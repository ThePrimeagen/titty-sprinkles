import { ISocket, State } from "../socket";

type StateChange = (_p: State, _n: State) => void;
type OnMessage = (_: string) => void;
export type StateData = {
    onStateChange: StateChange;
    onMessage: OnMessage;
    messages: string[];
};

export function mockSocket(): [ISocket, StateData] {
    let state = {
        onStateChange: (_p: State, _n: State) => {},
        onMessage: (_: string) => {},
        messages: [],
    } as StateData;
    return [
        {
            state: State.Connected,
            push: (msg: string) => {
                state.messages.push(msg);
                return new Promise((res) => res());
            },
            onStateChange: (cb: (p: State, n: State) => void) => {
                state.onStateChange = jest.fn(cb);
            },
            onMessage: (cb: (msg: string) => void) => {
                state.onMessage = jest.fn(cb);
            },
        },
        state,
    ];
}
