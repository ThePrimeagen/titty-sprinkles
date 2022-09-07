import { PieceType } from "../board";
import { mockSocket } from "../mock/socket";
import { User } from "../user";

test("user send play command", function() {
    const [sock, state] = mockSocket();
    const u = new User(sock);

    u.play();

    expect(state.messages).toEqual([
        "start",
    ]);
});

test("play turn", async function() {
    const [sock, state] = mockSocket();
    const u = new User(sock);

    u.play();
    const turn = u.turn();
    const expectedMove = {
        position: [69, 420],
        piece: PieceType.Big,
    };

    state.onMessage(JSON.stringify(expectedMove));

    const move = await turn;

    expect(move).toEqual(expectedMove);
});

test("done", async function() {
    const [sock, state] = mockSocket();
    const u = new User(sock);

    u.done(false);
    expect(state.messages).toEqual([
        "L",
    ]);

    u.done(true);
    expect(state.messages).toEqual([
        "L",
        "GIGACHAD",
    ]);
});


