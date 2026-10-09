import { createApplication } from './app';
import { configuration } from './config';
async function main() {
  const config = configuration();
  const app = await createApplication(config);
  await app.listen(config.port,config.host);
  console.log(`Operations API listening on ${config.host}:${config.port}`);
}
main().catch(() => { console.error('Startup failed: check configuration and dependency availability'); process.exitCode = 1; });
