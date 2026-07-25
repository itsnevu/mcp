import fs from "node:fs";
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const cli = "packages/bugglo/cli.js";

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function runAsync(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: "1" },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("CLI test timed out"));
    }, 5_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
  });
}

function startRpc(result) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      req.resume();
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result }));
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

describe("bugglo CLI package", () => {
  it("declares an executable npx entrypoint", () => {
    const manifest = JSON.parse(fs.readFileSync("packages/bugglo/package.json", "utf8"));

    expect(manifest.bin).toEqual({ bugglo: "cli.js" });
    expect(manifest.files).toContain("cli.js");
    expect(fs.statSync(cli).mode & 0o111).not.toBe(0);
  });

  it("prints useful help without touching the network", () => {
    const result = run(["--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("npx bugglo");
    expect(result.stdout).toContain("--rpc-list");
    expect(result.stdout).toContain("bugglo market <address>");
    expect(result.stdout).toContain("UNKNOWN is not PASS");
    expect(result.stderr).toBe("");
  });

  it("prints the package version", () => {
    const manifest = JSON.parse(fs.readFileSync("packages/bugglo/package.json", "utf8"));
    const result = run(["--version"]);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(manifest.version);
  });

  it("rejects malformed addresses before any chain read", () => {
    const result = run(["0xnope"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("not a valid EVM address");
    expect(result.stdout).toBe("");
  });

  it("refuses an RPC that is not Robinhood Chain", async () => {
    const { server, url } = await startRpc("0x1");
    try {
      const result = await runAsync(["--rpc", url, "0x2103faA9D1762e27a716C61718b3aCf3Ec1F9bf1"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("expected 0x1237 (Robinhood Chain 4663)");
      expect(result.stdout).toBe("");
    } finally {
      server.close();
    }
  });

  it("prints limits as JSON for scripts", () => {
    const result = run(["--json", "limits"]);
    const body = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(body.chainId).toBe(4663);
    expect(body.cannotMeasure.map((item) => item.key)).toEqual([
      "holderConcentration",
      "liquidityLock",
    ]);
    expect(body.rule).toMatch(/UNKNOWN is not PASS/);
  });
});
