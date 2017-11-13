import {IRequest, IRequestHandler, IResponse, Route, IProjectionRegistry} from "prettygoat";
import {inject} from "inversify";
import {ICluster} from "./Cluster";
import {IClusterConfig} from "./ClusterConfig";
import {Subscription} from "rxjs";
import {reduce, difference, concat, uniq} from "lodash";

type SystemStatus = {
    members: string[];
    unreachables: string[];
    projections: string[];
}

@Route("/health", "GET")
class ClusteredHealthCheck implements IRequestHandler {

    private subscription: Subscription;
    private status: SystemStatus = {
        members: [],
        unreachables: [],
        projections: []
    };

    constructor(@inject("ICluster") private cluster: ICluster,
                @inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("IClusterConfig") private clusterConfig: IClusterConfig) {
    }

    handle(request: IRequest, response: IResponse) {
        if (!this.subscription) {
            this.status.members = this.clusterConfig.nodes;
            this.status.projections = this.runningProjections();
            this.subscribeToClusterChanges();
        }
        response.send(this.status);
    }

    keyFor(request: IRequest): string {
        return null;
    }

    private subscribeToClusterChanges() {
        this.subscription = this.cluster.changes().subscribe(change => {
            this.status.members = difference(this.status.members, change.removed);
            this.status.unreachables = uniq(concat(this.status.unreachables, change.removed));
            this.status.members = uniq(concat(this.status.members, change.added));
            this.status.unreachables = difference(this.status.unreachables, change.added);
            this.status.projections = this.runningProjections();
        });
    }

    private runningProjections(): string[] {
        return reduce(this.registry.projections(), (result, entry) => {
            if (this.cluster.canHandle(entry[1].name)) result.push(entry[1].name);
            return result;
        }, []);
    }
}

export default ClusteredHealthCheck
