import {inject, injectable} from "inversify";
import {forEach, filter, concat} from "lodash";
import {
    ILogger, IProjectionEngine, IProjection,
    IProjectionRegistry, Dictionary, IProjectionRunner, NullLogger, LoggingContext
} from "prettygoat";
import {ICluster} from "./Cluster";

@injectable()
@LoggingContext("ClusteredProjectionEngine")
class ClusteredProjectionEngine implements IProjectionEngine {

    @inject("ILogger") private logger: ILogger = NullLogger;

    constructor(@inject("ProjectionEngine") private engine: IProjectionEngine,
                @inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("IProjectionRunnerHolder") private holder: Dictionary<IProjectionRunner<any>>,
                @inject("ICluster") private cluster: ICluster) {

    }

    async run(projection?: IProjection<any>) {
        if (projection) {
            await this.engine.run(projection);
        } else {
            let projections = filter(this.registry.projections(), entry => !!entry[1].publish),
                readmodels = filter(this.registry.projections(), entry => !entry[1].publish);

            for (const entry of concat(readmodels, projections)) {
                let registeredProjection = entry[1],
                    logger = this.logger.createChildLogger(registeredProjection.name),
                    runner = this.holder[registeredProjection.name];
                if (this.cluster.canHandle(registeredProjection.name)) {
                    if (!runner || (runner && !runner.stats.running)) {
                        await this.run(registeredProjection);
                        logger.info(`Projection running`);
                    }
                } else if (runner && runner.stats.running) {
                    runner.stop();
                    logger.info(`Projection stopped`);
                    delete this.holder[registeredProjection.name];
                }
            }
        }
    }
}

export default ClusteredProjectionEngine
