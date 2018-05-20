# testnow

Minimalistic testing framework

```shell
    npm install testnow
```

This framework doesn't have any CLI, only programmatic API.

Setting up some tests:

```typescript
import test from "testnow";

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

```

And running:
```typescript
test.run().then(result => {
    console.log(result.report);
});
```
