import "reflect-metadata";
import expect = require("expect.js");
import {IMock, Mock, Times, It} from "typemoq";
import {has} from "lodash";
import {
    IProjectionEngine, IProjectionRegistry, IProjection, Dictionary, NullLogger, IProjectionRunner, ProjectionStats
} from "prettygoat";
import ICluster from "../scripts/ICluster";
import DynamicNameProjection from "./fixtures/DynamicNameProjection";
import ClusteredProjectionEngine from "../scripts/ClusteredProjectionEngine";

describe("Given a set of projections to redistribute", () => {
    let subject: IProjectionEngine,
        registry: IMock<IProjectionRegistry>,
        projection1: IProjection<any>,
        projection2: IProjection<any>,
        runner1: IMock<IProjectionRunner<any>>,
        runner2: IMock<IProjectionRunner<any>>,
        cluster: IMock<ICluster>,
        engine: IMock<IProjectionEngine>,
        holder: Dictionary<IProjectionRunner<any>>;

    beforeEach(() => {
        projection1 = new DynamicNameProjection("projection1").define();
        projection2 = new DynamicNameProjection("projection2").define();
        runner1 = Mock.ofType<IProjectionRunner>();
        runner2 = Mock.ofType<IProjectionRunner>();
        holder = {
            projection1: runner1.object,
            projection2: runner2.object
        };
        registry = Mock.ofType<IProjectionRegistry>();
        registry.setup(r => r.projections()).returns(() => [
            ["Admin", projection1], ["Admin", projection2]
        ]);
        cluster = Mock.ofType<ICluster>();
        engine = Mock.ofType<IProjectionEngine>();
        subject = new ClusteredProjectionEngine(engine.object, registry.object, holder, cluster.object, NullLogger);
    });

    context("when a projection is assigned to a node", () => {
        beforeEach(() => {
            cluster.setup(c => c.canHandle("projection1")).returns(() => false);
            cluster.setup(c => c.canHandle("projection2")).returns(() => true);
        });
        context("and it was already running", () => {
            beforeEach(() => {
                runner2.setup(r => r.stats).returns(() => {
                    return <ProjectionStats>{running: true};
                });
            });
            it("should keep it like that", () => {
                subject.run();
                engine.verify(e => e.run(It.isValue(projection2)), Times.never());
            });
        });
        context("and it was not running", () => {
            beforeEach(() => {
                holder["projection2"].stats.running = false;
            });
            it("should run that projection", () => {
                subject.run();
                engine.verify(e => e.run(It.isValue(projection2)), Times.once());
            });
        });
    });

    context("when a projection is not assigned anymore to a certain node", () => {
        beforeEach(() => {
            cluster.setup(c => c.canHandle("projection1")).returns(() => false);
            cluster.setup(c => c.canHandle("projection2")).returns(() => true);
            runner1.setup(r => r.stats).returns(() => {
                return <ProjectionStats>{running: true};
            });
            subject.run();
        });
        it("should be shut down", () => {
            runner1.verify(r => r.stop(), Times.once());
        });

        it("should be removed from the runners holder", () => {
            expect(has(holder, "projection1")).to.be(false);
        });
    });
});
