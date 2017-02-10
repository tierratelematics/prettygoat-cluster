import {ISnapshotRepository, Snapshot, Dictionary} from "prettygoat";
import {Observable} from "rx";

class MockSnapshotRepository implements ISnapshotRepository {

    initialize(): Rx.Observable<void> {
        return Observable.just(null);
    }

    getSnapshots(): Observable<Dictionary<Snapshot<any>>> {
        return undefined;
    }

    getSnapshot<T>(streamId: string): Observable<Snapshot<T>> {
        return undefined;
    }

    saveSnapshot<T>(streamId: string, snapshot: Snapshot<T>): Observable<void> {
        return undefined;
    }

    deleteSnapshot(streamId: string): Observable<void> {
        return undefined;
    }

}

export default MockSnapshotRepository