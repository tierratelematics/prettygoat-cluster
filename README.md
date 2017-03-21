# Prettygoat-cluster

Workload distribution and failover for [prettygoat](https://github.com/tierratelematics/prettygoat) based on [ringpop](https://github.com/uber/ringpop-node).

## Installation

`
$ npm install prettygoat-cluster
`

## Usage

Register the module with prettygoat

```typescript
import {ClusteredEngine} from "prettygoat-cluster";

let engine = new ClusteredEngine();
//Register projections...
engine.run();
```

This will run the engine with the default cluster configuration (one node).
If you need to run different instances on the same machine just drop this configuration:

```typescript
container.bind<IClusterConfig>("IClusterConfig").toConstantValue({
    nodes: ["127.0.0.1:4000", "127.0.0.1:4001"],
    port: 4000,
    host: "127.0.0.1",
    forks: 2
});
```

## Load balancing

To load balance HTTP and Websockets among the cluster, use [loadbalancer](https://www.npmjs.com/package/loadbalancer).

Example configuration:

```json
{
  "sourcePort": 8000,
  "stickiness": false,
  "targets": [
    {
      "host": "127.0.0.1",
      "port": 3000
    },
    {
      "host": "127.0.0.1",
      "port": 3001
    }
  ]
}
```

## Socket.io clustering

In order to correctly send notifications between all the instances of socket.io server, you need to provide a Redis configuration.

```typescript
container.bind<IRedisConfig>("IRedisConfig").toConstantValue({
    host: "localhost",
    port: 6379
});
```

## License

Copyright 2016 Tierra SpA

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
