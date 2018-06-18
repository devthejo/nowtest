import invoke from './invoke';
import { ITest, IGroup, INode, IContext, Definition } from './interfaces';
import TNode from './node';
import TTest from './test';

class TGroup extends TNode implements IGroup {
    private groups: TGroup[] = [];
    private tests: ITest[] = [];
    private befores: invoke.Callback[] = [];
    private afters: invoke.Callback[] = [];

    get beforesCallback() {
        return invoke.sequence.asCallback(this.befores);
    }
    get aftersCallback() {
        return invoke.sequence.asCallback(this.afters);
    }

    constructor(context: IContext, parent: TGroup, name: string) {
        super(context, parent, name);
    }

    group(name: string, cb: invoke.Callback) {
        this.context.assertDefinitionStage();
        if (this.groups.find(grp => grp.name === name))
            throw new Error(`Test group with name '${name}' already exists within '${this.name}'`);
        
        const childGroup = new TGroup(this.context, this, name);
        this.groups.push(childGroup);
        this.context.enqueueGroupDefinition(cb);
    }

    before(cb: invoke.Callback): void {
        this.context.assertDefinitionStage();
        this.befores.push(cb);
    }

    after(cb: invoke.Callback): void {
        this.context.assertDefinitionStage();
        this.afters.push(cb);
    }
    test(name: string, cb: invoke.Callback, expect?: any): void {
        this.context.assertDefinitionStage();
        this.tests.push(new TTest(this.context, this, name, cb, expect));
    }
    listTree() {
        let result: IGroup[] = [];
        let it: IGroup = this;
        while (it) {
            result.push(it);
            it = it.parent;
        }
        return result;
    }
    runBeforesStack = () =>  {
        let cbs: invoke.Callback[] =
            this.listTree().map(igroup => igroup.beforesCallback);
        return invoke.sequence(cbs);
    }
    runAftersStack = () => {
        let cbs: invoke.Callback[] =
            this.listTree().map(igroup => igroup.aftersCallback);
        return invoke.sequence(cbs);
    }
    get runCallback() {
        return () => {
            return this.run();
        }
    }
    run = () => {
        return invoke.sequence(
            [...this.tests, ...this.groups]
                .map(inode => inode.runCallback)
        );
    }
}

export default TGroup;
