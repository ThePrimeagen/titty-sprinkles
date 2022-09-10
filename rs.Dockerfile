FROM rust:latest AS FETCH_THE_EFFIN_RUST
WORKDIR /app
COPY Cargo.toml /app/Cargo.toml
COPY Cargo.lock /app/Cargo.lock
COPY src/lib.rs /app/src/lib.rs
RUN rustup default nightly
RUN cargo fetch
COPY src /app/src
RUN cargo build --release --bin game_runner
RUN cargo install --path .

FROM debian:latest
EXPOSE 42069
WORKDIR /app
RUN apt update && apt install -y ca-certificates
COPY --from=FETCH_THE_EFFIN_RUST /usr/local/cargo/bin/game_runner /app
COPY run-test run-test
ARG GAME_COUNT
ARG PARALLEL
ARG HOST
CMD ["sh", "-c", "/app/run-test"]

