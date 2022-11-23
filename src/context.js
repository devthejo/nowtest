const { default: Deferred } = require("npdefer")
const TGroup = require("./group")
const invoke = require("./invoke")
const traverse = require("./traverse")

class TContext {
  constructor(name, options = {}) {
    this._name = name
    this._rootGroup = new TGroup(this, null, name, null)

    this.currentTest = null
    this.isDefining = true
    this.isExecuting = false
    this.isFinished = false

    this.currentGroup = this._rootGroup

    this.definitionsWereExecuted = false

    this.definitionStarted = new Deferred()
    this.lastDefinedPromise = this.definitionStarted.promise
    this.definitionFinished = new Deferred()

    this.definitionErrors = []
    this.errors = []
    this.options = options
  }

  get name() {
    return this._name
  }

  get rootGroup() {
    return this._rootGroup
  }

  currentGroup

  currentTest

  get isDefinitionsOk() {
    return this.definitionsWereExecuted && this.definitionErrors.length === 0
  }

  assertDefinitionStage(msg) {
    if (!this.isDefining)
      throw new Error(msg || "Expected to be called only in definition stage")
  }

  assertExecutionStage(msg) {
    if (!this.isExecuting)
      throw new Error(msg || "Expected to be called only in execution stage")
  }

  assertResultsStage(msg) {
    if (!this.isFinished)
      throw new Error(
        msg || "Expected to be called only after execution is finished"
      )
  }

  onError = (error, options) => {
    if (this.isDefining) {
      this.definitionErrors.push(error)
    } else if (this.isExecuting) {
      this.errors.push(error)
    } else {
      throw error
    }
  }

  enqueueDefinition(grp) {
    this.assertDefinitionStage()
    const thisGroupDefinedPromise = this.lastDefinedPromise
      .then(() => {
        this.assertDefinitionStage()
        return grp.definition()
      })
      .catch((error) => {
        this.definitionErrors.push(error)
      })
      .then(() => {
        if (this.lastDefinedPromise === thisGroupDefinedPromise) {
          this.definitionFinished.resolve()
        }
      })
    this.lastDefinedPromise = thisGroupDefinedPromise
  }

  runDefinitions(options) {
    return Promise.resolve()
      .then(() => {
        this.definitionStarted.resolve()
        return this.definitionFinished.promise
      })
      .then(() => {
        this.definitionsWereExecuted = true
      })
  }

  runTests(options) {
    return Promise.resolve().then(() => {
      this.currentGroup = this.rootGroup
      this.currentTest = null
      return this.rootGroup.run(options)
    })
  }

  run(options) {
    this.assertDefinitionStage()
    return this.runDefinitions(options).then(() => {
      this.isDefining = false
      if (this.isDefinitionsOk) {
        this.isExecuting = true
        return this.runTests(options).then(() => {
          this.isExecuting = false
          this.isFinished = true
        })
      }
      this.isExecuting = false
      this.isFinished = true
      return Promise.resolve()
    })
  }

  getResults() {
    this.assertResultsStage()
    let results
    results = {
      passed: false,
      name: this.name,
      definitionsOk: this.isDefinitionsOk,
      date: new Date().toString(),
      errors: null,
      tests: null,
      traverse: undefined,
    }
    Reflect.defineProperty(results, "traverse", {
      writable: true,
      configurable: true,
      enumerable: false,
      value: (options) => {
        traverse(results.tests, options)
      },
    })

    if (this.isDefinitionsOk) {
      results.errors = [...this.errors]
      results.tests = this.rootGroup.getResults()
    } else {
      results.errors = [...this.definitionErrors]
    }
    results.passed = results.errors.length === 0
    return results
  }

  getAPI() {
    const iapiMethod = (name, cb, expect = invoke.Any) => {
      this.currentGroup.test(name, cb, expect)
    }
    Object.assign(iapiMethod, {
      Falsy: invoke.Falsy,
      Truthy: invoke.Truthy,
      Any: invoke.Any,
      Deep: invoke.Deep,
    })
    iapiMethod.group = (name, cb) => {
      this.currentGroup.group(name, cb)
    }
    iapiMethod.before = (cb) => {
      this.currentGroup.before(cb)
    }
    iapiMethod.after = (cb) => {
      this.currentGroup.after(cb)
    }
    iapiMethod.run = (options) =>
      Promise.resolve()
        .then(() => this.run(options).then(() => this.getResults()))
        .catch((error) => {
          const res = {
            name: this.name,
            errors: [error, ...this.definitionErrors, ...this.errors],
            date: new Date().toString(),
            traverse: null,
            passed: false,
          }
          Reflect.defineProperty(res, "traverse", {
            writable: true,
            configurable: true,
            enumerable: false,
            value: (options) => {
              traverse(res.tests, options)
            },
          })
          return res
        })
    iapiMethod.context = (name) => {
      const context = new TContext(name)
      return context.getAPI()
    }

    return iapiMethod
  }
}

module.exports = TContext
