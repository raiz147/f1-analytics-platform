import { spawn } from "child_process";

import { config } from "../config.js";

function createDisabledImportError() {
  const error = new Error("Session imports are disabled in this environment");
  error.statusCode = 403;
  return error;
}

function runPipelineCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(config.pipeline.pythonPath, ["-m", "src.main", ...args], {
      cwd: config.pipeline.workdir,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `Pipeline command failed with exit code ${code}`));
    });
  });
}

export async function importSessionData(sessionKey) {
  if (!config.enableSessionImports) {
    throw createDisabledImportError();
  }

  await runPipelineCommand(["sync", "--session-key", String(sessionKey)]);

  return {
    sessionKey,
    status: "imported"
  };
}
