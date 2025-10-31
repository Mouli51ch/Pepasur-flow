import React, { useState, useEffect } from 'react';
import { getContractBadge } from '../../packages/ens-utils';

interface ContractBadgeProps {
  name: string;
}

export default function ContractBadge({ name }: ContractBadgeProps) {
  const [contractInfo, setContractInfo] = useState<{
    address: `0x${string}` | null;
    name: string | null;
    records: Record<string, string>;
  }>({ address: null, name: null, records: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContractInfo() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await getContractBadge(name);
        setContractInfo(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch contract info');
      } finally {
        setLoading(false);
      }
    }

    fetchContractInfo();
  }, [name]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-gray-100 rounded-lg">
        <div className="w-12 h-12 bg-gray-300 rounded-lg animate-pulse"></div>
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-300 rounded w-32 animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-48 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">Error: {error}</p>
        <p className="text-red-500 text-xs mt-1">Name: {name}</p>
      </div>
    );
  }

  if (!contractInfo.address) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-600 text-sm">No address found for {name}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {name.split('.')[0].charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Contract
            </span>
          </div>
        </div>
        
        {/* Copy Button */}
        <button
          onClick={() => copyToClipboard(contractInfo.address!)}
          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </button>
      </div>

      {/* Address */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <div className="flex items-center space-x-2">
          <code className="flex-1 px-3 py-2 bg-gray-100 rounded-md text-sm font-mono text-gray-800">
            {contractInfo.address}
          </code>
          <button
            onClick={() => copyToClipboard(contractInfo.address!)}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Copy address"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Reverse Name */}
      {contractInfo.name && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reverse Name
          </label>
          <code className="block px-3 py-2 bg-gray-100 rounded-md text-sm font-mono text-gray-800">
            {contractInfo.name}
          </code>
        </div>
      )}

      {/* Description */}
      {contractInfo.records.description && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <p className="text-sm text-gray-600">
            {contractInfo.records.description}
          </p>
        </div>
      )}

      {/* Text Records */}
      {Object.keys(contractInfo.records).length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Records
          </label>
          <div className="space-y-2">
            {Object.entries(contractInfo.records).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-600">{key}</span>
                <div className="flex items-center space-x-2">
                  <code className="text-sm font-mono text-gray-800 max-w-xs truncate">
                    {value}
                  </code>
                  <button
                    onClick={() => copyToClipboard(value)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Copy value"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="flex space-x-3 mt-4">
        <a
          href={`https://sepolia.etherscan.io/address/${contractInfo.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Etherscan
        </a>
        
        {contractInfo.records['com.github'] && (
          <a
            href={contractInfo.records['com.github']}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        )}
      </div>
    </div>
  );
}
