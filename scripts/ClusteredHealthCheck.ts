import {IRequest, IRequestHandler, IResponse, Route, IProjectionRegistry} from "prettygoat";
import {inject} from "inversify";
import {ICluster} from "./Cluster";
import {IClusterConfig} from "./ClusterConfig";
import {Subscription} from "rxjs";
import {reduce, difference, concat} from "lodash";

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
        this.status.members = this.clusterConfig.nodes;
        this.status.projections = this.runningProjections();
    }

    handle(request: IRequest, response: IResponse) {
        if (!this.subscription) this.subscribeToClusterChanges();
        response.send(this.status);
    }

    private subscribeToClusterChanges() {
        this.cluster.changes().subscribe(change => {
            this.status.members = difference(this.status.members, change.removed);
            this.status.unreachables = concat(this.status.unreachables, change.removed);
            this.status.members = concat(this.status.members, change.added);
            this.status.unreachables = difference(this.status.unreachables, change.added);
            this.status.projections = this.runningProjections();
        });
    }

    private runningProjections(): string[] {
        return reduce(this.registry.projections(), (result, entry) => {
            if (this.cluster.canHandle(entry[1].name)) result.push(entry[1].name);
            return result;
        }, []);
    };

    keyFor(request: IRequest): string {
        return null;
    }
}

export default ClusteredHealthCheck
