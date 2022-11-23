const { test } = require(".");
const { reporter } = require("..");

test.run({ skip: /subsubgroup/ }).then(result => {
    reporter.plain({})(result);
});
