import {IRouteResolver, IRequest, IRouteContext} from "prettygoat";

export default class MockRouteResolver implements IRouteResolver {
    resolve(request: IRequest): IRouteContext {
        return undefined;
    }

}