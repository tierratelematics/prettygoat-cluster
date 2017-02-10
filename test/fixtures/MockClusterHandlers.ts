import Channel from "../../scripts/web/ChannelDecorator";
import {IRequest, IRequestHandler, IResponse} from "prettygoat";

@Channel("test")
export class ChannelRequestHandler implements IRequestHandler {

    handle(request: IRequest, response: IResponse) {

    }

    keyFor(request: IRequest): string {
        return "testkey";
    }
}