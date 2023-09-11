[![Coverage Status](https://coveralls.io/repos/github/amit13k/unbounded-async-channel/badge.svg?branch=main)](https://coveralls.io/github/amit13k/unbounded-async-channel?branch=main)
[![npm](https://img.shields.io/npm/v/unbounded-async-channel)](https://www.npmjs.com/package/unbounded-async-channel)
![NPM](https://img.shields.io/npm/l/unbounded-async-channel)

# Documentation

The unbounded-async-channel library provides a simple unbounded channel that allows for concurrent reading and writing of values.

Writing to the channel is synchronous and non-blocking, while reading from the channel blocks until a value is written or the channel is closed.

If there are no readers when a value is written, the value is buffered and available for future readers.

## Installation

```
npm i unbounded-async-channel
```

## Basic Usage

```ts
import { createUnboundedAsyncChannel } from "unbounded-async-channel";

// create an UnboundedAsyncChannel with the provided type
const channel = createUnboundedAsyncChannel<number>();

// writing to channel is a non blocking operation
channel.write(1);

// read() blocks until a value is available or the channel is closed. read() doesn't throw any error
const res = await channel.read();

if (res.closed) {
  if (res.error) {
    console.log("Channel closed with error", res.error);
  } else {
    console.log("Channel closed without any error");
  }
} else {
  console.log(res.value);
}
```

## Reading values using for await loop

UnboundedAsyncChannel can be iterated using for await loop.

```ts
import { createUnboundedAsyncChannel } from "unbounded-async-channel";

const channel = createUnboundedAsyncChannel<number>();

for (let i = 0; i < 10; i++) {
  channel.write(i);
}

channel.close();

try {
  for await (const value of channel) {
    console.log(value);
  }
  console.log("channel closed without error");
} catch (err) {
  console.log("channel closed with error");
}
```

## Closing a channel with error

If a channel is closed with an error and there are no readers, a future reader can receive that error after consuming all the buffered values in the channel.

A for await loop will also first consume all buffered values before throwing an error. If the channel was closed without any error, a for await loop will cleanly end.

## Clearing a channel after closing

A closed channel may contain buffered values.
To clear all buffered values consume all the messages

```ts
channel.close();
// after closing the channel, this will not block
for await (const value of channel) {
}
```

## Example: Concurrent processing of tasks

```ts
import { createUnboundedAsyncChannel } from "unbounded-async-channel";

// channel to write tasks to
const tasks = createUnboundedAsyncChannel<string>();

// channel to write task results to
const taskResults = createUnboundedAsyncChannel<string>();

// queue all the tasks to be processed later
for (let i = 0; i < 1000; i++) {
  tasks.write(`some_url_${i}`);
}

// close the channel without passing an error
tasks.close();

// array to store worker promises
const workerPromises = [];

// create 10 workers to process the tasks
for (let i = 0; i < 10; i++) {
  workerPromises.push(
    new Promise<void>(async (resolve) => {
      try {
        /**
         * - Error is thrown only if the channel is closed with error parameter.
         * - Also error is not thrown immediately after closing the channel but
         *   instead after all buffered values are consumed
         */
        for await (const url of tasks) {
          // process the task
          const result = `processed ${url}`;
          taskResults.write(result);
        }
      } catch (e) {
        console.log("channel closed with error", e);
      }

      resolve();
    }),
  );
}

// wait for all workers to finish and then close the taskResults channel
Promise.all(workerPromises).then(() => {
  taskResults.close();
});

// consume the task results
for await (const result of taskResults) {
  console.log(result);
}
```
