import {interfaces} from "inversify";
import ClusteredProjectionEngine from "./ClusteredProjectionEngine";
import ICluster from "./ICluster";
import Cluster from "./Cluster";
import ClusteredSocketFactory from "./ClusteredSocketFactory";
import ClusteredReadModelFactory from "./ClusteredReadModelFactory";
import ClusteredReplicationManager from "./ClusteredReplicationManager";
import ProcessLogger from "./ProcessLogger";
import ClusteredRequestAdapter from "./web/ClusteredRequestAdapter";
import ClusteredRouteResolver from "./web/ClusteredRouteResolver";
import {
    IProjectionEngine, ProjectionEngine, ISocketFactory, IReadModelFactory, ReadModelFactory,
    IReplicationManager, ILogger, ConsoleLogger, IRequestAdapter, IRouteResolver, RouteResolver,
    IProjectionRegistry, IServiceLocator, IModule
} from "prettygoat";

class ClusterModule implements IModule {

    modules = (container: interfaces.Container) => {
        container.bind<ICluster>("ICluster").to(Cluster).inSingletonScope();

        container.unbind("IProjectionEngine");
        container.bind<IProjectionEngine>("ProjectionEngine").to(ProjectionEngine).inSingletonScope().whenInjectedInto(ClusteredProjectionEngine);
        container.bind<IProjectionEngine>("IProjectionEngine").to(ClusteredProjectionEngine).inSingletonScope();

        container.unbind("ISocketFactory");
        container.bind<ISocketFactory>("ISocketFactory").to(ClusteredSocketFactory).inSingletonScope();

        container.unbind("IReadModelFactory");
        container.bind<IReadModelFactory>("ReadModelFactory").to(ReadModelFactory).inSingletonScope();
        container.bind<IReadModelFactory>("IReadModelFactory").to(ClusteredReadModelFactory).inSingletonScope();

        container.unbind("IReplicationManager");
        container.bind<IReplicationManager>("IReplicationManager").to(ClusteredReplicationManager).inSingletonScope();

        container.unbind("ILogger");
        container.bind<ILogger>("Logger").to(ConsoleLogger).whenInjectedInto(ProcessLogger);
        container.bind<ILogger>("ILogger").to(ProcessLogger).inSingletonScope();

        container.unbind("IRequestAdapter");
        container.bind<IRequestAdapter>("IRequestAdapter").to(ClusteredRequestAdapter).inSingletonScope();

        container.unbind("IRouteResolver");
        container.bind<IRouteResolver>("IRouteResolver").to(ClusteredRouteResolver).inSingletonScope();
        container.bind<IRouteResolver>("RouteResolver").to(RouteResolver).inSingletonScope().whenInjectedInto(ClusteredRouteResolver);
    };

    register(registry: IProjectionRegistry, serviceLocator?: IServiceLocator, overrides?: any): void {

    }

}

export default ClusterModule