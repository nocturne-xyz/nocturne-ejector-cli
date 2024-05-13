# Nocturne Ejector CLI

Since [Nocturne is shutting down](TODO), all off-chain infrastructure run by Nocturne Labs, including the frontend, will be turned off. However, the contract still lives on-chain, so you can still withdraw your funds by interacting with it directly. This CLI is a tool that automates this, withdrawing all funds from the protocol (leaving no dust whatsoever) to a target EOA.

Before starting, please read this README in full.

### Prerequisites

Before using this repo, you must have the following installed:
* Node.Js version 18. This can be installed from the official website [here](https://nodejs.org/en/download).
* `git`. If you don't already have it installed, you can find instructions for installing it [here](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

And you must have access to the following:
* A fresh Ethereum account with the following:
	- enough ETH to pay for gas to complete the withdrawal. The exact amount will depend on gas prices and how many deposits there are to withdraw
	- the ability to export the private key. If you're using a hardware wallet, we reccomend to withdraw funds into a "burner" hot wallet and then transfer the funds back to your hardware wallet.
* The Ethereum account you used to derive your Nocturne account. For more information about what this is, see our [docs](https://nocturne-xyz.gitbook.io/nocturne/users/metamask-snap).

> Note that the process will involve exporting your private key and passing it into the CLI's via an environment variable. To stay safe, **we strongly reccomend you use a "burner" wallet to withdraw**.

## Usage

### Setup

After the cloning the repo, fire up a terminal and do the following to set up the CLI:
1. run `corepack enable`
2. run `yarn install`
3. run `git submodule init`
4. run `git submodule update`

### Overview

Once you've set everything up, there two steps to withdrawing:

1. Filling the `.env` file
2. Withdrawing the funds

### Filling the `.env` file

1. In the root directory of the repo, locate the file called `.env.example`. Within it there will be three empty variables: `SPEND_PRIVATE_KEY`, `RPC_URL`, and `WITHDRAWAL_EOA_PRIVATE_KEY`.
2. Make a copy of it, and name it `.env`. This is how you will tell which private keys the CLI should use.
3. Fill in the values. Here is how to get each value:
	* To get `SPEND_PRIVATE_KEY`
