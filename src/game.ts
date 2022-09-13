import { Board } from "./board";
import { ArrayPoolImpl, ObjectPool } from "./pool";
import { ISocket } from "./socket";
import { User } from "./user";

type Sockets = [ISocket, ISocket, ISocket, ISocket];
type Users = [User, User, User, User];

const boards = new ObjectPool<Board>(() => {
    return new Board();
});
const players = new ObjectPool<User>(() => {
    return new User();
});
const usersPool = new ArrayPoolImpl<User>(players);

let gameIdx = 0;
export class Game {
    private users!: Users;
    private board!: Board;
    private id!: number;

    constructor() { }

    // yes... i am lazy
    reset() {
        // @ts-ignore
        this.users = this.board = undefined;
    }

    setSockets(sockets: Sockets): this {
        const users = usersPool.get();
        for (let i = 0; i < sockets.length; ++i) {
            users[i] = players.get().setSocket(sockets[i]);
        }

        this.users = users as Users;
        this.board = boards.get();
        this.id = gameIdx++;

        return this;
    }

    async play() {
        let current = 0;
        for (let i = 0; i < this.users.length; ++i) {
            this.users[i].play();
        }

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
                // @ts-ignore
                console.log("LOOP: error", e.message);
                error = e;
                break;
            }
        } while (!this.board.gameOver());

        for (let i = 0; i < this.users.length; ++i) {
            this.users[i].done(i === this.board.winner && !errored);
        }

        usersPool.release(this.users);
        boards.release(this.board);

        if (error) {
            console.log("game errored", this.id, error);
        }

        if (this.id % 1000 === 0) {
            console.log("game finished", this.id);
        }
    }
}
