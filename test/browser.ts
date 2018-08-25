import test, { reporter } from ".";

window.onload = () => {
    test.run().then(result => {
        reporter.dom({})(result);
    });
}
