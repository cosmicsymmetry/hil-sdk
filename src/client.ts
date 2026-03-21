import type {
  PaymentRequest,
  ProposePaymentResponse,
  TransferOptions,
  TransactionRecord,
} from "./types.ts";

export interface HilWalletConfig {
  /** HIL server URL (e.g. "http://localhost:3000") */
  rpcUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** How often to poll for approval status (ms). Default: 2000 */
  pollingIntervalMs?: number;
  /** Max time to wait for approval (ms). Default: 300000 (5 min) */
  timeoutMs?: number;
}

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * A Solana wallet with built-in payment guardrails.
 *
 * Use it like a regular wallet — call `transfer()` to send SOL or tokens.
 * Transactions are automatically checked against spending policies.
 * Small/routine payments go through instantly. Larger or unusual payments
 * are held for human approval before executing.
 *
 * @example
 * ```ts
 * const wallet = new HilWallet({ rpcUrl: "http://localhost:3000", apiKey: "your-key" });
 *
 * // Send 0.5 SOL — may auto-approve or wait for human approval
 * const txSignature = await wallet.transfer("7xKp...recipient", 0.5);
 *
 * // Check balance
 * const balance = await wallet.getBalance();
 * ```
 */
export class HilWallet {
  private readonly serverUrl: string;
  private readonly apiKey: string;
  private readonly pollingIntervalMs: number;
  private readonly timeoutMs: number;

  constructor(config: HilWalletConfig) {
    this.serverUrl = config.rpcUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.pollingIntervalMs = config.pollingIntervalMs ?? 2000;
    this.timeoutMs = config.timeoutMs ?? 300_000;
  }

  /**
   * Transfer SOL or SPL tokens to a recipient.
   *
   * @param recipient - Base58 public key of the recipient
   * @param amount - Amount in SOL (e.g. 0.5 for half a SOL)
   * @param opts - Optional: mint (for SPL tokens), memo, source provenance tag
   * @returns Transaction signature string
   * @throws Error if the transfer is denied, rejected, or times out
   *
   * @example
   * ```ts
   * // Send SOL
   * const sig = await wallet.transfer("7xKp...", 0.5);
   *
   * // Send SOL with memo
   * const sig = await wallet.transfer("7xKp...", 1.0, { memo: "Payment for services" });
   *
   * // Send SPL token
   * const sig = await wallet.transfer("7xKp...", 100, { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" });
   * ```
   */
  async transfer(recipient: string, amount: number, opts?: TransferOptions): Promise<string> {
    const lamports = Math.round(amount * LAMPORTS_PER_SOL).toString();

    const res = await this.fetch("/api/v1/payments", {
      method: "POST",
      body: JSON.stringify({
        recipient,
        amount: lamports,
        mint: opts?.mint ?? null,
        memo: opts?.memo ?? null,
        sourceType: opts?.source ?? "tool-output",
      }),
    });

    const data = (await res.json()) as ProposePaymentResponse;

    if (!res.ok) {
      throw new Error(`Transfer ${res.status === 403 ? "denied" : "failed"}: ${data.reason ?? res.statusText}`);
    }

    // Auto-approved and executed
    if (data.status === "confirmed" && data.txSignature) {
      return data.txSignature;
    }

    // Awaiting approval — poll until resolved
    return this.waitForSignature(data.id);
  }

  /**
   * Get the SOL balance of this wallet.
   * @returns Balance in SOL
   */
  async getBalance(): Promise<number> {
    const res = await this.fetch("/api/v1/wallet/balance");
    if (!res.ok) throw new Error(`Failed to get balance: ${res.statusText}`);
    const data = (await res.json()) as { balance: number };
    return data.balance;
  }

  /**
   * Get the public key of this wallet.
   * @returns Base58-encoded public key
   */
  async getPublicKey(): Promise<string> {
    const res = await this.fetch("/api/v1/wallet/pubkey");
    if (!res.ok) throw new Error(`Failed to get public key: ${res.statusText}`);
    const data = (await res.json()) as { pubkey: string };
    return data.pubkey;
  }

  /**
   * Get transaction history.
   * @param limit - Max number of records to return (default: 20)
   */
  async getTransactionHistory(limit = 20): Promise<TransactionRecord[]> {
    const res = await this.fetch(`/api/v1/wallet/history?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to get history: ${res.statusText}`);
    const data = (await res.json()) as { transactions: TransactionRecord[] };
    return data.transactions;
  }

  /** Poll until a payment is confirmed and return the tx signature */
  private async waitForSignature(id: string): Promise<string> {
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      await sleep(this.pollingIntervalMs);

      const res = await this.fetch(`/api/v1/payments/${id}`);
      if (!res.ok) continue;

      const payment = (await res.json()) as PaymentRequest;

      switch (payment.status) {
        case "confirmed":
        case "auto_approved":
          if (payment.txSignature) return payment.txSignature;
          continue;
        case "rejected":
          throw new Error("Transfer rejected by approver");
        case "expired":
          throw new Error("Transfer expired — no approval received in time");
        case "failed":
          throw new Error(`Transfer failed: ${payment.reason}`);
        default:
          continue;
      }
    }

    throw new Error("Transfer timed out waiting for approval");
  }

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.serverUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...init?.headers,
      },
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
