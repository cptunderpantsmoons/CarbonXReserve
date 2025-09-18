import React, { useState } from 'react';
import { OrganizationForm, PersonalKYCForm, FormErrors } from '../types/forms';
import { KYCRequest, KYCResponse } from '../types/api';
import { submitKYC } from '../services/api';

const RegistrationForm: React.FC = () => {
  const [orgForm, setOrgForm] = useState<OrganizationForm>({
    name: '',
    type: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
  });

  const [kycForm, setKycForm] = useState<PersonalKYCForm>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    address: '',
    documentType: 'passport',
    documentNumber: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<KYCResponse | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Organization validation
    if (!orgForm.name.trim()) newErrors.orgName = 'Organization name is required';
    if (!orgForm.type) newErrors.orgType = 'Organization type is required';
    if (!orgForm.contactName.trim()) newErrors.contactName = 'Contact name is required';
    if (!orgForm.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(orgForm.email)) newErrors.email = 'Email is invalid';
    if (!orgForm.phone.trim()) newErrors.phone = 'Phone is required';
    if (!orgForm.address.trim()) newErrors.orgAddress = 'Address is required';

    // KYC validation
    if (!kycForm.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!kycForm.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!kycForm.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!kycForm.address.trim()) newErrors.kycAddress = 'Address is required';
    if (!kycForm.documentNumber.trim()) newErrors.documentNumber = 'Document number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setKycStatus(null);

    try {
      const kycRequest: KYCRequest = {
        userId: orgForm.email, // Use email as userId
        firstName: kycForm.firstName,
        lastName: kycForm.lastName,
        dateOfBirth: kycForm.dateOfBirth,
        address: kycForm.address,
        documentType: kycForm.documentType,
        documentNumber: kycForm.documentNumber,
      };

      const response = await submitKYC(kycRequest);
      setKycStatus(response);
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Submission failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOrgForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleKycChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setKycForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Organization Registration & KYC</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Details */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Organization Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Organization Name</label>
              <input
                type="text"
                name="name"
                value={orgForm.name}
                onChange={handleOrgChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.orgName && <p className="text-red-500 text-sm">{errors.orgName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Organization Type</label>
              <select
                name="type"
                value={orgForm.type}
                onChange={handleOrgChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select Type</option>
                <option value="corporation">Corporation</option>
                <option value="llc">LLC</option>
                <option value="partnership">Partnership</option>
                <option value="sole-proprietorship">Sole Proprietorship</option>
              </select>
              {errors.orgType && <p className="text-red-500 text-sm">{errors.orgType}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Name</label>
              <input
                type="text"
                name="contactName"
                value={orgForm.contactName}
                onChange={handleOrgChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.contactName && <p className="text-red-500 text-sm">{errors.contactName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={orgForm.email}
                onChange={handleOrgChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                name="phone"
                value={orgForm.phone}
                onChange={handleOrgChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Organization Address</label>
            <textarea
              name="address"
              value={orgForm.address}
              onChange={handleOrgChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.orgAddress && <p className="text-red-500 text-sm">{errors.orgAddress}</p>}
          </div>
        </div>

        {/* Personal KYC Details */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Personal KYC Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="firstName"
                value={kycForm.firstName}
                onChange={handleKycChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={kycForm.lastName}
                onChange={handleKycChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={kycForm.dateOfBirth}
                onChange={handleKycChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Document Type</label>
              <select
                name="documentType"
                value={kycForm.documentType}
                onChange={handleKycChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="national_id">National ID</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Document Number</label>
              <input
                type="text"
                name="documentNumber"
                value={kycForm.documentNumber}
                onChange={handleKycChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.documentNumber && <p className="text-red-500 text-sm">{errors.documentNumber}</p>}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Personal Address</label>
            <textarea
              name="address"
              value={kycForm.address}
              onChange={handleKycChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.kycAddress && <p className="text-red-500 text-sm">{errors.kycAddress}</p>}
          </div>
        </div>

        {errors.submit && <p className="text-red-500 text-center">{errors.submit}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Submitting...' : 'Submit Registration & KYC'}
        </button>
      </form>

      {kycStatus && (
        <div className="mt-6 p-4 rounded-md bg-gray-50">
          <h4 className="font-semibold text-gray-800">KYC Status</h4>
          <p className={`text-sm ${kycStatus.status === 'approved' ? 'text-green-600' : kycStatus.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
            Status: {kycStatus.status}
          </p>
          {kycStatus.reason && <p className="text-sm text-gray-600">Reason: {kycStatus.reason}</p>}
          <p className="text-sm text-gray-600">Timestamp: {new Date(kycStatus.timestamp).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default RegistrationForm;