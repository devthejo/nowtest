import test from "../index";

function mySetImmediate(cb: () => void) {
    return setTimeout(cb, 0);
}

test.group("mySetImmediate", () => {

    test("Executes callback", (resolve: (x?: any) => void) =>
        mySetImmediate(() => resolve()));

    test("May be cancelled with clearTimeout", (resolve, reject) => {
        let timeoutId = mySetImmediate(() => reject(new Error(`Callback executed`)));
        clearTimeout(timeoutId);
        setTimeout(() => resolve(true), 100);
    });

});

