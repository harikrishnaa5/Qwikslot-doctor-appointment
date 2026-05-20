import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";

async function main() {
  const env = loadConfig();
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Listening on http://${env.HOST}:${env.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
