import { Board } from "./board";
import { ISocket } from "./socket";
import { User } from "./user";

type Sockets = [ISocket, ISocket, ISocket, ISocket];
type Users = [User, User, User, User];

let gameIdx = 0;
export class Game {
    private users: Users;
    private board: Board;
    private id: number;

    constructor(sockets: Sockets) {
        this.users = sockets.map((x) => new User(x)) as Users;
        this.board = new Board();
        this.id = gameIdx++;
    }

    async play() {
        let current = 0;
        this.users.forEach((u) => u.play());

        let errored = false;
        do {
            const user = this.users[current];
            try {
                const move = await user.turn(this.board);

                if (move.position[0] === -1) {
                    current = (current + 1) % 4;
                    continue;
                }

                if (
                    this.board.move(current, move.piece, move.position) &&
                    user.pieces[move.piece] > 0
                ) {
                    current = (current + 1) % 4;
                    user.pieces[move.piece]--;
                }
            } catch (e) {
                errored = true;
                break;
            }
        } while (!this.board.gameOver());

        this.users.forEach((u, i) => {
            u.done(i === this.board.winner && !errored);
        });

        if (errored) {
            console.log("game errored", this.id);
        }

        if (this.id % 1000 === 0) {
            console.log("game finished", this.id);
        }
    }
}
