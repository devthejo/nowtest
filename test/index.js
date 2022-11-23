const nowtest = require("..");

const test = nowtest()

module.exports = {
  test
};

require("./self");
require("./mySetImmediate");

