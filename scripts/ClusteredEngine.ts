import ClusterModule from "./ClusterModule";
import {IReplicationManager, IProjectionEngine, IRequestAdapter, Engine, ILogger} from "prettygoat";
import {ICluster} from "./Cluster";

class ClusteredEngine extends Engine {

    constructor() {
        super();
        this.register(new ClusterModule());
    }

    run(overrides?: any) {
        this.boot(overrides);
        let replicationManager = this.container.get<IReplicationManager>("IReplicationManager");
        if (replicationManager.isMaster())
            return;

        let projectionEngine = this.container.get<IProjectionEngine>("IProjectionEngine"),
            cluster = this.container.get<ICluster>("ICluster"),
            requestAdapter = this.container.get<IRequestAdapter>("IRequestAdapter"),
            logger = this.container.get<ILogger>("ILogger").createChildLogger("ClusteredEngine");

        cluster.startup().subscribe(() => {
            projectionEngine.run();
            cluster.requests().subscribe(message => {
                requestAdapter.route(message[0], message[1]);
            });
            cluster.changes().subscribe(() => projectionEngine.run());
        }, error => logger.error(error));
    }
}

export default ClusteredEngine
