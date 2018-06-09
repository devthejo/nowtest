import invoke from './invoke';
import { ITest, IGroup, INode, IContext, Definition } from './interfaces';
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
    }
    runBefores(): Promise<void>;
    runAfters(): Promise<void>;
    run(): Promise<void>;
}

export default TGroup;
