import { PieceType } from "./board";
import { Socket, State } from "./sockets/socket";

export type Move = {
    position: [number, number],
    piece: PieceType,
}

function explodePromise<T>(): {res: (val: T | PromiseLike<T>) => void, rej: (e?: any) => void, promise: Promise<T>} {
    let res = (_: T | PromiseLike<T>) => {};
    let rej = (_?: Error) => {};
    let promise = new Promise<T>((r, e) => {
        res = r;
        rej = e;
    });

    return {
        promise,
        rej,
        res,
    };
}

export class User {
    private res?: (val: Move | PromiseLike<Move>) => void;
    private rej?: (err?: any) => void;
    private state?: State;

    constructor(private socket: Socket) {
        socket.onStateChange((_: State, next: State) => {
            this.state = next;
            if (this.res) {
                if (next === State.Error) {
                    this.reject("socket is errored");
                }
                if (next === State.Done) {
                    this.reject("socket is closed");
                }
            }
        });

        socket.onMessage((msg: string) => {
            this.resolve(JSON.parse(msg) as Move);
        });
    }

    turn(): Promise<Move> {
        // TODO: probably justn have a function on socket
        if (this.state !== State.Connected) {
            throw new Error("Socket isn't connected");
        }

        this.socket.push("your turn");

        const {res, rej, promise} = explodePromise<Move>();
        this.res = res;
        this.rej = rej;

        return promise;
    }

    done(isWinner: boolean) {
        this.socket.push(isWinner ? "GIGACHAD" : "L");
    }

    private reject(msg: string) {
        if (this.rej) {
            this.rej(msg);
            this.rej = this.res = undefined;
        }
    }

    private resolve(move: Move) {
        if (this.res) {
            this.res(move);
            this.res = this.rej = undefined;
        }
    }
}

