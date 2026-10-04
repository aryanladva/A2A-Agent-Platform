import app from './app';
import { config } from './config';

app.listen(config.port, config.host, () => {
  console.log(`Orchestrator service listening on http://${config.host}:${config.port} (${config.nodeEnv})`);
});
