class ElapsedTimer {
    constructor(){
        this.startedAt = 0;
    }
    get isStarted() { return this.startedAt !== 0; }
    start() {
        if (this.isStarted)
            throw new Error(`ElapsedTimer: timer is already started.`);
        this.startedAt = Date.now();
    }
    stop() {
        if (!this.isStarted)
            throw new Error(`ElapsedTimer: timer was not started.`);
        const now = Date.now();
        const result = now - this.startedAt;
        this.startedAt = 0;
        return result;
    }
}

module.exports = ElapsedTimer;
