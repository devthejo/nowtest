import {
    TestNowAPI,
    TestNowContext,
    TestNowResults,
    TestNowResultsGroup,
    TestNowResultsTest,
    TestNowAsyncHandler,
    TestNowResultsNode
} from "./src";

const initialContext = new TestNowContext("Tests");
const testNow = initialContext.getAPI();

namespace testNow {
    export type API = TestNowAPI;
    export type Results = TestNowResults;
    export type Handler = TestNowAsyncHandler;
    export type ResultsGroup = TestNowResultsGroup;
    export type ResultsTest = TestNowResultsTest;
    export type ResultsNode = TestNowResultsNode;
}

export default testNow;
