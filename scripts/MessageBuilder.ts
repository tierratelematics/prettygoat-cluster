import {IncomingMessage, ServerResponse} from "http";
const {Request, Response} = require("hammock");

class MessageBuilder {

    static messageFor(channel: string, payload: any): IncomingMessage {
        let request = new Request({url: `pgoat://${channel}`});
        request.end(JSON.stringify(payload));
        return request;
    }

    static emptyResponse(): ServerResponse {
        return new Response();
    }
}

export default MessageBuilder
