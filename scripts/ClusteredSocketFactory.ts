import {injectable, inject} from "inversify";
const io = require("socket.io");
import * as redis from "socket.io-redis";
import {IServerProvider, ISocketFactory} from "prettygoat";
import { IClusterConfig } from "./ClusterConfig";
import { optional } from "inversify";

@injectable()
class ClusteredSocketFactory implements ISocketFactory {

    private socket: SocketIO.Server = null;

    constructor(@inject("IServerProvider") private serverProvider: IServerProvider,
                @inject("IClusterConfig") private clusterConfig: IClusterConfig,
                @inject("RedisClient") @optional() private redisClient) {

    }

    socketForPath(path?: string): SocketIO.Server {
        if (!this.socket) {
            this.socket = io(this.serverProvider.provideServer(), {
                path: path || "socket.io"
            });
            if (this.redisClient) {
                this.socket.adapter(redis({pubClient: this.redisClient, subClient: this.redisClient}));
            }
        }

        return this.socket;
    }
}

export default ClusteredSocketFactory
