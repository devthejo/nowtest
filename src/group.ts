import invoke from './invoke';
import { ITest, IGroup, INode, IContext } from './interfaces';
import TNode from './node';
import TTest from './test';
import { IGroupResult } from './result';

class TGroup extends TNode implements IGroup {
    private groups: TGroup[] = [];
    private tests: ITest[] = [];
    private befores: invoke.Callback[] = [];
    private afters: invoke.Callback[] = [];
    private definitionCallback: invoke.Callback;

    constructor(
        context: IContext,
        parent: TGroup,
        name: string,
        definition: invoke.Callback
    ) {
        super(context, parent, name);
        this.definitionCallback = definition;
    }

    definition = () => {
        this.context.assertDefinitionStage();
        this.context.currentGroup = this;
        this.context.currentTest = null;
        return invoke(this.definitionCallback);
    }

    group(name: string, cb: invoke.Callback) {
        this.context.assertDefinitionStage();
        if (this.groups.find(grp => grp.name === name))
            throw new Error(`Test group with name '${name}' already exists within '${this.name}'`);

        const childGroup = new TGroup(this.context, this, name, cb);
        this.groups.push(childGroup);
        this.context.enqueueDefinition(childGroup);
        return childGroup;
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
        this.tests.push(new TTest(
            this.runBeforesStack,
            this.runAftersStack,
            this.context,
            this,
            name,
            cb,
            expect
        ));
    }

    getResults(parent: IGroupResult = null): IGroupResult {
        let results: IGroupResult = super.getResults(parent) as IGroupResult;
        results.tests = this.tests.map(test => test.getResults(results));
        results.groups = this.groups.map(group => group.getResults(results));
        results.totalCount = results.tests.length +
            results.groups.reduce((n, grp) => n + grp.totalCount, 0);
        results.executedCount =
            results.tests.reduce((n, tst) => n + (tst.executed ? 1 : 0), 0) +
            results.groups.reduce((n, grp) => n + grp.executedCount, 0);
        results.passedCount = 
            results.tests.reduce((n, tst) => n + (tst.passed ? 1 : 0), 0) +
            results.groups.reduce((n, grp) => n + grp.passedCount, 0);
        results.failedCount = results.executedCount - results.passedCount;
        return results;
    }

    protected runStart() {
        this.context.assertExecutionStage();
        if ((this.isRoot && this.context.currentGroup === this) || (
            this.context.currentGroup === this.parent
        )) {
            this.context.currentGroup = this;
        } else {
            throw new Error(`Incorrect test tree traversal`);
        }
        return super.runStart();
    }

    protected runEnd() {
        this.context.currentGroup = this.parent;
        return super.runEnd();
    }

    protected runMain() {
        return invoke.sequence(this.children.map(inode => inode.run));
    }

    protected get ownBeforesCallback() {
        return invoke.sequence.asCallback(this.befores);
    }
    protected get ownAftersCallback() {
        return invoke.sequence.asCallback(this.afters);
    }

    private get children() {
        return [...this.tests, ...this.groups];
    }

    /** Lists parent groups of this one from itself to root */
    protected compositionList() {
        let result: TGroup[] = [];
        let it: TGroup = this;
        while (it) {
            result.push(it);
            it = it.parent as TGroup;
        }
        return result;
    }
    private runBeforesStack = () => {
        let cbs: invoke.Callback[] =
            this.compositionList()
                .reverse() // Since we should first call most outer befores
                .map(group => group.ownBeforesCallback);
        return invoke.sequence(cbs);
    }
    private runAftersStack = () => {
        let cbs: invoke.Callback[] =
            this.compositionList().map(igroup => igroup.ownAftersCallback);
        return invoke.sequence(cbs);
    }
}

export default TGroup;
