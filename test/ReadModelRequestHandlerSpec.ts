import "reflect-metadata";
import {IMock, Mock, It, Times} from "typemoq";
import ReadModelRequestHandler from "../scripts/ReadModelRequestHandler";
import {IProjectionRunner, ProjectionStats} from "prettygoat";
import MockRequest from "./fixtures/MockRequest";
import MockResponse from "./fixtures/MockResponse";

context("Given a readmodel request handler", () => {
    let subject: ReadModelRequestHandler;

    beforeEach(() => {
        let runner = Mock.ofType<IProjectionRunner>();
        runner.setup(r => r.state).returns(() => {
            return {count: 20};
        });
        runner.setup(r => r.stats).returns(() => {
            let stats = new ProjectionStats();
            stats.lastEvent = new Date(1000);
            return stats;
        });
        subject = new ReadModelRequestHandler({"readmodel": runner.object});

    });

    context("when a readmodel is requested", () => {
        it("should respond with it", () => {
            let request = new MockRequest();
            request.body = {readmodel: "readmodel"};
            let response = Mock.ofType(MockResponse);
            subject.handle(request, response.object);

            response.verify(r => r.send(It.isValue({
                timestamp: new Date(1000),
                payload: {count: 20}
            })), Times.once());
        });
    });
});