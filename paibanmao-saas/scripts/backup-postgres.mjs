import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const backupDir = resolve(process.env.BACKUP_DIR || "backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputFile = join(backupDir, `paibanmao-${timestamp}.dump`);

if (!databaseUrl) {
  console.error("DATABASE_URL is required for database backup.");
  process.exit(1);
}

await mkdir(backupDir, { recursive: true });

const child = spawn("pg_dump", ["--dbname", databaseUrl, "--format", "custom", "--no-owner", "--file", outputFile], {
  stdio: ["ignore", "inherit", "pipe"],
  shell: process.platform === "win32",
});

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

const exitCode = await new Promise((resolveExit) => {
  child.on("close", resolveExit);
});

if (exitCode !== 0) {
  console.error(stderr.trim() || `pg_dump exited with code ${exitCode}`);
  process.exit(Number(exitCode) || 1);
}

console.log(`Database backup written: ${outputFile}`);
