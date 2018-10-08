import { deepEqual } from "fast-equals";

function invoke(
  cb: invoke.Callback,
  options: invoke.Options = {}
): Promise<any> {
  let timeout = options.timeout || 20000;
  let expect = "expect" in options ? options.expect : invoke.Any;

  let timeoutId: any = null;
  return new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      timeoutId = null;
      reject(new Error(`Timeout: ${timeout}`));
    }, timeout);
    let cbReturned: any | Promise<any>;
    switch (cb.length) {
      case 0:
        cbReturned = (cb as invoke.CallbackNoArgs)();
        if (cbReturned instanceof Promise) {
          cbReturned.then(resolve).catch(reject);
        } else {
          resolve(cbReturned);
        }
        break;
      case 1:
        cbReturned = (cb as invoke.CallbackWithHandler)(
          invoke.createAsyncHandler(resolve)
        );
        // If a promise is returned - then passed aasync handler
        // is used only as utility and real test completion depends
        // on the returned promise.
        if (cbReturned instanceof Promise) {
          cbReturned.then(resolve).catch(reject);
        }
        // Otherwise we expect the async operation to be resolved
        // with an async handler call
        break;
      default:
        throw new Error(`Invalid callback provided: ${cb.toString()}`);
    }
  })
    .catch(
      failure =>
        failure instanceof Error
          ? // Turn all failures into an resolution with an error argument
            failure
          : new Error(`${failure}`)
    )
    .then(result => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Rethrow errors, otherwise check the expectation, and if it fails -
      // - throw an appropriate error too
      return invoke.assert(result, expect);
    });
}

class Expect {
  constructor(protected expect: any) {}
  test(value: any) {
    return value === this.expect;
  }
}

class DeepExpect extends Expect {
  test(value: any) {
    return deepEqual(value, this.expect);
  }
}

namespace invoke {
  export interface Options {
    expect?: any;
    timeout?: number;
  }

  export interface AsyncHandler {
    (result?: Error | any): void;
    wrap(cb: Function): Function;
  }

  export function createAsyncHandler(resolve: (x?: any | Error) => void) {
    let handler = function(res?: Error | any) {
      resolve(res);
    };
    (handler as any).wrap = function(cb: Function, options: WrapOptions = {}) {
      const context = options.context || null;
      return function(this: any, ...args: any[]) {
        let result: any;
        try {
          result = cb.apply(context || this, args);
          return result;
        } catch (err) {
          resolve(err);
        }
      };
    };
    return handler as AsyncHandler;
  }

  export interface WrapOptions {
    context?: any;
  }

  export type CallbackNoArgs = () => Promise<any> | any;

  export type CallbackWithHandler = (
    handler: AsyncHandler
  ) => any | Promise<any>;

  export type Callback = CallbackNoArgs | CallbackWithHandler;

  export const Any = Symbol();
  export const Truthy = Symbol();
  export const Falsy = Symbol();
  export const Deep = (x: any) => new DeepExpect(x);

  /**
   * Executes sequence of possibly asynchronous callbacks
   * */
  export function sequence(cbs: Callback[], options: sequence.Options = {}) {
    const timeout = options.timeout || 20000;

    let queue = [...cbs];
    return new Promise<void>((resolve, reject) => {
      function next() {
        if (!queue.length) {
          resolve();
        } else {
          let cb = queue.shift();
          invoke(cb, { timeout })
            .then(next)
            .catch(reject);
        }
      }
      Promise.resolve()
        .then(next)
        .catch(reject);
    });
  }

  export namespace sequence {
    export interface Options {
      timeout?: number;
    }

    export function asCallback(
      cbs: Callback[],
      options?: sequence.Options
    ): Callback {
      return function() {
        if (cbs.length) {
          return sequence(cbs, options);
        }
      };
    }
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
      } else if (expected instanceof DeepExpect && !expected.test(factual)) {
        throw new Error(
          `Expectation failed: expected ${expected}, got: ${factual}`
        );
      } else if (factual !== expected) {
        throw new Error(
          `Expectation failed: expected ${expected}, got: ${factual}`
        );
      }
    }
    return factual;
  }
}

export default invoke;
