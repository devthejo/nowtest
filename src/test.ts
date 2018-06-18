import invoke from './invoke';
import { ITest, IGroup, IContext } from './interfaces';
import TNode from './node';

class TTest extends TNode implements ITest  {
    private _result: any;
    private expect: any;
    private cb: invoke.Callback;
    get result() { return this._result; }

    constructor(
        context: IContext,
        parent: IGroup,
        name: string,
        cb: invoke.Callback,
        expect: any = invoke.Any
    ) {
        super(context, parent, name);
        this.cb = cb;
        this.expect = expect;
    }

    private runTestCallback = ()=> {
        return invoke(this.cb, { expect: this.expect }).then(result => {
            this._result = result;
        });
    }

    run = () => {
        return invoke.sequence([
            this.parent.runBeforesStack,
            this.runTestCallback,
            this.parent.runAftersStack
        ]);
    }

    get runCallback() {
        return () => {
            return this.run();
        }
    }
}

export default TTest;
