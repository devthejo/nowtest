# testnow

Minimalistic testing framework

```shell
    npm install testnow
```

This framework doesn't have any CLI, only programmatic API.  
It's designed to be cross-platform and to be able to be
integrated with any CICD / deployment tools.

If you ever looked at 1.x - forget about it. 2.x is a completely rewritten
and now has relatively clean design which is to stay.

Currently only the most essential core functionality is implemented.
A decent readme, docs and examples along with advanced features like
disabling certain tests is coming... someday)

## Setting up tests

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
```typescript
import test from "testnow";

import "./mySetImmediate";
import util from "util";

test.run().then(result => {
    console.log(util.inspect(result, true, 10, true));
});
```
