import {Subject, Observable} from "rx";
import {injectable} from "inversify";
import {IReadModelFactory, Event, IWhen} from "prettygoat";

@injectable()
class MockReadModelFactory implements IReadModelFactory {

    private subject: Subject<Event>;

    constructor() {
        this.subject = new Subject<Event>();
    }

    publish(event: Event): void {
        this.subject.onNext(event);
    }

    asList(): any[] {
        return [];
    }

    from(lastEvent: Date, completions?: Rx.Observable<string>, definition?: IWhen<any>): Observable<Event> {
        return this.subject;
    }

}

export default MockReadModelFactory