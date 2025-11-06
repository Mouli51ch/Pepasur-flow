import React, { useState, useEffect } from 'react';
import { getDisplayName } from '../../packages/ens-utils';

interface PlayerBadgeProps {
  address: `0x${string}`;
  onFlowAddress?: (flowAddress: string | null) => void;
}

export default function PlayerBadge({ address, onFlowAddress }: PlayerBadgeProps) {
  const [displayName, setDisplayName] = useState<{
    name: string | null;
    avatar?: string;
    records: Record<string, string>;
  }>({ name: null, records: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDisplayName() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await getDisplayName(address);
        setDisplayName(result);
        
        // Notify parent of Flow address if available
        if (onFlowAddress) {
          onFlowAddress(result.records['flow.address'] || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch display name');
      } finally {
        setLoading(false);
      }
    }

    fetchDisplayName();
  }, [address, onFlowAddress]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg">
        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
        <div className="space-y-1">
          <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
          <div className="h-3 bg-gray-300 rounded w-32 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">Error: {error}</p>
        <p className="text-red-500 text-xs mt-1">Address: {address}</p>
      </div>
    );
  }

  const hasENSName = displayName.name && displayName.name !== '';
  const flowAddress = displayName.records['flow.address'];

  return (
    <div className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {displayName.avatar ? (
          <img
            src={displayName.avatar}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;
            }}
          />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {hasENSName ? displayName.name![0].toUpperCase() : address.slice(2, 4).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {hasENSName ? displayName.name : 'Unnamed Player'}
          </h3>
          {hasENSName && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ENS
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-500 font-mono">
          {address}
        </p>
        
        {flowAddress && (
          <div className="mt-1">
            <span className="text-xs text-gray-500">Flow:</span>
            <span className="text-xs text-blue-600 font-mono ml-1">
              {flowAddress}
            </span>
          </div>
        )}
        
        {displayName.records.description && (
          <p className="text-sm text-gray-600 mt-1">
            {displayName.records.description}
          </p>
        )}
      </div>

      {/* Social Links */}
      {(displayName.records['com.github'] || displayName.records['com.twitter']) && (
        <div className="flex space-x-2">
          {displayName.records['com.github'] && (
            <a
              href={displayName.records['com.github']}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600"
              title="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          )}
          
          {displayName.records['com.twitter'] && (
            <a
              href={displayName.records['com.twitter']}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600"
              title="Twitter"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
