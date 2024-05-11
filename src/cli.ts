#! /usr/bin/env node

import { program, Command } from "commander";
import { setup } from "./setup";
import { WithdrawalClient } from "./withdraw";
import * as dotenv from "dotenv";
import { runCommand } from "./utils";

export async function startCli(): Promise<void> {
  dotenv.config();

  program
    .name("nocturne-ejector")
    .description("CLI for withdrawing from Nocturne post-shutdown")
    .addCommand(withdraw)
    .addCommand(exportSpendKey);
  await program.parseAsync(process.argv);
}

const withdraw = new Command("withdraw")
  .summary("withdraw from Nocturne post-shutdown")
  .description(
    "must supply .env file with RPC_URL, SPEND_PRIVATE_KEY, and WITHDRAWAL_EOA_PRIVATE_KEY"
  )
  .option(
    "--config-path",
    "path to the nocturne deployment config file. 99.99% of the time you wont need this - it's only needed if you want to interact with a secondary deployment of the nocturne contracts. See the README for more information."
  )
  .option(
    "--rpc-sync-throttle",
    "minimum delay between RPC calls in milliseconds. This is useful for rate limiting your RPC calls to avoid getting rate limited by your RPC provider. Default is 0",
  )
  .action(async (options) => {
    const { configPath, rpcSyncThrottle } = options;

    // download any artifacts necessary for withdrawal, including circuits
    await setup();

    // instantiate the withdrawal client with given config
    const client = new WithdrawalClient(configPath);

    // sync all note balances into the withdrawal client
    console.log("syncing notes from RPC node. This make take a while...")
    console.log(`latest merkle index on-chain: ${await client.syncAdapter.getLatestIndexedMerkleIndex()}`)
    await client.sync();

    // submit a single op that withdraws all notes of every asset owned by the nocturne acount with the provided spend key
    await client.withdrawEverything();
  });

const exportSpendKey = new Command("export-spend-key")
  .summary("locally run the nocturne spend key exporter UI")
  .description(
    "The exporter UI allows you to get the spend key for nocturne accounts you own. Use this to get the `SPEND_PRIVATE_KEY` and then set it into your `.env` file."
  )
  .action(async () => {
    console.log("starting spend key exporter UI at http://localhost:3000");
    await runCommand("yarn install && yarn dev --port 3000", `${__dirname}/../nocturne-ejector-ui`);
  });