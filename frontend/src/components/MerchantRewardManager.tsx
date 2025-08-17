import { FC, useState } from 'react';
import { Reward } from '../types';
import { TransactionStatus } from './TransactionStatus';

interface MerchantRewardManagerProps {
  rewards: Reward[];
  isConnected: boolean;
  loading: boolean;
  onUpdateReward: (rewardId: string, updates: Partial<Reward>) => void;
  onDeleteReward: (rewardId: string) => void;
  onUpdateSupply: (rewardId: string, newSupply: number) => void;
  onCreateReward: (name: string, description: string, pointsCost: number, imageUrl: string, supply: number) => void;
}

interface EditingReward {
  id: string;
  field: 'name' | 'description' | 'pointsCost' | 'imageUrl' | 'supply';
  value: string | number;
  originalValue?: string | number;
}

export const MerchantRewardManager: FC<MerchantRewardManagerProps> = ({
  rewards,
  isConnected,
  loading,
  onUpdateReward,
  onDeleteReward,
  onUpdateSupply,
  onCreateReward,
}) => {
  const [editingReward, setEditingReward] = useState<EditingReward | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{
    status: 'idle' | 'pending' | 'success' | 'error';
    message?: string;
    type?: string;
  }>({ status: 'idle' });
  const [quickCreateData, setQuickCreateData] = useState({
    name: '',
    description: '',
    pointsCost: 100,
    imageUrl: '🎁',
    supply: 10
  });

  const handleEdit = (rewardId: string, field: EditingReward['field'], currentValue: string | number) => {
    setEditingReward({ id: rewardId, field, value: currentValue, originalValue: currentValue });
  };

  const handleSaveEdit = () => {
    if (!editingReward) return;
    
    // Check if value actually changed
    const hasChanged = editingReward.value !== editingReward.originalValue;
    if (!hasChanged) {
      setEditingReward(null);
      return;
    }
    
    // Validate input based on field type
    if (editingReward.field === 'name' || editingReward.field === 'description') {
      const trimmedValue = String(editingReward.value).trim();
      if (!trimmedValue) {
        return; // Don't save empty values
      }
    }
    
    if (editingReward.field === 'pointsCost') {
      const cost = Number(editingReward.value);
      if (cost < 1) {
        return; // Points cost must be at least 1
      }
    }
    
    // Set transaction status to pending
    const fieldName = editingReward.field === 'pointsCost' ? 'points cost' :
                     editingReward.field === 'imageUrl' ? 'image' :
                     editingReward.field;
    
    setTransactionStatus({
      status: 'pending',
      type: `Update ${fieldName}`,
      message: 'Please approve the transaction in your wallet'
    });

    if (editingReward.field === 'supply') {
      const supply = Number(editingReward.value);
      if (supply < 0) {
        return; // Supply cannot be negative
      }
      
      // Handle supply update
      const currentSupply = rewards.find(r => r.id === editingReward.id)?.remaining || 0;
      if (supply !== currentSupply) {
        try {
          onUpdateSupply(editingReward.id, supply);
          // Success will be handled by parent component's callback
          setTimeout(() => {
            setTransactionStatus({
              status: 'success',
              type: 'Supply Update',
              message: `Supply updated to ${supply} items`
            });
            setTimeout(() => setTransactionStatus({ status: 'idle' }), 3000);
          }, 2000);
        } catch {
          setTransactionStatus({
            status: 'error',
            type: 'Supply Update',
            message: 'Failed to update supply'
          });
          setTimeout(() => setTransactionStatus({ status: 'idle' }), 5000);
        }
      }
    } else {
      // Handle other field updates
      const updates: Partial<Reward> = {};
      
      if (editingReward.field === 'name') {
        updates.name = String(editingReward.value).trim();
      } else if (editingReward.field === 'description') {
        updates.description = String(editingReward.value).trim();
      } else if (editingReward.field === 'pointsCost') {
        updates.pointsCost = Number(editingReward.value);
      } else if (editingReward.field === 'imageUrl') {
        updates.imageUrl = String(editingReward.value).trim();
      }

      try {
        onUpdateReward(editingReward.id, updates);
        // Success will be handled by parent component's callback
        setTimeout(() => {
          setTransactionStatus({
            status: 'success',
            type: `${fieldName} Update`,
            message: `${fieldName} updated successfully`
          });
          setTimeout(() => setTransactionStatus({ status: 'idle' }), 3000);
        }, 2000);
      } catch {
        setTransactionStatus({
          status: 'error',
          type: `${fieldName} Update`,
          message: `Failed to update ${fieldName}`
        });
        setTimeout(() => setTransactionStatus({ status: 'idle' }), 5000);
      }
    }
    
    setEditingReward(null);
  };

  const handleCancelEdit = () => {
    setEditingReward(null);
  };



  const handleQuickCreate = () => {
    if (!quickCreateData.name.trim() || !quickCreateData.description.trim()) {
      return;
    }
    onCreateReward(
      quickCreateData.name,
      quickCreateData.description,
      quickCreateData.pointsCost,
      quickCreateData.imageUrl,
      quickCreateData.supply
    );
    setQuickCreateData({
      name: '',
      description: '',
      pointsCost: 100,
      imageUrl: '🎁',
      supply: 10
    });
    setShowQuickCreate(false);
  };

  const handleDeleteConfirm = (rewardId: string) => {
    onDeleteReward(rewardId);
    setShowDeleteConfirm(null);
  };

  const renderEditableField = (
    rewardId: string,
    field: EditingReward['field'],
    currentValue: string | number,
    label: string,
    type: 'text' | 'number' = 'text'
  ) => {
    const isEditing = editingReward?.id === rewardId && editingReward?.field === field;

    // Validation helpers
    const isValidValue = () => {
      if (!editingReward || editingReward.value === '') return false;
      
      if (type === 'number') {
        const numValue = Number(editingReward.value);
        const minValue = field === 'supply' ? 0 : 1;
        return !isNaN(numValue) && numValue >= minValue;
      }
      
      return String(editingReward.value || '').trim().length > 0;
    };

    const hasChanged = editingReward?.value !== editingReward?.originalValue;
    const canSave = isValidValue() && hasChanged;

    if (isEditing) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type={type}
              value={editingReward?.value || ''}
              onChange={(e) => {
                if (type === 'number') {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                    setEditingReward(prev => prev ? {
                      ...prev,
                      value: value === '' ? '' : Number(value)
                    } : null);
                  }
                } else {
                  setEditingReward(prev => prev ? {
                    ...prev,
                    value: e.target.value
                  } : null);
                }
              }}
              className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !isValidValue() ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              autoFocus
              placeholder={
                field === 'name' ? 'Enter reward name' :
                field === 'description' ? 'Enter description' :
                field === 'pointsCost' ? 'Enter points cost' :
                field === 'imageUrl' ? 'Enter emoji or image URL' :
                field === 'supply' ? 'Enter supply amount' : ''
              }
              min={type === 'number' ? (field === 'supply' ? '0' : '1') : undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSave) {
                  handleSaveEdit();
                }
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
          </div>
          
          {/* Validation message */}
          {!isValidValue() && editingReward.value !== '' && (
            <div className="text-xs text-red-600">
              {field === 'pointsCost' ? 'Points cost must be at least 1' :
               field === 'supply' ? 'Supply cannot be negative' :
               'This field cannot be empty'}
            </div>
          )}
          
          {/* Change indicator */}
          {hasChanged && (
            <div className="text-xs text-blue-600">
              Changed from: {editingReward?.originalValue}
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                canSave 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={loading || !canSave}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 bg-gray-500 text-white rounded-lg text-xs hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-lg transition-colors">
        <div>
          <span className="text-xs text-gray-500 block font-medium">{label}</span>
          <span className="font-semibold text-gray-900">
            {type === 'number' && field === 'pointsCost' ? `${currentValue} points` : 
             type === 'number' && field === 'supply' ? `${currentValue} items` :
             currentValue}
          </span>
        </div>
        <button
          onClick={() => handleEdit(rewardId, field, currentValue)}
          className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-all font-medium"
          disabled={!isConnected || loading}
        >
          ✏️ Edit
        </button>
      </div>
    );
  };

  if (rewards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-xl mb-3 text-blue-800">🚀 Create Your First Reward</h3>
          <p className="text-sm text-blue-700 mb-4">
            Welcome to the Reward Management system! Start by creating custom rewards that your customers can redeem with their loyalty points.
          </p>
          <button
            onClick={() => setShowQuickCreate(true)}
            disabled={!isConnected || loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:bg-gray-300 transition-all"
          >
            ✨ Create Custom Reward
          </button>
        </div>
        
        {showQuickCreate && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg">
            <h4 className="font-bold text-lg mb-4 text-gray-800">⚡ Create New Reward</h4>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Reward Name *</label>
                <input
                  type="text"
                  value={quickCreateData.name}
                  onChange={(e) => setQuickCreateData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Free Coffee, 20% Discount"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Description *</label>
                <input
                  type="text"
                  value={quickCreateData.description}
                  onChange={(e) => setQuickCreateData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Valid for any coffee size"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Points Cost</label>
                <input
                  type="number"
                  min="1"
                  value={quickCreateData.pointsCost}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                      setQuickCreateData(prev => ({ ...prev, pointsCost: value === '' ? 0 : Number(value) }));
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Emoji/Icon</label>
                <input
                  type="text"
                  value={quickCreateData.imageUrl}
                  onChange={(e) => setQuickCreateData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="🎁"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Initial Supply</label>
                <input
                  type="number"
                  min="0"
                  value={quickCreateData.supply}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                      setQuickCreateData(prev => ({ ...prev, supply: value === '' ? 0 : Number(value) }));
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleQuickCreate}
                disabled={!isConnected || loading || !quickCreateData.name.trim() || !quickCreateData.description.trim()}
                className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 transition-colors"
              >
                Create Reward
              </button>
              <button
                onClick={() => setShowQuickCreate(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <TransactionStatus 
        status={transactionStatus.status}
        message={transactionStatus.message}
        transactionType={transactionStatus.type}
      />
      <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg text-blue-800">🎯 Reward Management</h3>
          <button
            onClick={() => setShowQuickCreate(!showQuickCreate)}
            disabled={!isConnected || loading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 transition-colors"
          >
            + Quick Create
          </button>
        </div>
        <p className="text-sm text-blue-700">
          Manage your reward templates: edit descriptions, adjust point costs, update supply, or remove rewards.
        </p>
      </div>

      {showQuickCreate && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-bold text-lg mb-4 text-green-800">⚡ Quick Create Reward</h4>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Reward Name</label>
              <input
                type="text"
                value={quickCreateData.name}
                onChange={(e) => setQuickCreateData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Free Coffee"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
              <input
                type="text"
                value={quickCreateData.description}
                onChange={(e) => setQuickCreateData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Redeem for any coffee size"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Points Cost</label>
              <input
                type="number"
                min="1"
                value={quickCreateData.pointsCost}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string or valid positive numbers
                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                    setQuickCreateData(prev => ({ ...prev, pointsCost: value === '' ? 0 : Number(value) }));
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Emoji/Icon</label>
              <input
                type="text"
                value={quickCreateData.imageUrl}
                onChange={(e) => setQuickCreateData(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="🎁"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Initial Supply</label>
              <input
                type="number"
                min="0"
                value={quickCreateData.supply}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string or valid non-negative numbers
                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                    setQuickCreateData(prev => ({ ...prev, supply: value === '' ? 0 : Number(value) }));
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleQuickCreate}
              disabled={!isConnected || loading || !quickCreateData.name.trim() || !quickCreateData.description.trim()}
              className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 transition-colors"
            >
              Create Reward
            </button>
            <button
              onClick={() => setShowQuickCreate(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {rewards.map((reward) => (
          <div key={reward.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            {/* Header Section */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl p-2 bg-gray-50 rounded-lg">{reward.imageUrl}</div>
                <div className="flex-1">
                  {renderEditableField(reward.id, 'name', reward.name, 'Reward Name')}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Status indicator */}
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  reward.remaining > 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {reward.remaining > 0 ? '✅ Available' : '❌ Out of Stock'}
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(reward.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors font-medium"
                  disabled={!isConnected || loading}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Basic Information</h4>
                {renderEditableField(reward.id, 'description', reward.description, 'Description')}
                {renderEditableField(reward.id, 'imageUrl', reward.imageUrl, 'Image/Emoji')}
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Pricing & Inventory</h4>
                {renderEditableField(reward.id, 'pointsCost', reward.pointsCost, 'Points Cost', 'number')}
                {renderEditableField(reward.id, 'supply', reward.remaining, 'Current Supply', 'number')}
              </div>
            </div>

            {/* Footer with quick stats */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <span>💰 <strong>{reward.pointsCost}</strong> points each</span>
                  <span>📦 <strong>{reward.remaining}</strong> remaining</span>
                </div>
                <div className="text-xs text-gray-500">
                  ID: {reward.id.substring(0, 8)}...
                </div>
              </div>
            </div>


            {showDeleteConfirm === reward.id && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">⚠️</div>
                    <h3 className="font-bold text-xl mb-2 text-gray-900">Delete Reward?</h3>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{reward.imageUrl}</span>
                      <div>
                        <h4 className="font-semibold">{reward.name}</h4>
                        <p className="text-sm text-gray-600">{reward.pointsCost} points</p>
                      </div>
                    </div>
                    {reward.remaining > 0 && (
                      <div className="text-sm text-orange-600 font-medium">
                        📦 {reward.remaining} items will be removed from inventory
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This will mark the reward as inactive. Existing redeemed rewards remain valid.
                    </p>
                  </div>
                  
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(reward.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
                      disabled={loading}
                    >
                      {loading ? 'Deleting...' : 'Delete Reward'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
    </>
  );
};