import test from "..";

test.group("TestNow", () => {
    test("simple test with a callback doing nothing is ok", () => { });
    test.group("subgroup", () => {
        test("simple test in subgroup with a callback doing nothing is ok", () => { });
        test.group("subsubgroup", () => {
            test("simple test in subsubgroup with a callback doing nothing is ok", () => {});
        });
    });
});
