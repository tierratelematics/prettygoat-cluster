import "reflect-metadata";
import expect = require("expect.js");
import {Observable, Scheduler} from "rx";
import {IMock, Mock, Times, It} from "typemoq";
import ClusteredProjectionEngine from "../scripts/ClusteredProjectionEngine";
import {
    IProjectionEngine, IProjectionRegistry, ISnapshotRepository, IProjection,
    AreaRegistry, RegistryEntry, IProjectionSorter, Dictionary, Snapshot, NullLogger
} from "prettygoat";
import ICluster from "../scripts/ICluster";
import DynamicNameProjection from "./fixtures/DynamicNameProjection";

describe("Given a set of nodes", () => {
    let subject: IProjectionEngine,
        registry: IMock<IProjectionRegistry>,
        snapshotRepository: IMock<ISnapshotRepository>,
        projection1: IProjection<any>,
        projection2: IProjection<any>,
        cluster: IMock<ICluster>,
        engine: IMock<IProjectionEngine>,
        projectionSorter: IMock<IProjectionSorter>;

    beforeEach(() => {
        projection1 = new DynamicNameProjection("projection1").define();
        projection2 = new DynamicNameProjection("projection2").define();
        registry = Mock.ofType<IProjectionRegistry>();
        registry.setup(r => r.getAreas()).returns(() => {
            return [
                new AreaRegistry("Admin", [
                    new RegistryEntry(projection1, "projection1"),
                    new RegistryEntry(projection2, "projection2")
                ])
            ]
        });
        projectionSorter = Mock.ofType<IProjectionSorter>();
        projectionSorter.setup(s => s.sort()).returns(a => []);
        snapshotRepository = Mock.ofType<ISnapshotRepository>();
        snapshotRepository.setup(s => s.saveSnapshot("test", It.isValue(new Snapshot(66, new Date(5000))))).returns(a => null);
        snapshotRepository.setup(s => s.initialize()).returns(a => Observable.just(null));
        snapshotRepository.setup(s => s.getSnapshots()).returns(a => Observable.just<Dictionary<Snapshot<any>>>({}).observeOn(Scheduler.immediate));
        cluster = Mock.ofType<ICluster>();
        cluster.setup(c => c.whoami()).returns(() => "my-ip");
        engine = Mock.ofType<IProjectionEngine>();
        subject = new ClusteredProjectionEngine(engine.object, registry.object, snapshotRepository.object, projectionSorter.object, {}, cluster.object, NullLogger);
    });
    context("when the cluster starts", () => {
        beforeEach(() => {
            cluster.setup(c => c.lookup("projection1")).returns(() => "not-my-ip");
            cluster.setup(c => c.lookup("projection2")).returns(() => "my-ip");
        });
        it("should run the projections that match", () => {
            subject.run();
            engine.verify(e => e.run(It.isValue(projection1), It.isAny()), Times.never());
            engine.verify(e => e.run(It.isValue(projection2), It.isAny()), Times.once());
        });
    });
});