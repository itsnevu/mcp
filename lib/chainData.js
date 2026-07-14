/* The chain reader moved to packages/bugglo/chain.js. This file is now one line of re-export.
 *
 * WHY IT MOVED, AND WHY THIS SHIM STAYS.
 *
 * The code that reads Robinhood Chain is the only thing this project has that nothing else on the
 * internet has. Kept in lib/, it could only ever be reached by someone who opened the web app. As a
 * published package it is also an MCP server other people's agents install, and a CLI — the same
 * code, answering the same way, through three different doors.
 *
 * The rule that makes that safe is SINGLE SOURCE. There is exactly one implementation of rugCheck()
 * and it lives in the package. If this file were ever a copy instead of a re-export, the app and the
 * MCP server would drift, and one day they would say two different things about the same address —
 * which, for a tool whose entire pitch is that it does not fabricate, is the worst bug available.
 *
 * So: import from "@/lib/chainData" or from "bugglo/chain" — they are the same module. This shim
 * exists only so the app's existing imports (lib/liveAgent.js, tests/chainData.test.js) did not have
 * to be rewritten to prove a point about file layout.
 *
 * The core lives in `bugglo` and NOT in `bugglo-mcp` on purpose: bugglo-mcp pulls in the MCP SDK,
 * which pulls in express, hono, ajv and cors. The CLI must not download an HTTP server stack to
 * print a rug check. So `bugglo` depends on viem and nothing else, and bugglo-mcp depends on bugglo.
 */

export * from "bugglo/chain";
