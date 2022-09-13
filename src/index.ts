import { Game } from "./game";
import WebSocket from "ws";
import { ISocket, Socket } from "./socket";

const server = new WebSocket.Server({
    host: "127.0.0.1",
    port: 42010,
});

type Sockets = [ISocket, ISocket, ISocket, ISocket];
async function play_game(sockets: Sockets): Promise<void> {
    const game = new Game(sockets);
    await game.play();
}

let sockets: ISocket[] = [];
server.on("connection", (ws) => {
    const socket = new Socket(ws);
    sockets.push(socket);
    if (sockets.length === 4) {
        play_game(sockets as Sockets);
        sockets = [];
    }
});

server.on("error", function (e) {
    console.error("we got an error, this is bad...", e);
    process.exit(42);
});
