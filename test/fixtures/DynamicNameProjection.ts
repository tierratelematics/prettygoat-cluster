import {IProjection, IProjectionDefinition} from "prettygoat";

class DynamicNameProjection implements IProjectionDefinition<any> {

    constructor(private name: string) {

    }

    define(): IProjection<any> {
        return {
            name: this.name,
            definition: {},
            publish: {}
        };
    }

}

export default DynamicNameProjection
