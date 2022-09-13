
export type PoolObject = {
    reset(): void;
}

export interface Pool<T extends PoolObject> {
    get(): T;
    release(item: T): void;
}

export interface SimpleArrayPool<T extends number> {
    get(): T[];
    release(item: T[]): void;
}

export interface ArrayPool<T extends PoolObject> {
    get(): T[];
    release(item: T[]): void;
}

export class ObjectPool<T extends PoolObject> implements Pool<T> {
    private data: T[];
    constructor(private factory: () => T) {
        this.data = [];
    }

    get(): T {
        if (this.data.length) {
            return this.data.pop() as T;
        }
        return this.factory();
    }

    release(item: T) {
        item.reset();
        this.data.push(item);
    }
}

export class SimpleArrayPool<T extends number> implements SimpleArrayPool<T> {
    private factory: () => T[];
    private data: T[][];

    constructor() {
        this.factory = () => {
            return [] as T[];
        }
        this.data = [];
    }

    get(): T[] {
        if (this.data.length) {
            return this.data.pop() as T[];
        }
        return this.factory();
    }

    release(item: T[]): void {
        item.length = 0;
        this.data.push(item);
    }
}

export class ArrayPoolImpl<T extends PoolObject> implements ArrayPool<T> {
    private factory: () => T[];
    private data: T[][];

    constructor(private pool: Pool<T>) {
        this.factory = () => {
            return [] as T[];
        }
        this.data = [];
    }

    get(): T[] {
        if (this.data.length) {
            return this.data.pop() as T[];
        }
        return this.factory();
    }

    release(item: T[]): void {
        for (let i = 0; i < item.length; ++i) {
            this.pool.release(item[i]);
        }
        item.length = 0;
        this.data.push(item);
    }
}
