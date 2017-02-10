import {Observable} from "rx";
import {IncomingMessage} from "http";
import {ServerResponse} from "http";
import ICluster from "../../scripts/ICluster";
import {RequestData} from "prettygoat";

class MockCluster implements ICluster {

    changes(): Observable<void> {
        return undefined;
    }

    startup(): Observable<void> {
        return undefined;
    }

    whoami(): string {
        return undefined;
    }

    lookup(key): string {
        return undefined;
    }

    handleOrProxy(key: string, request: IncomingMessage, response: ServerResponse): boolean {
        return false;
    }

    handleOrProxyToAll(keys: string[], request: IncomingMessage) {

    }

    requests(): Observable<RequestData> {
        return undefined;
    }
}

export default MockCluster