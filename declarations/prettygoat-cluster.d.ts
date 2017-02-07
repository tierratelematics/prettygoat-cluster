export class ClusteredEngine extends Engine {

    register(module: IModule): boolean;

    boot(overrides?: any);

    run(overrides?: any);
}

export function Channel(name: string);

export interface IClusterConfig {
    nodes: string[];
    port: number;
    host: string;
    forks: number;
}
