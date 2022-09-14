import { Board } from "./board";
import { ArrayPoolImpl, ObjectPool } from "./pool";
import { ISocket, State } from "./socket";
import { Move, User } from "./user";

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

    // state variables
    private error?: Error;
    private current!: number;
    private cb!: () => void;
    private boundProcessResponse: (this: Game, state?: State, move?: Move) => void;

    constructor() {
        this.reset();
        this.boundProcessResponse = this.processResponse.bind(this);
    }

    // yes... i am lazy
    reset() {
        // @ts-ignore
        this.users = this.board = this.cb = undefined;

        this.current = 0;
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

    play(cb: () => void) {
        this.cb = cb;
        this.current = 0;
        for (let i = 0; i < this.users.length; ++i) {
            this.users[i].play();
        }

        this.error = undefined;
        this.playRound();
    }

    private inc() {
        this.current = (this.current + 1) % 4;
    }

    private processResponse(state?: State, move?: Move) {
        if (state || !move) {
            this.error = new Error(`state was transitioned to ${state} and move ${move}`);
            this.finish();
            return;
        }

        if (move.position[0] === -1) {
            this.inc();
            this.playRound();
            return;
        }

        const user = this.users[this.current];
        if (
            this.board.move(this.current, move.piece, move.position) &&
            user.pieces[move.piece] > 0
        ) {
            this.inc();
            user.pieces[move.piece]--;
        }
        this.playRound();
    }

    private playRound() {
        if (this.board.gameOver()) {
            this.finish();
            return;
        }

        const user = this.users[this.current];
        try {
            user.turn(this.board, this.boundProcessResponse);
        } catch (e) {
            this.error = e as Error;
        }
    }

    private finish() {
        for (let i = 0; i < this.users.length; ++i) {
            this.users[i].done(i === this.board.winner && !!this.error);
        }

        usersPool.release(this.users);
        boards.release(this.board);

        if (this.error) {
            console.log("game errored", this.id, this.error);
        }

        if (this.id % 1000 === 0) {
            console.log("game finished", this.id);
        }

        this.cb();
    }
}
