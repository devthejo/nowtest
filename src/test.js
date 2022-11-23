const invoke = require("./invoke")
const TNode = require("./node")

class TTest extends TNode {
  constructor(
    beforesStack,
    aftersStack,
    context,
    parent,
    name,
    cb,
    expect = invoke.Any
  ) {
    super(context, parent, name)
    this.cb = cb
    this.expect = expect
    this.executeSetup = beforesStack
    this.executeTeardown = aftersStack
  }

  getResults(parent = null) {
    return super.getResults(parent)
  }

  runTestCallback = (options = {}) =>
    invoke.invoke(this.cb, {
      ...this.context.options,
      ...options,
      expect: this.expect,
    })

  runStart() {
    this.context.currentTest = this
    return super.runStart()
  }

  runEnd() {
    this.context.currentTest = null
    return super.runEnd()
  }

  runMain(options) {
    return invoke.sequence(
      [this.executeSetup, this.runTestCallback, this.executeTeardown],
      { ...this.context.options, ...options }
    )
  }
}

module.exports = TTest
