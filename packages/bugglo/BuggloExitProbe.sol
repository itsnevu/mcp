// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/* BuggloExitProbe — the contract that answers "can I actually get out?"
 *
 * THIS CONTRACT IS NEVER DEPLOYED. Its runtime bytecode is injected into an eth_call via a state
 * override (see EXIT_PROBE_RUNTIME in simulate.js), so it exists only for the duration of one
 * read-only call, at an address that holds nothing and cannot be reached by anyone. No gas, no key,
 * no transaction, no funds at risk. Bugglo stays read-only with respect to the chain.
 *
 * WHY A CONTRACT IS NEEDED AT ALL, when simulate.js already simulates a sell.
 *
 * simulateSell() proves the tokens can MOVE to the pool. That catches the blunt honeypots, and it
 * is genuinely useful, but it is not the question a seller is asking. A token can allow the
 * transfer and still trap you two ways this probe closes:
 *
 *   1. A sell TAX. The transfer succeeds, but the pool receives less than was sent. Uniswap V3
 *      settles by measuring its own balance after the callback, so a taxed input makes the pool's
 *      own `require(... <= balance, 'IIA')` fail. The swap reverts and we see it.
 *   2. A pool that takes the tokens but will not pay out — a swap() that reverts for reasons the
 *      transfer path never touches.
 *
 * Uniswap's own Quoter cannot answer this. The Quoter's callback pays nothing and reverts to
 * capture the amount, so it never exercises the token's real transfer. It prices a swap; it does
 * not prove one can happen. That is the whole gap.
 *
 * HOW IT WORKS
 *
 * V3's pool.swap() sends the output first, then calls back for the input, then checks it was paid.
 * So the probe:
 *   - calls pool.swap(), asking to sell `amountIn` of the token
 *   - inside uniswapV3SwapCallback, pays with a real token.transfer() to the pool
 *   - lets the pool's own accounting be the judge
 *   - returns how much of the OTHER token actually arrived
 *
 * If the token blocks the transfer, the callback reverts. If it taxes it, the pool's IIA check
 * reverts. Either way the whole eth_call reverts, and a revert here is evidence, not an error.
 *
 * WHAT IT STILL DOES NOT PROVE — kept explicit so the caller never rounds it up:
 *   - It proves a sell clears AT THIS BLOCK, from a synthetic holder, for this size. An owner can
 *     enable a tax one transaction later; nothing read-only can rule that out.
 *   - A token that gates on tx.origin, on a holder allowlist, or on a first-buy timestamp may
 *     behave differently for a real wallet than for the probe's synthetic one.
 *   - Failure is proof of a problem. Success is absence of THIS problem, which is not safety.
 *
 * REGENERATE the bytecode constant in simulate.js from this file:
 *
 *   npm install solc@0.8.26
 *   node -e '
 *     const solc = require("solc"), fs = require("fs");
 *     const src = fs.readFileSync("packages/bugglo/BuggloExitProbe.sol", "utf8");
 *     const out = JSON.parse(solc.compile(JSON.stringify({
 *       language: "Solidity",
 *       sources: { "p.sol": { content: src } },
 *       settings: { optimizer: { enabled: true, runs: 200 },
 *                   outputSelection: { "*": { "*": ["evm.deployedBytecode.object"] } } },
 *     })));
 *     console.log("0x" + out.contracts["p.sol"].BuggloExitProbe.evm.deployedBytecode.object);
 *   '
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IUniswapV3Pool {
    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1);
}

contract BuggloExitProbe {
    /* Set for the duration of one swap so the callback knows who to pay and with what. The pool
       calls back re-entrantly within probeExit, so plain storage is correct and cheapest here. */
    address private activePool;
    address private activeToken;

    /**
     * Sell `amountIn` of `token` into `pool` and report what actually came back.
     *
     * @return received  units of the counter-token this contract actually holds afterwards
     * @return paid      units of `token` that actually left this contract
     *
     * Reverts if the sell cannot clear. The caller treats a revert as a finding, not as an error.
     */
    function probeExit(
        address pool,
        address token,
        bool zeroForOne,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        address counterToken
    ) external returns (uint256 received, uint256 paid) {
        activePool = pool;
        activeToken = token;

        uint256 tokenBefore = IERC20(token).balanceOf(address(this));
        uint256 counterBefore = IERC20(counterToken).balanceOf(address(this));

        IUniswapV3Pool(pool).swap(
            address(this),
            zeroForOne,
            int256(amountIn),
            sqrtPriceLimitX96,
            ""
        );

        uint256 counterAfter = IERC20(counterToken).balanceOf(address(this));
        uint256 tokenAfter = IERC20(token).balanceOf(address(this));

        /* Unchecked would be wrong here: if a token's balance moves the wrong way, an underflow
           revert is the honest outcome. Nothing about that state should produce a number. */
        received = counterAfter - counterBefore;
        paid = tokenBefore - tokenAfter;
    }

    /* The pool calls this to collect its input. Paying with a real transfer is the entire point:
       it is the token's own logic that decides whether this succeeds, and the pool's own balance
       check that decides whether it was enough. */
    function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata) external {
        require(msg.sender == activePool, "unexpected caller");

        int256 owed = amount0Delta > 0 ? amount0Delta : amount1Delta;
        require(owed > 0, "nothing owed");

        /* No return-value check on purpose. Tokens that return nothing at all are common and are
           not the failure we are hunting; if the transfer really did not move the funds, the pool's
           IIA check on the next line of its own code catches it, which is a stronger test than
           trusting a boolean the token chose to return. */
        IERC20(activeToken).transfer(activePool, uint256(owed));
    }
}
