export declare type TestCallbackNoArgs = () => Promise<any> | any;
export declare type TestCallbackResolve = (resolve: (x: any) => void) => any | Promise<any>;
export declare type TestCallbackPromise = (resolve: (x: any) => void, reject: (err: Error | any) => void) => any | Promise<any>;
export declare type TestCallback = TestCallbackNoArgs | TestCallbackPromise | TestCallbackResolve;
export declare const RootGroupName = "[ROOT]";
export interface Tests {
    (name: string, cb: TestCallback): void;
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
        report: string;
        errors: Error[];
        tests: TestsGroupResult;
    }
    interface TestsGroupResult {
        name: string;
        passed: number;
        failed: number;
        total: number;
        groups: TestsGroupResult[];
        tests: TestsTestResult[];
        elapsed: number;
    }
    interface TestsTestResult {
        name: string;
        passed: boolean;
        error?: Error;
        result?: any;
        elapsed: number;
    }
}
export default test;
