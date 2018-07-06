import TContext from "./context";
import invoke from "./invoke";
import { IResult, IGroupResult, ITestResult, IResultNode } from "./result";
import { ExternalAPI } from "./interfaces";
declare type AsyncHandler = invoke.AsyncHandler;
export { ExternalAPI as TestNowAPI, TContext as TestNowContext, IResult as TestNowResults, IGroupResult as TestNowResultsGroup, ITestResult as TestNowResultsTest, IResultNode as TestNowResultsNode, AsyncHandler as TestNowAsyncHandler };
