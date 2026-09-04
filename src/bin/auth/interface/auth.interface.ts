export class VerificationTokenData {
  tokenHash: string;
  expiresAt: Date;
}

export class ResetTokenData {
  tokenHash: string;
  expiresAt: Date;
}

export class RefreshTokenEntry {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}
