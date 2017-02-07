import {ISnapshotStrategy, Projection, IProjection, IProjectionDefinition} from "prettygoat";

@Projection("Mock")
class MockProjectionDefinition implements IProjectionDefinition<number> {

    constructor(private strategy?: ISnapshotStrategy) {

    }

    define(): IProjection<number> {
        return {
            name: "test",
            definition: {
                $init: () => 10,
                TestEvent: (s, e: number) => s + e
            },
            snapshotStrategy: this.strategy
        };
    }

}

export default MockProjectionDefinition