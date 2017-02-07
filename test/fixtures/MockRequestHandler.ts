import {IRequestHandler, IRequest, IResponse, Route} from "prettygoat";

@Route("GET", "/test")
export class MockRequestHandler implements IRequestHandler {

    handle(request: IRequest, response: IResponse) {
    }

    keyFor(request: IRequest): string {
        return null;
    }

}

