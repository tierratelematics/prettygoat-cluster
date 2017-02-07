import Channel from "../../scripts/web/ChannelDecorator";

@Channel("test")
export class ChannelRequestHandler implements IRequestHandler {

    handle(request: IRequest, response: IResponse) {

    }

    keyFor(request: IRequest): string {
        return "testkey";
    }
}

@Route("GET", "/noforward")
export class NoForwardRequestHandler implements IRequestHandler {

    handle(request: IRequest, response: IResponse) {

    }

    keyFor(request: IRequest): string {
        return null;
    }
}