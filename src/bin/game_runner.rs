use std::{sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
}, time::SystemTime};

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

fn usable_spots(board: &Board, piece: usize) -> Vec<(usize, usize)> {
    let mut out = vec![];
    for y in 0..=2 {
        for x in 0..=2 {
            if board[y][x][piece as usize] == -1 {
                out.push((x, y));
            }
        }
    }

    return out;
}

fn get_usable_pieces(board: &Board, user: &User) -> Vec<(u8, Vec<(usize, usize)>)> {
    return user
        .iter()
        .enumerate()
        .filter(|(_, count)| **count > 0)
        .map(|(idx, _)| (idx as u8, usable_spots(board, idx)))
        .filter(|(_, spots)| !spots.is_empty())
        .collect();
}

fn get_move(board: &Board, user: &User) -> Move {
    let moves = get_usable_pieces(board, user);
    if moves.is_empty() {
        return EMPTY_MOVE;
    }

    let moves = moves
        .get(rand::thread_rng().gen_range(0..moves.len()))
        .expect("this should always exist");

    let position = moves
        .1
        .get(rand::thread_rng().gen_range(0..moves.1.len()))
        .expect("positions should always be pre checked.");

    let position = [position.0 as i8, position.1 as i8];

    return Move {
        piece: moves.0,
        position,
    };
}

async fn run_player(args: &'static Args, player: usize) -> Result<usize> {
    let ws_stream = create_client(args).await?;
    let (mut write, mut read) = ws_stream.split();
    let mut count = 0;

    while let Some(Ok(msg)) = read.next().await {
        if msg.is_text() {
            info!("message({}): {}", player, msg);

            let msg = msg.to_text()?;
            if msg == "L" || msg == "GIGACHAD" {
                return Ok(count);
            }
            match serde_json::from_str(msg)? {
                Message::YourTurn { board, user } => {
                    count += 1;
                    let m = get_move(&board, &user);
                    info!("move({}): {:?}", player, m);
                    write
                        .send(tungstenite::Message::from(serde_json::to_string(&m)?))
                        .await?;
                }
                _ => {}
            }
        }
    }

    // NOTE: Something has happened to the socket, but i don't want to
    // unreachable! this because i don't want the program to terminate.
    return Ok(0);
}

async fn play(args: &'static Args) -> Result<usize> {
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
        .sum();

    return Ok(out);
}

struct Stats {
    start: u128,
    turns: usize,
    duration: u128,
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();

    let args: &'static Args = Box::leak(Box::new(Args::parse()));
    let semaphore = Arc::new(Semaphore::new(args.parallel));
    let stats: Arc<Mutex<Vec<Stats>>> = Arc::new(Mutex::new(Vec::with_capacity(args.games)));
    let error_count = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    warn!("args {:?}", args);
    let now = std::time::SystemTime::now();

    for i in 0..args.games {
        stats.lock().await.push(Stats {
            duration: 0,
            turns: 0,
            start: 0,
        });
        let semaphore = semaphore.clone();
        let permit = semaphore.acquire_owned().await?;
        let stats = stats.clone();
        let error_count = error_count.clone();

        handles.push(tokio::spawn(async move {
            let now = SystemTime::now();
            match play(args).await {
                Err(e) => {
                    error!("There was an error playing the game {}", e);
                    error_count.fetch_add(1, Ordering::Relaxed);
                }
                Ok(turns) => {
                    if let (Ok(duration), Ok(epoch)) = (now.elapsed(), now.duration_since(SystemTime::UNIX_EPOCH)) {
                        stats.lock().await[i] = Stats {
                            turns,
                            start: epoch.as_micros(),
                            duration: duration.as_micros()
                        };
                    }
                }
            }
            drop(permit)
        }));
    }


    futures::future::join_all(handles).await;
    println!("errors: {}", error_count.load(Ordering::Relaxed));
    println!("duration total: {}", now.elapsed()?.as_micros());
    for (idx, stat) in stats.lock().await.iter().enumerate() {
        println!("{}, {}, {}, {}", idx, stat.start, stat.turns, stat.duration);
    }

    return Ok(());
}
