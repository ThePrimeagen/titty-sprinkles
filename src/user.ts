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

let id = 0;
export class User {
    private res?: (val: Move | PromiseLike<Move>) => void;
    private rej?: (err?: any) => void;
    private socket!: ISocket;

    private boundOnStateChange: (prev: State, next: State) => void;
    private boundOnMessage: (msg: string) => void;
    private _id: number;

    public pieces!: [number, number, number];

    /**
    private log(...msg: string[]) {
        console.log(this._id, "User", ...msg);
    }
    */

    constructor() {
        this._id = id++;
        this.reset();
        this.boundOnStateChange = this.onStateChange.bind(this);
        this.boundOnMessage = this.onMessage.bind(this);
    }

    reset() {
        // this.log("reset");
        // ... something here
        this.pieces = [3, 3, 3];
        this.res = this.rej = undefined;

        // else we will get late calls to state change
        if (this.socket) {
            this.socket.detach();
            // @ts-ignore i am lazy
            this.socket = undefined;
        }

    }

    private onStateChange(_: State, next: State) {
        // this.log(`onStateChange ${next}`);
        if (this.res) {
            if (next === State.Error) {
                this.reject("socket is errored");
            }
            if (next === State.Done) {
                this.reject(`socket is closed: ${this._id}`);
            }
        }
    }

    setSocket(socket: ISocket): this {
        // this.log("setSocket");
        socket.onStateChange(this.boundOnStateChange);
        socket.onMessage(this.boundOnMessage);

        this.socket = socket;
        return this;
    }

    private onMessage(msg: string) {
        this.resolve(JSON.parse(msg) as Move);
    }

    async play() {
        //this.log("play");
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
        // this.log("turn");
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

