import {
    IReadModelNotifier,
    Event,
    IReadModelRetriever,
    IProjectionRegistry,
    IAsyncPublisher,
    IAsyncPublisherFactory,
    SpecialEvents,
    Dictionary,
    IProjectionRunner
} from "prettygoat";
import {Observable, Subject} from "rxjs";
import {inject} from "inversify";
import ICluster from "./ICluster";
import {forEach, reduce, uniq, includes} from "lodash";
import MessageBuilder from "./MessageBuilder";

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
                dependents = this.dependents[change.payload] || this.dependantsFor(readmodel);
            this.dependents[readmodel] = dependents;
            forEach(dependents, dependent => {
                if (this.cluster.whoami() === this.cluster.lookup(dependent)) {
                    this.localChanges.next(change);
                } else {
                    this.cluster.send(dependent, MessageBuilder.requestFor("readmodel/change", change));
                }
            });
        });
    }

    changes(name: string): Observable<Event> {
        return this.cluster.requests()
            .filter(request => request[0].url === "pgoat://readmodel/change")
            .map(requestData => requestData[0].body)
            .filter(change => change.payload === name)
            .merge(this.localChanges);
    }

    notifyChanged(name: string, timestamp: Date) {
        this.publisher.publish({
            type: SpecialEvents.READMODEL_CHANGED,
            payload: name,
            timestamp: timestamp
        });
    }

    private dependantsFor(readmodel: string): string[] {
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

type CachedReadModel<T = any> = {
    timestamp: Date;
    payload: T;
}

export class ClusteredReadModelRetriever implements IReadModelRetriever {

    private readModelsChanges: Dictionary<Observable<Event>> = {};
    private latestTimestamps: Dictionary<Date> = {};
    private readModelsCache: Dictionary<CachedReadModel> = {};

    constructor(@inject("ICluster") private cluster: ICluster,
                @inject("IProjectionRunnerHolder") private holder: Dictionary<IProjectionRunner>,
                @inject("IReadModelNotifier") private readModelNotifier: IReadModelNotifier) {

    }

    async modelFor<T>(name: string): Promise<T> {
        this.subscribeToReadModelChanges(name);
        let cachedReadModel = this.readModelsCache[name],
            latestTimestamp = this.latestTimestamps[name];

        if (cachedReadModel && +cachedReadModel.timestamp === +latestTimestamp)
            return Promise.resolve(cachedReadModel.payload);

        if (this.cluster.lookup(name) === this.cluster.whoami()) {
            return this.holder[name].state;
        } else {
            let readmodel = await this.cluster.send<Event>(name, MessageBuilder.requestFor("readmodel/retrieve", {
                readmodel: name
            }));
            this.readModelsCache[name] = {
                timestamp: readmodel.timestamp,
                payload: readmodel.payload
            };
            return readmodel.payload;
        }
    }

    private subscribeToReadModelChanges(name: string) {
        let source = this.readModelsChanges[name];
        if (!source) {
            source = this.readModelsChanges[name] = this.readModelNotifier.changes(name);
            source.subscribe(change => this.latestTimestamps[name] = change.timestamp);
        }
    }
}
