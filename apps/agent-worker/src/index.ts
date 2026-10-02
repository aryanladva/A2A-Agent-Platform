import app from './app';
import { config } from './config';
import { registerWithOrchestrator } from './services/workerAgent';

app.listen(config.port, () => {
  console.log(
    `Worker Agent service listening on port ${config.port} (Mock Mode: ${config.isMock}, Provider: ${config.llmProvider})`
  );

  // Register with Orchestrator on startup per ARCHITECTURE.md & AGENT_CARD_SPEC.md
  registerWithOrchestrator();
});
