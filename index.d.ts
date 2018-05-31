export declare type TestCallbackNoArgs = () => Promise<any> | any;
export declare type TestCallbackResolve = (resolve: (x: any) => void) => any | Promise<any>;
export declare type TestCallbackPromise = (resolve: (x: any) => void, reject: (err: Error | any) => void) => any | Promise<any>;
export declare type TestCallback = TestCallbackNoArgs | TestCallbackPromise | TestCallbackResolve;
export declare const RootGroupName = "[ROOT]";
export declare const DeclarationStage = "declaration";
export declare const ExecutionStage = "execution";
export declare const DoneStage = "done";
export declare type TestingStage = "declaration" | "execution" | "done";
export interface RegisteredError extends Error {
    timestamp: number;
    index: number;
    stage: TestingStage;
    path: string[];
    procedure: string;
}
export interface Tests {
    (name: string, cb: TestCallback, expect?: any): void;
    group(name: string, cb: TestCallback): void;
    before(cb: TestCallback): void;
    after(cb: TestCallback): void;
    run(): Promise<test.TestsResult>;
    void(name: string, cb: TestCallback): void;
}
export declare let test: Tests;
export declare namespace test {
    interface TestsResult {
        date: string;
        errors: Error[];
        tests: TestsGroupResult;
        traverse(options?: ResultTraverseOptions): void;
    }
    interface ResultTraverseOptions {
        group?: (res: TestsGroupResult) => void;
        test?: (res: TestsTestResult) => void;
        groupsFirst?: boolean;
    }
    interface TestsResultNode {
        name: string;
        path: string[];
        elapsed: number;
    }
    interface TestsGroupResult extends TestsResultNode {
        passed: number;
        failed: number;
        total: number;
        groups: TestsGroupResult[];
        tests: TestsTestResult[];
    }
    interface TestsTestResult extends TestsResultNode {
        passed: boolean;
        errors?: Error[];
        result?: any;
    }
}
export default test;
