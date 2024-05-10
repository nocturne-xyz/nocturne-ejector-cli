import { setup, startCli } from "./src/index";

async function main() {
  await setup();
  await startCli();
}

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