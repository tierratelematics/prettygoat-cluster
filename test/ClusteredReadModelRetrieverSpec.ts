import "reflect-metadata";
import expect = require("expect.js");
import {ClusteredReadModelRetriever} from "../scripts/ClusteredReadModels";
import {IMock, Mock, Times, It} from "typemoq";
import ICluster from "../scripts/ICluster";
import {IProjectionRunner, IReadModelNotifier, SpecialEvents, ProjectionStats} from "prettygoat";
import {Observable} from "rxjs";
import MockRequest from "./fixtures/MockRequest";
import MockResponse from "./fixtures/MockResponse";

describe("Given a clustered readmodel retriever", () => {

    let subject: ClusteredReadModelRetriever;
    let cluster: IMock<ICluster>;
    let runner: IMock<IProjectionRunner>;
    let readmodelNotifier: IMock<IReadModelNotifier>;

    beforeEach(() => {
        cluster = Mock.ofType<ICluster>();
        runner = Mock.ofType<IProjectionRunner>();
        runner.setup(r => r.state).returns(() => {
            return {count: 20};
        });
        readmodelNotifier = Mock.ofType<IReadModelNotifier>();
        cluster.setup(c => c.whoami()).returns(() => "my-ip");
        subject = new ClusteredReadModelRetriever(cluster.object, {"readmodel": runner.object}, readmodelNotifier.object);
    });

    context("when requesting a readmodel state", () => {
        context("when it's not retrieved yet", () => {
            beforeEach(() => {
                readmodelNotifier.setup(r => r.changes("readmodel")).returns(() => Observable.of({
                    type: SpecialEvents.READMODEL_CHANGED,
                    payload: "readmodel",
                    timestamp: new Date(6000)
                }));
            });
            context("when it's on the same node", () => {
                beforeEach(() => {
                    cluster.setup(c => c.lookup("readmodel")).returns(() => "my-ip");
                });
                it("should pick the readmodel from memory", async () => {
                    let readmodel = await subject.modelFor("readmodel");

                    expect(readmodel).to.eql({count: 20});
                });
            });

            context("when it's on another node", () => {
                beforeEach(() => {
                    cluster.setup(c => c.whoami()).returns(() => "not-my-ip");
                    cluster.setup(c => c.send("readmodel", It.isValue({
                        channel: "readmodel/retrieve",
                        payload: {readmodel: "readmodel"}
                    }))).returns(() => Promise.resolve({
                        type: "readmodel",
                        payload: {
                            count: 20
                        },
                        timestamp: new Date(6000)
                    }));
                });
                it("should retrieve it from another node", async () => {
                    let readmodel = await subject.modelFor("readmodel");

                    expect(readmodel).to.eql({count: 20});
                });

                it("should avoid duplicate requests to the same readmodel", async () => {
                    let readmodel = await subject.modelFor("readmodel");
                    readmodel = await subject.modelFor("readmodel");

                    expect(readmodel).to.eql({count: 20});
                    cluster.verify(c => c.lookup("readmodel"), Times.once());
                });
            });
        });
    });
});
