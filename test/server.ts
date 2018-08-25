import { install } from "source-map-support";
install();

import test, { reporter } from ".";
test.run().then(result => {
    reporter.plain({})(result);
});
