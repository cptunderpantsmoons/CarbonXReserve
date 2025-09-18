export interface KYCRequest {
  userId: string;
  fullName: string;
  idDoc: File;
  proofOfAddress: File;
}

export interface KYCResult {
  status: 'approved' | 'rejected' | 'manual_review';
  reason: string;
  notabeneId: string;
  completedAt: Date;
}