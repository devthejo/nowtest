const TContext = require("./src/context");

const reporter = require("./src/reporter");

const initialContext = new TContext("Tests");
const testNow = initialContext.getAPI();

module.exports = {
    test: testNow,
    reporter
}
