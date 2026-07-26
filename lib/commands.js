/* `template` is the prompt handed to the agent and stays English regardless of
   the UI language; only `descKey` is shown to the user. */
export const COMMANDS = [
  { cmd: "/rugcheck", descKey: "cmd.rugcheck", template: "Rug check this contract: 0x" },
  { cmd: "/trending", descKey: "cmd.trending", template: "Which tickers have the strongest buy pressure on Robinhood Chain right now?", send: true },
  { cmd: "/sentiment", descKey: "cmd.sentiment", template: "Read the on-chain sentiment — buy/sell pressure, holder momentum, liquidity — for $" },
  { cmd: "/wallet", descKey: "cmd.wallet", template: "Analyze this Robinhood Chain wallet: 0x" },
  /* Was /fud. "FUD" names a social phenomenon and there are no social tools to detect it with;
     what the chain can show is the money moving, which is the signal the question was after. */
  { cmd: "/distress", descKey: "cmd.distress", template: "Check for distress signals — liquidity being pulled, sell pressure spiking, holders exiting — for $" },
  { cmd: "/moving", descKey: "cmd.moving", template: "What's moving on Robinhood Chain today?", send: true },
  { cmd: "/help", descKey: "cmd.help", template: "What can you do?", send: true },
];
