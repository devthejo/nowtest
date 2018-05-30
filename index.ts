

export type TestCallbackNoArgs = () => Promise<any> | any;
export type TestCallbackResolve = (resolve: (x: any) => void) => any | Promise<any>;
export type TestCallbackPromise = (
    resolve: (x: any) => void,
    reject: (err: Error | any) => void
) => any | Promise<any>;
export type TestCallback = TestCallbackNoArgs | TestCallbackPromise | TestCallbackResolve;

const NodeTypeTest = 'test';
const NodeTypeGroup = 'group';
type NodeType = "test" | "group";

export const RootGroupName = "[ROOT]";
export const DeclarationStage = "declaration";
export const ExecutionStage = "execution";
export const DoneStage = "done";
export type TestingStage = "declaration" | "execution" | "done";

const rootGroup: GroupNode = {
    children: {},
    before: [],
    after: [],
    parent: null,
    name: RootGroupName,
    type: 'group'
};

let currentGroup = rootGroup;
let currentTest: TestNode = null;
let currentStage: TestingStage = "declaration";

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
            throw new Error(`testnow: timer is already started.`);
        this.startedAt = Date.now();
    }
    stop() {
        if (!this.isStarted)
            throw new Error(`testnow: timer was not started.`);
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

const Any = Symbol();

namespace runCallback {
    export interface Options {
        expect?: any;
        timeout?: number;
    }
}

function assertExpectation(factual: any, expected: any) {
    if (expected !== Any) {
        if (factual !== expected) {
            throw new Error(`Expectation failed: expected ${expected}, got: ${factual}`);
        }
    }
    return factual;
}

function runCallback(cb: TestCallback, options: runCallback.Options = {}): Promise<any> {
    let timeout = options.timeout || 20000;
    let expect = ("expect" in options) ? options.expect : undefined;
    let timeoutId: any = null;
    return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
            timeoutId = null;
            reject(new Error(`Timeout: ${timeout}`));
        }, timeout);
        if (cb.length)
            (cb as TestCallbackPromise)(resolve, reject);
        else
            resolve((cb as TestCallbackNoArgs)());
    }).catch(failure => {
        const error = (failure instanceof Error) ? failure : new Error(`Error: ${failure}`);
        return errorTracker.add(error);
    }).then(result => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        return assertExpectation(result, expect);
    });;
}

namespace sequence {
    export interface Options {
        timeout?: number;
        recover?: boolean;
    }
}
/**
 * Executes sequence of possibly asynchronous callbacks
 * */
function sequence(cbs: TestCallback[], options: sequence.Options = {}) {
    const timeout = options.timeout || 20000;
    const recover = options.recover || false;

    let queue = [...cbs];
    return new Promise((resolve, reject) => {
        function next(prevResult?: any) {
            if (!queue.length) {
                resolve(true);
            } else {
                let cb = queue.shift();
                runCallback(cb, { timeout }).catch(
                    (err: Error) => errorTracker.add(err)
                ).then((cbResult) => {
                    if ((cbResult instanceof Error) && !recover) {
                        reject(cbResult);
                    } else {
                        next();
                    }
                });
            }
        }
        next();
    });
}

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

        /** An error ocurred in 'before' callbacks */
        let testInitializationError: Error;
        return sequence(listBefores(testNode.parent)).catch(err => {
            testInitializationError = err;
            currentTest.errors.push(errorTracker.register(err));
        }).then(() => {
            if (testInitializationError) {
                testNode.error = new Error(
                    `Failed to during invocation of "before()" handlers: ${testInitializationError}`
                );
                testNode.passed = false;
                registerError(testNode.error);
                return Promise.resolve();
            } else {
                return runCallback(testNode.test).then(callbackResult => {
                    result = callbackResult;
                    testNode.passed = !!result;
                    testNode.result = callbackResult;
                    if (!testNode.passed) {
                        throw new Error(
                            `Test failed: ${getFullName(testNode)}`
                        );
                    }
                }).catch(err => {
                    testError = err;
                    testNode.error = testError;
                    testNode.passed = false;
                    registerError(err);
                });
            }
        }).then(() => {
            return sequence(listAfters(testNode.parent), { recover: true });
        }).catch(cleanupError => {
            if (!testError) testError = cleanupError;
            registerError(cleanupError);
        }).then(() => {
            testNode.elapsed = stopTimer();
            return true;
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
            .catch(e => { registerError(e); });
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
        if ("result" in testNode) testResult.result = testNode.result;
        if ("error" in testNode) testResult.error = testNode.error;
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
            }).catch(registerError).then(() => {
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
                    errors: [...errors.values()],
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

export interface Tests {
    (name: string, cb: TestCallback): void;
    group(name: string, cb: TestCallback): void;
    before(cb: TestCallback): void;
    after(cb: TestCallback): void;
    run(): Promise<test.TestsResult>;
    void(name: string, cb: TestCallback): void;
}

export let test: Tests = <Tests>declTest;
test.group = group;
test.before = before;
test.after = after;
test.run = run;
test.void = function (name: string, cb: TestCallback) {
    test(name, ignoreResultValue(cb));
};

export namespace test {
    export interface TestsResult {
        date: string;
        errors: Error[];
        tests: TestsGroupResult;
        traverse(options?: ResultTraverseOptions): void;
    }
    export interface ResultTraverseOptions {
        group?: (res: TestsGroupResult) => void;
        test?: (res: TestsTestResult) => void;
        groupsFirst?: boolean;
    }
    export interface TestsResultNode {
        name: string;
        path: string[];
        elapsed: number;
    }
    export interface TestsGroupResult extends TestsResultNode {
        passed: number;
        failed: number;
        total: number;
        groups: TestsGroupResult[];
        tests: TestsTestResult[];
    }
    export interface TestsTestResult extends TestsResultNode {
        passed: boolean;
        error?: Error;
        result?: any;
    }
}

export default test;
