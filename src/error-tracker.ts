import { RegisteredError, IErrorTracker, IContext, INode } from './interfaces';

class ErrorTracker implements IErrorTracker {
    private errors: Set<RegisteredError> = new Set();
    private _context: IContext;
    private _node: INode;
    private get context() { return this._context; }
    private get node() { return this._node; }
    constructor(context?: IContext, node?: INode) {
        this._node = node;
        this._context = context;
    }
    public add(error: Error) {
        const registered = error as RegisteredError;
        if (!this.errors.has(registered)) {
            this.errors.add(registered);
            if (this === ErrorTracker.global) {
                registered.index = this.errors.size;
                registered.timestamp = Date.now();
            } else {
                ErrorTracker.global.add(registered);
            }
            if (this.context) {
                if (this === this.context.errors) {
                    if (!registered.stage) {
                        registered.stage = this.context.stage;
                        registered.contextName = this.context.name;
                    }
                } else {
                    this.context.errors.add(registered);
                }
            }
            if (this.node) {
                if (this === this.node.errors) {
                    if (!registered.nodeName) {
                        registered.nodeName = this.node.fullName;
                    }
                }
                if (this.node.parent) {
                    this.node.parent.errors.add(registered);
                }
            }
        }
        
        return registered;
    }
    public create(message: string) {
        return this.add(new Error(message));
    }
    public list() {
        let result = [...this.errors.values()];
        result.sort((a, b) => {
            return b.index - a.index;
        });
        return result;
    }
    has(error: Error) {
        return this.errors.has(error as RegisteredError);
    }
    get count() {
        return this.errors.size;
    }
}

namespace ErrorTracker {
    export const global = new ErrorTracker();
}

export default ErrorTracker;
