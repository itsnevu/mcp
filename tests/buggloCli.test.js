import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const cli = "packages/bugglo/cli.js";

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
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

  it("rejects malformed addresses before any chain read", () => {
    const result = run(["0xnope"]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("not a valid EVM address");
    expect(result.stdout).toBe("");
  });

  it("prints limits as JSON for scripts", () => {
    const result = run(["--json", "limits"]);
    const body = JSON.parse(result.stdout);

    expect(result.status).toBe(0);
    expect(body.chainId).toBe(4663);
    expect(body.cannotMeasure.map((item) => item.key)).toEqual([
      "holderConcentration",
      "liquidityLock",
      "honeypotSimulation",
    ]);
    expect(body.rule).toMatch(/UNKNOWN is not PASS/);
  });
});
