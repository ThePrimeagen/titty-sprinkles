
// WS connection that is going to make a play the game request.
// 1. to be putn in a queue awaiting 4 players.
// 2. play command will be given for all players to become ready
// 3. a your turn + the state of the table will be sent down.
// 4. you make a turn and play your piece.  The server will respond with
//    success or fail
// 5. if fail, replay your piece
// 6. if success, wait until 3.
// 7. if a game end message is received, teh game will be over and sockets
//    disconnect.


