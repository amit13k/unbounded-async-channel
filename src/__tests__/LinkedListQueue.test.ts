import { createLinkedListQueue } from "../linked-list-queue";

describe("LinkedListQueue", () => {
  it("deque should return null when queue is empty", () => {
    const queue = createLinkedListQueue();
    expect(queue.dequeue()).toBeNull();
  });

  it("should enqueue and dequeue objects", () => {
    const queue = createLinkedListQueue<string>();
    queue.enqueue("a");

    expect(queue.size).toBe(1);

    expect(queue.dequeue()).toBe("a");

    expect(queue.size).toBe(0);
    expect(queue.dequeue()).toBeNull();
    expect(queue.size).toBe(0);

    queue.enqueue("b");
    queue.enqueue("c");

    expect(queue.size).toBe(2);

    expect(queue.dequeue()).toBe("b");
    expect(queue.dequeue()).toBe("c");

    expect(queue.size).toBe(0);

    expect(queue.dequeue()).toBeNull();

    queue.enqueue("d");
    queue.enqueue("e");
    queue.enqueue("f");

    expect(queue.size).toBe(3);

    expect(queue.dequeue()).toBe("d");

    expect(queue.size).toBe(2);

    queue.enqueue("g");

    expect(queue.size).toBe(3);

    expect(queue.dequeue()).toBe("e");
    expect(queue.dequeue()).toBe("f");
    expect(queue.dequeue()).toBe("g");
    expect(queue.dequeue()).toBeNull();

    expect(queue.size).toBe(0);
  });
});
