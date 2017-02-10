import {injectable, inject, optional} from "inversify";
const io = require("socket.io");
import * as redis from "socket.io-redis";
import {server, IRedisConfig, ISocketFactory} from "prettygoat";

@injectable()
class ClusteredSocketFactory implements ISocketFactory {

    private socket: SocketIO.Server = null;

    constructor(@inject("IRedisConfig") @optional() private redisConfig: IRedisConfig) {

    }

    socketForPath(path?: string): SocketIO.Server {
        if (!this.socket) {
            this.socket = io(server, {
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