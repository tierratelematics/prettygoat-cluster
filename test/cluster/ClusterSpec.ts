import "reflect-metadata";
import expect = require("expect.js");
import {Observable, Scheduler} from "rx";
import * as TypeMoq from "typemoq";

describe("Given a set of nodes", () => {
    let subject: IProjectionEngine,
        registry: TypeMoq.IMock<IProjectionRegistry>,
        snapshotRepository: TypeMoq.IMock<ISnapshotRepository>,
        projection1: IProjection<any>,
        projection2: IProjection<any>,
        cluster: TypeMoq.IMock<ICluster>,
        engine: TypeMoq.IMock<IProjectionEngine>,
        projectionSorter: TypeMoq.IMock<IProjectionSorter>;

    beforeEach(() => {
        projection1 = new DynamicNameProjection("projection1").define();
        projection2 = new DynamicNameProjection("projection2").define();
        registry = TypeMoq.Mock.ofType(MockProjectionRegistry);
        registry.setup(r => r.getAreas()).returns(a => {
            return [
                new AreaRegistry("Admin", [
                    new RegistryEntry(projection1, "projection1"),
                    new RegistryEntry(projection2, "projection2")
                ])
            ]
        });
        projectionSorter = TypeMoq.Mock.ofType(MockProjectionSorter);
        projectionSorter.setup(s => s.sort()).returns(a => []);
        snapshotRepository = TypeMoq.Mock.ofType(MockSnapshotRepository);
        snapshotRepository.setup(s => s.saveSnapshot("test", TypeMoq.It.isValue(new Snapshot(66, new Date(5000))))).returns(a => null);
        snapshotRepository.setup(s => s.initialize()).returns(a => Observable.just(null));
        snapshotRepository.setup(s => s.getSnapshots()).returns(a => Observable.just<Dictionary<Snapshot<any>>>({}).observeOn(Scheduler.immediate));
        cluster = TypeMoq.Mock.ofType(MockCluster);
        cluster.setup(c => c.whoami()).returns(() => "my-ip");
        engine = TypeMoq.Mock.ofType(MockProjectionEngine);
        subject = new ClusteredProjectionEngine(engine.object, registry.object, snapshotRepository.object, projectionSorter.object, {}, cluster.object, NullLogger);
    });
    context("when the cluster starts", () => {
        beforeEach(() => {
            cluster.setup(c => c.lookup("projection1")).returns(() => "not-my-ip");
            cluster.setup(c => c.lookup("projection2")).returns(() => "my-ip");
        });
        it("should run the projections that match", () => {
            subject.run();
            engine.verify(e => e.run(TypeMoq.It.isValue(projection1), TypeMoq.It.isAny()), TypeMoq.Times.never());
            engine.verify(e => e.run(TypeMoq.It.isValue(projection2), TypeMoq.It.isAny()), TypeMoq.Times.once());
        });
    });
});