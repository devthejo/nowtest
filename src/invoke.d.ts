declare function invoke(cb: invoke.Callback, options?: invoke.Options): Promise<any>;
declare namespace invoke {
    interface Options {
        expect?: any;
        timeout?: number;
    }
    interface AsyncHandler {
        (result?: Error | any): void;
        wrap(cb: Function): Function;
    }
    function createAsyncHandler(resolve: (x?: any | Error) => void): AsyncHandler;
    interface WrapOptions {
        context?: any;
    }
    type CallbackNoArgs = () => Promise<any> | any;
    type CallbackWithHandler = (handler: AsyncHandler) => any | Promise<any>;
    type Callback = CallbackNoArgs | CallbackWithHandler;
    const Any: unique symbol;
    const Truthy: unique symbol;
    const Falsy: unique symbol;
    /**
     * Executes sequence of possibly asynchronous callbacks
     * */
    function sequence(cbs: Callback[], options?: sequence.Options): Promise<void>;
    namespace sequence {
        interface Options {
            timeout?: number;
        }
        function asCallback(cbs: Callback[], options?: sequence.Options): Callback;
    }
    function assert(factual: any, expected: any): any;
}
export default invoke;
