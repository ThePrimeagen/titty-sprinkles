import { Board, PieceType } from "./board";
import { ISocket, State } from "./socket";

export type Move = {
    position: [number, number];
    piece: PieceType;
};

function explodePromise<T>(): {
    res: (val: T | PromiseLike<T>) => void;
    rej: (e?: any) => void;
    promise: Promise<T>;
} {
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

enum MessageType {
    GameStart = "GameStart",
    YourTurn = "YourTurn",
}

export class User {
    private res?: (val: Move | PromiseLike<Move>) => void;
    private rej?: (err?: any) => void;

    public pieces: [number, number, number];

    constructor(private socket: ISocket) {
        socket.onStateChange((_: State, next: State) => {
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

        this.pieces = [3, 3, 3];
    }

    async play() {
        // TODO: probably justn have a function on socket
        if (this.socket.state !== State.Connected) {
            throw new Error("Socket isn't connected");
        }

        try {
            await this.socket.push({
                type: MessageType.GameStart,
            });
        } catch (e) {
            console.error("user push and broke", e);
        }
    }

    async turn(board: Board): Promise<Move> {
        // TODO: probably justn have a function on socket
        if (this.socket.state !== State.Connected) {
            throw new Error("Socket isn't connected");
        }

        await this.socket.push({
            type: MessageType.YourTurn,
            board: board.board,
            user: this.pieces,
        });

        const { res, rej, promise } = explodePromise<Move>();
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
