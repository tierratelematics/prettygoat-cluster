import {injectable, inject, optional} from "inversify";
const io = require("socket.io");
import * as redis from "socket.io-redis";
import {IServerProvider, ISocketFactory, IRedisConfig} from "prettygoat";
import {isArray} from "lodash";

@injectable()
class ClusteredSocketFactory implements ISocketFactory {

    private socket: SocketIO.Server = null;

    constructor(@inject("IServerProvider") private serverProvider: IServerProvider,
                @inject("IRedisConfig") @optional() private redisConfig: IRedisConfig) {

    }

    socketForPath(path?: string): SocketIO.Server {
        if (!this.socket) {
            this.socket = io(this.serverProvider.provideServer(), {
                path: path || "socket.io"
            });
            let config = isArray(this.redisConfig) ? this.redisConfig[0] : this.redisConfig;
            if (this.redisConfig) {
                this.socket.adapter(redis({host: config.host, port: config.port}));
            }
        }

        return this.socket;
    }
}

export default ClusteredSocketFactory
