import { INode, IGroup, IContext, NodeStatus, Definition } from './interfaces';

import ElapsedTimer from './elapsed-timer';

class TNode implements INode {
    private _name: string;
    private _parent: IGroup;
    private _context: IContext;
    private elapsedTimer: ElapsedTimer;
    protected _status: NodeStatus;
    protected _passed: boolean;
    protected _finished: boolean;
    protected _elapsed: number = 0;

    get name() { return this._name; }
    get parent() { return this._parent; }
    get isRoot() { return this._parent === null; }
    get context() { return this._context; }
    get status() { return this._status; }
    get passed() { return this._passed; }
    get finished() { return this._finished; }
    get elapsed() { return this._elapsed; }

    get fullName() {
        if (this.isRoot) {
            return this.name;
        } else {
            return `${this.parent.fullName}${
                TNode.FullNameDelimiter
                }${this.name}`;
        }
    }

    get runCallback() { return () => void 0; }

    timeStart() {
        this.elapsedTimer.start();
    }
    timeEnd() {
        this._elapsed = this.elapsedTimer.stop();
    }

    constructor(context: IContext, parent: IGroup, name: string) {
        this._context = context;
        this._parent = parent;
        this._name = name;
        this.elapsedTimer = new ElapsedTimer();
        this._status = Definition;

        if (!this.isRoot && this.context !== this.parent.context) {
            throw new Error(`Invalid context in ${this.name}`);
        }
    }
}

namespace TNode {
    export const FullNameDelimiter = '/';
}

export default TNode;
