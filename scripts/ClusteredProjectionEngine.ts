import {inject, injectable} from "inversify";
import {forEach} from "lodash";
import ICluster from "./ICluster";
import {
    ILogger, IProjectionEngine, PushContext, IProjection,
    IProjectionRegistry, Dictionary, IProjectionRunner
} from "prettygoat";

@injectable()
class ClusteredProjectionEngine implements IProjectionEngine {

    constructor(@inject("ProjectionEngine") private engine: IProjectionEngine,
                @inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("IProjectionRunnerHolder") private holder: Dictionary<IProjectionRunner<any>>,
                @inject("ICluster") private cluster: ICluster,
                @inject("ILogger") private logger: ILogger) {

    }

    run(projection?: IProjection<any>) {
        if (projection) {
            this.engine.run(projection);
        } else {
            let projections = this.registry.projections();
            forEach(projections, entry => {
                let registeredProjection = entry[1],
                    runner = this.holder[registeredProjection.name];
                if (this.cluster.canHandle(registeredProjection.name)) {
                    if (!runner || (runner && !runner.stats.running)) {
                        this.run(registeredProjection);
                        this.logger.info(`Running projection ${registeredProjection.name}`);
                    }
                } else if (runner && runner.stats.running) {
                    runner.stop();
                    this.logger.info(`Stopping projection ${registeredProjection.name}`);
                    delete this.holder[registeredProjection.name];
                }
            });

        }
    }
}

export default ClusteredProjectionEngine
