import { z } from "zod";

// Source types for provenance tracking
export const SourceType = z.enum([
  "user-command",
  "email",
  "web-scrape",
  "tool-output",
  "scheduled",
]);
export type SourceType = z.infer<typeof SourceType>;

// Transfer options — what the agent can optionally provide
export interface TransferOptions {
  /** SPL token mint address. Omit for native SOL. */
  mint?: string;
  /** Human-readable memo/reason for the payment. */
  memo?: string;
  /** Where the payment instruction originated from. Defaults to "tool-output". */
  source?: SourceType;
}

// Transaction record for history
export interface TransactionRecord {
  id: string;
  recipient: string;
  amount: number; // in SOL (or token units)
  mint: string | null;
  memo: string | null;
  status: string;
  txSignature: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

// --- Internal types (used by server, not exposed to agent) ---

export const PaymentIntent = z.object({
  recipient: z.string(),
  amount: z.string(), // lamports as string
  mint: z.string().nullable().default(null),
  memo: z.string().nullable().default(null),
  sourceType: SourceType.default("tool-output"),
});
export type PaymentIntent = z.infer<typeof PaymentIntent>;

export const RiskTier = z.enum([
  "auto-approve",
  "soft-approval",
  "hard-approval",
  "deny",
]);
export type RiskTier = z.infer<typeof RiskTier>;

export const PaymentStatus = z.enum([
  "pending",
  "auto_approved",
  "awaiting_approval",
  "approved",
  "rejected",
  "expired",
  "submitted",
  "confirmed",
  "failed",
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export interface EvidencePacket {
  paymentFacts: {
    recipient: string;
    recipientAllowlisted: boolean;
    amount: string;
    currency: string;
    destinationChanged: boolean;
  };
  provenance: {
    sourceType: SourceType;
    memo: string | null;
  };
  riskSignals: {
    amountVsAverage: number | null;
    firstTimePayee: boolean;
    volumeInWindow: string;
    windowLimit: string;
    windowUtilization: number;
  };
  recommendation: RiskTier;
  reason: string;
}

export interface PaymentRequest {
  id: string;
  agentId: string;
  recipient: string;
  amount: string;
  mint: string | null;
  memo: string | null;
  sourceType: SourceType;
  status: PaymentStatus;
  riskTier: RiskTier;
  reason: string;
  evidencePacket: EvidencePacket | null;
  approvedBy: string | null;
  approvedAt: string | null;
  txSignature: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ProposePaymentResponse {
  id: string;
  status: PaymentStatus;
  riskTier: RiskTier;
  reason: string;
  txSignature: string | null;
}
