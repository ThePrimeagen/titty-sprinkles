use std::{
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::Duration,
};

use anyhow::Result;
use clap::Parser;
use futures::StreamExt;
use log::{error, info};
use tokio::{net::TcpStream, sync::Semaphore};
use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};

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

async fn create_client(args: &'static Args) -> Result<WebSocketStream<MaybeTlsStream<TcpStream>>> {
    let url = url::Url::parse(&format!("ws://{}:{}", args.address, args.port))?;

    info!("attempting to connect: {}", url);
    let (ws_stream, _) = connect_async(url).await.expect("Failed to connect");
    info!("WebSocket handshake has been successfully completed");

    return Ok(ws_stream);
}

async fn run_player(args: &'static Args, player: usize) -> Result<()> {
    let ws_stream = create_client(args).await?;
    let (_, mut read) = ws_stream.split();

    while let Some(Ok(msg)) = read.next().await {
        if msg.is_text() {
            info!("{}: {}", player, msg);
        }
    }

    return Ok(());
}

async fn play(args: &'static Args) -> Result<()> {
    let player = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    handles.push(tokio::spawn(run_player(
        args,
        player.clone().fetch_add(1, Ordering::Relaxed),
    )));
    handles.push(tokio::spawn(run_player(
        args,
        player.clone().fetch_add(1, Ordering::Relaxed),
    )));
    handles.push(tokio::spawn(run_player(
        args,
        player.clone().fetch_add(1, Ordering::Relaxed),
    )));
    handles.push(tokio::spawn(run_player(
        args,
        player.clone().fetch_add(1, Ordering::Relaxed),
    )));

    futures::future::join_all(handles).await;

    return Ok(());
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();

    let args: &'static Args = Box::leak(Box::new(Args::parse()));
    let semaphore = Arc::new(Semaphore::new(args.parallel));
    let mut handles = vec![];

    info!("args {:?}", args);
    for i in 0..args.games {
        info!("loop {}", i);
        let semaphore = semaphore.clone();
        let permit = semaphore.acquire_owned().await?;

        handles.push(tokio::spawn(async move {
            match play(args).await {
                Err(e) => {
                    error!("There was an error playing the game {}", e);
                }
                _ => {}
            }
            drop(permit)
        }));
    }

    futures::future::join_all(handles).await;

    return Ok(());
}
