import "reflect-metadata";
import expect = require("expect.js");
import {IMock, Mock, Times, It} from "typemoq";
import ClusteredHealthCheck from "../scripts/ClusteredHealthCheck";
import {ICluster} from "../scripts/Cluster";
import {IProjection, IProjectionRegistry, IRequest, IResponse} from "prettygoat";
import {IClusterConfig} from "../scripts/ClusterConfig";
import MockResponse from "./fixtures/MockResponse";
import {Observable} from "rxjs";
import MockRequest from "./fixtures/MockRequest";

describe("Given a clustered health check", () => {

    let subject: ClusteredHealthCheck;
    let cluster: IMock<ICluster>;
    let registry: IMock<IProjectionRegistry>;
    let request: IRequest;
    let response: IMock<IResponse>;

    beforeEach(() => {
        cluster = Mock.ofType<ICluster>();
        registry = Mock.ofType<IProjectionRegistry>();
        request = new MockRequest();
        response = Mock.ofType<IResponse>();
        let proj1 = Mock.ofType<IProjection>();
        proj1.setup(p => p.name).returns(() => "proj1");
        let proj2 = Mock.ofType<IProjection>();
        proj2.setup(p => p.name).returns(() => "proj2");
        registry.setup(r => r.projections()).returns(() => [
            ["Test", proj1.object],
            ["Test", proj2.object]
        ]);
        cluster.setup(c => c.canHandle("proj1")).returns(() => true);
        cluster.setup(c => c.canHandle("proj2")).returns(() => false);
        subject = new ClusteredHealthCheck(cluster.object, registry.object, <IClusterConfig>{nodes: ["127.0.0.1:4000", "127.0.0.1:4001"]});
    });

    context("when the health is requested", () => {
        beforeEach(() => {
            cluster.setup(c => c.changes()).returns(() => Observable.empty());
        });
        it("should return the list of active members and projections", () => {
            subject.handle(request, response.object);

            response.verify(r => r.send(It.isValue({
                members: ["127.0.0.1:4000", "127.0.0.1:4001"],
                unreachables: [],
                projections: ["proj1"]
            })), Times.once());
        });
    });

    context("when a node is removed", () => {
        beforeEach(() => {
            cluster.setup(c => c.changes()).returns(() => Observable.of({
                removed: ["127.0.0.1:4001"],
                added: []
            }));
        });
        it("should update the members list", () => {
            subject.handle(request, response.object);

            response.verify(r => r.send(It.isValue({
                members: ["127.0.0.1:4000"],
                unreachables: ["127.0.0.1:4001"],
                projections: ["proj1"]
            })), Times.once());
        });
    });

    context("when a node is added", () => {
        beforeEach(() => {
            cluster.setup(c => c.changes()).returns(() => Observable.of({
                added: ["127.0.0.1:4002"],
                removed: []
            }));
        });
        it("should update the members list", () => {
            subject.handle(request, response.object);

            response.verify(r => r.send(It.isValue({
                members: ["127.0.0.1:4000", "127.0.0.1:4001", "127.0.0.1:4002"],
                unreachables: [],
                projections: ["proj1"]
            })), Times.once());
        });
    });
});
