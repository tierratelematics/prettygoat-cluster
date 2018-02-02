import {inject, optional, injectable} from "inversify";
import {IClusterConfig, EmbeddedClusterConfig} from "./ClusterConfig";
import * as cluster from "cluster";
import {ILogger, IReplicationManager, NullLogger, LoggingContext} from "prettygoat";

@injectable()
@LoggingContext("ClusteredReplicationManager")
class ClusteredReplicationManager implements IReplicationManager {

    @inject("ILogger") private logger: ILogger = NullLogger;

    constructor(@inject("IClusterConfig") @optional() private config: IClusterConfig = new EmbeddedClusterConfig()) {

    }

    canReplicate(): boolean {
        return true;
    }

    replicate() {
        // Spawn children after every 1s (required to correctly bind to free tcp ports)
        for (let i = 0; i < this.config.forks; i++) {
            setTimeout(() => {
                cluster.fork();
            }, i * 1000);
        }
    }

    isMaster(): boolean {
        return cluster.isMaster;
    }

}

export default ClusteredReplicationManager
