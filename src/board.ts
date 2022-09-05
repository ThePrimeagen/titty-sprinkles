
export enum PieceType {
    Small,
    Medium,
    Big,
}

type BoardPiece = {
    player: number,
    type: PieceType,
}

type BoardLine = [BoardPiece, BoardPiece, BoardPiece];

export type Position = [number, number];

export class Board {
    private board: BoardPiece[][];
    private finished: boolean;

    constructor() {
        this.board = new Array(3);
        for (let i = 0; i < 3; ++i) {
            this.board[i] = new Array(3).fill(0).map(_ => ({
                player: -1,
                type: PieceType.Big,
            }));
        }

        this.finished = false;
    }

    move(player: number, piece: PieceType, pos: Position): boolean {
        const [y, x] = pos;
        const p = this.board[y][x];
        if (p.player !== -1) {
            return false;
        }

        p.player = player;
        p.type = piece;

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
            if (win.every((p, i) => pieces[i].player === player && pieces[i].type === p)) {
                return true;
            }
        }

        return false;
    }
}

