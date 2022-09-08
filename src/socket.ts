// WS connection that is going to make a play the game request.
// 1. to be putn in a queue awaiting 4 players.
// 2. play command will be given for all players to become ready
// 3. a your turn + the state of the table will be sent down.
// 4. you make a turn and play your piece.  The server will respond with
//    success or fail
// 5. if fail, replay your piece
// 6. if success, wait until 3.
// 7. if a game end message is received, teh game will be over and sockets
//    disconnect.
import WebSocket from "ws";

export enum State {
    Connected,
    Done,
    Error,
}

export interface ISocket {
    state: State;
    onStateChange(cb: (prev: State, next: State) => void): void;
    onMessage(cb: (message: string) => void): void;
    push(msg: string | object): Promise<void>;
}

export class Socket {
    public state: State;

    private msgCallback!: (msg: string) => void;
    private stateChange!: (prev: State, state: State) => void;

    constructor(private ws: WebSocket) {
        this.state = State.Connected;

        this.ws.on("close", () => {
            this.setState(State.Done);
        });

        this.ws.on("error", (_e) => {
            this.setState(State.Error);
        });

        this.ws.on("message", (msg: WebSocket.RawData, isBinary: boolean) => {
            if (isBinary) {
                return;
            }

            if (this.msgCallback) {
                this.msgCallback(msg.toString());
            }
        });
    }

    onStateChange(cb: (prev: State, next: State) => void): void {
        this.stateChange = cb;
    }

    onMessage(cb: (message: string) => void): void {
        this.msgCallback = cb;
    }

    push(msg: string | object): Promise<void> {
        if (typeof msg === "object") {
            msg = JSON.stringify(msg);
        }

        if (this.ws.readyState !== this.ws.OPEN) {
            this.setState(State.Done);
            return Promise.reject();
        }

        return new Promise((res, err) => {
            try {
                this.ws.send(msg, (e?: Error) => {
                    if (e) {
                        err(e);
                    } else {
                        res();
                    }
                });
            } catch (e) {
                this.setState(State.Error);
            }
        });
    }

    private setState(state: State) {
        this.stateChange(this.state, state);
    }
}
