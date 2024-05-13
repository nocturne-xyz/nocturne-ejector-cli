import { startCli } from "./src/index";

async function main() {
  await startCli();
}

// ! HACK for some reason something in our code maxes out the event listeners. This just supresses the scary warning
process.setMaxListeners(0);

process.on("SIGINT", () => {
  process.exit(1);
});

// ! HACK
// ! in principle, there should be no hanging promises once `main()` resolves or rejects.
// ! as a backstop, we manually call `process.exit()` to ensure the process actually exits
// ! even if there's a bug somewhere that results in a hanging promise
main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.log(`exited with error: ${e}`);
    process.exit(1);
  });