import {inject, injectable} from "inversify";
import * as _ from "lodash";
import ICluster from "./ICluster";
import {
    ILogger, ISnapshotRepository, IProjectionSorter, IProjectionEngine, PushContext, IProjection,
    IProjectionRegistry, Dictionary, RegistryEntry, AreaRegistry, IProjectionRunner
} from "prettygoat";

@injectable()
class ClusteredProjectionEngine implements IProjectionEngine {

    constructor(@inject("ProjectionEngine") private engine: IProjectionEngine,
                @inject("IProjectionRegistry") private registry: IProjectionRegistry,
                @inject("ISnapshotRepository") private snapshotRepository: ISnapshotRepository,
                @inject("IProjectionSorter") private sorter: IProjectionSorter,
                @inject("IProjectionRunnerHolder") private holder: Dictionary<IProjectionRunner<any>>,
                @inject("ICluster") private cluster: ICluster,
                @inject("ILogger") private logger: ILogger) {

    }

    run(projection?: IProjection<any>, context?: PushContext) {
        if (projection) {
            this.engine.run(projection, context);
        } else {
            this.sorter.sort();
            this.snapshotRepository
                .initialize()
                .subscribe(() => {
                    let areas = this.registry.getAreas();
                    _.forEach<AreaRegistry>(areas, areaRegistry => {
                        _.forEach<RegistryEntry<any>>(areaRegistry.entries, (entry: RegistryEntry<any>) => {
                            let projection = entry.projection,
                                runner = this.holder[projection.name];
                            if (this.cluster.lookup(projection.name) === this.cluster.whoami()) {
                                if (!runner || (runner && !runner.stats.running)) {
                                    this.run(projection, new PushContext(entry.exposedName, areaRegistry.area));
                                    this.logger.info(`Running projection ${projection.name}`);
                                }
                            } else if (runner && runner.stats.running) {
                                runner.stop();
                                this.logger.info(`Stopping projection ${projection.name}`);
                                delete this.holder[projection.name];
                            }
                        });
                    });
                });
        }
    }
}

export default ClusteredProjectionEngine