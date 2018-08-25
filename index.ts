import {
    ExternalAPI as TestNowAPI,
    TContext as TestNowContext,
    IResult as TestNowResults,
    IGroupResult as TestNowResultsGroup,
    ITestResult as TestNowResultsTest,
    IResultNode as TestNowResultsNode,
    IReporter as TestNowReporter,
    IRunOptions as TestNowRunOptions,
    AsyncHandler as TestNowAsyncHandler
} from "./src";

import reporter from "./src/reporter";

const initialContext = new TestNowContext("Tests");
const testNow = initialContext.getAPI();

namespace testNow {
    export type API = TestNowAPI;
    export type Results = TestNowResults;
    export type Handler = TestNowAsyncHandler;
    export type ResultsGroup = TestNowResultsGroup;
    export type ResultsTest = TestNowResultsTest;
    export type ResultsNode = TestNowResultsNode;
    export type Reporter = TestNowReporter;
    export type Options = TestNowRunOptions;
}

export default testNow;

export {
    reporter
}
