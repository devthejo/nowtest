import { ExternalAPI as TestNowAPI, IResult as TestNowResults, IGroupResult as TestNowResultsGroup, ITestResult as TestNowResultsTest, IResultNode as TestNowResultsNode, IReporter as TestNowReporter, IRunOptions as TestNowRunOptions, AsyncHandler as TestNowAsyncHandler } from "./src";
import reporter from "./src/reporter";
declare const testNow: TestNowAPI;
declare namespace testNow {
    type API = TestNowAPI;
    type Results = TestNowResults;
    type Handler = TestNowAsyncHandler;
    type ResultsGroup = TestNowResultsGroup;
    type ResultsTest = TestNowResultsTest;
    type ResultsNode = TestNowResultsNode;
    type Reporter = TestNowReporter;
    type Options = TestNowRunOptions;
}
export default testNow;
export { reporter };
