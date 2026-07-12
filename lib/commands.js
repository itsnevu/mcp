/* `template` is the prompt handed to the agent and stays English regardless of
   the UI language; only `descKey` is shown to the user. */
export const COMMANDS = [
  { cmd: "/rugcheck", descKey: "cmd.rugcheck", template: "Rug check this contract: 0x" },
  { cmd: "/trending", descKey: "cmd.trending", template: "What are the trending tickers on X right now?", send: true },
  { cmd: "/sentiment", descKey: "cmd.sentiment", template: "What's the community sentiment for $" },
  { cmd: "/wallet", descKey: "cmd.wallet", template: "Analyze this Robinhood Chain wallet: 0x" },
  { cmd: "/fud", descKey: "cmd.fud", template: "Run FUD detection for $" },
  { cmd: "/moving", descKey: "cmd.moving", template: "What's moving on Robinhood Chain today?", send: true },
  { cmd: "/help", descKey: "cmd.help", template: "What can you do?", send: true },
];
