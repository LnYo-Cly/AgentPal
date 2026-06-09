FROM rust:1-bookworm AS builder
WORKDIR /app
COPY . .
RUN cargo build --release -p agentpal-relay

FROM debian:bookworm-slim
RUN useradd --system --uid 10001 --create-home agentpal
COPY --from=builder /app/target/release/agentpal-relay /usr/local/bin/agentpal-relay
COPY deploy/relay/start-agentpal-relay.sh /usr/local/bin/start-agentpal-relay
RUN chmod +x /usr/local/bin/start-agentpal-relay
USER agentpal
EXPOSE 8790
ENTRYPOINT ["/usr/local/bin/start-agentpal-relay"]
