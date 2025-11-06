import React, { useState } from 'react';
import PlayerBadge from '../components/PlayerBadge';
import ContractBadge from '../components/ContractBadge';

export default function Demo() {
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<'address' | 'name'>('address');
  const [flowAddress, setFlowAddress] = useState<string | null>(null);

  const handleFlowAddress = (address: string | null) => {
    setFlowAddress(address);
  };

  const isAddress = (value: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (isAddress(value)) {
      setInputType('address');
    } else {
      setInputType('name');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pepasur ENS Demo
          </h1>
          <p className="text-lg text-gray-600">
            Real ENS integration with reverse lookup, forward verification, and text records
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Enter Address or ENS Name
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Type: {inputType === 'address' ? 'Address' : 'ENS Name'}
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Enter Ethereum address or ENS name (e.g., 0x1234... or alice.pepasur.eth)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setInputType('address')}
                className={`px-4 py-2 rounded-md font-medium ${
                  inputType === 'address'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Address Mode
              </button>
              <button
                onClick={() => setInputType('name')}
                className={`px-4 py-2 rounded-md font-medium ${
                  inputType === 'name'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ENS Name Mode
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {inputValue && (
          <div className="space-y-6">
            {/* Player Badge (for addresses) */}
            {inputType === 'address' && isAddress(inputValue) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Player Information
                </h3>
                <PlayerBadge 
                  address={inputValue as `0x${string}`}
                  onFlowAddress={handleFlowAddress}
                />
                
                {flowAddress && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Flow Address Found</h4>
                    <code className="text-blue-800 font-mono">{flowAddress}</code>
                  </div>
                )}
              </div>
            )}

            {/* Contract Badge (for ENS names) */}
            {inputType === 'name' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Contract Information
                </h3>
                <ContractBadge name={inputValue} />
              </div>
            )}
          </div>
        )}

        {/* Examples */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Try These Examples
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Addresses</h4>
              <div className="space-y-2">
                <button
                  onClick={() => handleInputChange('0x1234567890123456789012345678901234567890')}
                  className="block w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-mono"
                >
                  0x1234567890123456789012345678901234567890
                </button>
                <button
                  onClick={() => handleInputChange('0xabcdef1234567890abcdef1234567890abcdef12')}
                  className="block w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-mono"
                >
                  0xabcdef1234567890abcdef1234567890abcdef12
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">ENS Names</h4>
              <div className="space-y-2">
                <button
                  onClick={() => handleInputChange('treasury.pepasur.eth')}
                  className="block w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                >
                  treasury.pepasur.eth
                </button>
                <button
                  onClick={() => handleInputChange('nft.pepasur.eth')}
                  className="block w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                >
                  nft.pepasur.eth
                </button>
                <button
                  onClick={() => handleInputChange('marketplace.pepasur.eth')}
                  className="block w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                >
                  marketplace.pepasur.eth
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Features Demonstrated
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Primary Name Pattern</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Reverse lookup: Address → ENS name</li>
                <li>• Forward verification: ENS name → Address</li>
                <li>• Only verified names are displayed</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Universal Resolver</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Single interface for all ENS reads</li>
                <li>• Text records (flow.address, description)</li>
                <li>• Address resolution</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Text Records</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Flow addresses stored as text records</li>
                <li>• Social links (GitHub, Twitter)</li>
                <li>• Descriptions and avatars</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Contract Naming</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Named contracts (treasury.pepasur.eth)</li>
                <li>• Reverse records for contracts</li>
                <li>• Contract metadata via text records</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
