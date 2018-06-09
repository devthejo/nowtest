import { IContext, ContextStatus, ExternalAPI } from "./interfaces";
import TGroup from './group';
import TTest from './test';


class TContext implements IContext {
    private _name: string;
    private _stage: ContextStatus;
    private _currentGroup: TGroup;
    private _currentTest: TTest;
    private _rootGroup: TGroup;
    
    get name() { return this._name; }
    get stage() { return this._stage; }
    get rootGroup() { return this._rootGroup; }
    get currentGroup() { return this._currentGroup; }
    get currentTest() { return this._currentTest; }
    
    assertDefinitionStage(msg?: string): void;
    assertExecutionStage(msg?: string): void;
    assertResultsStage(msg?: string): void;

    enqueueGroupDefinition(cb: invoke.Callback): void;
    readonly definitionsDone: Promise<void>;
    getAPI(): ExternalAPI;
}

export default TContext
