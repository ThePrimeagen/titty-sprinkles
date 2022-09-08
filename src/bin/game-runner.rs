use std::{
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::Duration,
};

use anyhow::Result;
use clap::Parser;
use futures::{SinkExt, StreamExt};
use log::{error, info, warn};
use rand::Rng;
use serde::{Deserialize, Serialize};
use tokio::{
    net::TcpStream,
    sync::{Mutex, Semaphore},
};
use tokio_tungstenite::{connect_async, tungstenite, MaybeTlsStream, WebSocketStream};

#[derive(Parser, Debug)]
#[clap()]
struct Args {
    #[clap(short = 'a', default_value_t = String::from("0.0.0.0"))]
    address: String,

    #[clap(long = "port", default_value_t = 42010)]
    port: u16,

    #[clap(short = 'p', default_value_t = 8)]
    parallel: usize,

    #[clap(short = 'g', default_value_t = 1000)]
    games: usize,
}

type BoardPiece = [i8; 3];
type Board = [[BoardPiece; 3]; 3];
type User = [u8; 3];

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
enum Message {
    GameStart,
    YourTurn { board: Board, user: User },
}

#[derive(Debug, Serialize, Deserialize)]
struct Move {
    position: [i8; 2],
    piece: u8,
}

const EMPTY_MOVE: Move = Move {
    position: [-1, -1],
    piece: 0,
};

async fn create_client(args: &'static Args) -> Result<WebSocketStream<MaybeTlsStream<TcpStream>>> {
    let url = url::Url::parse(&format!("ws://{}:{}", args.address, args.port))?;

    info!("attempting to connect: {}", url);
    let (ws_stream, _) = connect_async(url).await.expect("Failed to connect");
    info!("WebSocket handshake has been successfully completed");

    return Ok(ws_stream);
}

fn can_use_piece(board: &Board, piece: usize) -> bool {
    let mut found_one = false;
    'outer: for y in 0..=2 {
        for x in 0..=2 {
            if board[y][x][piece as usize] == -1 {
                found_one = true;
                break 'outer;
            }
        }
    }

    return found_one;
}

fn get_user_piece(board: &Board, user: &User) -> u8 {
    let mut out = 0;
    loop {
        let piece = rand::thread_rng().gen_range(0..=2);
        let moves = user[piece];
        if moves == 0 {
            continue;
        }

        if can_use_piece(board, piece) {
            out = piece as u8;
            break;
        }
    }

    return out;
}

fn get_board_pos(board: &Board, piece: u8) -> [i8; 2] {
    let mut out = [0; 2];
    loop {
        let x = rand::thread_rng().gen_range(0..=2);
        let y = rand::thread_rng().gen_range(0..=2);

        let board = board[y][x];
        info!("getting_board_pos: {} {} {}", piece, x, y);
        if board[piece as usize] >= 0 {
            continue;
        }
        out[0] = x as i8;
        out[1] = y as i8;

        break;
    }

    return out;
}

fn play_turn(board: Board, user: User) -> Option<Move> {
    let can_play = user.iter().enumerate().fold(false, |acc, (idx, count)| {
        if count == &0 {
            return acc;
        }
        return acc || can_use_piece(&board, idx);
    });

    if !can_play {
        return None;
    }

    let piece = get_user_piece(&board, &user);
    let position = get_board_pos(&board, piece);

    return Some(Move { position, piece });
}

async fn run_player(args: &'static Args, player: usize) -> Result<bool> {
    let ws_stream = create_client(args).await?;
    let (mut write, mut read) = ws_stream.split();

    while let Some(Ok(msg)) = read.next().await {
        if msg.is_text() {
            info!("message({}): {}", player, msg);

            let msg = msg.to_text()?;
            if msg == "L" {
                info!("{}: msg L", player);
                return Ok(false);
            }
            if msg == "GIGACHAD" {
                warn!("{}: msg GIGACHAD", player);
                return Ok(true);
            }
            match serde_json::from_str(msg)? {
                Message::YourTurn { board, user } => {
                    let m = play_turn(board, user);
                    if let Some(m) = m {
                        info!("move({}): {:?}", player, m);
                        write
                            .send(tungstenite::Message::from(serde_json::to_string(&m)?))
                            .await?;
                    } else {
                        write
                            .send(tungstenite::Message::from(serde_json::to_string(
                                &EMPTY_MOVE,
                            )?))
                            .await?;
                    }
                }
                _ => {}
            }
        }
    }

    return Ok(false);
}

async fn play(args: &'static Args) -> Result<Vec<bool>> {
    let player = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    handles.push(run_player(
        args,
        player.clone().fetch_add(1, Ordering::Relaxed),
    ));
    handles.push(run_player(
        args,
        player.clone().fetch_add(1, Ordering::Relaxed),
    ));
    handles.push(run_player(
        args,
        player.clone().fetch_add(1, Ordering::Relaxed),
    ));
    handles.push(run_player(
        args,
        player.clone().fetch_add(1, Ordering::Relaxed),
    ));

    let out = futures::future::join_all(handles)
        .await
        .iter()
        .flatten()
        .map(|x| *x)
        .collect::<Vec<bool>>();

    warn!("game finished: {:?}", out);

    return Ok(out);
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();

    let args: &'static Args = Box::leak(Box::new(Args::parse()));
    let semaphore = Arc::new(Semaphore::new(args.parallel));
    let winners: Arc<Mutex<[usize; 4]>> = Arc::new(Mutex::new([0; 4]));
    let mut handles = vec![];

    warn!("args {:?}", args);
    for i in 0..args.games {
        warn!("loop {}", i);
        let semaphore = semaphore.clone();
        let permit = semaphore.acquire_owned().await?;

        let winners = winners.clone();
        handles.push(tokio::spawn(async move {
            match play(args).await {
                Err(e) => {
                    error!("There was an error playing the game {}", e);
                }
                Ok(results) => {
                    for (idx, r) in results.iter().enumerate() {
                        if *r {
                            winners.lock().await[idx] += 1;
                        }
                    }
                }
            }
            drop(permit)
        }));
    }

    println!("{:?}", winners.lock().await);

    futures::future::join_all(handles).await;

    return Ok(());
}
