const TContext = require("./src/context")

const reporter = require("./src/reporter")

module.exports = (options, name="Tests") => {
  const context = new TContext(name, options)
  return context.getAPI()
}
module.exports.reporter = reporter
