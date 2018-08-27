import invoke from './invoke';
import { ITest, IGroup, IContext, IRunOptions } from './interfaces';
import TNode from './node';
import { IGroupResult, ITestResult } from './result';
declare class TTest extends TNode implements ITest {
    private expect;
    private cb;
    private executeSetup;
    private executeTeardown;
    constructor(beforesStack: invoke.Callback, aftersStack: invoke.Callback, context: IContext, parent: IGroup & TNode, name: string, cb: invoke.Callback, expect?: any);
    getResults(parent?: IGroupResult): ITestResult;
    private runTestCallback;
    protected runStart(options: IRunOptions): void;
    protected runEnd(options: IRunOptions): void;
    protected runMain(options: IRunOptions): Promise<void>;
}
export default TTest;
