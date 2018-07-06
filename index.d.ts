import { TestNowAPI, TestNowResults, TestNowResultsGroup, TestNowResultsTest, TestNowAsyncHandler, TestNowResultsNode } from "./src";
declare const testNow: TestNowAPI;
declare namespace testNow {
    type API = TestNowAPI;
    type Results = TestNowResults;
    type Handler = TestNowAsyncHandler;
    type ResultsGroup = TestNowResultsGroup;
    type ResultsTest = TestNowResultsTest;
    type ResultsNode = TestNowResultsNode;
}
export default testNow;
