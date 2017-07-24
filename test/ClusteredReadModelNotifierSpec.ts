import "reflect-metadata";
import expect = require("expect.js");
import {ClusteredReadModelNotifier} from "../scripts/ClusteredReadModels";
import {IProjectionRegistry, IProjection, IAsyncPublisherFactory, IAsyncPublisher, SpecialEvents} from "prettygoat";
import {IMock, Mock, Times, It} from "typemoq";
import ICluster from "../scripts/ICluster";
import {Observable} from "rxjs";
import MockRequest from "./fixtures/MockRequest";
import MockResponse from "./fixtures/MockResponse";

describe("Given a clustered readmodel notifier", () => {

    let subject: ClusteredReadModelNotifier;
    let registry: IMock<IProjectionRegistry>;
    let cluster: IMock<ICluster>;
    let asyncPublisherFactory: IMock<IAsyncPublisherFactory>;

    beforeEach(() => {
        cluster = Mock.ofType<ICluster>();
        registry = Mock.ofType<IProjectionRegistry>();
        let proj1 = Mock.ofType<IProjection>();
        proj1.setup(p => p.name).returns(() => "proj1");
        proj1.setup(p => p.publish).returns(() => {
            return {
                "point": {
                    readmodels: {
                        $list: ["readmodel1"],
                        $change: null
                    }
                }
            };
        });
        let proj2 = Mock.ofType<IProjection>();
        proj2.setup(p => p.name).returns(() => "proj2");
        proj2.setup(p => p.publish).returns(() => {
            return {
                "point2": {}
            };
        });
        registry.setup(r => r.projections()).returns(() => [
            ["Test", proj1.object],
            ["Test", proj2.object],
        ]);
        asyncPublisherFactory = Mock.ofType<IAsyncPublisherFactory>();
    });

    context("when a new readmodel is processed", () => {
        beforeEach(() => {
            asyncPublisherFactory.setup(a => a.publisherFor(It.isAny())).returns(() => {
                let publisher = Mock.ofType<IAsyncPublisher<any>>();
                publisher.setup(p => p.items(It.is<any>(value => !!value))).returns(() => Observable.of({
                    type: SpecialEvents.READMODEL_CHANGED,
                    payload: "readmodel1",
                    timestamp: new Date(6000)
                }));
                return publisher.object;
            });
        });
        it("should send the notification to the dependent nodes", () => {
            subject = new ClusteredReadModelNotifier(registry.object, cluster.object, asyncPublisherFactory.object);

            cluster.verify(c => c.handleOrProxyToAll(It.isValue(["proj1"]), It.isAny()), Times.once());
        });
    });

    context("when a new readmodel is produced", () => {
        let publisher: IMock<IAsyncPublisher<any>>;
        beforeEach(() => {
            asyncPublisherFactory.setup(a => a.publisherFor(It.isAny())).returns(() => {
                publisher = Mock.ofType<IAsyncPublisher<any>>();
                publisher.setup(p => p.items(It.is<any>(value => !!value))).returns(() => Observable.empty());
                return publisher.object;
            });
        });
        it("should be published", () => {
            subject = new ClusteredReadModelNotifier(registry.object, cluster.object, asyncPublisherFactory.object);
            subject.notifyChanged("readmodel1", new Date(6000));

            publisher.verify(p => p.publish(It.isValue({
                type: SpecialEvents.READMODEL_CHANGED,
                payload: "readmodel1",
                timestamp: new Date(6000)
            })), Times.once());
        });
    });

    context("when the changes of a specific readmodel are requested", () => {
        beforeEach(() => {
            cluster.setup(c => c.requests()).returns(() => Observable.create(observer => {
                observer.next([new MockRequest("pgoat://readmodel/change", {
                    type: SpecialEvents.READMODEL_CHANGED,
                    payload: "readmodel1",
                    timestamp: new Date(6000)
                }), new MockResponse()]);
                observer.next([new MockRequest("/api/stop"), new MockResponse()]);
                observer.next([new MockRequest("pgoat://readmodel/change", {
                    type: SpecialEvents.READMODEL_CHANGED,
                    payload: "readmodel2",
                    timestamp: new Date(7000)
                }), new MockResponse()]);
            }));
            cluster.setup(c => c.handleOrProxyToAll(It.isAny(), It.isAny())).returns(() => true);
            asyncPublisherFactory.setup(a => a.publisherFor(It.isAny())).returns(() => {
                let publisher = Mock.ofType<IAsyncPublisher<any>>();
                publisher.setup(p => p.items(It.is<any>(value => !!value))).returns(() => Observable.empty());
                return publisher.object;
            });
        });

        it("should receive all the changes", () => {
            let changes = [];
            subject = new ClusteredReadModelNotifier(registry.object, cluster.object, asyncPublisherFactory.object);
            subject.changes("readmodel1").subscribe(change => changes.push(change));

            expect(changes).to.have.length(1);
            expect(changes[0].payload).to.be("readmodel1");
        });
    });
});
