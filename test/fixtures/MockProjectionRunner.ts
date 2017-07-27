import {IProjectionRunner, ProjectionStats, Snapshot} from "prettygoat";

class MockProjectionRunner<T> implements IProjectionRunner<T> {
    closed = false;
    state: T;
    stats = new ProjectionStats();

    constructor() {
    }

    notifications() {
        return null;
    }

    run(snapshot?: Snapshot<T>): void {

    }

    stop(): void {
    }

    pause(): void {
    }

    resume(): void {
    }

    unsubscribe(): void {

    }

}

export default MockProjectionRunner
