import { sleep, runCommand, ROOT_DIR } from "../utils";
import { getEnvVars } from "../env";
import * as fs from "fs";
import * as compose from "docker-compose";

export const GRAPH_NODE_COMPOSE_CWD = `${ROOT_DIR}/graph-node/docker`;

const GRAPH_NODE_COMPOSE_OPTS: compose.IDockerComposeOptions = {
  cwd: GRAPH_NODE_COMPOSE_CWD,
  commandOptions: [["--force-recreate"], ["--renew-anon-volumes"]],
};

export const SUBGRAPH_CWD = `${ROOT_DIR}/subgraph`;

// NOTE: `_config` here is actually unused - it just uses what's currently hardcoded in `subgraph.yaml`
// TODO: parse / modify / backup subgraph.yaml or find a way to do this through CLI (doubtful) so we can actually set this config
export async function startSubgraph(): Promise<() => Promise<void>> {
  // start graph node
  console.log("starting graph node...");
  const { RPC_URL } = getEnvVars();
  await fs.promises.writeFile(`${GRAPH_NODE_COMPOSE_CWD}/.env`, `RPC_URL=${RPC_URL}`);
  try {
    const res = await compose.upAll(GRAPH_NODE_COMPOSE_OPTS);
    console.log("graph node successfully started", res);
  } catch (err) {
    console.error(err);
    throw err;
  }

  console.log("waiting for graph node to start...");
  await sleep(20_000);

  // build subgraph
  try {
    console.log("building subgraph...");
    const [stdout, stderr] = await runCommand(`yarn install && yarn codegen && yarn graph build --network mainnet`, SUBGRAPH_CWD);
    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }
  } catch (err) {
    console.error(err);
    throw err;
  }

  // deploy subgraph
  try {
    console.log("deploying subgraph...");
    const [stdout, stderr] = await runCommand(
      `yarn create-local && yarn deploy-local`,
      SUBGRAPH_CWD
    );
    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }
  } catch (err) {
    console.error(err);
    throw err;
  }

  // wait for subgraph to sync
  console.log("waiting for subgraph to sync... this could take a few minutes");
  await sleep(300_000);

  return async () => {
    await compose.down({
      cwd: GRAPH_NODE_COMPOSE_CWD,
      commandOptions: [["--volumes"]],
    });
  };
}
