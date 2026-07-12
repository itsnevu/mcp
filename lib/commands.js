export const COMMANDS = [
  { cmd: "/rugcheck", desc: "Deployer + liquidity risk scan for a contract", template: "Rug check this contract: 0x" },
  { cmd: "/trending", desc: "Trending tickers on 𝕏 right now", template: "What are the trending tickers on X right now?", send: true },
  { cmd: "/sentiment", desc: "𝕏 community sentiment for a ticker", template: "What's the community sentiment for $" },
  { cmd: "/wallet", desc: "Analyze a Robinhood Chain wallet", template: "Analyze this Robinhood Chain wallet: 0x" },
  { cmd: "/fud", desc: "Detect coordinated FUD for a ticker", template: "Run FUD detection for $" },
  { cmd: "/moving", desc: "What's moving on Robinhood Chain", template: "What's moving on Robinhood Chain today?", send: true },
  { cmd: "/help", desc: "What can Ranger do?", template: "What can you do?", send: true },
];
