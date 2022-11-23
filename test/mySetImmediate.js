const {test} = require(".");

function mySetImmediate(cb) {
    return setTimeout(cb, 0);
}

test.group("mySetImmediate", () => {
    test("Executes callback", (resolve) =>
        mySetImmediate(() => resolve()));

    test("May be cancelled with clearTimeout", (resolve) => {
        let timeoutId = mySetImmediate(
            () => resolve(new Error(`Callback executed`))
        );
        clearTimeout(timeoutId);
        setTimeout(() => resolve(), 100);
    });
});

