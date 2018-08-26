# testnow

Minimalistic testing framework

```shell
    npm install testnow
```

This framework doesn't have any CLI, only programmatic API.  
It's designed to be cross-platform and to be able to be
integrated with any build / CICD / deployment tools.

Examples are in typescript.

## Setting up / describing tests

```typescript
import test from "testnow";

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

```typescript
import test from "testnow";

import "./mySetImmediate";
import util from "util";

test.run().then(result => {
    console.log(util.inspect(result, true, 10, true));
});
```

Several simple reporters are now built in `testnow`. Reporter is simply a function that
takes test results and does something with them. Usually reporters output the results somewhere.
Right now there are 4 simple reporter types: `plain` - using the most basic and cross-platform
`console.log` functionality, `console` and `terminal` - are similar to `plain` for now,
`dom` - inserts a html-formatted report as `innerHTML` into a given dom-node. The `reporter`
export provided by `testnow` contains not reporters themselves, but reporter creators,
functions that have optional reporter-options object as a parameter and return a reporter.
We could rewrite the above example using a simple built-in reporter which just logs results
to the console:

```typescript
import test, {reporter} from "testnow";

import "./mySetImmediate";

test.run().then(result => {
    reporter.plain({})(result);
});
```

### browser

```typescript
import test, { reporter } from ".";

window.onload = () => {
    test.run().then(result => {
        reporter.dom({})(result);
    });
}
```

We should compile the code above into a `bundle.js` somehow, and then we can see the results
using following html:

```html
<html>

<head>
    <script src="bundle.js"></script>
</head>

<body>

</body>

</html>

```
