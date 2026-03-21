// Public API — what agents use
export { HilWallet } from "./client.ts";
export type { HilWalletConfig } from "./client.ts";
export type { TransferOptions, TransactionRecord } from "./types.ts";

// Error types
export {
  HilError,
  PolicyDeniedError,
  ApprovalTimeoutError,
  ApprovalRejectedError,
} from "./errors.ts";

// Internal types — used by the server, not typically by agents
export {
  PaymentIntent,
  PaymentStatus,
  RiskTier,
  SourceType,
} from "./types.ts";
export type {
  PaymentRequest,
  ProposePaymentResponse,
  EvidencePacket,
} from "./types.ts";
