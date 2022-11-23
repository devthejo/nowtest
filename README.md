# nowtest

Minimalistic testing framework

based on [testnow](https://github.com/hyperkot/testnow/)

```shell
    npm install nowtest
```

This framework doesn't have any CLI, only programmatic API.  
It's designed to be cross-platform and to be able to be
integrated with any build / CICD / deployment tools.

## Setting up / describing tests

```js
const nowtest = require("nowtest");

const test = nowtest()

function mySetImmediate(cb: () => void) {
    return setTimeout(cb, 0);
}

test.group("mySetImmediate", () => {
    test("Executes callback", (end: test.Handler) =>
        mySetImmediate(() => end()));

    test("May be cancelled with clearTimeout", (end: test.Handler) => {
        let timeoutId = mySetImmediate(
            () => end(new Error(`Callback executed`))
        );
        clearTimeout(timeoutId);
        setTimeout(() => end(), 100);
    });
});
```

## Executing tests
### nodejs

```js
const nowtest = require("nowtest");

const test = nowtest()

require("./mySetImmediate");
const util  = require("util");

test.run().then(result => {
    console.log(util.inspect(result, true, 10, true));
});
```

Several simple reporters are now built in `nowtest`. Reporter is simply a function that
takes test results and does something with them. Usually reporters output the results somewhere.
Right now there are 4 simple reporter types: `plain` - using the most basic and cross-platform
`console.log` functionality, `console` and `terminal` - are similar to `plain` for now,
`dom` - inserts a html-formatted report as `innerHTML` into a given dom-node. The `reporter`
export provided by `nowtest` contains not reporters themselves, but reporter creators,
functions that have optional reporter-options object as a parameter and return a reporter.
We could rewrite the above example using a simple built-in reporter which just logs results
to the console:

```js
const nowtest  = require("nowtest");
const {reporter}  = nowtest;

require("./mySetImmediate");

test.run().then(result => {
    reporter.plain({})(result);
});
```
