import React, { useState } from 'react';
import { DocumentForm } from '../types/forms';

interface DocumentUploadProps {
  onDocumentsChange: (documents: DocumentForm) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onDocumentsChange }) => {
  const [documents, setDocuments] = useState<DocumentForm>({
    idDocument: null,
    addressProof: null,
  });
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof DocumentForm) => {
    const file = e.target.files?.[0] || null;
    const newDocuments = { ...documents, [type]: file };
    setDocuments(newDocuments);
    onDocumentsChange(newDocuments);
  };

  const simulateUpload = async (file: File, type: string) => {
    setUploadProgress(prev => ({ ...prev, [type]: 0 }));
    setIsUploading(true);

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(prev => ({ ...prev, [type]: progress }));
    }

    setIsUploading(false);
  };

  const handleUpload = async (type: keyof DocumentForm) => {
    const file = documents[type];
    if (file) {
      await simulateUpload(file, type);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Document Upload</h2>

      <div className="space-y-6">
        {/* ID Document Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ID Document</label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e, 'idDocument')}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              type="button"
              onClick={() => handleUpload('idDocument')}
              disabled={!documents.idDocument || isUploading}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Upload
            </button>
          </div>
          {documents.idDocument && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">Selected: {documents.idDocument.name}</p>
              {uploadProgress.idDocument !== undefined && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.idDocument}%` }}
                  ></div>
                </div>
              )}
              {uploadProgress.idDocument === 100 && (
                <p className="text-sm text-green-600 mt-1">Upload complete</p>
              )}
            </div>
          )}
        </div>

        {/* Proof of Address Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Proof of Address</label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e, 'addressProof')}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              type="button"
              onClick={() => handleUpload('addressProof')}
              disabled={!documents.addressProof || isUploading}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Upload
            </button>
          </div>
          {documents.addressProof && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">Selected: {documents.addressProof.name}</p>
              {uploadProgress.addressProof !== undefined && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.addressProof}%` }}
                  ></div>
                </div>
              )}
              {uploadProgress.addressProof === 100 && (
                <p className="text-sm text-green-600 mt-1">Upload complete</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;