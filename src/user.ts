import { Socket } from "./sockets/socket";

export class User {
    constructor(private socket: Socket) { }

    turn() {
        this.socket.push("your turn");
    }

    done(isWinner: boolean) {
        this.socket.push(isWinner ? "GIGACHAD" : "L");
    }
}

