import {inject, injectable, optional} from "inversify";
import {Observable} from "rxjs";
import {EmbeddedClusterConfig} from "./ClusterConfig";
import {IncomingMessage} from "http";
import {ServerResponse} from "http";
import {RequestData, IMiddlewareTransformer, IRequestParser, ILogger, PortDiscovery, LoggingContext} from "prettygoat";

const {Request} = require("hammock");

const Ringpop = require("ringpop");
const TChannel = require("tchannel");

export interface ICluster {
    startup(): Observable<void>;
    canHandle(key: string): boolean;
    handleOrProxy(key: string, request: IncomingMessage, response: ServerResponse): boolean;
    send<T>(key: string, message: ClusterMessage): Promise<T>;
    requests(): Observable<RequestData>;
    changes(): Observable<ClusterChange>;
}

export type ClusterMessage = {
    channel: string;
    payload: object
}

export type ClusterChange = {
    added: string[];
    removed: string[];
}

@injectable()
@LoggingContext("Cluster")
export class Cluster implements ICluster {
    ringpop: any;
    requestSource: Observable<RequestData>;

    @inject("ILogger") private logger: ILogger;
    
    constructor(@inject("IClusterConfig") @optional() private clusterConfig = new EmbeddedClusterConfig(),
                @inject("IRequestParser") private requestParser: IRequestParser,
                @inject("IMiddlewareTransformer") private middlewareTransformer: IMiddlewareTransformer) {

    }

    startup(): Observable<void> {
        return Observable.create(observer => {
            PortDiscovery.freePort(this.clusterConfig.port, this.clusterConfig.host).then(port => {
                let proxyLogger = {
                    trace: (message, data) => this.logger.debug(`${message} ${JSON.stringify(data)}`),
                    debug: (message, data) => this.logger.debug(`${message} ${JSON.stringify(data)}`),
                    error: (message, data) => this.logger.error(`${message} ${JSON.stringify(data)}`),
                    fatal: (message, data) => this.logger.error(`${message} ${JSON.stringify(data)}`),
                    info: (message, data) => this.logger.info(`${message} ${JSON.stringify(data)}`),
                    warn: (message, data) => this.logger.warning(`${message} ${JSON.stringify(data)}`)
                };
                let tchannel = new TChannel({
                    logger: proxyLogger
                });
                this.ringpop = new Ringpop({
                    app: "prettygoat-cluster",
                    hostPort: `${this.clusterConfig.host}:${port}`,
                    logger: proxyLogger,
                    channel: tchannel.makeSubChannel({
                        serviceName: "ringpop",
                        trace: false
                    })
                });
                this.requestSource = Observable.create(requestObserver => {
                    this.ringpop.on("request", (request, response) => {
                        let requestData = this.requestParser.parse(request, response);
                        this.middlewareTransformer.transform(requestData[0], requestData[1]).then(data => {
                            requestObserver.next(data);
                        });
                    });
                }).share();
                this.ringpop.setupChannel();
                tchannel.listen(port, this.clusterConfig.host, () => {
                    this.logger.info(`TChannel listening on ${port}`);
                    this.ringpop.bootstrap(this.clusterConfig.nodes, (error, nodes) => {
                        if (error) {
                            observer.error(error);
                        } else {
                            this.logger.debug(`Nodes joined ${JSON.stringify(nodes)}`);
                            observer.next(null);
                        }
                        observer.complete();
                    });
                });
            }).catch(error => this.logger.error(error));
        });
    }

    canHandle(key: string): boolean {
        return this.ringpop.whoami() === this.ringpop.lookup(key);
    }

    handleOrProxy(key: string, request: IncomingMessage, response: ServerResponse): boolean {
        return this.ringpop.handleOrProxy(key, request, response);
    }

    send<T>(key: string, message: ClusterMessage): Promise<T> {
        return new Promise((resolve, reject) => {
            let request = new Request({url: `pgoat://${message.channel}`});
            request.end(JSON.stringify(message.payload));
            this.ringpop.handleOrProxyAll({
                keys: [key],
                req: request
            }, (error, responses) => {
                if (error) {
                    reject(error);
                } else {
                    let body = responses[0].res.body;
                    let stringBody = Buffer.isBuffer(body) ? body.toString("utf8") : body;
                    resolve(JSON.parse(stringBody));
                }
            });
        });
    }

    requests(): Observable<RequestData> {
        return this.requestSource;
    }

    changes(): Observable<ClusterChange> {
        return Observable.fromEvent<ClusterChange>(this.ringpop, "ringChanged")
            .do(data => this.logger.debug(`Ring changed ${JSON.stringify(data)}`));
    }

}
