import ICluster from "./ICluster";
import {inject, injectable, optional} from "inversify";
import {Observable} from "rx";
import {EmbeddedClusterConfig} from "./ClusterConfig";
import {IncomingMessage} from "http";
import {ServerResponse} from "http";
import {RequestData, IMiddlewareTransformer, IRequestParser, ILogger, PortDiscovery} from "prettygoat";
const Ringpop = require('ringpop');
const TChannel = require('tchannel');

@injectable()
class Cluster implements ICluster {
    ringpop: any;
    requestSource: Observable<RequestData>;

    constructor(@inject("IClusterConfig") @optional() private clusterConfig = new EmbeddedClusterConfig(),
                @inject("IRequestParser") private requestParser: IRequestParser,
                @inject("IMiddlewareTransformer") private middlewareTransformer: IMiddlewareTransformer,
                @inject("ILogger") private logger: ILogger) {

    }

    startup(): Observable<void> {
        return Observable.create<void>(observer => {
            PortDiscovery.freePort(this.clusterConfig.port, this.clusterConfig.host).then(port => {
                let tchannel = new TChannel({
                    trace: true,
                    logger: {
                        trace: console.log.bind(console),
                        debug: console.log.bind(console),
                        error: console.error.bind(console),
                        fatal: console.error.bind(console),
                        info: console.log.bind(console),
                        warn: console.warn.bind(console)
                    }
                });
                this.ringpop = new Ringpop({
                    app: "ringpop",
                    hostPort: `${this.clusterConfig.host}:${port}`,
                    logger: {
                        trace: console.log.bind(console),
                        debug: console.log.bind(console),
                        error: console.error.bind(console),
                        fatal: console.error.bind(console),
                        info: console.log.bind(console),
                        warn: console.warn.bind(console)
                    },
                    channel: tchannel.makeSubChannel({
                        serviceName: 'ringpop',
                        trace: true
                    })
                });
                this.requestSource = Observable.create(observer => {
                    this.ringpop.on('request', (request, response) => {
                        let requestData = this.requestParser.parse(request, response);
                        this.middlewareTransformer.transform(requestData[0], requestData[1]).then(data => {
                            observer.onNext(data)
                        });
                    });
                }).share();
                this.ringpop.setupChannel();
                tchannel.listen(port, this.clusterConfig.host, () => {
                    this.logger.info(`TChannel listening on ${port}`);
                    this.ringpop.bootstrap(this.clusterConfig.nodes, (error, nodes) => {
                        if (error) {
                            observer.onError(error);
                        } else {
                            this.logger.debug(`Nodes joined ${JSON.stringify(nodes)}`);
                            observer.onNext(null);
                        }
                        observer.onCompleted();
                    });
                });
            }).catch(error => this.logger.error(error));
        });
    }

    whoami(): string {
        return this.ringpop.whoami();
    }

    lookup(key: string): string {
        return this.ringpop.lookup(key);
    }

    handleOrProxy(key: string, request: IncomingMessage, response: ServerResponse): boolean {
        return this.ringpop.handleOrProxy(key, request, response);
    }

    handleOrProxyToAll(keys: string[], request: IncomingMessage) {
        this.ringpop.handleOrProxyAll({
            keys: keys,
            req: request
        });
    }

    requests(): Observable<RequestData> {
        return this.requestSource;
    }

    changes(): Observable<void> {
        return Observable.fromEvent<void>(this.ringpop, 'ringChanged');
    }

}

export default Cluster