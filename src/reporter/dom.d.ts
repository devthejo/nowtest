import { IReporter } from "..";
declare function createReporter(options?: createReporter.Options): IReporter;
declare namespace createReporter {
    interface Options {
        target?: Element;
        cssPrefix?: string;
    }
}
export default createReporter;
