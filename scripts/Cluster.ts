import {inject, injectable, optional} from "inversify";
import {Observable} from "rxjs";
import {EmbeddedClusterConfig} from "./ClusterConfig";
import {IncomingMessage} from "http";
import {ServerResponse} from "http";
import {RequestData, IMiddlewareTransformer, IRequestParser, ILogger, PortDiscovery} from "prettygoat";

const {Request} = require("hammock");

const Ringpop = require("ringpop");
const TChannel = require("tchannel");

export interface ICluster {
    startup(): Observable<void>;
    canHandle(key: string): boolean;
    handleOrProxy(key: string, request: IncomingMessage, response: ServerResponse): boolean;
    send<T>(key: string, message: ClusterMessage): Promise<T>;
    requests(): Observable<RequestData>;
    changes(): Observable<void>;
}

@injectable()
export class Cluster implements ICluster {
    ringpop: any;
    requestSource: Observable<RequestData>;

    constructor(@inject("IClusterConfig") @optional() private clusterConfig = new EmbeddedClusterConfig(),
                @inject("IRequestParser") private requestParser: IRequestParser,
                @inject("IMiddlewareTransformer") private middlewareTransformer: IMiddlewareTransformer,
                @inject("ILogger") private logger: ILogger) {

    }

    startup(): Observable<void> {
        return Observable.create(observer => {
            PortDiscovery.freePort(this.clusterConfig.port, this.clusterConfig.host).then(port => {
                let tchannel = new TChannel({
                    logger: {
                        trace: this.logger.debug.bind(this.logger),
                        debug: this.logger.debug.bind(this.logger),
                        error: this.logger.error.bind(this.logger),
                        fatal: this.logger.error.bind(this.logger),
                        info: this.logger.info.bind(this.logger),
                        warn: this.logger.warning.bind(this.logger)
                    }
                });
                this.ringpop = new Ringpop({
                    app: "prettygoat-cluster",
                    hostPort: `${this.clusterConfig.host}:${port}`,
                    logger: {
                        trace: this.logger.debug.bind(this.logger),
                        debug: this.logger.debug.bind(this.logger),
                        error: this.logger.error.bind(this.logger),
                        fatal: this.logger.error.bind(this.logger),
                        info: this.logger.info.bind(this.logger),
                        warn: this.logger.warning.bind(this.logger)
                    },
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

    changes(): Observable<void> {
        return Observable.fromEvent<void>(this.ringpop, "ringChanged").do(changes => {

        });
    }

}

export type ClusterMessage = {
    channel: string;
    payload: object
}

