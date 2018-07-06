import { INode, IGroup, IContext } from './interfaces';

import ElapsedTimer from './elapsed-timer';
import { IGroupResult, IResultNode } from './result';

class TNode implements INode {
    private _name: string;
    private _parent: IGroup & TNode;
    private _context: IContext;
    protected _elapsedTimer: ElapsedTimer;

    protected _finished: boolean = false;
    protected _elapsed: number = 0;
    protected _executed: boolean = false;

    readonly errors: Error[] = [];

    get name() { return this._name; }
    get parent() { return this._parent; }
    get isRoot() { return this._parent === null; }
    get context() { return this._context; }
    get finished() { return this._finished; }
    get elapsed() { return this._elapsed; }
    get passed() { return this.finished && this.errors.length === 0; }
    get executed() { return this._executed; }

    get fullName(): string {
        if (this.isRoot) {
            return this.name;
        } else {
            return `${this.parent.fullName}${
                TNode.FullNameDelimiter
                }${this.name}`;
        }
    }

    constructor(context: IContext, parent: IGroup & TNode, name: string) {
        this._context = context;
        this._parent = parent;
        this._name = name;
        this._elapsedTimer = new ElapsedTimer();

        if (!this.isRoot && this.context !== this.parent.context) {
            throw new Error(`Invalid context in ${this.name}`);
        }
    }

    run = () => {
        return Promise.resolve()
            .then(() => this.runStart())
            .then(() => this.runMain())
            .catch(error => this.onError(error))
            .then(() => this.runEnd());
    };

    getResults(parent: IGroupResult = null): IResultNode {
        return {
            name: this.name,
            fullName: this.fullName,
            parent,
            nestLevel: parent ? (parent.nestLevel + 1) : 0,
            elapsed: this.elapsed,
            errors: [...this.errors],
            passed: this.passed,
            executed: this.executed
        };
    }

    protected runStart() {
        this._elapsedTimer.start();
        this._executed = true;
    }

    protected onError(error: Error) {
        this.errors.push(error);
        if (this.isRoot) {
            this.context.onError(error)
        } else {
            this.parent.onError(error);
        }
    }

    protected runMain() {

    }

    protected runEnd() {
        this._elapsed = this._elapsedTimer.stop();
        this._finished = true;
    }
}

namespace TNode {
    export const FullNameDelimiter = '/';
}

export default TNode;
