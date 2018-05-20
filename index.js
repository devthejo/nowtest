"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RootGroupName = "[ROOT]";
const rootGroup = {
    children: {},
    before: [],
    after: [],
    parent: null,
    name: exports.RootGroupName,
    type: 'group'
};
let currentGroup = rootGroup;
let currentTest = null;
let errors = new Set();
function registerError(err) {
    errors.add(err);
}
let timerStartedAt = 0;
let isTimerStarted = false;
function startTimer() {
    if (isTimerStarted)
        throw new Error(`Timer is already started.`);
    timerStartedAt = Date.now();
    isTimerStarted = true;
}
function stopTimer() {
    if (!isTimerStarted)
        throw new Error(`Timer is not started.`);
    isTimerStarted = false;
    const timerStoppedAt = Date.now();
    return timerStoppedAt - timerStartedAt;
}
function isRootGroup(groupNode) {
    return !!groupNode.parent && groupNode.name === exports.RootGroupName;
}
/** How definitions work - first whenever test-group is defined it puts it's definition code in definition
 * queue. All definitions are executed asynchronously, right after source loaded.
 */
let testDefinitionAsyncCaret = (Promise.resolve());
let testDefinitionComplete;
let defGroups = 0;
let testDefinitionCompletePromise = new Promise((resolve, reject) => {
    testDefinitionComplete = resolve;
});
function runCallback(cb, options = {}) {
    let timeout = options.timeout || 20000;
    let ignoreResult = options.ignoreResult || false;
    let timeoutId = null;
    return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
            timeoutId = null;
            reject(new Error(`Timeout: ${timeout}`));
        }, timeout);
        if (cb.length)
            cb(resolve, reject);
        else
            resolve(cb());
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
        if (result instanceof Error)
            throw result;
        return result;
    });
    ;
}
/**
 * Executes sequence of possibly asynchronous callbacks
 * */
function sequence(cbs, options = {}) {
    const timeout = options.timeout || 20000;
    const recover = options.recover || false;
    let queue = cbs.slice();
    return new Promise((resolve, reject) => {
        function next(prevResult) {
            if (!queue.length) {
                resolve(true);
            }
            else {
                let cb = queue.shift();
                runCallback(cb, { timeout }).catch((err) => {
                    registerError(err);
                    return err;
                }).then((cbResult) => {
                    if ((cbResult instanceof Error) && !recover) {
                        reject(cbResult);
                    }
                    else {
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
function ignoreResultValue(cb) {
    return () => {
        return Promise.resolve(cb()).then(() => true);
    };
}
function getCurrentGroup() {
    return currentGroup;
}
function setCurrentGroup(group) {
    currentGroup = group;
}
function group(name, groupDeclarationCallback) {
    let parent = getCurrentGroup();
    defGroups++;
    testDefinitionAsyncCaret = testDefinitionAsyncCaret.then(() => {
        let child = {
            children: {}, before: [], after: [], parent, name, type: 'group'
        };
        if (parent.children[name]) {
            throw new Error(`Name ${name} is already used`);
        }
        parent.children[name] = child;
        setCurrentGroup(child);
        let error = null;
        return runCallback(ignoreResultValue(groupDeclarationCallback)).catch((err) => {
            error = err;
        }).then(() => {
            setCurrentGroup(parent);
            defGroups--;
            if (!defGroups) {
                testDefinitionComplete();
            }
            if (error)
                throw error;
        });
    });
}
function declTest(name, testCallback) {
    let parent = getCurrentGroup();
    let child = {
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
function before(cb) {
    getCurrentGroup().before.push(ignoreResultValue(cb));
}
function after(cb) {
    getCurrentGroup().after.push(ignoreResultValue(cb));
}
/**
 * Populates all "before" callbacks, including the parent ones for given group
 */
function listBefores(node) {
    return node ? [...listBefores(node.parent), ...node.before] : [];
}
/**
 * Populates all "after" callbacks, including the parent ones for given group
 */
function listAfters(node) {
    return node ? [...node.after, ...listAfters(node.parent)] : [];
}
function getFullName(testNode) {
    let name = testNode.name;
    let parent = testNode.parent;
    while (parent && parent.parent) {
        name = `${parent.name}/${name}`;
    }
    return name;
}
function runTest(testNode) {
    return Promise.resolve().then(() => {
        let result;
        let testError;
        startTimer();
        currentTest = testNode;
        /** An error ocurred in 'before' callbacks */
        let testInitializationError;
        return sequence(listBefores(testNode.parent)).catch(err => {
            testInitializationError = err;
            registerError(err);
        }).then(() => {
            if (testInitializationError) {
                testNode.error = new Error(`Failed to during invocation of "before()" handlers: ${testInitializationError}`);
                testNode.passed = false;
                registerError(testNode.error);
                return Promise.resolve();
            }
            else {
                return runCallback(testNode.test).then(callbackResult => {
                    result = callbackResult;
                    testNode.passed = !!result;
                    testNode.result = callbackResult;
                    if (!testNode.passed) {
                        throw new Error(`Test failed: ${getFullName(testNode)}`);
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
            if (!testError)
                testError = cleanupError;
            registerError(cleanupError);
        }).then(() => {
            testNode.elapsed = stopTimer();
            return true;
        });
    });
}
function listTests(group) {
    let tests = [];
    for (let key of Object.keys(group.children)) {
        if (group.children[key].type === 'test') {
            tests.push(group.children[key]);
        }
    }
    return tests;
}
function listSubGroups(group) {
    let groups = [];
    for (let key of Object.keys(group.children)) {
        if (group.children[key].type === 'group') {
            groups.push(group.children[key]);
        }
    }
    return groups;
}
function runGroup(group) {
    return Promise.resolve().then(() => {
        return sequence(listTests(group).map(test => () => runTest(test)))
            .then(() => sequence(listSubGroups(group).map(subGroup => () => runGroup(subGroup))))
            .catch(e => { registerError(e); });
    });
}
function getTextReport() {
    function indent(text, n = 4) {
        let indentValue = " ".repeat(n);
        let result = text.replace(/\n/g, `\n${indentValue}`);
        result = `${indentValue}${result}`;
        return result;
    }
    function reportTest(test) {
        if (test.passed !== undefined) {
            if (test.passed) {
                return `- ${test.name}: passed, OK!`;
            }
            else {
                return `- ${test.name}: FAILED\n${test.error ? test.error.stack : "   returned false"}`;
            }
        }
        else {
            return `- ${test.name}: N/A`;
        }
    }
    function reportGroup(group) {
        let own = listTests(group).map(reportTest).join('\n');
        let groups = listSubGroups(group).map(reportGroup).join('\n');
        if (group === rootGroup) {
            return `${own}\n${groups}`;
        }
        return `[${group.name}]\n${indent(own, 2)}\n${indent(groups, 2)}`;
    }
    let mainText = reportGroup(rootGroup);
    if (errors.size) {
        let errList = [...errors.values()];
        return `___Tests Failed!\n${mainText}\n\n___Errors:\n${[...errors.values()].map(error => error.stack).join('\n')}\n___Tests Failed!`;
    }
    else {
        return `___Tests Passed!\n${mainText}\n___Tests Passed!`;
    }
}
let runPromise;
function run() {
    function getTestResult(testNode) {
        let testResult = {
            name: testNode.name,
            passed: testNode.passed,
            elapsed: testNode.elapsed
        };
        if ("result" in testNode)
            testResult.result = testNode.result;
        if ("error" in testNode)
            testResult.error = testNode.error;
        return testResult;
    }
    function getGroupResult(groupNode) {
        let groupResult = {
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
                    report: getTextReport(),
                    errors: [...errors.values()],
                    tests: getGroupResult(rootGroup)
                };
            });
        });
    }
    return runPromise;
}
exports.test = declTest;
exports.test.group = group;
exports.test.before = before;
exports.test.after = after;
exports.test.run = run;
exports.test.void = function (name, cb) {
    exports.test(name, ignoreResultValue(cb));
};
exports.default = exports.test;
//# sourceMappingURL=index.js.map