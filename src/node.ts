import { INode, IGroup, IContext } from './interfaces';
import ErrorTracker from './error-tracker';

class TNode implements INode {
    private _name: string;
    private _parent: IGroup;
    private _context: IContext;
    private _errors: ErrorTracker;

    get name() { return this._name; }
    get parent() { return this._parent; }
    get isRoot() { return this._parent === null; }
    get context() { return this._context; }
    get errors() { return this._errors; }
    get fullName() {
        if (this.isRoot) {
            return this.name;
        } else {
            return `${this.parent.fullName}${
                TNode.FullNameDelimiter
                }${this.name}`;
        }
    }

    constructor(context: IContext, parent: IGroup, name: string) {
        this._context = context;
        this._parent = parent;
        this._name = name;
        this._errors = new ErrorTracker(this.context, this);

        if (!this.isRoot && this.context !== this.parent.context) {
            throw new Error(`Invalid context in ${this.name}`);
        }
    }
}

namespace TNode {
    export const FullNameDelimiter = '/';
}

export default TNode;
