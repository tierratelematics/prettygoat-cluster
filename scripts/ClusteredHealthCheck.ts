import {IRequest, IRequestHandler, IResponse, Route, IProjectionRegistry} from "prettygoat";
import {inject} from "inversify";
import {ICluster} from "./Cluster";
import {IClusterConfig} from "./ClusterConfig";

@Route("/health", "GET")
class ClusteredHealthCheck implements IRequestHandler {

    constructor(@inject("ICluster") private cluster: ICluster,
                @inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("IClusterConfig") private clusterConfig: IClusterConfig) {

    }

    handle(request: IRequest, response: IResponse) {

    }

    keyFor(request: IRequest): string {
        return null;
    }
}

export default ClusteredHealthCheck
