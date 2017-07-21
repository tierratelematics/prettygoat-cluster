import {
    IReadModelNotifier,
    Event,
    IReadModelRetriever,
    IProjectionRegistry,
    IAsyncPublisher,
    IAsyncPublisherFactory,
    SpecialEvents,
    Dictionary
} from "prettygoat";
import {Observable, Subject} from "rxjs";
import {inject} from "inversify";
import ICluster from "./ICluster";
import {forEach, reduce, uniq, includes} from "lodash";
import {IProjectionRunner} from "../../prettygoat/scripts/projections/IProjectionRunner";
import RequestBuilder from "./web/RequestBuilder";

export class ClusteredReadModelNotifier implements IReadModelNotifier {

    private publisher: IAsyncPublisher<Event>;
    private localChanges = new Subject<Event>();
    private dependents: Dictionary<string[]> = {};

    constructor(@inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("ICluster") private cluster: ICluster,
                @inject("IAsyncPublisherFactory") asyncPublisherFactory: IAsyncPublisherFactory) {
        this.publisher = asyncPublisherFactory.publisherFor<Event>(<IProjectionRunner>{stats: {realtime: true}});
        this.publisher.items(item => item.payload).subscribe(change => {
            let readmodel = change.payload,
                dependents = this.dependents[change.payload] || this.dependentsFor(readmodel);
            this.dependents[readmodel] = dependents;
            if (this.cluster.handleOrProxyToAll(dependents, RequestBuilder.buildChannelMessage("readmodel/change", change))) {
                this.localChanges.next(change);
            }
        });
    }

    changes(name: string): Observable<Event> {
        return undefined;
    }

    notifyChanged(name: string, timestamp: Date) {
        this.publisher.publish({
            type: SpecialEvents.READMODEL_CHANGED,
            payload: name,
            timestamp: timestamp
        });
    }

    private dependentsFor(readmodel: string): string[] {
        return uniq(reduce(this.registry.projections(), (result, entry) => {
            let publishPoints = entry[1].publish;
            forEach(publishPoints, point => {
                if (point.readmodels && includes(point.readmodels.$list, readmodel))
                    result.push(entry[1].name);
            });
            return result;
        }, []));
    }

}

export class ClusteredReadModelRetriever implements IReadModelRetriever {

    constructor() {

    }

    modelFor<T>(name: string): Promise<T> {
        throw new Error("Method not implemented.");
    }

}
