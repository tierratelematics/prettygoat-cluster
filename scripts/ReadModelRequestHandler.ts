import {IProjectionRunner, IRequest, IRequestHandler, IResponse, Route, Dictionary} from "prettygoat";
import {inject} from "inversify";

@Route("pgoat://readmodel/retrieve")
class ReadModelRequestHandler implements IRequestHandler {

    constructor(@inject("IProjectionRunnerHolder") private holder: Dictionary<IProjectionRunner>) {

    }

    handle(request: IRequest, response: IResponse) {
        let readmodel = request.body.readmodel,
            runner = this.holder[readmodel];
        response.send({
            timestamp: runner.stats.lastEvent,
            payload: runner.state
        });
    }

    keyFor(request: IRequest): string {
        return null;
    }
}

export default ReadModelRequestHandler
