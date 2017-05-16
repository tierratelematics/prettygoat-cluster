import {injectable, inject, optional} from "inversify";
const io = require("socket.io");
import * as redis from "socket.io-redis";
import {IServerProvider, ISocketFactory} from "prettygoat";
import IRedisConfig from "./configs/IRedisConfig";

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
            if (this.redisConfig) {
                this.socket.adapter(redis({host: this.redisConfig.host, port: this.redisConfig.port}))
            }
        }

        return this.socket;
    }
}

export default ClusteredSocketFactory