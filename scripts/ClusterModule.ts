import {interfaces} from "inversify";
import ClusteredProjectionEngine from "./ClusteredProjectionEngine";
import ClusteredSocketFactory from "./ClusteredSocketFactory";
import ClusteredReplicationManager from "./ClusteredReplicationManager";
import ClusteredRequestAdapter from "./ClusteredRequestAdapter";
import {
    IProjectionEngine, ProjectionEngine,
    IProjectionRegistry, IServiceLocator, IModule, IRequestHandler
} from "prettygoat";
import {ClusteredReadModelNotifier, ClusteredReadModelRetriever} from "./ClusteredReadModels";
import ReadModelRequestHandler from "./ReadModelRequestHandler";
import ClusteredHealthCheck from "./ClusteredHealthCheck";
import {Cluster, ICluster} from "./Cluster";

class ClusterModule implements IModule {

    modules = (container: interfaces.Container) => {
        container.bind<ICluster>("ICluster").to(Cluster).inSingletonScope();
        container.bind<IProjectionEngine>("ProjectionEngine").to(ProjectionEngine).inSingletonScope().whenInjectedInto(ClusteredProjectionEngine);
        container.rebind("IProjectionEngine").to(ClusteredProjectionEngine).inSingletonScope();
        container.rebind("ISocketFactory").to(ClusteredSocketFactory).inSingletonScope();
        // container.rebind("IReplicationManager").to(ClusteredReplicationManager).inSingletonScope();
        container.rebind("IRequestAdapter").to(ClusteredRequestAdapter).inSingletonScope();
        container.rebind("IReadModelRetriever").to(ClusteredReadModelRetriever).inSingletonScope();
        container.rebind("IReadModelNotifier").to(ClusteredReadModelNotifier).inSingletonScope();
        container.bind<IRequestHandler>("IRequestHandler").to(ReadModelRequestHandler).inSingletonScope();
        container.bind<IRequestHandler>("IRequestHandler").to(ClusteredHealthCheck).inSingletonScope();
    };

    register(registry: IProjectionRegistry, serviceLocator?: IServiceLocator, overrides?: any): void {

    }

}

export default ClusterModule
