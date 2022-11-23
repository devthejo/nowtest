function logTests(results) {
  results.traverse({
    test(result) {
      if (!result.skipped) {
        console.log(
          `${"  ".repeat(result.nestLevel)}- ${result.name}: ${
            result.passed ? "PASSED" : "FAILED"
          } (in ${result.elapsed} ms)`
        );
      }
    },
    group(result) {
      if (!result.skipped) {
        console.log(
          `${"  ".repeat(result.nestLevel)} [ ${result.name} ] (${
            result.passedCount
          }/${result.totalCount})`
        );
      }
      return result.skipped;
    }
  });
}

function createReporter(options = {}) {
  return function(results) {
    const testsOk = !results.errors.length;
    console.log(`@ ${results.date}`);

    if (testsOk) {
      console.log(`${results.name} passed.`);
      logTests(results);
    } else {
      console.log(`${results.name} tests failed!!`);
      if (results.definitionsOk) {
        logTests(results);
      }
      console.log(`=== ${results.errors.length} Errors:`);
      results.errors.forEach((error, i) => {
        console.log(`--- ${i}. ${error.stack}`);
      });
    }

    return testsOk;
  };
}

module.exports = createReporter;
