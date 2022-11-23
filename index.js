const TContext = require("./src/context")

const reporter = require("./src/reporter")

module.exports = (options) => {
  const context = new TContext("Tests", options)
  return context.getAPI()
}
module.exports.reporter = reporter
