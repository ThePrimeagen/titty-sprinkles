import { Board, PieceType } from "./board";
import { ISocket, State } from "./socket";

export type Move = {
    position: [number, number];
    piece: PieceType;
};

enum MessageType {
    GameStart = "GameStart",
    YourTurn = "YourTurn",
}

export class User {
    private socket!: ISocket;

    private boundOnStateChange: (prev: State, next: State) => void;
    private boundOnMessage: (msg: string) => void;
    private turnCb?: (state?: State, move?: Move) => void;

    public pieces!: [number, number, number];

    constructor() {
        this.reset();
        this.boundOnStateChange = this.onStateChange.bind(this);
        this.boundOnMessage = this.onMessage.bind(this);
    }

    reset() {
        // this.log("reset");
        // ... something here
        this.pieces = [3, 3, 3];
        this.turnCb = undefined;

        // else we will get late calls to state change
        if (this.socket) {
            this.socket.detach();
            // @ts-ignore i am lazy
            this.socket = undefined;
        }

    }

    private onStateChange(_: State, next: State) {
        // this.log(`onStateChange ${next}`);
        if (this.turnCb && next !== State.Connected) {
            this.reject(next);
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

    play() {
        //this.log("play");
        // TODO: probably justn have a function on socket
        if (this.socket.state !== State.Connected) {
            throw new Error("Socket isn't connected");
        }

        this.socket.push({
            type: MessageType.GameStart,
        });
    }

    turn(board: Board, cb: (state?: State, move?: Move) => void): void  {
        // this.log("turn");
        // TODO: probably justn have a function on socket
        if (this.socket.state !== State.Connected) {
            throw new Error("Socket isn't connected");
        }

        this.turnCb = cb;
        this.socket.push({
            type: MessageType.YourTurn,
            board: board.board,
            user: this.pieces,
        });
    }

    done(isWinner: boolean) {
        this.socket.push(isWinner ? "GIGACHAD" : "L");
    }

    private reject(state: State) {
        if (this.turnCb) {
            this.turnCb(state);
            this.turnCb = undefined;
        }
    }

    private resolve(move: Move) {
        if (this.turnCb) {
            this.turnCb(undefined, move);
            this.turnCb = undefined;
        }
    }
}

