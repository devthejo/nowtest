

export interface RegisteredError extends Error {
    timestamp: number;
    index: number;
    stage: TestingStage;
    path: string[];
    procedure: string;
}

class ErrorTracker {
    private errors: Set<RegisteredError> = new Set();
    constructor() {
    }
    public register(error: Error): RegisteredError {
        const registered = error as RegisteredError;
        if (!this.errors.has(registered)) {
            registered.stage = currentStage;
            registered.timestamp = Date.now();
            registered.index = this.errors.size;
            this.errors.add(registered);
        }
        return registered;
    }
    public add(error: Error) {
        return this.register(error);
    }
    public list() {
        let result = [...this.errors.values()];
        result.sort((a, b) => {
            return b.index - a.index;
        });
        return result;
    }
}

let errorTracker: ErrorTracker = new ErrorTracker();

interface NodeBase {
    /** Name of either group or test */
    name: string;
    /** Group that contains this node */
    parent: GroupNode;
    /** NodeType: test or group */
    type: NodeType;
}

function getNodePath(node: NodeBase): string[] {
    let path = [];
    let subj = node;
    while (!isRootGroup(subj)) {
        path.unshift(subj.name);
        subj = subj.parent;
    }
    return path;
}

interface TestNode extends NodeBase {
    /** Successfully executed */
    passed?: boolean;
    /** The error that terminated the execution */
    errors?: RegisteredError[];
    /** The result of the execution (either returned or resolved from promise) */
    result?: any;
    /** The expected result of execution */
    expect?: any;
    /** The test callback */
    test: TestCallback;
    /** Time elapsed for all tests of this node */
    elapsed: number;
}

interface GroupNode extends NodeBase {
    children: { [key: string]: TestNode | GroupNode };
    before: TestCallback[];
    after: TestCallback[];
}

function isRootGroup(groupNode: NodeBase) {
    return !groupNode.parent && groupNode.name === RootGroupName;
}

class ElapsedTimer {
    private startedAt: number = 0;
    get isStarted() { return this.startedAt !== 0; }
    start() {
        if (this.isStarted)
            throw new Error(`ElapsedTimer: timer is already started.`);
        this.startedAt = Date.now();
    }
    stop() {
        if (!this.isStarted)
            throw new Error(`ElapsedTimer: timer was not started.`);
        const now = Date.now();
        const result = now - this.startedAt;
        this.startedAt = 0;
        return result;
    }
}

const elapsedTimer = new ElapsedTimer();


/** How definitions work - first whenever test-group is defined
 *  it puts it's definition callback in definition queue.
 *  All definitions are executed asynchronously, right after source loaded.
 */
let testDefinitionAsyncCaret = <Promise<void>>(Promise.resolve());
let testDefinitionComplete: () => void;
let defGroups = 0;
let testDefinitionCompletePromise = new Promise((resolve, reject) => {
    testDefinitionComplete = resolve;
});

function getCurrentGroup() {
    return currentGroup;
}
function setCurrentGroup(group: GroupNode) {
    currentGroup = group;
}
function group(name: string, groupDeclarationCallback: TestCallback) {
    let parent = getCurrentGroup();
    defGroups++;

    testDefinitionAsyncCaret = <Promise<void>>testDefinitionAsyncCaret
        .then(() => {
            let child: GroupNode = {
                children: {},
                before: [],
                after: [],
                parent,
                name,
                type: NodeTypeGroup
            };
            if (parent.children[name]) {
                throw new Error(`Name ${name} is already used`);
            }
            parent.children[name] = child;
            setCurrentGroup(child);
            let error: Error = null;
            return runCallback(groupDeclarationCallback)
                .catch((err: Error) => {
                    error = err;
                }).then(() => {
                    setCurrentGroup(parent);
                    defGroups--;
                    if (!defGroups) {
                        testDefinitionComplete();
                    }
                    if (error) throw error;
                });
        });
}
function declTest(name: string, testCallback: TestCallback, expect?: any) {
    let parent = getCurrentGroup();

    let child: TestNode = {
        errors: [],
        test: testCallback,
        name,
        parent,
        expect,
        type: 'test',
        elapsed: 0
    };

    if (parent.children[name]) {
        throw new Error(`Name ${name} is already used`);
    }
    parent.children[name] = child;
}

function before(cb: TestCallback) {
    getCurrentGroup().before.push(cb);
}

function after(cb: TestCallback) {
    getCurrentGroup().after.push(cb);
}

/**
 * Populates all "before" callbacks, including the parent ones for given group
 */
function listBefores(node: GroupNode): TestCallback[] {
    return node ? [...listBefores(node.parent), ...node.before] : [];
}

/**
 * Populates all "after" callbacks, including the parent ones for given group
 */
function listAfters(node: GroupNode): TestCallback[] {
    return node ? [...node.after, ...listAfters(node.parent)] : [];
}

function getFullName(testNode: TestNode) {
    let name = testNode.name;
    let parent = testNode.parent;
    while (parent && parent.parent) {
        name = `${parent.name}/${name}`;
    }
    return name;
}

function runTest(testNode: TestNode) {
    return Promise.resolve().then(() => {
        let result: any;
        let testError: Error;
        elapsedTimer.start();

        currentTest = testNode;
        // ToDo: determine which group exactly failed the initialization
        // ToDo: and fully fail rest of this group
        let initFailed = false;

        return sequence(listBefores(testNode.parent)).catch(err => {
            currentTest.errors.push(errorTracker.add(err));
            currentTest.passed = false;
            initFailed = true;
        }).then(() => {
            if (!currentTest.errors.length) {
                return runCallback(testNode.test, { expect: testNode.expect }).then(callbackResult => {
                    result = callbackResult;
                    currentTest.result = callbackResult;
                    currentTest.passed = true;
                }).catch(err => {
                    currentTest.errors.push(errorTracker.add(err));
                    currentTest.passed = false;
                });
            }

        }).then(() => {
            return sequence(listAfters(testNode.parent), { recover: true });
        }).catch(cleanupError => {
            currentTest.errors.push(errorTracker.add(cleanupError));
            currentTest.passed = false;
        }).then(() => {
            currentTest.elapsed = elapsedTimer.stop();
            currentTest = null;
        });
    });
}

function listTests(group: GroupNode) {
    let tests: TestNode[] = [];
    for (let key of Object.keys(group.children)) {
        if (group.children[key].type === 'test') {
            tests.push(<TestNode>group.children[key]);
        }
    }
    return tests;
}

function listSubGroups(group: GroupNode) {
    let groups: GroupNode[] = [];
    for (let key of Object.keys(group.children)) {
        if (group.children[key].type === 'group') {
            groups.push(<GroupNode>group.children[key]);
        }
    }
    return groups;
}

function runGroup(group: GroupNode): Promise<void> {
    return Promise.resolve().then(() => {
        return <Promise<void>>sequence(listTests(group).map(test => () => runTest(test)))
            .then(() => sequence(listSubGroups(group).map(subGroup => () => runGroup(subGroup))))
            .catch(e => { errorTracker.add(e); });
    });
}

let runPromise: Promise<test.TestsResult>;
let lastReport: test.TestsResult;
function run() {
    function getTestResult(testNode: TestNode): test.TestsTestResult {
        let testResult: test.TestsTestResult = {
            name: testNode.name,
            passed: testNode.passed,
            elapsed: testNode.elapsed,
            path: getNodePath(testNode)
        };
        testResult.result = testNode.result;
        if (testNode.errors.length)
            testResult.errors = testNode.errors;
        else
            testResult.result = testNode.result;
        return testResult;
    }
    function getGroupResult(groupNode: GroupNode): test.TestsGroupResult {
        let groupResult: test.TestsGroupResult = {
            name: groupNode.name,
            passed: 0,
            failed: 0,
            total: 0,
            groups: [],
            tests: [],
            elapsed: 0,
            path: getNodePath(groupNode)
        };
        if (groupResult.name === RootGroupName) {
            groupResult.name = "Tests";
        }
        listTests(groupNode).forEach(testNode => {
            let testResult = getTestResult(testNode);
            groupResult.tests.push(testResult);
            if (testResult.passed)
                groupResult.passed++;
            else
                groupResult.failed++;
            groupResult.total++;
            groupResult.elapsed += testResult.elapsed;
        });
        listSubGroups(groupNode).forEach(subGroupNode => {
            let subGroupResult = getGroupResult(subGroupNode);
            groupResult.groups.push(subGroupResult);
            groupResult.passed += subGroupResult.passed;
            groupResult.failed += subGroupResult.failed;
            groupResult.total += subGroupResult.total;
            groupResult.elapsed + subGroupResult.elapsed;
        });
        return groupResult;
    }
    if (!runPromise) {

        runPromise = testDefinitionCompletePromise.then(() => {
            let lastDAC = testDefinitionAsyncCaret;
            testDefinitionAsyncCaret = null;
            return lastDAC.then(() => {
                testDefinitionAsyncCaret = null;
                return runGroup(rootGroup);
            }).catch((err) => errorTracker.add(err)).then(() => {
                function traverse(
                    what: test.TestsGroupResult,
                    options: test.ResultTraverseOptions) {
                    const { test: cbTest, group: cbGroup, groupsFirst } = options;
                    if (groupsFirst) {
                        what.groups.forEach(g => {
                            cbGroup(g);
                            traverse(g, options);
                        });
                    }
                    what.tests.forEach(t => {
                        cbTest(t)
                    });
                    if (!groupsFirst) {
                        what.groups.forEach(g => {
                            cbGroup(g);
                            traverse(g, options);
                        });
                    }
                }
                return lastReport = {
                    date: new Date().toString(),
                    errors: [...errorTracker.list()],
                    tests: getGroupResult(rootGroup),
                    traverse: function (options: test.ResultTraverseOptions = {}) {
                        const opts = {
                            test: options.test || (() => { }),
                            group: options.group || (() => { }),
                            groupsFirst: options.groupsFirst || false
                        }
                        traverse(this.tests, options);
                    }
                };
            });
        });
    }
    return runPromise;
}

