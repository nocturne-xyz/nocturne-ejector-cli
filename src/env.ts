import * as dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

export interface EnvVars {
  RPC_URL: string;
  NOCTURNE_SPENDING_KEY: string;
  WITHDRAWAL_ACCOUNT_PRIVATE_KEY: string;
}

export function getEnvVars(): EnvVars {
  const RPC_URL = process.env.RPC_URL;
  if (!RPC_URL) {
    throw new Error("RPC_URL env var is not set!");
  }

  const NOCTURNE_SPENDING_KEY = process.env.NOCTURNE_SPENDING_KEY;
  if (!NOCTURNE_SPENDING_KEY) {
    throw new Error("NOCTURNE_SPENDING_KEY env var is not set!");
  }
  if (!ethers.utils.isHexString(NOCTURNE_SPENDING_KEY)) {
    throw new Error("NOCTURNE_SPENDING_KEY env var is not a valid hex string!");
  }


  const WITHDRAWAL_ACCOUNT_PRIVATE_KEY = process.env.WITHDRAWAL_ACCOUNT_PRIVATE_KEY;
  if (!WITHDRAWAL_ACCOUNT_PRIVATE_KEY) {
    throw new Error("WITHDRAWAL_ACCOUNT_PRIVATE_KEY env var is not set!");
  }

  if (!ethers.utils.isBytesLike(WITHDRAWAL_ACCOUNT_PRIVATE_KEY)) {
    throw new Error(
      "WITHDRAWAL_ACCOUNT_PRIVATE_KEY env var is not a valid hex string!"
    );
  }

  return {
    RPC_URL,
    NOCTURNE_SPENDING_KEY,
    WITHDRAWAL_ACCOUNT_PRIVATE_KEY,
  };
}
