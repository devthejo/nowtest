
function invoke(
    cb: invoke.Callback,
    options: invoke.Options = {}
): Promise<any> {
    let timeout = options.timeout || 20000;
    let expect = ("expect" in options) ? options.expect : invoke.Any;

    let timeoutId: any = null;
    return new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
            timeoutId = null;
            reject(new Error(`Timeout: ${timeout}`));
        }, timeout);
        switch (cb.length) {
            case 0:
                resolve((cb as invoke.CallbackNoArgs)());
                break;
            case 1:
                (cb as invoke.CallbackResolve)(resolve);
                break;
            case 2:
                (cb as invoke.CallbackPromise)(resolve, reject);
                break;
            default:
                throw new Error(`Invalid callback provided: ${cb.toString()}`);
        }
    }).catch(failure => (failure instanceof Error)
        ? failure
        : new Error(`${failure}`)
    ).then(result => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        return invoke.assert(result, expect);
    });
}

namespace invoke {
    export interface Options {
        expect?: any;
        timeout?: number;
    }

    export type CallbackNoArgs =
        () => Promise<any> | any;

    export type CallbackResolve =
        (resolve: (x?: any) => void) => any | Promise<any>;

    export type CallbackPromise =
        (
            resolve: (x?: any) => void,
            reject: (err?: Error | any) => void
        ) => any | Promise<any>;

    export type Callback =
        CallbackNoArgs
        | CallbackPromise
        | CallbackResolve;

    export const Any = Symbol();
    export const Truthy = Symbol();
    export const Falsy = Symbol();

    namespace sequence {
        export interface Options {
            timeout?: number;
            recover?: boolean;
            onError?: (error: Error) => void;
        }
    }
    /**
     * Executes sequence of possibly asynchronous callbacks
     * */
    export function sequence(
        cbs: Callback[],
        options: sequence.Options = {}
    ) {
        const timeout = options.timeout || 20000;
        const recover = options.recover || false;
        const onError = options.onError || (() => undefined);

        let queue = [...cbs];
        return new Promise<boolean>((resolve, reject) => {
            let noFails = true;
            function handleError(error: Error) {
                noFails = false;
                onError(error);
                if (recover) {
                    Promise.resolve().then(next).catch(handleError);
                } else {
                    reject(error);
                }
            }
            function next(prevResult?: any) {
                if (!queue.length) {
                    resolve(noFails);
                } else {
                    let cb = queue.shift();
                    invoke(cb, { timeout }).then(next).catch(handleError);
                }
            };
            Promise.resolve().then(next).catch(handleError);
        });
    }

    export function assert(factual: any, expected: any) {
        if (factual instanceof Error) {
            throw factual;
        }
        if (expected !== invoke.Any) {
            if (expected === invoke.Truthy && !factual) {
                throw new Error(`Expectation failed: expected TRUTHY, got: ${factual}`);
            } else if (expected === invoke.Falsy && !!factual) {
                throw new Error(`Expectation failed: expected FALSY, got: ${factual}`);
            } else if (factual !== expected) {
                throw new Error(`Expectation failed: expected ${expected}, got: ${factual}`);
            }
        }
        return factual;
    }
}

export default invoke;
