import { exec } from 'child_process';
import path from 'path';

export interface SandboxOptions {
  projectPath?: string;
  command?: string;
  image?: string;
  timeoutSeconds?: number;
  cpus?: number;
  memory?: string;
  allowNetwork?: boolean;
}

export interface SandboxResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  dockerAvailable: boolean;
  error?: string;
}

/**
 * Checks if the Docker daemon is installed and currently running.
 */
export function isDockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('docker info', { timeout: 3000 }, (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Runs a short-lived Docker container per task scoped strictly to projectPath.
 * Enforces resource limits (2 CPU/2GB/60s default) and network isolation by default.
 */
export async function runInDockerSandbox(options: SandboxOptions): Promise<SandboxResult> {
  const dockerReady = await isDockerAvailable();
  if (!dockerReady) {
    return {
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: '',
      durationMs: 0,
      dockerAvailable: false,
      error:
        'Docker is not installed or running. Code execution (Debug/Test agent) requires Docker. Please start Docker and try again.',
    };
  }

  const projectPath = path.resolve(options.projectPath || process.cwd());
  const command = options.command || 'npm test';
  const image = options.image || 'node:20-alpine';
  const timeoutSeconds = options.timeoutSeconds || 60;
  const timeoutMs = timeoutSeconds * 1000;
  const cpus = options.cpus || 2;
  const memory = options.memory || '2g';
  const networkFlag = options.allowNetwork ? '' : '--network=none';

  // Short-lived container (--rm), scoped to project folder (-v), isolated network (--network=none), resource limits (--cpus, --memory)
  const dockerCmd = `docker run --rm ${networkFlag} --cpus=${cpus} --memory=${memory} -v "${projectPath}:/workspace" -w /workspace ${image} sh -c "${command.replace(
    /"/g,
    '\\"'
  )}"`;

  const startTime = Date.now();

  return new Promise<SandboxResult>((resolve) => {
    exec(dockerCmd, { timeout: timeoutMs }, (err, stdout, stderr) => {
      const durationMs = Date.now() - startTime;

      if (err) {
        const exitCode = typeof err.code === 'number' ? err.code : 1;
        const isTimeout = err.killed;
        resolve({
          success: false,
          exitCode,
          stdout: stdout || '',
          stderr: stderr || err.message,
          durationMs,
          dockerAvailable: true,
          error: isTimeout ? `Execution timed out after ${timeoutSeconds} seconds` : err.message,
        });
      } else {
        resolve({
          success: true,
          exitCode: 0,
          stdout: stdout || '',
          stderr: stderr || '',
          durationMs,
          dockerAvailable: true,
        });
      }
    });
  });
}
