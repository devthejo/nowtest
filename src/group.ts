import invoke from './invoke';
import { ITest, IGroup, INode, IContext } from './interfaces';
import TNode from './node';

class TGroup extends TNode implements IGroup {
    private groups: TGroup[] = [];
    private tests: ITest[] = [];
    private befores: invoke.Callback[] = [];
    private afters: invoke.Callback[] = [];

    constructor(context: IContext, parent: TGroup, name: string) {
        super(context, parent, name);


    }

    group(name: string, cb: invoke.Callback) {
        
    }
    before(cb: invoke.Callback): void;
    after(cb: invoke.Callback): void;
    test(name: string, cb: invoke.Callback, expect?: any): void;
    runBefores(): Promise<void>;
    runAfters(): Promise<void>;
    run(): Promise<void>;
}

export default TGroup;
