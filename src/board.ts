export enum PieceType {
    Small,
    Medium,
    Big,
}

type BoardPiece = Record<PieceType, number>;
type BoardLine = [BoardPiece, BoardPiece, BoardPiece];

export type Position = [number, number];
function serializePiece(piece: BoardPiece): number {
    // Does for ... of / object.values order it according to S, M, B?
    return [PieceType.Small, PieceType.Medium, PieceType.Big].reduce((acc, type, i) => {
        return acc | (piece[type] + 1) << (i * 3);
    }, 0);
}

export class Board {
    public board: BoardPiece[][];

    private finished: boolean;

    constructor() {
        this.board = new Array(3);
        for (let i = 0; i < 3; ++i) {
            this.board[i] = new Array(3).fill(0).map(_ => ({
                [PieceType.Small]: -1,
                [PieceType.Medium]: -1,
                [PieceType.Big]: -1,
            }));
        }

        this.finished = false;
    }

    move(player: number, piece: PieceType, pos: Position): boolean {
        const [y, x] = pos;
        const p = this.board[y][x];

        if (p[piece] !== -1) {
            return false;
        }

        p[piece] = player;

        this.finished = this.checkForWin(player, pos);

        return true;
    }

    gameOver(): boolean {
        return this.finished;
    }

    private checkForWin(player: number, pos: Position): boolean {
        const [row, col] = pos;
        if (this.hasWin(player, this.board[row] as BoardLine)) {
            return true;
        }

        const column: BoardLine = [
            this.board[0][col],
            this.board[1][col],
            this.board[2][col],
        ];
        if (this.hasWin(player, column)) {
            return true;
        }

        if (row !== 1 || col !== 1) {
            return false;
        }

        const diag1: BoardLine = [
            this.board[0][0],
            this.board[1][1],
            this.board[2][2],
        ]
        const diag2: BoardLine = [
            this.board[0][2],
            this.board[1][1],
            this.board[2][0],
        ]

        return this.hasWin(player, diag1) || this.hasWin(player, diag2);
    }

    private wins = [
        [PieceType.Small, PieceType.Medium, PieceType.Big],
        [PieceType.Big, PieceType.Medium, PieceType.Small],
        [PieceType.Big, PieceType.Big, PieceType.Big],
        [PieceType.Medium, PieceType.Medium, PieceType.Medium],
        [PieceType.Small, PieceType.Small, PieceType.Small],
    ];

    private hasWin(player: number, pieces: BoardLine): boolean {
        for (let idx = 0; idx < this.wins.length; ++idx) {
            const win = this.wins[idx];
            if (win.every((p, i) => pieces[i][p] === player)) {
                return true;
            }
        }

        return false;
    }
}

