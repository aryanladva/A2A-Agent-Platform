import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`Orchestrator service listening on port ${config.port} (${config.nodeEnv})`);
});
