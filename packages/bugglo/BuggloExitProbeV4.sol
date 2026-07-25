// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/* BuggloExitProbeV4 — the same question as BuggloExitProbe, asked of a Uniswap V4 pool.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * STATUS: NOT WIRED IN. This compiles and nothing calls it. simulateExit() still answers UNKNOWN
 * for every V4 pool, which is the honest answer while this is unproven.
 *
 * It is committed rather than deleted because the research around it is the expensive part and it
 * is all verified: the V4 PoolManager on chain 4663 is 0x8366a39cc670b4001a1121b8f6a443a643e40951,
 * and a PoolKey can be recovered from a bare pool id by reading the manager's Initialize log
 * (topic0 0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438, id as topic1) and
 * re-hashing to confirm — done for four live pools, matching every time. DexScreener labels these
 * pairs `labels: ["v4"]`, which is a cleaner detector than guessing from a 32-byte pool id.
 *
 * WHAT BLOCKS IT, and it is not V4. Every V4 token reachable for testing belongs to one launchpad
 * family: 44-byte EIP-1167 minimal proxies pointing at implementation
 * 0x3be8b97fd0e713b5abe0649fa830223b6b4bc599, all sharing hook 0x4e3468951D49f2EEa976eD0D6e75fFCb44a9a544.
 * findBalanceSlot() cannot locate their balances — not in 200 integer slots, not under any tried
 * ERC-7201 namespace, not under Solady's layout — so the probe cannot be funded and the swap
 * cannot be attempted. That gap blocks the V3 path for the same tokens, so fixing balance-slot
 * discovery is worth more than finishing this file, and has to come first.
 *
 * Do not wire this up on the strength of it compiling. A swap simulation that has never completed
 * against a live pool has no business informing anyone's money.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * Like its V3 sibling this contract is NEVER DEPLOYED. Its runtime bytecode is injected into one
 * read-only eth_call through a `code` state override, at an address that holds nothing. No key, no
 * gas, no transaction.
 *
 * WHY V4 NEEDED ITS OWN PROBE, AND WHY IT MATTERS MORE THAN V3 DID.
 *
 * Chain 4663 runs V3 and V4 side by side. Measured on a sample of 60 tokens, roughly a third could
 * not be answered at all, and V4 pools were the largest single reason — one of them carrying
 * $216,000 of liquidity. A blind spot that size is not a footnote.
 *
 * V4 also introduces a honeypot vector V3 does not have. A V4 pool carries a HOOK: an arbitrary
 * contract invoked around every swap, free to revert, to gate on the caller, or to take a fee that
 * is not the pool's fee. The pool measured while writing this has both a hook and the dynamic-fee
 * flag set. So on V4 the token can be entirely innocent and the trap can live in the hook, where no
 * amount of reading the token's bytecode will ever find it. Only actually attempting the swap does.
 *
 * HOW IT WORKS
 *
 * V4 is a singleton with flash accounting. You cannot simply call swap(): you call unlock(), the
 * manager calls you back, and inside that callback your net balances must come out settled or the
 * whole thing reverts. So the probe:
 *   - calls manager.unlock()
 *   - inside unlockCallback, calls manager.swap() for an exact-input sell
 *   - pays what it owes with a REAL transfer, through sync() / transfer / settle()
 *   - take()s whatever the swap credited it
 *   - lets the manager's own settlement rules be the judge
 *
 * A token that blocks the transfer, a hook that rejects the swap, and a fee that leaves the pool
 * short all end the same way: revert. A revert here is evidence, not an error.
 *
 * WHAT IT STILL DOES NOT PROVE, kept explicit so the caller never rounds it up:
 *   - It proves a sell clears AT THIS BLOCK, at this size, for a synthetic holder. A hook can
 *     change its mind on the next block as easily as an owner can.
 *   - A hook or token that gates on tx.origin or on holder history may treat a real wallet
 *     differently from the probe's synthetic one.
 *   - Failure is proof of a problem. Success is the absence of THIS problem, not safety.
 *
 * REGENERATE the bytecode constant in simulate.js from this file:
 *
 *   npm install solc@0.8.26
 *   node -e '
 *     const solc = require("solc"), fs = require("fs");
 *     const src = fs.readFileSync("packages/bugglo/BuggloExitProbeV4.sol", "utf8");
 *     const out = JSON.parse(solc.compile(JSON.stringify({
 *       language: "Solidity",
 *       sources: { "p.sol": { content: src } },
 *       settings: { optimizer: { enabled: true, runs: 200 },
 *                   outputSelection: { "*": { "*": ["evm.deployedBytecode.object"] } } },
 *     })));
 *     console.log("0x" + out.contracts["p.sol"].BuggloExitProbeV4.evm.deployedBytecode.object);
 *   '
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPoolManager {
    function unlock(bytes calldata data) external returns (bytes memory);

    function swap(
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) external returns (int256 delta);

    function sync(address currency) external;

    function settle() external payable returns (uint256);

    function take(address currency, address to, uint256 amount) external;
}

struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

contract BuggloExitProbeV4 {
    /* V4's own bounds. Asking to swap right up to them means "no price limit" — we want whatever
       the pool will actually give at this block, not a target price. */
    uint160 private constant MIN_SQRT_PRICE = 4295128739;
    uint160 private constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342;

    address private activeManager;
    address private activeTokenIn;
    bool private probing;

    /**
     * Sell `amountIn` of `tokenIn` through a V4 pool and report what actually came back.
     *
     * @return received units of tokenOut this contract actually holds afterwards
     * @return paid     units of tokenIn that actually left this contract
     *
     * Reverts if the sell cannot clear. The caller treats a revert as a finding, not an error.
     */
    function probeExitV4(
        address manager,
        PoolKey calldata key,
        bool zeroForOne,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external returns (uint256 received, uint256 paid) {
        require(!probing, "reentrant probe");
        probing = true;

        /* Same unchecked-cast hazard as the V3 probe: int256(uint256) wraps rather than reverting,
           and amountIn derives from the token's own decimals(), which its deployer chooses. */
        require(amountIn <= uint256(type(int256).max), "amountIn exceeds int256");

        activeManager = manager;
        activeTokenIn = tokenIn;

        uint256 tokenBefore = IERC20(tokenIn).balanceOf(address(this));
        uint256 outBefore = IERC20(tokenOut).balanceOf(address(this));

        IPoolManager(manager).unlock(abi.encode(key, zeroForOne, amountIn, tokenIn, tokenOut));

        uint256 outAfter = IERC20(tokenOut).balanceOf(address(this));
        uint256 tokenAfter = IERC20(tokenIn).balanceOf(address(this));

        /* Checked subtraction on purpose: a balance that moved the wrong way should revert rather
           than produce a number that reads like a measurement. */
        received = outAfter - outBefore;
        paid = tokenBefore - tokenAfter;

        probing = false;
    }

    /* The manager calls this back with the lock held. Everything that makes the swap real happens
       in here: the swap itself, and the settlement that the manager will verify before it returns. */
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == activeManager, "unexpected caller");

        (PoolKey memory key, bool zeroForOne, uint256 amountIn, address tokenIn, address tokenOut) =
            abi.decode(data, (PoolKey, bool, uint256, address, address));

        /* Negative amountSpecified means EXACT INPUT in V4 — the opposite sign convention to the
           one V3 uses, and an easy place to silently ask the wrong question. */
        int256 delta = IPoolManager(msg.sender).swap(
            key,
            SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(amountIn),
                sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE + 1 : MAX_SQRT_PRICE - 1
            }),
            ""
        );

        /* BalanceDelta packs two int128s: amount0 in the high half, amount1 in the low half.
           Negative means this contract owes the pool; positive means the pool owes it. */
        int128 amount0 = int128(delta >> 128);
        int128 amount1 = int128(int256(uint256(uint128(uint256(delta)))));

        (int128 deltaIn, int128 deltaOut) = zeroForOne ? (amount0, amount1) : (amount1, amount0);
        require(deltaIn < 0, "nothing owed");

        /* Pay with a real transfer. sync() snapshots the manager's balance, the transfer moves the
           tokens, settle() credits whatever actually arrived — so a token that takes a cut on
           transfer comes up short here and the manager rejects it, exactly as it should. */
        uint256 owed = uint256(uint128(-deltaIn));
        IPoolManager(msg.sender).sync(tokenIn);
        IERC20(tokenIn).transfer(msg.sender, owed);
        IPoolManager(msg.sender).settle();

        if (deltaOut > 0) {
            IPoolManager(msg.sender).take(tokenOut, address(this), uint256(uint128(deltaOut)));
        }

        return "";
    }
}
