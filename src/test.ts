import invoke from './invoke';
import { ITest, IGroup, IContext, IRunOptions } from './interfaces';
import TNode from './node';
import { IGroupResult, ITestResult } from './result';

class TTest extends TNode implements ITest {
    private expect: any;
    private cb: invoke.Callback;
    private executeSetup: invoke.Callback;
    private executeTeardown: invoke.Callback;

    constructor(
        beforesStack: invoke.Callback,
        aftersStack: invoke.Callback,
        context: IContext,
        parent: IGroup & TNode,
        name: string,
        cb: invoke.Callback,
        expect: any = invoke.Any
    ) {
        super(context, parent, name);
        this.cb = cb;
        this.expect = expect;
        this.executeSetup = beforesStack;
        this.executeTeardown = aftersStack;
    }

    getResults(parent: IGroupResult = null): ITestResult {
        return super.getResults(parent);
    }

    private runTestCallback = () => {
        return invoke(this.cb, { expect: this.expect });
    }

    protected runStart(options: IRunOptions) {
        this.context.currentTest = this;
        return super.runStart(options);
    }

    protected runEnd(options: IRunOptions) {
        this.context.currentTest = null;
        return super.runEnd(options);
    }

    protected runMain(options: IRunOptions) {
        return invoke.sequence([
            this.executeSetup,
            this.runTestCallback,
            this.executeTeardown
        ]);
    }
}

export default TTest;
