

export type TestCallbackNoArgs = () => Promise<any> | any;
export type TestCallbackResolve = (resolve: (x: any) => void) => any | Promise<any>;
export type TestCallbackPromise = (
    resolve: (x: any) => void,
    reject: (err: Error | any) => void
) => any | Promise<any>;
export type TestCallback = TestCallbackNoArgs | TestCallbackPromise | TestCallbackResolve;

type TestNodeType = "test" | "group";

export const RootGroupName = "[ROOT]";
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

let errors: Set<Error> = new Set<Error>();
function registerError(err: Error) {
    errors.add(err);
}

interface NodeBase {
    name: string;
    /**
     * Root group is the only node having parent === null
     */
    parent: GroupNode;
    type: TestNodeType;
}

interface TestNode extends NodeBase {
    /** Successfully executed */
    passed?: boolean;
    /** The error that terminated the execution */
    error?: Error;
    /** The result of the execution (either returned or resolved from promise) */
    result?: any;
    /** The test callback */
    test: TestCallback;
    elapsed: number;
}

let timerStartedAt: number = 0;
let isTimerStarted: boolean = false;
function startTimer() {
    if (isTimerStarted)
        throw new Error(`Timer is already started.`);
    timerStartedAt = Date.now();
    isTimerStarted = true;
}

function stopTimer() {
    if (!isTimerStarted) throw new Error(`Timer is not started.`);
    isTimerStarted = false;
    const timerStoppedAt = Date.now();
    return timerStoppedAt - timerStartedAt;
}

interface GroupNode extends NodeBase {
    children: { [key: string]: TestNode | GroupNode };
    before: TestCallback[];
    after: TestCallback[];
}

function isRootGroup(groupNode: GroupNode) {
    return !!groupNode.parent && groupNode.name === RootGroupName;
}


/** How definitions work - first whenever test-group is defined it puts it's definition code in definition
 * queue. All definitions are executed asynchronously, right after source loaded.
 */
let testDefinitionAsyncCaret = <Promise<void>>(Promise.resolve());
let testDefinitionComplete: () => void;
let defGroups = 0;
let testDefinitionCompletePromise = new Promise((resolve, reject) => {
    testDefinitionComplete = resolve;
});

namespace runCallback {
    export interface Options {
        ignoreResult?: boolean;
        timeout?: number;
    }
}

function runCallback(cb: TestCallback, options: runCallback.Options = {}): Promise<any> {
    let timeout = options.timeout || 20000;
    let ignoreResult = options.ignoreResult || false;
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
        let error = (failure instanceof Error) ? failure : new Error(`Error: ${failure}`);
        registerError(error);
        return error;
    }).then(result => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        if (!ignoreResult) {
            if (!result) {
                result = new Error(`Callback returned falsy value: ${result}`);
            }
        }
        if (result instanceof Error) throw result;
        return result;
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

    let queue = cbs.slice();
    return new Promise((resolve, reject) => {

        function next(prevResult?: any) {
            if (!queue.length) {
                resolve(true);
            } else {
                let cb = queue.shift();
                runCallback(cb, { timeout }).catch((err: Error) => {
                    registerError(err);
                    return err;
                }).then((cbResult) => {
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

/** 
 * Wraps callback so that it always returns true or Promise resolving with true
 * Such callback fails in 'runCallback' only if an Error occurs
 */
function ignoreResultValue(cb: TestCallback): TestCallback {
    return () => {
        return Promise.resolve((cb as TestCallbackNoArgs)()).then(() => true);
    };
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

    testDefinitionAsyncCaret = <Promise<void>>testDefinitionAsyncCaret.then(() => {
        let child: GroupNode = {
            children: {}, before: [], after: [], parent, name, type: 'group'
        };
        if (parent.children[name]) {
            throw new Error(`Name ${name} is already used`);
        }
        parent.children[name] = child;
        setCurrentGroup(child);
        let error: Error = null;
        return runCallback(ignoreResultValue(groupDeclarationCallback)).catch((err: Error) => {
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
function declTest(name: string, testCallback: TestCallback) {
    let parent = getCurrentGroup();

    let child: TestNode = {
        error: null,
        test: testCallback,
        name,
        parent,
        type: 'test',
        elapsed: 0
    };

    if (parent.children[name]) {
        throw new Error(`Name ${name} is already used`);
    }
    parent.children[name] = child;
}

function before(cb: TestCallback) {
    getCurrentGroup().before.push(ignoreResultValue(cb));
}

function after(cb: TestCallback) {
    getCurrentGroup().after.push(ignoreResultValue(cb));
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
        startTimer();

        currentTest = testNode;

        /** An error ocurred in 'before' callbacks */
        let testInitializationError: Error;
        return sequence(listBefores(testNode.parent)).catch(err => {
            testInitializationError = err;
            registerError(err);
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
function run() {
    function getTestResult(testNode: TestNode): test.TestsTestResult {
        let testResult: test.TestsTestResult = {
            name: testNode.name,
            passed: testNode.passed,
            elapsed: testNode.elapsed
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
            elapsed: 0
        };
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
                return {
                    date: new Date().toString(),
                    errors: [...errors.values()],
                    tests: getGroupResult(rootGroup)
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
    }
    export interface TestsGroupResult {
        name: string;
        passed: number;
        failed: number;
        total: number;
        groups: TestsGroupResult[];
        tests: TestsTestResult[];
        elapsed: number;
    }
    export interface TestsTestResult {
        name: string;
        passed: boolean;
        error?: Error;
        result?: any;
        elapsed: number;
    }
}

export default test;
