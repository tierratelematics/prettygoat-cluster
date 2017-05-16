import {inject, optional, injectable} from "inversify";
import {IClusterConfig, EmbeddedClusterConfig} from "./configs/ClusterConfig";
import * as cluster from "cluster";
import {ILogger, IReplicationManager} from "prettygoat";

@injectable()
class ClusteredReplicationManager implements IReplicationManager {

    constructor(@inject("ILogger") private logger: ILogger,
                @inject("IClusterConfig") @optional() private config: IClusterConfig = new EmbeddedClusterConfig()) {

    }

    canReplicate(): boolean {
        return true;
    }

    replicate() {
        //Spawn children after every 500ms (required to correctly bind to free tcp ports)
        for (let i = 0; i < this.config.forks; i++) {
            setTimeout(() => {
                cluster.fork();
            }, i * 500);
        }
        cluster.on('exit', () => {
            this.logger.error("Worker has died");
        });
    }

    isMaster(): boolean {
        return cluster.isMaster;
    }

}

export default ClusteredReplicationManager
