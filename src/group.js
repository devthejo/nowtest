const invoke = require("./invoke")
const TNode = require("./node")
const TTest = require("./test")

class TGroup extends TNode {
  constructor(context, parent, name, definition) {
    super(context, parent, name)
    this.groups = []
    this.tests = []
    this.befores = []
    this.afters = []
    this.definitionCallback = definition
  }

  definition = () => {
    this.context.assertDefinitionStage()
    this.context.currentGroup = this
    this.context.currentTest = null
    return invoke.invoke(this.definitionCallback, this.context.options)
  }

  group(name, cb) {
    this.context.assertDefinitionStage()
    if (this.groups.find((grp) => grp.name === name))
      throw new Error(
        `Test group with name '${name}' already exists within '${this.name}'`
      )

    const childGroup = new TGroup(this.context, this, name, cb)
    this.groups.push(childGroup)
    this.context.enqueueDefinition(childGroup)
    return childGroup
  }

  before(cb) {
    this.context.assertDefinitionStage()
    this.befores.push(cb)
  }

  after(cb) {
    this.context.assertDefinitionStage()
    this.afters.push(cb)
  }

  test(name, cb, expect) {
    this.context.assertDefinitionStage()
    this.tests.push(
      new TTest(
        this.runBeforesStack,
        this.runAftersStack,
        this.context,
        this,
        name,
        cb,
        expect
      )
    )
  }

  getResults(parent) {
    const results = super.getResults(parent)
    results.tests = this.tests.map((test) => test.getResults(results))
    results.groups = this.groups.map((group) => group.getResults(results))
    results.totalCount =
      results.tests.length +
      results.groups.reduce((n, grp) => n + grp.totalCount, 0)
    results.executedCount =
      results.tests.reduce((n, tst) => n + (tst.executed ? 1 : 0), 0) +
      results.groups.reduce((n, grp) => n + grp.executedCount, 0)
    results.passedCount =
      results.tests.reduce((n, tst) => n + (tst.passed ? 1 : 0), 0) +
      results.groups.reduce((n, grp) => n + grp.passedCount, 0)
    results.failedCount = results.executedCount - results.passedCount
    return results
  }

  runStart(options) {
    this.context.assertExecutionStage()
    if (
      (this.isRoot && this.context.currentGroup === this) ||
      this.context.currentGroup === this.parent
    ) {
      this.context.currentGroup = this
    } else {
      throw new Error(`Incorrect test tree traversal`)
    }
    return super.runStart(options)
  }

  runEnd(options) {
    this.context.currentGroup = this.parent
    return super.runEnd(options)
  }

  runMain(options = {}) {
    options = { ...this.context.options, ...options }
    return invoke.sequence(
      this.children.map((inode) => () => inode.run(options)),
      options
    )
  }

  get ownBeforesCallback() {
    return invoke.asCallback(this.befores)
  }

  get ownAftersCallback() {
    return invoke.asCallback(this.afters)
  }

  get children() {
    return [...this.tests, ...this.groups]
  }

  /** Lists parent groups of this one from itself to root */
  compositionList() {
    const result = []
    let it = this
    while (it) {
      result.push(it)
      it = it.parent
    }
    return result
  }

  runBeforesStack = () => {
    const cbs = this.compositionList()
      .reverse() // Since we should first call most outer befores
      .map((group) => group.ownBeforesCallback)
    return invoke.sequence(cbs, this.context.options)
  }

  runAftersStack = () => {
    const cbs = this.compositionList().map((igroup) => igroup.ownAftersCallback)
    return invoke.sequence(cbs, this.context.options)
  }
}

module.exports = TGroup
