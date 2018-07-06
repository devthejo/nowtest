import invoke from './invoke';
import { IGroup, IContext } from './interfaces';
import TNode from './node';
import { IGroupResult } from './result';
declare class TGroup extends TNode implements IGroup {
    private groups;
    private tests;
    private befores;
    private afters;
    private definitionCallback;
    constructor(context: IContext, parent: TGroup, name: string, definition: invoke.Callback);
    definition: () => Promise<any>;
    group(name: string, cb: invoke.Callback): TGroup;
    before(cb: invoke.Callback): void;
    after(cb: invoke.Callback): void;
    test(name: string, cb: invoke.Callback, expect?: any): void;
    getResults(parent?: IGroupResult): IGroupResult;
    protected runStart(): void;
    protected runEnd(): void;
    protected runMain(): Promise<void>;
    protected readonly ownBeforesCallback: invoke.Callback;
    protected readonly ownAftersCallback: invoke.Callback;
    private readonly children;
    /** Lists parent groups of this one from itself to root */
    protected compositionList(): TGroup[];
    private runBeforesStack;
    private runAftersStack;
}
export default TGroup;
