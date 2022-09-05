import { Board } from "./board";
import { Socket } from "./sockets/socket";
import { User } from "./user";

type Sockets = [Socket, Socket, Socket, Socket];
type Users = [User, User, User, User];

export class Game {
    private users: Users;
    private current: number;
    private board: Board;

    constructor(sockets: Sockets) {
        this.current = 0;
        this.users = sockets.map(x => new User(x)) as Users;
        this.board = new Board();
    }

    play() {

        let current = 0;
        do {

        } while (!this.board.gameOver());

        this.users.forEach((u, i) => u.done(i === current));
    }

}
