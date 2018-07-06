import test from "..";

function mySetImmediate(cb: () => void) {
    return setTimeout(cb, 0);
}

test.group("mySetImmediate", () => {
    test("Executes callback", (resolve: test.Handler) =>
        mySetImmediate(() => resolve()));

    test("May be cancelled with clearTimeout", (resolve: test.Handler) => {
        let timeoutId = mySetImmediate(
            () => resolve(new Error(`Callback executed`))
        );
        clearTimeout(timeoutId);
        setTimeout(() => resolve(), 100);
    });
});

