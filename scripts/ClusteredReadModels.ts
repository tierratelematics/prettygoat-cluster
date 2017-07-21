import {
    IReadModelNotifier,
    Event,
    IReadModelRetriever,
    IProjectionRegistry,
    IAsyncPublisher,
    IAsyncPublisherFactory
} from "prettygoat";
import {Observable} from "rxjs";
import {inject} from "inversify";
import ICluster from "./ICluster";

export class ClusteredReadModelNotifier implements IReadModelNotifier {

    constructor(@inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("ICluster") private cluster: ICluster,
                @inject("IAsyncPublisherFactory") private asyncPublisherFactory: IAsyncPublisherFactory) {

    }

    changes(name: string): Observable<Event> {
        return undefined;
    }

    notifyChanged(name: string, timestamp: Date) {
    }

}

export class ClusteredReadModelRetriever implements IReadModelRetriever {

    constructor() {

    }

    modelFor<T>(name: string): Promise<T> {
        throw new Error("Method not implemented.");
    }

}
