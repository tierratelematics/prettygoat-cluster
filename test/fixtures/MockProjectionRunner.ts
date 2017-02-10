import {Subject, IObserver} from "rx";
import {IProjectionRunner, ProjectionStats, Snapshot, Dictionary, Event} from "prettygoat";

class MockProjectionRunner<T> implements IProjectionRunner<T> {
    state: T;
    stats = new ProjectionStats();
    private subject: Subject<Event>;

    constructor(data?: Subject<Event>) {
        this.subject = data;
    }

    notifications() {
        return this.subject;
    }

    run(snapshot?: Snapshot<T|Dictionary<T>>): void {

    }

    stop(): void {
    }

    pause(): void {
    }

    resume(): void {
    }

    dispose(): void {

    }

}

function isObserver<T>(observerOrOnNext: (Rx.IObserver<Event>) | ((value: Event) => void)): observerOrOnNext is IObserver<Event> {
    return (<IObserver<Event>>observerOrOnNext).onNext !== undefined;
}


export default MockProjectionRunner