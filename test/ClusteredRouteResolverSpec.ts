import "reflect-metadata";
import expect = require("expect.js");
import {IMock, Mock, Times, It} from "typemoq";
import {ChannelRequestHandler} from "./fixtures/MockClusterHandlers";
import MockRequest from "./fixtures/MockRequest";
import ClusteredRouteResolver from "../scripts/web/ClusteredRouteResolver";
import {IRouteResolver, IRequest, IRequestHandler} from "prettygoat";

describe("Given a ClusteredRouteResolver and a request", () => {

    let subject: IRouteResolver;
    let baseStrategy: IMock<IRouteResolver>;
    let request: IRequest;
    let requestHandler: IRequestHandler;

    beforeEach(() => {
        requestHandler = new ChannelRequestHandler();
        request = new MockRequest();
        baseStrategy = Mock.ofType<IRouteResolver>();
        subject = new ClusteredRouteResolver(baseStrategy.object, [requestHandler]);
    });

    context("when the request is coming from a channel", () => {
        context("and a registered handler can receive the request", () => {
            it("should route it", () => {
                request.channel = "test";
                let context = subject.resolve(request);
                expect(context[0]).to.be(requestHandler);
            });
        });

        context("and no registered handlers can receive the request", () => {
            it("should drop it", () => {
                request.channel = "badChannel";
                let context = subject.resolve(request);
                expect(context[0]).to.be(null);
            });
        });
    });

    context("when the request is not coming from a channel", () => {
        it("should route the request using the base strategy", () => {
            request.url = "/something";
            subject.resolve(request);
            baseStrategy.verify(baseStrategy => baseStrategy.resolve(It.isValue(request)), Times.once());
        });
    });
});