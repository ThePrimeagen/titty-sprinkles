import { Game } from "./game";
import WebSocket from "ws";
import { ISocket, Socket } from "./socket";
import { ObjectPool } from "./pool";

const server = new WebSocket.Server({
    host: "0.0.0.0",
    port: 42010,
});

type Sockets = [ISocket, ISocket, ISocket, ISocket];
// const sockets = new ObjectPool<Socket>();

const games = new ObjectPool<Game>(() => new Game());

async function play_game(sockets: Sockets): Promise<void> {
    const game = games.get().setSockets(sockets);
    game.play(() => {
        games.release(game);
    });
}

let sockets = new ObjectPool<Socket>(() => new Socket());

let socketsArray: ISocket[] = [];
server.on("connection", (ws) => {
    const socket = sockets.get().setSocket(ws);

    socketsArray.push(socket);
    if (socketsArray.length === 4) {
        play_game(socketsArray as Sockets);
        socketsArray = [];
    }
});

server.on("error", function (e) {
    console.error("we got an error, this is bad...", e);
    process.exit(42);
});
