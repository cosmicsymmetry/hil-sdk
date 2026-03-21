export class HilError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "HilError";
  }
}

export class PolicyDeniedError extends HilError {
  constructor(
    public readonly reason: string,
  ) {
    super(`Payment denied by policy: ${reason}`);
    this.name = "PolicyDeniedError";
  }
}

export class ApprovalTimeoutError extends HilError {
  constructor(public readonly paymentId: string) {
    super(`Approval timed out for payment ${paymentId}`);
    this.name = "ApprovalTimeoutError";
  }
}

export class ApprovalRejectedError extends HilError {
  constructor(public readonly paymentId: string) {
    super(`Payment ${paymentId} was rejected by approver`);
    this.name = "ApprovalRejectedError";
  }
}
