import {inject, injectable} from "inversify";
import ICluster from "./ICluster";
import {Observable, Subject} from "rx";
import RequestBuilder from "./web/RequestBuilder";
import {IProjectionSorter, IProjectionRegistry, IReadModelFactory, Event, IWhen, Dictionary} from "prettygoat";
import {values} from "lodash";

@injectable()
class ClusteredReadModelFactory implements IReadModelFactory {

    private cache: Dictionary<Event> = {};

    constructor(@inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("ICluster") private cluster: ICluster,
                @inject("IProjectionSorter") private sorter: IProjectionSorter) {

    }

    publish(event: Event): void {
        this.cache[event.type] = event;
        let dependents = this.sorter.dependents(this.registry.getEntry(event.type).data.projection);
        this.cluster.handleOrProxyToAll(dependents, RequestBuilder.buildChannelMessage("readModels", event));
    }

    from(lastEvent: Date, completions?: Observable<string>, definition?: IWhen<any>): Observable<Event> {
        return Observable
            .from(this.asList())
            .concat(
                this.cluster.requests()
                    .filter(requestData => !!requestData[0].channel)
                    .map(requestData => requestData[0].body)
                    .do(event => this.cache[event.type] = event)
            );
    }

    asList(): any[] {
        return values<Event>(this.cache);
    }
}

export default ClusteredReadModelFactory