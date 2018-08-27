import { install } from "source-map-support";
install();

import test, { reporter } from ".";
test.run({ skip: /subsubgroup/ }).then(result => {
    reporter.plain({})(result);
});
