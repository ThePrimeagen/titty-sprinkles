import { Board } from "./board";
import { ArrayPoolImpl, ObjectPool } from "./pool";
import { ISocket } from "./socket";
import { User } from "./user";

type Sockets = [ISocket, ISocket, ISocket, ISocket];
type Users = [User, User, User, User];

const players = new ObjectPool<User>(() => {
    return new User();
});
const usersPool = new ArrayPoolImpl<User>(players);

let gameIdx = 0;
export class Game {
    private users: Users;
    private board: Board;
    private id: number;

    constructor(sockets: Sockets) {
        const users = usersPool.get();
        for (let i = 0; i < sockets.length; ++i) {
            users[i] = players.get().setSocket(sockets[i]);
        }

        this.users = users as Users;
        this.board = new Board();
        this.id = gameIdx++;
    }

    async play() {
        let current = 0;
        this.users.forEach((u) => u.play());

        let errored = false;
        let error = undefined;
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
                if (e instanceof Error) {
                    console.log("LOOP: error", e.message, e.stack);
                }
                error = e;
                break;
            }
        } while (!this.board.gameOver());

        for (let i = 0; i < this.users.length; ++i) {
            this.users[i].done(i === this.board.winner && !errored);
        }

        usersPool.release(this.users);

        if (error) {
            console.log("game errored", this.id, error);
        }

        if (this.id % 1000 === 0) {
            console.log("game finished", this.id);
        }
    }
}
