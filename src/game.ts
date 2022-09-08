import { Board } from "./board";
import { ISocket } from "./socket";
import { User } from "./user";

type Sockets = [ISocket, ISocket, ISocket, ISocket];
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
            const move = await user.turn(this.board);

            if (move.position[0] === -1) {
                current = (current + 1) % 4;
                continue;
            }

            if (this.board.move(current, move.piece, move.position) &&
                user.pieces[move.piece] > 0) {

                current = (current + 1) % 4;
                user.pieces[move.piece]--;
            }

        } while (!this.board.gameOver());

        this.users.forEach((u, i) => {
            u.done(i === this.board.winner);
        });
    }

}
