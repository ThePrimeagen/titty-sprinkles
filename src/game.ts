import { Board } from "./board";
import { Socket } from "./sockets/socket";
import { User } from "./user";

type Sockets = [Socket, Socket, Socket, Socket];
type Users = [User, User, User, User];

export class Game {
    private users: Users;
    private board: Board;

    constructor(sockets: Sockets) {
        this.users = sockets.map(x => new User(x)) as Users;
        this.board = new Board();
    }

    async play() {

        let current = 0;
        this.users.forEach(u => u.play());

        do {
            const user = this.users[current];
            const move = await user.turn();

            if (this.board.move(current, move.piece, move.position)) {
                current = (current + 1) % 4;
            }

        } while (!this.board.gameOver());

        this.users.forEach((u, i) => u.done(i === current));
    }

}
