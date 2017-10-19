import "reflect-metadata";
import {IMock, Mock, Times, It} from "typemoq";
import ClusteredProjectionEngine from "../scripts/ClusteredProjectionEngine";
import {
    IProjectionEngine,
    IProjectionRegistry,
    IProjection
} from "prettygoat";
import DynamicNameProjection from "./fixtures/DynamicNameProjection";
import {ICluster} from "../scripts/Cluster";

describe("Given a set of nodes", () => {
    let subject: IProjectionEngine,
        registry: IMock<IProjectionRegistry>,
        projection1: IProjection<any>,
        projection2: IProjection<any>,
        cluster: IMock<ICluster>,
        engine: IMock<IProjectionEngine>;

    beforeEach(() => {
        projection1 = new DynamicNameProjection("projection1").define();
        projection2 = new DynamicNameProjection("projection2").define();
        registry = Mock.ofType<IProjectionRegistry>();
        registry.setup(r => r.projections()).returns(() => [
            ["Admin", projection1], ["Admin", projection2]
        ]);
        cluster = Mock.ofType<ICluster>();
        engine = Mock.ofType<IProjectionEngine>();
        subject = new ClusteredProjectionEngine(engine.object, registry.object, {}, cluster.object);
    });
    context("when the cluster starts", () => {
        beforeEach(() => {
            cluster.setup(c => c.canHandle("projection1")).returns(() => false);
            cluster.setup(c => c.canHandle("projection2")).returns(() => true);
        });
        it("should run the projections that match", () => {
            subject.run();
            engine.verify(e => e.run(It.isValue(projection1)), Times.never());
            engine.verify(e => e.run(It.isValue(projection2)), Times.once());
        });
    });
});
