import test from "../index";
import { install } from "source-map-support";
install();

function mySetImmediate(cb: () => void) {
    return setTimeout(cb, 0);
}

test.group("mySetImmediate", () => {

    test("Executes callback", (resolve: (x: any) => void) =>
        mySetImmediate(() => resolve(true)));
    
    test("May be cancelled with clearTimeout", (resolve, reject) => {
        let timeoutId = mySetImmediate(() => reject(new Error(`Callback executed`)));
        clearTimeout(timeoutId);
        setTimeout(() => resolve(true), 100);
    });
    
});

test.run().then(result => {
    console.log(result.report);
});
