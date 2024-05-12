import {
  MockEthToTokenConverter,
  newOpRequestBuilder,
  NocturneClient,
  NocturneDB,
  proveOperation,
  signOperation,
  SyncOpts,
} from "@nocturne-xyz/client";
import {
  AssetType,
  InMemoryKVStore,
  JoinSplitProver,
  maxGasForOperation,
  NocturneSigner,
  SparseMerkleProver,
  thunk,
  Thunk,
  TotalEntityIndexTrait,
  VerifyingKey,
} from "@nocturne-xyz/core";
import { ARTIFACTS_DIR } from "./utils";
import { ethers } from "ethers";
import { getEnvVars } from "./env";
import { MockOpTracker } from "@nocturne-xyz/client/dist/src/OpTracker";
import { Erc20Plugin } from "@nocturne-xyz/op-request-plugins";
import { WasmJoinSplitProver } from "@nocturne-xyz/local-prover";
import path from "path";
import fs from "fs";
import { CIRCUIT_ARTIFACTS } from "./setup/downloadCircuitArtifacts";
import { Teller, Teller__factory } from "@nocturne-xyz/contracts";
import { loadNocturneConfig, NocturneConfig } from "@nocturne-xyz/config";
import { RPCSDKSyncAdapter } from "@nocturne-xyz/rpc-sync-adapters";
import inquirer from "inquirer";

export const GAS_MULTIPLIER = 0;

export class WithdrawalClient {
  provider: ethers.providers.JsonRpcProvider;
  eoa: ethers.Wallet;
  signer: NocturneSigner;
  client: NocturneClient;
  syncAdapter: RPCSDKSyncAdapter;
  db: NocturneDB;
  config: NocturneConfig;
  teller: Teller;

  joinSplitProver: Thunk<JoinSplitProver>;

  constructor(networkNameOrConfigPath = "mainnet") {
    const { RPC_URL, SPEND_PRIVATE_KEY, WITHDRAWAL_EOA_PRIVATE_KEY } = getEnvVars();

    this.config = loadNocturneConfig(networkNameOrConfigPath);

    // use separate provider for syncing
    // determine kind by checking prefix, assume websocket if not http
    const syncProvider = RPC_URL.startsWith("http") ? new ethers.providers.JsonRpcBatchProvider(RPC_URL) : new ethers.providers.WebSocketProvider(RPC_URL);
    this.syncAdapter = new RPCSDKSyncAdapter(syncProvider, this.config.handlerAddress);

    this.provider = RPC_URL.startsWith("http") ? new ethers.providers.JsonRpcBatchProvider(RPC_URL) : new ethers.providers.WebSocketProvider(RPC_URL);
    this.signer = new NocturneSigner(ethers.utils.arrayify(SPEND_PRIVATE_KEY));
    this.eoa = new ethers.Wallet(WITHDRAWAL_EOA_PRIVATE_KEY, this.provider);

    this.db = new NocturneDB(new InMemoryKVStore());
    this.db.setCurrentTotalEntityIndex(TotalEntityIndexTrait.fromBlockNumber(this.config.startBlock, "UP_TO"));
    this.client = new NocturneClient(
      this.signer,
      this.provider,
      "mainnet",
      new SparseMerkleProver(this.db.kv),
      this.db,
      this.syncAdapter,
      new MockEthToTokenConverter(),
      new MockOpTracker()
    );

    this.teller = Teller__factory.connect(
      this.config.contracts.tellerProxy.proxy,
      this.eoa
    );

    this.joinSplitProver = thunk(async () => {
      const vkey = await fs.promises.readFile(
        path.join(ARTIFACTS_DIR, CIRCUIT_ARTIFACTS.joinSplit.vkey),
        { encoding: "utf-8" }
      );
      return new WasmJoinSplitProver(
        path.join(ARTIFACTS_DIR, CIRCUIT_ARTIFACTS.joinSplit.wasm),
        path.join(ARTIFACTS_DIR, CIRCUIT_ARTIFACTS.joinSplit.zkey),
        JSON.parse(vkey) as VerifyingKey
      );
    });
  }

  async sync(opts?: SyncOpts): Promise<void> {
    await this.client.sync(opts);
  }

  async withdrawEverything(): Promise<void> {
    const balances = await this.client.getAllAssetBalances();
    const builder = newOpRequestBuilder(this.provider, this.config.chainId).use(
      Erc20Plugin
    );
    console.log(
      `Initializing batch-withdrawal to recipient: ${this.eoa.address}`
    );

    let hasFundsToWithdraw = false;
    for (const { asset, balance } of balances) {
      // this should never happen since we only care about ERC20 assets
      if (asset.assetType !== AssetType.ERC20) {
        console.log("skipping non-ERC20 asset");
        continue;
      }

      // TODO: use ticker instead of address
      console.log(
        `\tadding withdrawal for asset with contract address ${asset.assetAddr}...`
      );
      if (balance > 0n) {
        builder.erc20Transfer(asset.assetAddr, this.eoa.address, balance);
        hasFundsToWithdraw = true;
      }
    }

    if (!hasFundsToWithdraw) {
      console.log("no funds to withdraw!");
      return;
    }

    const opRequest = await builder.build();
    const preSignOp = await this.client.prepareOperation(
      opRequest.request,
      GAS_MULTIPLIER
    );
    const signedOp = await signOperation(this.signer, preSignOp);
    const provenOp = await proveOperation(
      await this.joinSplitProver(),
      signedOp
    );

    console.log("estimating gas for batch-withdrawal transaction...");
    // Calculate total gas limit based on op data because eth_estimateGas is not predictable for
    // processBundle
    const gasLimit = maxGasForOperation(provenOp); 
    const gasPrice = await this.provider.getGasPrice();
    console.log("gas price:", gasPrice.toString());
    console.log(`estimated gas limit: ${gasLimit.toString()} (${ethers.utils.formatEther((gasLimit * gasPrice.toBigInt()).toString())} ETH)`);
    console.log("note: the gas limit is a very conservative estimate, in practice the gas cost will likely be lower");

    await inquirer.prompt([{
      type: "confirm",
      name: "confirm",
      message: "approve the transaction?",
      default: false
    }]).then(async (answers) => {
      if (answers.confirm) {
        console.log("submitting batch-withdrawal transaction...");
        const tx = await this.teller.processBundle({
          operations: [provenOp],
        }, { gasLimit });
        console.log(`transaction submitted with hash: ${tx.hash}`);
        console.log("waiting 3 confirmations...");
        await tx.wait(3);
        console.log("withdrawal complete!");
      } else {
        console.log("withdrawal cancelled");
      }
    });
  }
}
