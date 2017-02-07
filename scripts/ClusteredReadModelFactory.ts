import {inject, injectable} from "inversify";
import ICluster from "./ICluster";
import {Observable} from "rx";
import RequestBuilder from "./web/RequestBuilder";
import {IProjectionSorter, IProjectionRegistry, IReadModelFactory, Event, IWhen} from "prettygoat";

@injectable()
class ClusteredReadModelFactory implements IReadModelFactory {

    constructor(@inject("ReadModelFactory") private readModelFactory: IReadModelFactory,
                @inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("ICluster") private cluster: ICluster,
                @inject("IProjectionSorter") private sorter: IProjectionSorter) {

    }

    publish(event: Event): void {
        this.readModelFactory.publish(event);
        let dependents = this.sorter.dependents(this.registry.getEntry(event.type).data.projection);
        this.cluster.handleOrProxyToAll(dependents, RequestBuilder.buildChannelMessage("readModels", event));
    }

    from(lastEvent: Date, completions?: Observable<string>, definition?: IWhen<any>): Observable<Event> {
        return Observable.merge(
            this.readModelFactory.from(lastEvent),
            this.cluster.requests()
                .filter(requestData => !!requestData[0].channel)
                .map(requestData => requestData[0].body)
        );
    }

    asList(): any[] {
        return this.readModelFactory.asList();
    }
}

export default ClusteredReadModelFactory