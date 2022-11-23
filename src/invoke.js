const { deepEqual } = require("fast-equals")
const _jss = require("json-stringify-safe")

function jss(x) {
  return _jss(x, null, 2)
}

function createAsyncHandler(resolve) {
  const handler = function (res) {
    resolve(res)
  }
  handler.wrap = function (cb, options = {}) {
    const context = options.context || null
    return function (...args) {
      let result
      try {
        result = cb.apply(context || this, args)
        return result
      } catch (err) {
        resolve(err)
      }
    }
  }
  return handler
}

function invoke(cb, options = {}) {
  const timeout = options.timeout || 20000
  const expect = "expect" in options ? options.expect : Any

  let timeoutId = null
  return new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      timeoutId = null
      reject(new Error(`Timeout: ${timeout}`))
    }, timeout)
    let cbReturned
    switch (cb.length) {
      case 0:
        cbReturned = cb()
        if (cbReturned instanceof Promise) {
          cbReturned.then(resolve).catch(reject)
        } else {
          resolve(cbReturned)
        }
        break
      case 1:
        cbReturned = cb(createAsyncHandler(resolve))
        // If a promise is returned - then passed aasync handler
        // is used only as utility and real test completion depends
        // on the returned promise.
        if (cbReturned instanceof Promise) {
          cbReturned.then(resolve).catch(reject)
        }
        // Otherwise we expect the async operation to be resolved
        // with an async handler call
        break
      default:
        throw new Error(`Invalid callback provided: ${cb.toString()}`)
    }
  })
    .catch((failure) =>
      failure instanceof Error
        ? // Turn all failures into an resolution with an error argument
          failure
        : new Error(`${failure}`)
    )
    .then((result) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      // Rethrow errors, otherwise check the expectation, and if it fails -
      // - throw an appropriate error too
      return assert(result, expect)
    })
}

const Any = Symbol("Any")
const Truthy = Symbol("Truthy")
const Falsy = Symbol("Falsy")
const Deep = (x) => {
  const fn = (v) => deepEqual(x, v)
  fn.expect = x
  return fn
}

function assert(factual, expected) {
  if (factual instanceof Error) {
    throw factual
  }
  if (expected !== Any) {
    if (expected === Truthy) {
      if (!factual) {
        throw new Error(
          `Expectation failed: expected TRUTHY, got: ${jss(factual)}`
        )
      }
    } else if (expected === Falsy) {
      if (factual) {
        throw new Error(
          `Expectation failed: expected FALSY, got: ${jss(factual)}`
        )
      }
    } else if (typeof expected === "function" && expected.expect) {
      if (!expected(factual)) {
        throw new Error(
          `Expectation failed: expected ${jss(expected.expect)}, got: ${jss(
            factual
          )}`
        )
      }
    } else if (factual !== expected) {
      throw new Error(
        `Expectation failed: expected ${jss(expected)}, got: ${jss(factual)}`
      )
    }
  }
  return factual
}

/**
 * Executes sequence of possibly asynchronous callbacks
 * */
function sequence(cbs, options = {}) {
  const queue = [...cbs]
  return new Promise((resolve, reject) => {
    function next() {
      if (!queue.length) {
        resolve()
      } else {
        const cb = queue.shift()
        invoke(cb, options).then(next).catch(reject)
      }
    }
    Promise.resolve().then(next).catch(reject)
  })
}

function asCallback(cbs, options) {
  return function () {
    if (cbs.length) {
      return sequence(cbs, options)
    }
  }
}

module.exports = {
  Any,
  Truthy,
  Falsy,
  Deep,
  invoke,
  asCallback,
  sequence,
}
