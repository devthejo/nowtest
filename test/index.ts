import test from "../index";
import { install } from "source-map-support";
install();

test.run().then(result => {
    console.log(result);
});
