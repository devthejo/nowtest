declare class ElapsedTimer {
    private startedAt;
    readonly isStarted: boolean;
    start(): void;
    stop(): number;
}
export default ElapsedTimer;
