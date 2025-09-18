import axios from 'axios';
import { KYCRequest, KYCResponse, KYCError } from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const submitKYC = async (data: KYCRequest): Promise<KYCResponse> => {
  try {
    const response = await api.post<KYCResponse>('/kyc/verify', data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const kycError: KYCError = error.response.data;
      throw new Error(kycError.message || 'KYC verification failed');
    }
    throw new Error('Network error occurred');
  }
};

export default api;