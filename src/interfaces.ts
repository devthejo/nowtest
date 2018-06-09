import invoke from './invoke';
import { IResult } from './result';
export * from './result';

export interface IErrorTracker {
    add(error: Error): RegisteredError;
    create(message: string): RegisteredError;
    list(): RegisteredError[];
    has(error: Error): boolean;
    readonly count: number;
}

export interface INode extends IErrorsContainer {
    readonly name: string;
    readonly parent: IGroup;
    readonly isRoot: boolean;
    readonly fullName: string;
    readonly context: IContext;
    readonly status: NodeStatus;
    readonly elapsed: number;
    readonly passed: boolean;
    readonly finished: boolean;
    timeStart(): void;
    timeEnd(): void;
}

export interface IGroup extends INode {
    group(name: string, cb: invoke.Callback): void;
    before(cb: invoke.Callback): void;
    after(cb: invoke.Callback): void;
    test(name: string, cb: invoke.Callback, expect?: any): void;
    runBefores(): Promise<void>;
    runAfters(): Promise<void>;
    run(): Promise<void>;
}

export interface ITest extends INode {
    readonly result: any;
    run(): Promise<void>;
}

export interface IErrorsContainer {
    readonly errors: IErrorTracker;
}

export type ContextStatus =
    "definition" | "execution" | "results";
export const Definition: ContextStatus = "definition";
export const Execution: ContextStatus = "execution";
export const Results: ContextStatus = "results";

export type NodeStatus =
    "definition" | "preparation" | "execution" | "cleanup" | "results";
export const Preparation: NodeStatus = "preparation";
export const Cleanup: NodeStatus = "cleanup";


export interface IContext {
    readonly name: string;
    readonly stage: ContextStatus;
    readonly rootGroup: IGroup;
    readonly currentGroup: IGroup;
    readonly currentTest: ITest;
    readonly errors: IErrorTracker;

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
