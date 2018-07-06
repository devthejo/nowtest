import test from "../index";

import "./mySetImmediate";
import util from "util";

test.run().then(result => {
    console.log(util.inspect(result, true, 10, true));
    /*result.traverse({
        group(g) {
            const indent = "  ".repeat(g.path.length);
            console.log(`${indent}[ ${g.name} ]: (${g.passed}/${g.total}) T: ${g.elapsed} ms`);
        },
        test(t) {
            const indent = "  ".repeat(t.path.length);
            let elapsed = "";
            if (t.elapsed > 50) {
                elapsed = `(${t.elapsed} ms)`;
            }
            console.log(`${indent} - ${t.name}${elapsed}: ${t.passed ? "OK" : "FAILED"} `);
            if (t.errors) {
                t.errors.forEach(error => console.error(`${indent}${error.stack}`));
            }
        }
    });*/
    /*result.errors.forEach(error => {
        console.error(error);
    });*/
});
