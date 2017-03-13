import {Engine, IModule, ILogger, LogLevel} from "prettygoat";

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

export class ProcessLogger implements ILogger {

    constructor(logger: ILogger);

    debug(message: string);

    info(message: string);

    warning(message: string);

    error(error: string|Error);

    setLogLevel(level: LogLevel);
}