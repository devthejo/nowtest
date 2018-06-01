
export interface IResult {
    
    date: string;
    errors: Error[];
    tests: IGroupResult;
    traverse(options?: ResultTraverseOptions): void;
    
}

export interface ResultTraverseOptions {
    group?: (res: IGroupResult) => void;
    test?: (res: ITestResult) => void;
    groupsFirst?: boolean;
}

export interface IResultNode {
    name: string;
    path: string[];
    elapsed: number;
}

export interface IGroupResult extends IResultNode {
    passed: number;
    failed: number;
    total: number;
    groups: IGroupResult[];
    tests: ITestResult[];
}

export interface ITestResult {
    passed: boolean;
    errors?: Error[];
    result?: any;
}
