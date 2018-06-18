import invoke from './invoke';
import { IResult } from './result';
export * from './result';

export interface INode {
    readonly name: string;
    readonly parent: IGroup;
    readonly isRoot: boolean;
    readonly fullName: string;
    readonly context: IContext;
    readonly status: NodeStatus;
    readonly elapsed: number;
    readonly passed: boolean;
    readonly finished: boolean;
    readonly runCallback: invoke.Callback;
    timeStart(): void;
    timeEnd(): void;
}

export interface IGroup extends INode {
    group(name: string, cb: invoke.Callback): void;
    before(cb: invoke.Callback): void;
    after(cb: invoke.Callback): void;
    test(name: string, cb: invoke.Callback, expect?: any): void;
    readonly beforesCallback: invoke.Callback;
    readonly aftersCallback: invoke.Callback;
    run(): Promise<void>;
    listTree(): IGroup[];
    runBeforesStack(): Promise<void>;
    runAftersStack(): Promise<void>;
}

export interface ITest extends INode {
    readonly result: any;
    run(): Promise<void>;
}


export const Definition = "definition";
export const Execution = "execution";
export const Results = "results";
export const Failed = "failed";
export type ContextStatus =
    typeof Definition |
    typeof Execution |
    typeof Results |
    typeof Failed;

export const Preparation = "preparation";
export const Cleanup = "cleanup";
export type NodeStatus =
    typeof Definition |
    typeof Execution |
    typeof Results |
    typeof Preparation |
    typeof Cleanup;


export interface IContext {
    readonly name: string;
    readonly stage: ContextStatus;
    readonly rootGroup: IGroup;
    readonly currentGroup: IGroup;
    readonly currentTest: ITest;

    assertDefinitionStage(msg?: string): void;
    assertExecutionStage(msg?: string): void;
    assertResultsStage(msg?: string): void;

    enqueueGroupDefinition(cb: invoke.Callback): void;
    readonly definitionsDone: Promise<void>;
    getAPI(): ExternalAPI;
}


export interface ExternalAPI {
    (name: string, cb: invoke.Callback, expect?: any): void;
    group(name: string, cb: invoke.Callback): void;
    before(cb: invoke.Callback): void;
    after(cb: invoke.Callback): void;
    run(): Promise<IResult>;

    readonly Any: Symbol;
    readonly Truthy: Symbol;
    readonly Falsy: Symbol;
}
