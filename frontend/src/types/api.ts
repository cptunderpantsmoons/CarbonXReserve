export interface KYCRequest {
  userId: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  address?: string;
  documentType?: 'passport' | 'drivers_license' | 'national_id';
  documentNumber?: string;
}

export interface KYCResponse {
  status: 'approved' | 'rejected' | 'pending';
  reason?: string;
  timestamp: string;
}

export interface KYCError {
  error: string;
  message: string;
}