import "reflect-metadata";
import expect = require("expect.js");
import {ClusteredReadModelRetriever} from "../scripts/ClusteredReadModels";
import {IMock, Mock, Times, It} from "typemoq";
import ICluster from "../scripts/ICluster";
import {IProjectionRunner, IReadModelNotifier, SpecialEvents} from "prettygoat";
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
        subject = new ClusteredReadModelRetriever(cluster.object, {"readmodel": runner.object}, readmodelNotifier.object);
    });

    context("when requesting a readmodel state", () => {
        context("when it's already been retrieved", () => {
            beforeEach(async () => {
                cluster.setup(c => c.handleOrProxy("readmodel", It.isAny(), It.isAny())).returns(() => true);
                readmodelNotifier.setup(r => r.changes("readmodel")).returns(() => Observable.of({
                    type: SpecialEvents.READMODEL_CHANGED,
                    payload: "readmodel",
                    timestamp: new Date(6000)
                }));
                await subject.modelFor("readmodel");
            });
            it("should pick it from cache", async () => {
                let readmodel = await subject.modelFor("readmodel");

                expect(readmodel).to.eql({count: 20});
                cluster.verify(c => c.handleOrProxy("readmodel", It.isAny(), It.isAny()), Times.once());
            });
        });

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
                    cluster.setup(c => c.handleOrProxy("readmodel", It.isAny(), It.isAny())).returns(() => true);
                });
                it("should pick the readmodel from memory", async () => {
                    let readmodel = await subject.modelFor("readmodel");

                    expect(readmodel).to.eql({count: 20});
                });
            });

            context("when it's on another node", () => {
                beforeEach(() => {
                    cluster.setup(c => c.handleOrProxy("readmodel", It.isAny(), It.isAny())).returns(() => false);
                    cluster.setup(c => c.requests()).returns(() => Observable.create(observer => {
                        observer.next([new MockRequest("/api"), new MockResponse()]);
                        observer.next([new MockRequest("pgoat://readmodel/payload", {
                            readmodel: "readmodel2",
                            payload: {
                                count: 40
                            }
                        }), new MockResponse()]);
                        observer.next([new MockRequest("pgoat://readmodel/payload", {
                            readmodel: "readmodel",
                            payload: {
                                count: 20
                            }
                        }), new MockResponse()]);
                    }));
                });
                it("should retrieve it from another node", async () => {
                    let readmodel = await subject.modelFor("readmodel");

                    expect(readmodel).to.eql({count: 20});
                });
            });
        });
    });
});
