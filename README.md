# @hil/sdk

A Solana wallet with built-in payment guardrails. Use it like a regular wallet — transactions are automatically checked against spending policies. Small/routine payments go through instantly. Larger or unusual payments are held for human approval before executing.

## Install

```bash
bun add @hil/sdk
```

## Quick Start

```typescript
import { HilWallet } from "@hil/sdk";

const wallet = new HilWallet({
  rpcUrl: "http://localhost:3000",
  apiKey: "your-api-key",
});

const txSignature = await wallet.transfer("7xKp...recipient", 0.5);
```

## API

### `new HilWallet(config)`

Create a wallet instance.

```typescript
const wallet = new HilWallet({
  rpcUrl: "http://localhost:3000", // HIL server URL
  apiKey: "your-api-key",         // Agent API key
  pollingIntervalMs: 2000,        // Optional: poll interval (default: 2000)
  timeoutMs: 300000,              // Optional: max wait for approval (default: 5 min)
});
```

### `wallet.transfer(recipient, amount, opts?)`

Send SOL or SPL tokens. Returns a transaction signature.

```typescript
// Send SOL
const sig = await wallet.transfer("7xKp...recipient", 0.5);

// Send SOL with memo
const sig = await wallet.transfer("7xKp...recipient", 1.0, {
  memo: "Payment for services",
});

// Send SPL token
const sig = await wallet.transfer("7xKp...recipient", 100, {
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
});

// With provenance tag (helps the approver understand context)
const sig = await wallet.transfer("7xKp...recipient", 0.5, {
  memo: "Invoice #1234",
  source: "email",  // "user-command" | "email" | "web-scrape" | "tool-output" | "scheduled"
});
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `recipient` | `string` | Base58 public key of the recipient |
| `amount` | `number` | Amount in SOL (e.g. `0.5` for half a SOL) |
| `opts.mint` | `string?` | SPL token mint address. Omit for native SOL |
| `opts.memo` | `string?` | Human-readable reason for the payment |
| `opts.source` | `string?` | Where the instruction came from. Default: `"tool-output"` |

**Returns:** `Promise<string>` — transaction signature

**Throws:** `Error` if the transfer is denied by policy, rejected by the approver, or times out.

### `wallet.getBalance()`

Get the SOL balance of the wallet.

```typescript
const balance = await wallet.getBalance(); // e.g. 4.5
```

**Returns:** `Promise<number>` — balance in SOL

### `wallet.getPublicKey()`

Get the wallet's public key.

```typescript
const pubkey = await wallet.getPublicKey(); // e.g. "7xKp..."
```

**Returns:** `Promise<string>` — base58-encoded public key

### `wallet.getTransactionHistory(limit?)`

Get recent transactions made through this wallet.

```typescript
const history = await wallet.getTransactionHistory(10);
for (const tx of history) {
  console.log(`${tx.amount} SOL → ${tx.recipient} [${tx.status}]`);
}
```

**Returns:** `Promise<TransactionRecord[]>`

Each record contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Payment ID |
| `recipient` | `string` | Recipient public key |
| `amount` | `number` | Amount in SOL |
| `mint` | `string \| null` | Token mint (null for SOL) |
| `memo` | `string \| null` | Memo |
| `status` | `string` | `"confirmed"`, `"rejected"`, `"expired"`, `"failed"` |
| `txSignature` | `string \| null` | On-chain transaction signature |
| `createdAt` | `string` | ISO timestamp |
| `resolvedAt` | `string \| null` | ISO timestamp when resolved |

## Error Handling

All errors are standard `Error` instances with descriptive messages:

```typescript
try {
  await wallet.transfer("7xKp...", 5.0);
} catch (err) {
  // "Transfer denied: Amount exceeds per-tx limit"
  // "Transfer rejected by approver"
  // "Transfer expired — no approval received in time"
  // "Transfer timed out waiting for approval"
  console.error(err.message);
}
```

## How It Works

Under the hood, the wallet routes every transfer through a guardrail server that:

1. Checks the transfer against spending policies (per-transaction limits, volume caps, allowlists)
2. Auto-approves small routine payments instantly
3. Sends larger or unusual payments to a human approver via Telegram
4. Signs and submits the transaction only after authorization

The agent doesn't need to know any of this — it just calls `transfer()` and gets back a transaction signature.
