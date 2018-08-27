
/** Description of the results object returned by testnow.run() */
export interface IResult {
    name?: string;
    /** Test execution date and time */
    date: string;
    /** true if tests passed */
    passed: boolean;
    /** If false tests weren't even started because definition failed */
    definitionsOk?: boolean;
    /** All errors raised during the tests execution */
    errors: Error[];
    /** The tree of test results */
    tests?: IGroupResult;
    /** A special method put in result object provides a convenient way
     * to traverse the whole results tree */
    traverse(options?: ResultTraverseOptions): void;
}

export interface ResultTraverseOptions {
    /** This callback is called for each group of the tree, before handling the group */
    group?: (res: IGroupResult) => void;
    /** This callback is called for each group of the tree, after handling the group */
    groupEnd?: (res: IGroupResult) => void;
    /** This callback is called for each test leaf of the tree */
    test?: (res: ITestResult) => void;
    /** This callback for each test node(test or group) before anything else */
    all?: (res: IResultNode) => void;
    /** If that property is set to true - inside every group all subgroups
     * will be processed first and tests second. This means that all group
     * results will be processed(passed to group() callback) before any
     * test results. Normally traverser processes test results first and
     * then subgroup results and in every subgroup processes test results
     * first and then sub-subgroup results etc. */
    groupsFirst?: boolean;
}

/** The whole results tree is composed of nodes sharing this interface */
export interface IResultNode {
    /** Group or test name as provided by the user */
    name: string;
    /** A list of containing group names */
    fullName: string;
    parent: IGroupResult;
    nestLevel: number;
    /** The time elapsed to run this node with all it's contents */
    elapsed: number;
    errors?: Error[];
    passed?: boolean;
    executed?: boolean;
    skipped?: boolean;
}


export interface IGroupResult extends IResultNode {
    /** Number of tests passed */
    passedCount: number;
    /** Number of tests failed */
    failedCount: number;
    /** Total number of tests */
    totalCount: number;
    executedCount: number;
    groups: IGroupResult[];
    tests: ITestResult[];
}

export interface ITestResult extends IResultNode {
}

export function traverse(
    what: IGroupResult,
    options: ResultTraverseOptions
) {
    let { test: cbTest, group: cbGroup, groupEnd: cbGroupEnd, groupsFirst, all: cbAll } = options;
    cbGroup = cbGroup || (() => undefined);
    cbGroupEnd = cbGroupEnd || (() => undefined);
    cbTest = cbTest || (() => undefined);
    cbAll = cbAll || (() => undefined);
    let onTest = (test: ITestResult) => {
        cbAll(test);
        cbTest(test);
    };
    let onGroup = (group: IGroupResult) => {
        cbAll(group);
        if (!cbGroup(group)) {
            traverse(group, options);
        }
        cbGroupEnd(group);
    }

    if (groupsFirst) what.groups.forEach(onGroup);
    what.tests.forEach(onTest);
    if (!groupsFirst) what.groups.forEach(onGroup);
}

export type IReporter = (results: IResult) => boolean;
