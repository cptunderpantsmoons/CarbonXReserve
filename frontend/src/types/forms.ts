export interface OrganizationForm {
  name: string;
  type: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
}

export interface DocumentForm {
  idDocument: File | null;
  addressProof: File | null;
}

export interface PersonalKYCForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  documentType: 'passport' | 'drivers_license' | 'national_id';
  documentNumber: string;
}

export interface FormErrors {
  [key: string]: string;
}