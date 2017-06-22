import {inject, injectable} from "inversify";
import ICluster from "./ICluster";
import {Observable, Subject} from "rx";
import RequestBuilder from "./web/RequestBuilder";
import {IProjectionSorter, IProjectionRegistry, IReadModelFactory, Event, IWhen, Dictionary} from "prettygoat";
import {values, forEach} from "lodash";

@injectable()
class ClusteredReadModelFactory implements IReadModelFactory {

    private cache: Dictionary<Event> = {};
    private subject = new Subject<Event>();

    constructor(@inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("ICluster") private cluster: ICluster,
                @inject("IProjectionSorter") private sorter: IProjectionSorter) {

    }

    publish(event: Event): void {
        this.cache[event.type] = event;
        let dependents = this.sorter.dependents(this.registry.getEntry(event.type).data.projection);
        forEach(dependents, dependent => {
            if (this.cluster.lookup(dependent) === this.cluster.whoami()) // Don't broadcast since ringpop loses the body of a local request
                this.subject.onNext(event);
            else
                this.cluster.handleOrProxyToAll([dependent], RequestBuilder.buildChannelMessage("readModels", event));
        });
    }

    from(lastEvent: Date, completions?: Observable<string>, definition?: IWhen<any>): Observable<Event> {
        return Observable
            .from(this.asList())
            .concat(
                this.cluster.requests()
                    .filter(requestData => !!requestData[0].channel)
                    .map(requestData => requestData[0].body)
                    .do(event => this.cache[event.type] = event)
            )
            .merge(this.subject);
    }

    asList(): any[] {
        return values<Event>(this.cache);
    }
}

export default ClusteredReadModelFactory
