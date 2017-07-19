import {IProjection, IProjectionDefinition} from "prettygoat";

class MockProjectionDefinition implements IProjectionDefinition<number> {

    constructor() {

    }

    define(): IProjection<number> {
        return {
            name: "test",
            definition: {
                $init: () => 10,
                TestEvent: (s, e: number) => s + e
            },
            publish: {}
        };
    }

}

export default MockProjectionDefinition
