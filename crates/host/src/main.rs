mod codex;

use std::path::PathBuf;

use anyhow::Result;
use clap::{Args, Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(name = "agentpal-host", version, about = "AgentPal desktop Host")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    Codex(CodexCommand),
}

#[derive(Debug, Args)]
struct CodexCommand {
    #[command(subcommand)]
    command: CodexSubcommand,
}

#[derive(Debug, Subcommand)]
enum CodexSubcommand {
    Probe(codex::CodexProbeArgs),
    Connect(codex::CodexConnectArgs),
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Command::Codex(command) => match command.command {
            CodexSubcommand::Probe(args) => {
                let report = codex::probe(args).await;
                println!("{}", serde_json::to_string_pretty(&report)?);
            }
            CodexSubcommand::Connect(args) => {
                codex::connect(args).await?;
            }
        },
    }

    Ok(())
}

fn normalize_workspace(path: PathBuf) -> Result<PathBuf> {
    if path.is_absolute() {
        Ok(path)
    } else {
        Ok(std::env::current_dir()?.join(path))
    }
}
