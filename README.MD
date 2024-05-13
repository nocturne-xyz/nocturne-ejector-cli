# Nocturne Ejector CLI

Since [Nocturne is shutting down](TODO), all off-chain infrastructure run by Nocturne Labs, including the frontend, will be turned off. However, the contract still lives on-chain, so you can still withdraw your funds by interacting with it directly. This CLI is a tool that automates this, withdrawing all funds from the protocol (leaving no dust whatsoever) to a target EOA.

> Before starting, please read this README in full.

### Prerequisites

Before using this repo, you must have the following installed:
* Node.Js version 18. This can be installed from the official website [here](https://nodejs.org/en/download).
* `git`. If you don't already have it installed, you can find instructions for installing it [here](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

And you must have access to the following:
* A fresh Ethereum account with the following:
	- enough ETH to pay for gas to complete the withdrawal. The exact amount will depend on gas prices and how many deposits there are to withdraw
	- the ability to export the private key. If you're using a hardware wallet, we reccomend to withdraw funds into a "burner" hot wallet and then transfer the funds back to your hardware wallet.
* The Ethereum account you used to derive your Nocturne account. For more information about what this is, see our [docs](https://nocturne-xyz.gitbook.io/nocturne/users/metamask-snap).
* An RPC node. You can find publicly-accessible nodes [here](https://ethereumnodes.com/), though we reccomend [setting up a free alchemy account](https://www.alchemy.com/overviews/private-rpc-endpoint) because we make a lot of calls to the node when syncing.

> Note that the process will involve exporting your private key and passing it into the CLI's via an environment variable. To stay safe, **we strongly reccomend you use a "burner" wallet to withdraw**.

## Usage

### Setup

After the cloning the repo, fire up a terminal and do the following to set up the CLI:
1. run `git submodule init`
2. run `git submodule update --remote`
3. run `corepack enable`
4. run `yarn install`

### Filling the `.env` file

1. In the root directory of the repo, locate the file called `.env.example`. Within it there will be three empty variables: `SPEND_PRIVATE_KEY`, `RPC_URL`, and `WITHDRAWAL_EOA_PRIVATE_KEY`.
2. Make a copy of it, and name it `.env`. This is how you will tell which private keys the CLI should use.
3. Collect and fill in the values.

To get `SPEND_PRIVATE_KEY`, run `nocturne-ejector-cli export-spend-key`. This will locally host a UI (only on your machine) that you can use to export your Nocturne Spending Key. Then do the following:
	1. Open your browser and go to `http://localhost:3000` to open the UI
	2. Connect to MetaMask from the acconut you originally used to set up your Nocturne account
	3. Sign the key generation message to re-derive your spend key.
	4. You should now see your spending key as a hex string. Copy it into the `SPEND_PRIVATE_KEY` field inside your `.env` file.

To get `WITHDRAWAL_EOA_PRIVATE_KEY`, export the private key for the EOA you're using to withdraw and paste it into the `WITHDRAWAL_EOA_PRIVATE_KEY` field inside your `.env` file.

To get `RPC_URL`, find the URL of the RPC node you prepared in the [prerequisites](#prerequisites) and paste it into the `RPC_URL` field inside your `.env` file.

### Withdrawing funds

Once you've filled your `.env` file, all you need to do is `nocturne-ejector-cli withdraw`. It will sync your balances and kick off a single transaction that withdraws all of your funds from nocturne to the withdrawal EOA in a single transaction.

> Tip: if sync is failing, it's likely due to the CLI overloading your RPC node. Try running with a longer delay between RPC calls. You can set this by running the withdraw command with `--rpc-sync-throttle DELAY_MS`, where `DELAY_MS` is the desired delay in milliseconds. By default it's 1000ms. For example, `nocturne-ejector-cli withdraw --rpc-sync-throttle 2000`.
