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
    detach(): void;
}

export class Socket {
    public state!: State;

    private ws!: WebSocket;

    private msgCallback?: (msg: string) => void;
    private stateChange?: (prev: State, state: State) => void;
    private wsOnClose: (this: Socket) => void;
    private wsOnError: (this: Socket, error?: Error) => void;
    private wsOnMessage: (this: Socket, msg: WebSocket.RawData, isBinary: boolean) => void;

    constructor() {
        this.wsOnClose = this.onClose.bind(this);
        this.wsOnError = this.onError.bind(this);
        this.wsOnMessage = this.onMessageReceive.bind(this);
    }

    private onMessageReceive(msg: WebSocket.RawData, isBinary: boolean) {
        if (isBinary) {
            return;
        }

        if (this.msgCallback) {
            this.msgCallback(msg.toString());
        }
    }

    private onError(_e?: Error) {
        this.setState(State.Error);
    }

    private onClose() {
        this.setState(State.Done);
    }

    setSocket(ws: WebSocket): this {
        this.ws = ws;
        this.state = State.Connected;

        // @ts-ignore I AM LAZY DONT GIVE AF
        this.ws.on("close", this.wsOnClose);

        // @ts-ignore I AM LAZY DONT GIVE AF
        this.ws.on("error", this.wsOnError);

        // @ts-ignore I AM LAZY DONT GIVE AF
        this.ws.on("message", this.wsOnMessage);

        return this;
    }

    reset() {
        // @ts-ignore I AM LAZY DONT GIVE AF
        this.ws.off("close", this.wsOnClose);

        // @ts-ignore I AM LAZY DONT GIVE AF
        this.ws.off("error", this.wsOnError);

        // @ts-ignore I AM LAZY DONT GIVE AF
        this.ws.off("message", this.wsOnMessage);

        // @ts-ignore I AM LAZY
        this.ws = undefined;
        this.state = State.Done;
    }

    onStateChange(cb: (prev: State, next: State) => void): void {
        this.stateChange = cb;
    }

    onMessage(cb: (message: string) => void): void {
        this.msgCallback = cb;
    }

    detach() {
        this.stateChange = undefined;
        this.msgCallback = undefined;
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
        if (this.stateChange) {
            this.stateChange(this.state, state);
        }
    }
}
