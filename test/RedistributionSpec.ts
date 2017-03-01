import "reflect-metadata";
import expect = require("expect.js");
import {Observable, Scheduler} from "rx";
import * as TypeMoq from "typemoq";
import {has} from "lodash";
import {
    IProjectionEngine, IProjectionRegistry, ISnapshotRepository, IProjection,
    AreaRegistry, RegistryEntry, IProjectionSorter, Dictionary, Snapshot, NullLogger, IProjectionRunner
} from "prettygoat";
import ICluster from "../scripts/ICluster";
import DynamicNameProjection from "./fixtures/DynamicNameProjection";
import ClusteredProjectionEngine from "../scripts/ClusteredProjectionEngine";
import MockProjectionRunner from "./fixtures/MockProjectionRunner";

describe("Given a set of projections to redistribute", () => {
    let subject: IProjectionEngine,
        registry: TypeMoq.IMock<IProjectionRegistry>,
        snapshotRepository: TypeMoq.IMock<ISnapshotRepository>,
        projection1: IProjection<any>,
        projection2: IProjection<any>,
        runner1: TypeMoq.IMock<IProjectionRunner<any>>,
        runner2: TypeMoq.IMock<IProjectionRunner<any>>,
        cluster: TypeMoq.IMock<ICluster>,
        projectionSorter: TypeMoq.IMock<IProjectionSorter>,
        engine: TypeMoq.IMock<IProjectionEngine>,
        holder: Dictionary<IProjectionRunner<any>>;

    beforeEach(() => {
        projection1 = new DynamicNameProjection("projection1").define();
        projection2 = new DynamicNameProjection("projection2").define();
        runner1 = TypeMoq.Mock.ofType(MockProjectionRunner);
        runner2 = TypeMoq.Mock.ofType(MockProjectionRunner);
        holder = {
            projection1: runner1.object,
            projection2: runner2.object
        };
        registry = TypeMoq.Mock.ofType<IProjectionRegistry>();
        registry.setup(r => r.getAreas()).returns(a => {
            return [
                new AreaRegistry("Admin", [
                    new RegistryEntry(projection1, "projection1"),
                    new RegistryEntry(projection2, "projection2")
                ])
            ]
        });
        projectionSorter = TypeMoq.Mock.ofType<IProjectionSorter>();
        projectionSorter.setup(s => s.sort()).returns(a => []);
        snapshotRepository = TypeMoq.Mock.ofType<ISnapshotRepository>();
        snapshotRepository.setup(s => s.saveSnapshot("test", TypeMoq.It.isValue(new Snapshot(66, new Date(5000))))).returns(a => null);
        snapshotRepository.setup(s => s.initialize()).returns(a => Observable.just(null));
        snapshotRepository.setup(s => s.getSnapshots()).returns(a => Observable.just<Dictionary<Snapshot<any>>>({}).observeOn(Scheduler.immediate));
        cluster = TypeMoq.Mock.ofType<ICluster>();
        cluster.setup(c => c.whoami()).returns(() => "my-ip");
        engine = TypeMoq.Mock.ofType<IProjectionEngine>();
        engine.setup(e => e.run(TypeMoq.It.isValue(projection1), TypeMoq.It.isAny()));
        engine.setup(e => e.run(TypeMoq.It.isValue(projection2), TypeMoq.It.isAny()));
        subject = new ClusteredProjectionEngine(engine.object, registry.object, snapshotRepository.object, projectionSorter.object, holder, cluster.object, NullLogger);
    });

    context("when a projection is assigned to a node", () => {
        beforeEach(() => {
            cluster.setup(c => c.lookup("projection1")).returns(() => "not-my-ip");
            cluster.setup(c => c.lookup("projection2")).returns(() => "my-ip");
        });
        context("and it was already running", () => {
            beforeEach(() => {
                holder["projection2"].stats.running = true;
            });
            it("should keep it like that", () => {
                subject.run();
                engine.verify(e => e.run(TypeMoq.It.isValue(projection2), TypeMoq.It.isAny()), TypeMoq.Times.never());
            });
        });
        context("and it was not running", () => {
            beforeEach(() => {
                holder["projection2"].stats.running = false;
            });
            it("should run that projection", () => {
                subject.run();
                engine.verify(e => e.run(TypeMoq.It.isValue(projection2), TypeMoq.It.isAny()), TypeMoq.Times.once());
            });
        });
    });

    context("when a projection is not assigned anymore to a certain node", () => {
        beforeEach(() => {
            cluster.setup(c => c.lookup("projection1")).returns(() => "not-my-ip");
            cluster.setup(c => c.lookup("projection2")).returns(() => "my-ip");
            runner1.object.stats.running = true;
            subject.run();
        });
        it("should be shut down", () => {
            runner1.verify(r => r.stop(), TypeMoq.Times.once());
        });

        it("should be removed from the runners holder", () => {
            expect(has(holder, "projection1")).to.be(false);
        });
    });
});
