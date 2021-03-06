import {
    IReadModelNotifier,
    Event,
    IReadModelRetriever,
    IProjectionRegistry,
    IProjectionRunner,
    SpecialEvents,
    Dictionary
} from "prettygoat";
import {Observable, Subject} from "rxjs";
import {inject, injectable} from "inversify";
import {forEach, reduce, uniq, includes, chain, last} from "lodash";
import {ICluster} from "./Cluster";
import { ILogger, NullLogger, ReadModelNotification } from "prettygoat";

@injectable()
export class ClusteredReadModelNotifier implements IReadModelNotifier {

    private localChanges = new Subject<ReadModelNotification>();
    private dependants: Dictionary<string[]> = {};
    private subject = new Subject<ReadModelNotification>()

    @inject("ILogger") private logger: ILogger = NullLogger;

    constructor(@inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("ICluster") private cluster: ICluster) {
        this.subject
            .groupBy(data => data[0].payload)
            .flatMap(group => group.bufferTime(100))
            .map(buffer => {
                if (!buffer.length) return null;
                let keys = chain(buffer).map(item => item[1]).flatten().uniq().valueOf();
                return [last(buffer)[0], keys] as ReadModelNotification;
            })
            .filter(data => !!data)
            .subscribe(change => {
                let readmodel = change[0].payload;
                let dependants = this.dependants[readmodel] || this.dependantsFor(readmodel);
                this.dependants[readmodel] = dependants;
                forEach(dependants, dependant => {
                    if (this.cluster.canHandle(dependant)) {
                        this.localChanges.next(change);
                    } else {
                        this.cluster.send(dependant, {channel: "readmodel/change", payload: change}).catch(error => {
                            this.logger.error(error);
                        });
                    }
                });
            });
    }

    changes(name: string): Observable<ReadModelNotification> {
        return this.cluster.requests()
            .filter(request => request[0].url === "pgoat://readmodel/change")
            .map(requestData => requestData[0].body)
            .filter(change => change[0].payload === name)
            .merge(this.localChanges);
    }

    notifyChanged(event: Event, contexts: string[]) {
        this.subject.next([{
            type: SpecialEvents.READMODEL_CHANGED,
            payload: event.type,
            timestamp: event.timestamp,
            id: event.id,
            metadata: event.metadata
        }, contexts]);
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

@injectable()
export class ClusteredReadModelRetriever implements IReadModelRetriever {

    private readModelsChanges: Dictionary<Observable<ReadModelNotification>> = {};
    private latestTimestamps: Dictionary<Date> = {};
    private readModelsCache: Dictionary<CachedReadModel> = {};

    @inject("ILogger") private logger: ILogger = NullLogger;

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

        if (this.cluster.canHandle(name)) {
            return this.holder[name].state;
        } else {
            try {
                let readmodel = await this.cluster.send<Event>(name, {
                    channel: "readmodel/retrieve",
                    payload: {
                        readmodel: name
                    }
                });

                this.readModelsCache[name] = {
                    timestamp: readmodel.timestamp,
                    payload: readmodel.payload
                };
                return readmodel.payload;
            } catch (error) {
                this.logger.error(error);
            }
            
            return null;
        }
    }

    private subscribeToReadModelChanges(name: string) {
        let source = this.readModelsChanges[name];
        if (!source) {
            source = this.readModelsChanges[name] = this.readModelNotifier.changes(name);
            source.subscribe(change => this.latestTimestamps[name] = change[0].timestamp);
        }
    }
}
