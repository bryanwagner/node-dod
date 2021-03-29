# Node.js Data-Oriented Design Benchmark

Performs an Object-Oriented Design vs. Data-Oriented Design benchmark for the problem of calculating financial algorithms on cryptocurrency time-series data. Timings are written to log. When finished, writes sample data for charts and runs an http-server.

## Quickstart

We're using the more recent version of Node.js because some other experiments were performed using [n-api](https://nodejs.org/api/n-api.html) and [@thi.ng/simd](https://www.npmjs.com/package/@thi.ng/simd). To run:

```
$ nvm use 15.12.0
$ npm install
$ node index.js
```

## Problem Domain

OHLC Sample data for Bitcoin (BTC/USD) was downloaded in CSV format from [Crytpo Data Download](http://www.cryptodatadownload.com/data/gemini/).

![](res/hlc3.png)

![](res/osc.png)

[Technical Analysis](https://en.wikipedia.org/wiki/Technical_analysis) calculations:

* [Typical Price](https://en.wikipedia.org/wiki/Typical_price)
* [Bollinger Bands](https://en.wikipedia.org/wiki/Bollinger_Bands)
* [Relative Strength Index](https://en.wikipedia.org/wiki/Relative_strength_index)
* [Fast Stochastic](https://en.wikipedia.org/wiki/Stochastic_oscillator)
* [Money Flow Index](https://en.wikipedia.org/wiki/Money_flow_index)

In order to add to the amount of processing the benchmark does, several calculations are performed to find the median value for several data sets. Finding the median requires a sort, so it is a good problem to stress the opposing designs.

## Analysis

[Data-Oriented Design](https://en.wikipedia.org/wiki/Data-oriented_design)

[Entity Component Systems](https://en.wikipedia.org/wiki/Entity_component_system)
"For performance, we can learn a lot from video game engine developers"
* An *entity* is simply represented by an identifier
* a *component* is a property of an entity or entities represented by data 
* It is a *system* for which calculations are  updated in batches

ECS systems are best implemented as arrays of data transformations where component data is stored in arrays. Calculation dependencies are ordered semantically between arrays, and transformations happen array-by-array. This is the design implemented by `OhlcSystem`.

"Do I have more than one system?"
"How do I know just how well numpy is doing" (refer to jboner) [Latency Numbers Every Programmer Should Know](https://gist.github.com/jboner/2841832)

The main point of DoD is, "how do I orient my data in memory to maximize cache locality/minimize access to RAM"
It could be as simple as using a SQL statement to only select one column from a database as opposed to using an ORM mapped to a full data model.
It's not just data memory; you should also consider the icache (instructions).
    Calling the same functions across a loop is faster than calling many functions across the loop (and possibly invalidating the instruction cache)

What kinds of problems?
Any problem that is processing intensive. Data Transformations, ETL calculations, image processing, machine learning, deeplearning AI, simulation engines.

The kinds of problems this is not a good solution for are generalized scripting, rules-based logic, or event-driven systems such as most web platform backends which model user management with traditional Object-Oriented Design practices. These kinds of problems are more flexible in their design, which is advantageous when the effort to write high-performance software (in the context of CPU-level optimization) has diminishing returns.

### Array-of-Structs: Object-Oriented Design

Model encapsulating OHLC (Open, High, Low, Close) values used in financial markets such as Stock Markets and Cryptocurrency exchanges.

This model demonstrates the [Array-of-Structs](https://en.wikipedia.org/wiki/AoS_and_SoA) memory arrangement.

Note that in typical Object-Oriented Design, the fields would likely have more encapsulation,

but to demonstrate performance differences with Data-Oriented Design and Struct-of-Arrays,

we keep the model flat so it has the least indirection and best chance to compete.

Several calculations range across a window of n-periods.

```js
class Ohlc {
  constructor ({ date, open, high, low, close, volume } = {}) {
    this.date = date
    this.open = open
    this.high = high
    this.low = low
    this.close = close
    this.volume = volume
  }
}
```

### Struct-of-Arrays: Data-Oriented Design

System encapsulating OHLC (Open, High, Low, Close) values used in financial markets such as Stock Markets and Cryptocurrency exchanges.

This representation demonstrates [Struct-of-Arrays](https://en.wikipedia.org/wiki/AoS_and_SoA) memory arrangement.

SoA is typically modelled as a "system" where operations process over independent arrays.

Here we use all independent arrays (allocated in a common arena), but sometimes data is interleaved due to processing interdependency

(one common example is vertices in 2 or 3 space are typically stored as (x,y) and (x,y,z) pairs, respectively).

Several calculations range across a window of n-periods.

```js
class OhlcSystem {
  constructor (capacity) {
    this.length = 0

    // use a Memory Arena to maximize memory locality:
    // https://en.wikipedia.org/wiki/Region-based_memory_management
    // For more general problems, this becomes the limit for our batch size,
    // and we process our calculations in batches.
    const buffer = new ArrayBuffer(5 * capacity * Float64Array.BYTES_PER_ELEMENT)
    function mapTo (i) {
      return new Float64Array(buffer, i * capacity * Float64Array.BYTES_PER_ELEMENT, capacity)
    }
    this.opens = mapTo(0)
    this.highs = mapTo(1)
    this.lows = mapTo(2)
    this.closes = mapTo(3)
    this.volumes = mapTo(4)
  }
}
```

## Implementation

[dotenv](https://www.npmjs.com/package/dotenv) for config

[winston](https://www.npmjs.com/package/winston) for logging

Used [Standard.js](https://standardjs.com/)

The entrypoint into the application is `index.js` and logic is delegated to :

* Utility classes containing static, stateless functions (see `./src/util`)
* `Ohlc` - Object-Oriented model containing data for one OHLC instance
* `OhlcSystem` - Data-Oriented system (based on ECS) composing arrays of data for a series of OHLCs

Simple project although later tested n-api and SIMD

After benchmark, project runs Node http server to render charts with [Chart.js](https://www.chartjs.org/)

After calculating the data, we sample the data to make chart visualization easier. We sample two ways:
1. Evenly distributed sample count
2. (Optionally) the tail of the samples to see the most recent values

(AoS and SoA probably goes here)

We take advantage of Buffer:
buffer: https://nodejs.org/api/buffer.html

### CSV Parsing Considerations

Used [NodeCSV](https://www.npmjs.com/package/csv)

* considerations about how data is stored (do we need CSV? Perhaps binary data formats are better)
* considerations about code maintainability
* CSV format itself has a few gotchas but is not inherently difficult. [RFC 4180](https://tools.ietf.org/html/rfc4180#section-2)

Without opt: (4.98 + 5.10) = 10.08 seconds vs (3.41 + 3.45) = 6.86 seconds, or approximately 1.47 times faster.

## Results

Example result for `res/gemini_BTCUSD_2020_1min.csv`:

```json
stats: {
  "lineCountSeconds": 0.14650689999759198,
  "ohlcs": {
    "parseOhlcsFromCsvSeconds": 3.4075680999904874,
    "calculateAllSeconds": 6.010672399997711,
    "writeOhlcsSamplesSeconds": 0.003225700005888939
  },
  "ohlcSystem": {
    "parseOhlcsFromCsvSeconds": 3.4495963999927044,
    "calculateAllSeconds": 2.313260899990797,
    "writeOhlcsSamplesSeconds": 0.007214100003242492
  }
}
```

Reducing the processing time from 6.01 second to 2.31 seconds is approximately 2.6 times faster for simply reordering the data in memory to leverage CPU cache architectures.

window sizes: 20 vs 200

```json
stats: {
  "lineCountSeconds": 0.1463555999994278,
  "ohlcs": {
    "parseOhlcsFromCsvSeconds": 3.247934799998999,
    "calculateAllSeconds": 10.200312600001693,
    "writeOhlcsSamplesSeconds": 0.0034536000043153764
  },
  "ohlcSystem": {
    "parseOhlcsFromCsvSeconds": 3.3336841000020505,
    "calculateAllSeconds": 6.135633900001645,
    "writeOhlcsSamplesSeconds": 0.005962599992752076
  }
}
```

Total time increases, but the ratio is closer: 10.20 seconds vs. 6.14 seconds or 1.66 times faster. Increasing the window size means more time is spent in a tight loop. Since V8 is highly optimized

## Further Improvements

If we want to optimize this problem further, we're just scratching the surface. Talk about [Automatice vectorization](https://en.wikipedia.org/wiki/Automatic_vectorization)

Note that we could easily turn the Float63 arryas into Float32 arrays (actually, generalize)
Float32

[SIMD](https://en.wikipedia.org/wiki/SIMD)

[SIMD Intrinsics](https://software.intel.com/sites/landingpage/IntrinsicsGuide/)

n-api

but also SIMD. I convenient high-level abstraction for access to SIMD is [@thi.ng/simd
](https://www.npmjs.com/package/@thi.ng/simd), whih uses [AssemblyScript](https://www.assemblyscript.org/) to access [WebAssembly SIMD](https://github.com/WebAssembly/simd).

> [AssemblyScript](https://en.wikipedia.org/wiki/AssemblyScript) is a TypeScript-based programming language that is optimized for WebAssembly and compiled to WebAssembly using asc, the reference AssemblyScript compiler.

"is our problem highly parallelizable? In this case, consider something like [CUDA](https://developer.nvidia.com/cuda-toolkit) to leverage GPU parallel processing"

## References

* [Data-Oriented Design by Richard Fabian](https://www.dataorienteddesign.com/dodbook/)
* [High Performance JavaScript via Data Oriented Design](https://www.thomcc.io/2015/09/06/high-performance-javascript.html)
* [Latency Numbers Every Programmer Should Know](https://gist.github.com/jboner/2841832)
* [CppCon 2014: Mike Acton "Data-Oriented Design and C++"](https://www.youtube.com/watch?v=rX0ItVEVjHc&ab_channel=CppCon)
* [CppCon 2014: Chandler Carruth "Efficiency with Algorithms, Performance with Data Structures"](https://www.youtube.com/watch?v=fHNmRkzxHWs&ab_channel=CppCon)
* [Improving performance with SIMD intrinsics in three use cases](https://stackoverflow.blog/2020/07/08/improving-performance-with-simd-intrinsics-in-three-use-cases/)
* [Beginners guide to writing NodeJS Addons using C++ and N-API (node-addon-api)](https://medium.com/@a7ul/beginners-guide-to-writing-nodejs-addons-using-c-and-n-api-node-addon-api-9b3b718a9a7f)
* [How to call C/C++ code from Node.js](https://medium.com/@koistya/how-to-call-c-c-code-from-node-js-86a773033892)
* [Supercharging the TensorFlow.js WebAssembly backend with SIMD and multi-threading](https://blog.tensorflow.org/2020/09/supercharging-tensorflowjs-webassembly.html)