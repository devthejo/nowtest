import invoke from './invoke';
import { IResult } from './result';
export * from './result';

export interface INode {
    readonly name: string;
    readonly parent: IGroup;
    readonly isRoot: boolean;
    readonly fullName: string;
    readonly context: IContext;
    readonly errors: IErrorTracker;
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
    readonly passed: boolean;
    run(): Promise<void>;
}

export interface RegisteredError extends Error {
    timestamp: number;
    index: number;
    stage?: ContextStage;
    nodeName?: string;
    contextName?: string;
}

export interface IErrorTracker {
    add(error: Error): RegisteredError;
    create(message: string): RegisteredError;
    list(): RegisteredError[];
    has(error: Error): boolean;
    readonly count: number;
}

export type ContextStage =
    "definition"
    | "execution"
    | "results";
export const ContextDefinition: ContextStage = "definition";
export const ContextExecution: ContextStage = "execution";
export const ContextResults: ContextStage = "results";

export type TestStage =
    "definition"
    | "preparation"
    | "execution"
    | "cleanup"
    | "results";
export const TestDefinitionStage: TestStage = "definition";
export const TestPreparationStage: TestStage = "preparation";
export const TestExecutionStage: TestStage = "execution";
export const TestCleanupStage: TestStage = "cleanup";
export const TestResultsStage: TestStage = "results";

export interface IContext {
    readonly name: string;
    stage: ContextStage;
    rootGroup: IGroup;
    currentGroup: IGroup;
    currentTest: ITest;
    readonly errors: IErrorTracker;
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
