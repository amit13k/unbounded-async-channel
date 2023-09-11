type Queue<T> = {
  enqueue: (value: T) => void;
  dequeue: () => T | null;

  [Symbol.iterator]: () => Iterator<T>;
  size: number;
};

type Node<T> = {
  value: T;
  next: Node<T> | null;
};

export function createLinkedListQueue<T>(): Queue<T> {
  let front: Node<T> | null = null;
  let rear: Node<T> | null = null;

  let size = 0;
  return {
    enqueue: (value) => {
      const node = { value, next: null };
      if (rear === null) {
        front = node;
        rear = node;
      } else {
        rear.next = node;
        rear = node;
      }

      size++;
    },

    dequeue: () => {
      if (front === null) return null;
      const node = front;
      front = front.next;
      if (front === null) rear = null;

      size--;
      return node.value;
    },

    get size() {
      return size;
    },

    [Symbol.iterator]: function* () {
      let node = front;
      while (node !== null) {
        yield node.value;
        node = node.next;
      }
    },
  };
}
