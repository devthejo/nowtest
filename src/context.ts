import { IContext, ExternalAPI, IGroup, ITest, INode, IRunOptions } from "./interfaces";
import TGroup from './group';
import invoke from './invoke';
import { IResult, traverse, ResultTraverseOptions, ITestResult, IResultNode } from "./result";
import TTest from './test';

import Deferred from "npdefer";


class TContext implements IContext {
    
    get name() { return this._name; }
    get rootGroup() { return this._rootGroup; }
    currentGroup: IGroup;
    currentTest: ITest;

    private _name: string;
    private _rootGroup: IGroup;
    private definitionsWereExecuted: boolean = false;
    private isDefining: boolean = false;
    private isExecuting: boolean = false;
    private isFinished: boolean = false;

    private definitionErrors: Error[] = [];
    private errors: Error[] = [];
    get isDefinitionsOk() {
        return this.definitionsWereExecuted &&
            this.definitionErrors.length === 0;
    }


    

    constructor(name: string) {
        this._name = name;
        this._rootGroup = new TGroup(this, null, name, null);

        this.currentTest = null;
        this.isDefining = true;
        this.isExecuting = false;
        this.isFinished = false;

        this.currentGroup = this._rootGroup;
        this.currentTest = null;
    }

    assertDefinitionStage(msg?: string): void {
        if (!this.isDefining) throw new Error(
            msg || "Expected to be called only in definition stage"
        );
    }
    assertExecutionStage(msg?: string): void {
        if (!this.isExecuting) throw new Error(
            msg || "Expected to be called only in execution stage"
        );
    }
    assertResultsStage(msg?: string): void {
        if (!this.isFinished) throw new Error(
            msg || "Expected to be called only after execution is finished"
        );
    }

    onError = (error: Error) => {
        if (this.isDefining) {
            this.definitionErrors.push(error);
        } else {
            if (this.isExecuting) {
                this.errors.push(error);
            } else {
                throw error;
            }
        }
    }

    private definitionStarted = new Deferred();
    private lastDefinedPromise = this.definitionStarted.promise;
    private definitionFinished = new Deferred();
    enqueueDefinition(grp: IGroup): void {
        this.assertDefinitionStage();
        const thisGroupDefinedPromise = this.lastDefinedPromise
            .then(() => {
                this.assertDefinitionStage();
                return grp.definition();
            })
            .catch(error => {
                this.definitionErrors.push(error);
            }).then(() => {
                if (this.lastDefinedPromise === thisGroupDefinedPromise) {
                    this.definitionFinished.resolve();
                }
            });
        this.lastDefinedPromise = thisGroupDefinedPromise;
    }

    private runDefinitions() {
        return Promise.resolve().then(() => {
            this.definitionStarted.resolve();
            return this.definitionFinished.promise;
        }).then(() => {
            this.definitionsWereExecuted = true;
        });
    }
    private runTests() {
        return Promise.resolve().then(() => {
            this.currentGroup = this.rootGroup;
            this.currentTest = null;
            return this.rootGroup.run();
        });
    }

    run(options: IRunOptions = {}) {
        this.assertDefinitionStage();
        return this.runDefinitions().then(() => {
            this.isDefining = false;
            if (this.isDefinitionsOk) {
                this.isExecuting = true;
                return this.runTests().then(() => {
                    this.isExecuting = false;
                    this.isFinished = true;
                });
            } else {
                this.isExecuting = false;
                this.isFinished = true;
                return Promise.resolve();
            }
        })
    }

    getResults(): IResult {
        this.assertResultsStage();
        let results: IResult;
        results = {
            passed: false,
            name: this.name,
            definitionsOk: this.isDefinitionsOk,
            date: new Date().toString(),
            errors: null,
            tests: null,
            traverse: undefined
        };
        Reflect.defineProperty(results, "traverse", {
            writable: true,
            configurable: true,
            enumerable: false,
            value: (options: ResultTraverseOptions) => {
                traverse(results.tests, options);
            }
        });

        if (this.isDefinitionsOk) {
            results.errors = [...this.errors];
            results.tests = this.rootGroup.getResults();
        } else {
            results.errors = [...this.definitionErrors];
        }
        results.passed = results.errors.length === 0;
        return results;
    }

    getAPI(): ExternalAPI {
        let iapiMethod: ExternalAPI =
            ((name: string, cb: invoke.Callback, expect: any = invoke.Any) => {
                this.currentGroup.test(name, cb, expect);
            }) as any;
        Object.assign(iapiMethod, {
            Falsy: invoke.Falsy,
            Truthy: invoke.Truthy,
            Any: invoke.Any
        });
        iapiMethod.group = (name: string, cb: invoke.Callback) => {
            this.currentGroup.group(name, cb);
        };
        iapiMethod.before = (cb: invoke.Callback) => {
            this.currentGroup.before(cb);
        }
        iapiMethod.after = (cb: invoke.Callback) => {
            this.currentGroup.after(cb);
        }
        iapiMethod.run = (options?: IRunOptions) => {
            return Promise.resolve().then(() => {
                return this.run(options).then(() => {
                    return this.getResults();
                })
            }).catch((error) => {
                const res: IResult = {
                    name: this.name,
                    errors: [error, ...this.definitionErrors, ...this.errors],
                    date: new Date().toString(),
                    traverse: null,
                    passed: false
                };
                Reflect.defineProperty(res, "traverse", {
                    writable: true,
                    configurable: true,
                    enumerable: false,
                    value: (options: ResultTraverseOptions) => {
                        traverse(res.tests, options);
                    }
                });
                return res;
            });
        }
        iapiMethod.context = (name: string) => {
            let context = new TContext(name);
            return context.getAPI();
        }

        return iapiMethod;
    }
}

export default TContext
