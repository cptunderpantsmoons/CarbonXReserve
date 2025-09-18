import React, { useState } from 'react';
import DocumentUpload from '../components/DocumentUpload';
import { DocumentForm } from '../types/forms';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentForm>({
    idDocument: null,
    addressProof: null,
  });

  const handleDocumentsChange = (newDocuments: DocumentForm) => {
    setDocuments(newDocuments);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <DocumentUpload onDocumentsChange={handleDocumentsChange} />
    </div>
  );
};

export default Documents;