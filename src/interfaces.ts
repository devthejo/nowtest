import invoke from './invoke';
import { IResult, IGroupResult, IResultNode, ITestResult } from './result';
export * from './result';

export interface INode {
    readonly name: string;
    readonly parent: IGroup;
    readonly isRoot: boolean;
    readonly fullName: string;
    readonly context: IContext;
    readonly elapsed: number;
    readonly finished: boolean;
    readonly passed: boolean;
    readonly errors: Error[];
    readonly executed: boolean;
    
    run(): Promise<void>;
    getResults(parent?: IGroupResult): IResultNode;
}

export interface IGroup extends INode {
    definition(): Promise<void>;

    group(name: string, cb: invoke.Callback): IGroup;
    before(cb: invoke.Callback): void;
    after(cb: invoke.Callback): void;
    test(name: string, cb: invoke.Callback, expect?: any): void;

    getResults(parent?: IGroupResult): IGroupResult;
}

export interface ITest extends INode {
    getResults(parent?: IGroupResult): ITestResult;
}

export interface IContext {
    readonly name: string;
    readonly rootGroup: IGroup;
    currentGroup: IGroup;
    currentTest: ITest;

    assertDefinitionStage(msg?: string): void;
    assertExecutionStage(msg?: string): void;
    assertResultsStage(msg?: string): void;

    enqueueDefinition(group: IGroup): void;
    onError(error: Error): void;

    run(options?: IRunOptions): Promise<void>;

    getResults(): IResult;

    getAPI(): ExternalAPI;
}

export interface IRunOptions {
    
}


export interface ExternalAPI {
    (name: string, cb: invoke.Callback, expect?: any): void;
    group(name: string, cb: invoke.Callback): void;
    before(cb: invoke.Callback): void;
    after(cb: invoke.Callback): void;

    run(options?: IRunOptions): Promise<IResult>;
    context(name: string): ExternalAPI;

    readonly Any: Symbol;
    readonly Truthy: Symbol;
    readonly Falsy: Symbol;
}
