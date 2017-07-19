import {interfaces} from "inversify";
import ClusteredProjectionEngine from "./ClusteredProjectionEngine";
import ICluster from "./ICluster";
import Cluster from "./Cluster";
import ClusteredSocketFactory from "./ClusteredSocketFactory";
import ClusteredReplicationManager from "./ClusteredReplicationManager";
import ProcessLogger from "./ProcessLogger";
import ClusteredRequestAdapter from "./web/ClusteredRequestAdapter";
import ClusteredRouteResolver from "./web/ClusteredRouteResolver";
import {
    IProjectionEngine, ProjectionEngine,
    ILogger, ConsoleLogger, IRouteResolver, RouteResolver,
    IProjectionRegistry, IServiceLocator, IModule
} from "prettygoat";

class ClusterModule implements IModule {

    modules = (container: interfaces.Container) => {
        container.bind<ICluster>("ICluster").to(Cluster).inSingletonScope();
        container.bind<IProjectionEngine>("ProjectionEngine").to(ProjectionEngine).inSingletonScope().whenInjectedInto(ClusteredProjectionEngine);
        container.rebind("IProjectionEngine").to(ClusteredProjectionEngine).inSingletonScope();
        container.rebind("ISocketFactory").to(ClusteredSocketFactory).inSingletonScope();
        container.rebind("IReplicationManager").to(ClusteredReplicationManager).inSingletonScope();
        container.bind<ILogger>("Logger").to(ConsoleLogger).whenInjectedInto(ProcessLogger);
        container.rebind("ILogger").to(ProcessLogger).inSingletonScope();
        container.rebind("IRequestAdapter").to(ClusteredRequestAdapter).inSingletonScope();
        container.rebind("IRouteResolver").to(ClusteredRouteResolver).inSingletonScope();
        container.bind<IRouteResolver>("RouteResolver").to(RouteResolver).inSingletonScope().whenInjectedInto(ClusteredRouteResolver);
    };

    register(registry: IProjectionRegistry, serviceLocator?: IServiceLocator, overrides?: any): void {

    }

}

export default ClusterModule