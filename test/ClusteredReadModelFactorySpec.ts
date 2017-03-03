import "reflect-metadata";
import expect = require("expect.js");
import {IMock, Mock, Times, It} from "typemoq";
import ClusteredReadModelFactory from "../scripts/ClusteredReadModelFactory";
import ICluster from "../scripts/ICluster";
import DynamicNameProjection from "./fixtures/DynamicNameProjection";
import {IReadModelFactory, IProjectionRegistry, IProjectionSorter, RegistryEntry, Event, RequestData} from "prettygoat";
import {Observable} from "rx";
import MockResponse from "./fixtures/MockResponse";
import MockRequest from "./fixtures/MockRequest";

describe("Given a ClusteredReadModelFactory", () => {

    let subject: IReadModelFactory;
    let cluster: IMock<ICluster>;
    let sorter: IMock<IProjectionSorter>;
    let registry: IMock<IProjectionRegistry>;

    beforeEach(() => {
        cluster = Mock.ofType<ICluster>();
        sorter = Mock.ofType<IProjectionSorter>();
        registry = Mock.ofType<IProjectionRegistry>();
        registry.setup(r => r.getEntry("Projection")).returns(() => {
            return {area: null, data: new RegistryEntry(new DynamicNameProjection("Projection").define(), null)};
        });
        sorter.setup(sorter => sorter.dependents(It.isValue(new DynamicNameProjection("Projection").define()))).returns(() => ["Proj2", "Proj3"]);
        subject = new ClusteredReadModelFactory(registry.object, cluster.object, sorter.object);
    });

    context("when a new readmodel is published", () => {
        let readModel: Event;
        beforeEach(() => {
            cluster.setup(c => c.requests()).returns(() => Observable.empty<RequestData>());
            readModel = {
                type: "Projection",
                payload: {
                    "id": 20
                },
                splitKey: null,
                timestamp: null
            };
            subject.publish(readModel);
        });

        it("should broadcast it to the dependent nodes", () => {
            cluster.verify(c => c.handleOrProxyToAll(It.isValue(["Proj2", "Proj3"]), It.isAny()), Times.once());
        });

        it("should cache it", () => {
            expect(subject.asList()).to.eql([readModel]);
        });
    });

    context("when the stream of readmodels is subscribed", () => {
        beforeEach(() => {
            cluster.setup(c => c.requests()).returns(() => Observable.create<RequestData>(observer => {
                observer.onNext([new MockRequest(null, {
                    type: "Projection",
                    payload: 10,
                    splitKey: null,
                    timestamp: null
                }, "readModel"), new MockResponse()]);
                observer.onNext([new MockRequest("/api/stop"), new MockResponse()]);
                observer.onNext([new MockRequest(null, {
                    type: "Projection",
                    payload: 20,
                    splitKey: null,
                    timestamp: null
                }, "readModel"), new MockResponse()]);
            }));
        });
        it("should merge the readmodels coming from the other nodes", () => {
            let notifications: Event[] = [];
            subject.publish({
                type: "Projection",
                payload: 50,
                splitKey: null,
                timestamp: null
            });
            subject.from(null).subscribe(readModel => notifications.push(readModel));
            expect(notifications).to.have.length(3);
            expect(notifications[0].payload).to.be(50);
            expect(notifications[1].payload).to.be(10);
            expect(notifications[2].payload).to.be(20);
        });
    });
});