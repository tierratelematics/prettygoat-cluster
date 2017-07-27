import "reflect-metadata";
import expect = require("expect.js");
import {IMock, Mock, Times, It} from "typemoq";
import ClusteredRequestAdapter from "../scripts/ClusteredRequestAdapter";
import ICluster from "../scripts/ICluster";
import MockResponse from "./fixtures/MockResponse";
import MockRequest from "./fixtures/MockRequest";
import {IResponse, IRequest, IRequestHandler, IRouteResolver, IRequestAdapter} from "prettygoat";
const anyValue = It.isAny();

describe("Given a ClusteredRequestAdapter and a new request", () => {
    let subject: IRequestAdapter;
    let routeResolver: IMock<IRouteResolver>;
    let cluster: IMock<ICluster>;
    let request: IRequest;
    let response: IMock<IResponse>;
    let requestHandler: IMock<IRequestHandler>;

    beforeEach(() => {
        requestHandler = Mock.ofType<IRequestHandler>();
        request = new MockRequest();
        request.method = "GET";
        request.originalRequest = undefined;
        response = Mock.ofType(MockResponse);
        response.setup(r => r.status(anyValue)).returns(() => response.object);
        cluster = Mock.ofType<ICluster>();
        routeResolver = Mock.ofType<IRouteResolver>();
        routeResolver.setup(r => r.resolve(anyValue)).returns(() => [requestHandler.object, {}]);
        subject = new ClusteredRequestAdapter(cluster.object, routeResolver.object);
    });

    context("when a sharding key is provided", () => {
        beforeEach(() => {
            requestHandler.setup(r => r.keyFor(anyValue)).returns(() => "testkey");
        });
        context("when it can be handled on the current node", () => {
            beforeEach(() => {
                cluster.setup(c => c.handleOrProxy("testkey", undefined, undefined)).returns(() => true);
            });
            it("should route the message to the specific handler", () => {
                request.url = "/test";
                subject.route(request, response.object);
                requestHandler.verify(r => r.handle(It.isValue(request), It.isValue(response.object)), Times.once());
            });
        });

        context("when it cannot be handled on the current node", () => {
            beforeEach(() => {
                cluster.setup(c => c.handleOrProxy("testkey", undefined, undefined)).returns(() => false);
            });
            it("should proxy the request to the next node", () => {
                request.url = "/test";
                subject.route(request, response.object);
                requestHandler.verify(r => r.handle(It.isValue(request), It.isValue(response.object)), Times.never());
                cluster.verify(c => c.handleOrProxy("testkey", undefined, undefined), Times.once());
            });
        });
    });

    context("when no sharding key is provided", () => {
        beforeEach(() => {
            requestHandler.setup(r => r.keyFor(anyValue)).returns(() => null);
        });
        it("should handle the request on the current node", () => {
            request.url = "/noforward";
            subject.route(request, response.object);
            cluster.verify(c => c.handleOrProxy(anyValue, undefined, undefined), Times.never());
            requestHandler.verify(r => r.handle(It.isValue(request), It.isValue(response.object)), Times.once());
        });
    });
});