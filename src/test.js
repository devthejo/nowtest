const invoke = require('./invoke');
const TNode = require('./node');

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
        super(context, parent, name);
        this.cb = cb;
        this.expect = expect;
        this.executeSetup = beforesStack;
        this.executeTeardown = aftersStack;
    }

    getResults(parent = null) {
        return super.getResults(parent);
    }

    runTestCallback = () => {
        return invoke.invoke(this.cb, { expect: this.expect });
    }

    runStart(options) {
        this.context.currentTest = this;
        return super.runStart(options);
    }

    runEnd(options) {
        this.context.currentTest = null;
        return super.runEnd(options);
    }

    runMain(options) {
        return invoke.sequence([
            this.executeSetup,
            this.runTestCallback,
            this.executeTeardown
        ]);
    }
}

module.exports = TTest;
