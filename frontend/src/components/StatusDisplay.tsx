import React from 'react';

interface StatusDisplayProps {
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  timestamp?: string;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ status, message, timestamp }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: '✓',
          title: 'KYC Approved',
        };
      case 'rejected':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: '✗',
          title: 'KYC Rejected',
        };
      case 'pending':
      default:
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: '⏳',
          title: 'KYC Pending',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center">
        <div className={`text-2xl mr-3 ${config.color}`}>{config.icon}</div>
        <div>
          <h3 className={`text-lg font-semibold ${config.color}`}>{config.title}</h3>
          {message && <p className="text-sm text-gray-600 mt-1">{message}</p>}
          {timestamp && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {new Date(timestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusDisplay;