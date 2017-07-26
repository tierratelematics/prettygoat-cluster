import {Observable} from "rxjs";
import {IncomingMessage, ServerResponse} from "http";
import {RequestData} from "prettygoat";
import {ClusterMessage} from "./ClusterMessage";

interface ICluster {
    startup(): Observable<void>;
    whoami(): string;
    lookup(key: string): string;
    handleOrProxy(key: string, request: IncomingMessage, response: ServerResponse): boolean;
    send<T>(key: string, message: ClusterMessage): Promise<T>;
    requests(): Observable<RequestData>;
    changes(): Observable<void>;
}

export default ICluster
