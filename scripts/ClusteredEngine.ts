import ClusterModule from "./ClusterModule";
import {IReplicationManager, IProjectionEngine, IRequestAdapter, Engine, ILogger} from "prettygoat";
import {ICluster} from "./Cluster";
import {Observable} from "rxjs";

class ClusteredEngine extends Engine {

    constructor() {
        super();
        this.register(new ClusterModule());
    }

    async run(overrides?: any) {
        this.boot(overrides);
        let replicationManager = this.container.get<IReplicationManager>("IReplicationManager");
        if (replicationManager.isMaster())
            return;

        let projectionEngine = this.container.get<IProjectionEngine>("IProjectionEngine"),
            cluster = this.container.get<ICluster>("ICluster"),
            requestAdapter = this.container.get<IRequestAdapter>("IRequestAdapter"),
            logger = this.container.get<ILogger>("ILogger").createChildLogger("ClusteredEngine");

        await cluster.bind();
        
        if (overrides && overrides.startupDelay)
            await overrides.startupDelay();

        Observable.from(cluster.start())
            .do(() => {
                cluster.requests().subscribe(message => {
                    requestAdapter.route(message[0], message[1]);
                });
            }, error => {
                throw error; // Make the process stop if the cluster goes down
            })
            .concat(Observable.defer(() => cluster.changes()))
            .subscribe(() => projectionEngine.run(), error => logger.error(error));
    }
}

export default ClusteredEngine
