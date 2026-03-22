#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { createInterface } from "readline";

const OPENCLAW_DIR = join(process.env.HOME ?? "~", ".openclaw");
const CONFIG_PATH = join(OPENCLAW_DIR, "openclaw.json");
const SKILLS_DIR = resolve(dirname(import.meta.dirname!), "skills");

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function readConfig(): Record<string, any> {
  if (!existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeConfig(config: Record<string, any>) {
  mkdirSync(OPENCLAW_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

async function main() {
  console.log("\n  HIL Wallet — OpenClaw Setup\n");

  // 1. Add skills dir to extraDirs
  const config = readConfig();
  config.skills ??= {};
  config.skills.load ??= {};
  config.skills.load.extraDirs ??= [];

  const extraDirs: string[] = config.skills.load.extraDirs;
  if (!extraDirs.includes(SKILLS_DIR)) {
    extraDirs.push(SKILLS_DIR);
    console.log(`  + Added skill path: ${SKILLS_DIR}`);
  } else {
    console.log(`  ~ Skill path already registered`);
  }

  // 2. Configure env vars
  config.skills.entries ??= {};
  const entry = config.skills.entries["solana_wallet"] ?? {};

  const currentUrl = entry.env?.HIL_WALLET_URL ?? "";
  const currentKey = entry.env?.HIL_WALLET_API_KEY ?? "";

  const walletUrl = (await prompt(`  Wallet URL [${currentUrl || "none"}]: `)) || currentUrl;
  const apiKey = (await prompt(`  API Key [${currentKey ? "***" + currentKey.slice(-4) : "none"}]: `)) || currentKey;

  if (!walletUrl || !apiKey) {
    console.log("\n  ! Wallet URL and API Key are required. You can set them later in:");
    console.log(`    ${CONFIG_PATH}\n`);
  }

  config.skills.entries["solana_wallet"] = {
    enabled: true,
    env: {
      HIL_WALLET_URL: walletUrl,
      HIL_WALLET_API_KEY: apiKey,
    },
  };

  writeConfig(config);
  console.log(`\n  Done. Config saved to ${CONFIG_PATH}`);
  console.log("  Restart OpenClaw to activate the wallet skill.\n");
}

main();
