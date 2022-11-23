const ElapsedTimer = require("./elapsed-timer")

const FullNameDelimiter = "/"

class TNode {
  constructor(context, parent, name) {
    this._finished = false
    this._elapsed = 0
    this._executed = false
    this._skipped = false
    this.errors = []

    this._context = context
    this._parent = parent
    this._name = name
    this._elapsedTimer = new ElapsedTimer()

    if (!this.isRoot && this.context !== this.parent.context) {
      throw new Error(`Invalid context in ${this.name}`)
    }
  }

  get name() {
    return this._name
  }

  get parent() {
    return this._parent
  }

  get isRoot() {
    return this._parent === null
  }

  get context() {
    return this._context
  }

  get finished() {
    return this._finished
  }

  get elapsed() {
    return this._elapsed
  }

  get passed() {
    return this.finished && this.errors.length === 0
  }

  get executed() {
    return this._executed
  }

  get skipped() {
    return this._skipped
  }

  get fullName() {
    if (this.isRoot) {
      return this.name
    }
    return `${this.parent.fullName}${FullNameDelimiter}${this.name}`
  }

  skip = () => {
    this._skipped = true
    return Promise.resolve()
  }

  run = (options = {}) => {
    options = { ...this._context.options, ...options }
    if (
      (options.skip && options.skip.test(this.fullName)) ||
      (options.only && !options.only.test(this.fullName))
    ) {
      return this.skip()
    }
    return Promise.resolve()
      .then(() => this.runStart(options))
      .then(() => this.runMain(options))
      .catch((error) => this.onError(error, options))
      .then(() => this.runEnd(options))
  }

  getResults(parent = null) {
    return {
      name: this.name,
      fullName: this.fullName,
      parent,
      nestLevel: parent ? parent.nestLevel + 1 : 0,
      elapsed: this.elapsed,
      errors: [...this.errors],
      passed: this.passed,
      executed: this.executed,
      skipped: this.skipped,
    }
  }

  runStart() {
    this._elapsedTimer.start()
    this._executed = true
  }

  onError(error, options) {
    options = { ...this.context.options, ...options }
    this.errors.push(error)
    if (this.isRoot) {
      this.context.onError(error, options)
    } else {
      this.parent.onError(error, options)
    }
  }

  runMain(_options) {}

  runEnd() {
    this._elapsed = this._elapsedTimer.stop()
    this._finished = true
  }
}

module.exports = TNode
