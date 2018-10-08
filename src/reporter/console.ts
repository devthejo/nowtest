import { IResult, IReporter } from "..";

function logTests(results: IResult) {
    results.traverse({
        test(result) {
            if (!result.skipped) {
                console.log(`${"  ".repeat(result.nestLevel)}- ${
                    result.name
                    }: ${result.passed ? "PASSED" : "FAILED"} (in ${result.elapsed} ms)`);
            }
        },
        group(result) {
            if (!result.skipped) {
                console.log(`${"  ".repeat(result.nestLevel)} [ ${
                    result.name
                    } ] (${result.passedCount}/${result.totalCount})`);
            }
            return result.skipped;
        }
    });
}

function createReporter(options: createReporter.Options = {}): IReporter {
    return function (results: IResult) {
        const testsOk = !results.errors.length;
        console.log(`@ ${results.date}`);

        if (testsOk) {
            console.log(`${results.name} passed.`);
            logTests(results);
        } else {
            console.log(`${results.name} tests failed!!`);
            if (results.definitionsOk) {
              logTests(results);
            } else {
              console.log(`Definitions failed!`);
            }
            console.log(`=== ${results.errors.length} Errors:`);
            results.errors.forEach((error: Error, i: number) => {
                console.log(`--- ${i}. ${error.stack}`);
            });
        }

        return testsOk;
    }
}

namespace createReporter {
    export interface Options {
    }
}

export default createReporter;
