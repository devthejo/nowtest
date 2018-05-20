import test from "../index";
import { install } from "source-map-support";
install();

import "./mySetImmediate";

test.run().then(result => {
    console.log(result);
});
