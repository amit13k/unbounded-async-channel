import { createUnboundedAsyncChannel } from "..";

describe("UnboundedAsyncChannel", () => {
  describe("read and write without closing channel", () => {
    it("write a value and read it back", async () => {
      const channel = createUnboundedAsyncChannel<number>();
      channel.write(1);

      expect(await channel.read()).toEqual({
        closed: false,
        value: 1,
      });
    });

    it("write a value, read it, write more and read again", async () => {
      const channel = createUnboundedAsyncChannel<number>();
      channel.write(1);

      expect(await channel.read()).toEqual({
        closed: false,
        value: 1,
      });

      channel.write(2);

      expect(await channel.read()).toEqual({
        closed: false,
        value: 2,
      });
    });

    it("try to read value when channel is empty, write value later", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      expect(channel.read()).resolves.toEqual({
        closed: false,
        value: 1,
      });

      channel.write(1);
    });

    it("try read slower/write faster values concurrently", async () => {
      const channel = createUnboundedAsyncChannel<number>();
      const writeFunction = async () => {
        for (let i = 0; i < 3; i++) {
          channel.write(i);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      };

      const readFunction = async () => {
        for (let i = 0; i < 3; i++) {
          expect(await channel.read()).toEqual({
            closed: false,
            value: i,
          });
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      };

      await Promise.all([writeFunction(), readFunction()]);
    });

    it("try read faster/write slower faster values concurrently", async () => {
      const channel = createUnboundedAsyncChannel<number>();
      const writeFunction = async () => {
        for (let i = 0; i < 3; i++) {
          channel.write(i);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      };

      const readFunction = async () => {
        for (let i = 0; i < 3; i++) {
          expect(await channel.read()).toEqual({
            closed: false,
            value: i,
          });
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      };

      await Promise.all([writeFunction(), readFunction()]);
    });

    it("written values are read in order", async () => {
      const channel = createUnboundedAsyncChannel<number>();
      channel.write(1);
      channel.write(2);

      expect(await channel.read()).toEqual({
        closed: false,
        value: 1,
      });

      expect(await channel.read()).toEqual({
        closed: false,
        value: 2,
      });
    });
  });

  describe("close channel", () => {
    it("create channel, close it without error", async () => {
      const channel = createUnboundedAsyncChannel<number>();
      channel.close();

      expect(await channel.read()).toEqual({
        closed: true,
        error: undefined,
      });

      expect(channel.write(1)).toEqual({
        closed: true,
        error: undefined,
      });

      // read after writing to a closed channel should still return closed channel
      expect(await channel.read()).toEqual({
        closed: true,
        error: undefined,
      });

      expect(channel.state).toEqual({
        closed: true,
        error: undefined,
      });
    });

    it("create channel, close it with error", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      const closeError = new Error("test error");
      channel.close(closeError);

      expect(await channel.read()).toEqual({
        closed: true,
        error: closeError,
      });

      expect(channel.write(1)).toEqual({
        closed: true,
        error: closeError,
      });

      // read after writing to closed channel should still return closed channel
      expect(await channel.read()).toEqual({
        closed: true,
        error: closeError,
      });

      expect(channel.state).toEqual({
        closed: true,
        error: closeError,
      });
    });

    it("create channel, write some values, close it without error, read all values", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      channel.write(1);
      channel.write(2);
      channel.close();

      expect(await channel.read()).toEqual({
        closed: false,
        value: 1,
      });
      expect(await channel.read()).toEqual({
        closed: false,
        value: 2,
      });

      expect(await channel.read()).toEqual({
        closed: true,
        error: undefined,
      });
    });

    it("create channel, write some values, close it with error, read all values", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      channel.write(1);
      channel.write(2);

      const closeError = new Error("test error");
      channel.close(closeError);

      expect(await channel.read()).toEqual({
        closed: false,
        value: 1,
      });
      expect(await channel.read()).toEqual({
        closed: false,
        value: 2,
      });

      expect(await channel.read()).toEqual({
        closed: true,
        error: closeError,
      });

      expect(await channel.read()).toEqual({
        closed: true,
        error: closeError,
      });
    });

    it("write values, close without error and read using for await of", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      const writeFunction = async () => {
        for (let i = 0; i < 3; i++) {
          channel.write(i);
        }
        channel.close();
      };

      const readFunction = async () => {
        const values: number[] = [];
        for await (const value of channel) {
          values.push(value);
        }

        expect(values).toEqual([0, 1, 2]);
      };

      await Promise.all([writeFunction(), readFunction()]);
    });

    it("write values, close with error and read using for await of", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      const closeEror = new Error("test error");
      const writeFunction = async () => {
        for (let i = 0; i < 3; i++) {
          channel.write(i);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        channel.close(closeEror);
      };

      const readFunction = async () => {
        const values: number[] = [];

        try {
          for await (const value of channel) {
            values.push(value);
          }
          expect(true).toEqual(false);
        } catch (error) {
          expect(error).toEqual(closeEror);
        }

        expect(values).toEqual([0, 1, 2]);
      };

      await Promise.all([writeFunction(), readFunction()]);
    });

    it("close channel multiple times should not throw error", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      channel.close();
      channel.close();
      channel.close();

      expect(await channel.read()).toEqual({
        closed: true,
        error: undefined,
      });
    });

    it("if closed with no error, any further close calls should not change the error", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      channel.close();

      expect(await channel.read()).toEqual({
        closed: true,
        error: undefined,
      });

      const closeError = new Error("test error");
      channel.close(closeError);

      expect(await channel.read()).toEqual({
        closed: true,
        error: undefined,
      });
    });

    it("if closed with error, any further close calls should not change that error", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      const closeError = new Error("test error");
      channel.close(closeError);

      expect(await channel.read()).toEqual({
        closed: true,
        error: closeError,
      });

      channel.close();

      expect(await channel.read()).toEqual({
        closed: true,
        error: closeError,
      });

      channel.close(new Error("another error"));

      expect(await channel.read()).toEqual({
        closed: true,
        error: closeError,
      });
    });

    it("closing channel without error should resolve pending read calls", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      expect(channel.read()).resolves.toEqual({
        closed: true,
        error: undefined,
      });

      channel.close();
    });

    it("closing channel with error should resolve pending read calls", async () => {
      const channel = createUnboundedAsyncChannel<number>();
      const closedError = new Error("test error");

      expect(channel.read()).resolves.toEqual({
        closed: true,
        error: closedError,
      });

      channel.close(closedError);
    });

    it("multiple for await of loops should work", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      const writtenValues: Set<number> = new Set([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);
      const writeFunction = async () => {
        for (const value of writtenValues) {
          channel.write(value);
        }
        channel.close();
      };

      const readValues: Set<number> = new Set();

      const readFunction = async () => {
        for await (const value of channel) {
          readValues.add(value);
        }
      };

      await Promise.all([
        writeFunction(),
        readFunction(),
        readFunction(),
        readFunction(),
      ]);
      expect(readValues).toEqual(writtenValues);
    });

    it("multiple writers and multiple readers using for await loop should work", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      const writtenValues: Set<number> = new Set([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);

      const batch1 = [0, 1, 2, 3, 4];
      const batch2 = [5, 6, 7, 8, 9];

      const writeFunction = async (values: number[]) => {
        for (const value of values) {
          channel.write(value);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      };

      const readValues: Set<number> = new Set();

      const readFunction = async () => {
        for await (const value of channel) {
          readValues.add(value);
        }
      };

      const concurrentWriteFunction = async () => {
        await Promise.all([writeFunction(batch1), writeFunction(batch2)]);
        channel.close();
      };

      await Promise.all([
        concurrentWriteFunction(),
        readFunction(),
        readFunction(),
        readFunction(),
      ]);

      expect(readValues).toEqual(writtenValues);
    });

    it("multiple writers and multiple readers using read should work", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      const writtenValues: Set<number> = new Set([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);

      const batch1 = [0, 1, 2, 3, 4];
      const batch2 = [5, 6, 7, 8, 9];

      const writeFunction = async (values: number[]) => {
        for (const value of values) {
          channel.write(value);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      };

      const readValues: Set<number> = new Set();

      const readFunction = async () => {
        while (true) {
          const result = await channel.read();
          if (result.closed) {
            break;
          }
          readValues.add(result.value);
        }
      };

      const concurrentWriteFunction = async () => {
        await Promise.all([writeFunction(batch1), writeFunction(batch2)]);
        channel.close();
      };

      await Promise.all([
        concurrentWriteFunction(),
        readFunction(),
        readFunction(),
        readFunction(),
      ]);

      expect(readValues).toEqual(writtenValues);
    });

    it("both read and for await loop can be used concurrently", async () => {
      const channel = createUnboundedAsyncChannel<number>();

      const writtenValues: Set<number> = new Set([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);

      const batch1 = [0, 1, 2, 3, 4];
      const batch2 = [5, 6, 7, 8, 9];

      const writeFunction = async (values: number[]) => {
        for (const value of values) {
          channel.write(value);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      };

      const readValues: Set<number> = new Set();

      const readFunction = async () => {
        while (true) {
          const result = await channel.read();
          if (result.closed) {
            break;
          }
          readValues.add(result.value);
        }
      };

      const readFunctionForAwait = async () => {
        for await (const value of channel) {
          readValues.add(value);
        }
      };

      const concurrentWriteFunction = async () => {
        await Promise.all([writeFunction(batch1), writeFunction(batch2)]);
        channel.close();
      };

      await Promise.all([
        concurrentWriteFunction(),
        readFunction(),
        readFunctionForAwait(),
      ]);

      expect(readValues).toEqual(writtenValues);
    });
  });
});
