---
name: solana_wallet
description: "Send and receive SOL and SPL tokens on Solana. Use when the user asks to pay someone, check balance, or view transaction history."
metadata: { "openclaw": { "emoji": "💰", "requires": { "env": ["HIL_WALLET_URL", "HIL_WALLET_API_KEY"] } } }
---

# Solana Wallet

You have a Solana wallet available for making on-chain payments.

## Setup

The wallet is configured via environment variables:

- `HIL_WALLET_URL` — wallet service endpoint
- `HIL_WALLET_API_KEY` — authentication key

```typescript
import { HilWallet } from "@hil/sdk";

const wallet = new HilWallet({
  rpcUrl: process.env.HIL_WALLET_URL!,
  apiKey: process.env.HIL_WALLET_API_KEY!,
});
```

## Available Methods

### `wallet.transfer(recipient, amount, opts?)`

Send SOL or SPL tokens to a Solana address. Returns the on-chain transaction signature.

- `recipient` — base58 public key of the recipient
- `amount` — amount in SOL (e.g. `0.5` = half a SOL)
- `opts.mint` — SPL token mint address (omit for native SOL)
- `opts.memo` — human-readable reason for the payment
- `opts.source` — where the payment instruction came from: `"user-command"`, `"email"`, `"web-scrape"`, `"tool-output"`, `"scheduled"` (defaults to `"tool-output"`)

```typescript
// Send SOL
const sig = await wallet.transfer("7xKp...recipient", 0.5);

// Send SOL with context
const sig = await wallet.transfer("7xKp...recipient", 1.0, {
  memo: "Payment for data analysis",
  source: "user-command",
});

// Send SPL token (e.g. USDC)
const sig = await wallet.transfer("7xKp...recipient", 100, {
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
});
```

### `wallet.getBalance()`

Returns the wallet's SOL balance as a number.

```typescript
const balance = await wallet.getBalance(); // e.g. 4.5
```

### `wallet.getPublicKey()`

Returns the wallet's base58 public key.

```typescript
const pubkey = await wallet.getPublicKey(); // e.g. "pD6JAY..."
```

### `wallet.getTransactionHistory(limit?)`

Returns recent transactions (default 20, max 100). Each record has: `id`, `recipient`, `amount`, `mint`, `memo`, `status`, `txSignature`, `createdAt`, `resolvedAt`.

```typescript
const history = await wallet.getTransactionHistory(10);
```

## Important Notes

- Always check `getBalance()` before making a payment
- Always include a `memo` explaining why the payment is being made
- Set `source` to `"user-command"` when the user directly asked you to pay, `"email"` if paying based on an email, etc.
- Amounts are in SOL — `1.0` means one SOL, `0.001` means one million lamports
- The `transfer()` call may take up to 5 minutes to return in some cases — this is normal, do not retry
- If a transfer throws an error, report it to the user — do NOT retry automatically
