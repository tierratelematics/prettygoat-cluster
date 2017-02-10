import {IProjection, Projection, IProjectionDefinition} from "prettygoat";

@Projection("Dynamic")
class DynamicNameProjection implements IProjectionDefinition<any> {

    constructor(private name: string) {

    }

    define(): IProjection<any> {
        return {
            name: this.name,
            definition: {}
        }
    }

}

export default DynamicNameProjection