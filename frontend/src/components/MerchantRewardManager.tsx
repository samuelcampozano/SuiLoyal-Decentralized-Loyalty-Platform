import { FC, useState } from 'react';
import { Reward } from '../types';

interface MerchantRewardManagerProps {
  rewards: Reward[];
  isConnected: boolean;
  loading: boolean;
  onUpdateReward: (rewardId: string, updates: Partial<Reward>) => void;
  onDeleteReward: (rewardId: string) => void;
  onUpdateSupply: (rewardId: string, additionalSupply: number) => void;
}

interface EditingReward {
  id: string;
  field: 'name' | 'description' | 'pointsCost' | 'imageUrl' | 'supply';
  value: string | number;
}

export const MerchantRewardManager: FC<MerchantRewardManagerProps> = ({
  rewards,
  isConnected,
  loading,
  onUpdateReward,
  onDeleteReward,
  onUpdateSupply,
}) => {
  const [editingReward, setEditingReward] = useState<EditingReward | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [supplyToAdd, setSupplyToAdd] = useState<{ [key: string]: number }>({});

  const handleEdit = (rewardId: string, field: EditingReward['field'], currentValue: string | number) => {
    setEditingReward({ id: rewardId, field, value: currentValue });
  };

  const handleSaveEdit = () => {
    if (!editingReward) return;

    if (editingReward.field === 'supply') {
      // Handle supply update differently
      const newSupply = Number(editingReward.value);
      const currentSupply = rewards.find(r => r.id === editingReward.id)?.remaining || 0;
      if (newSupply !== currentSupply) {
        if (newSupply > currentSupply) {
          // Add supply
          onUpdateSupply(editingReward.id, newSupply - currentSupply);
        } else {
          // Note: We can't reduce supply below current level in this implementation
          // Could add a separate function for this if needed
          alert('Cannot reduce supply below current level');
          setEditingReward(null);
          return;
        }
      }
    } else {
      const updates: Partial<Reward> = {};
      
      if (editingReward.field === 'name') {
        updates.name = editingReward.value as string;
      } else if (editingReward.field === 'description') {
        updates.description = editingReward.value as string;
      } else if (editingReward.field === 'pointsCost') {
        updates.pointsCost = Number(editingReward.value);
      } else if (editingReward.field === 'imageUrl') {
        updates.imageUrl = editingReward.value as string;
      }

      onUpdateReward(editingReward.id, updates);
    }
    
    setEditingReward(null);
  };

  const handleCancelEdit = () => {
    setEditingReward(null);
  };

  const handleAddSupply = (rewardId: string) => {
    const additionalSupply = supplyToAdd[rewardId] || 0;
    if (additionalSupply > 0) {
      onUpdateSupply(rewardId, additionalSupply);
      setSupplyToAdd(prev => ({ ...prev, [rewardId]: 0 }));
    }
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

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={editingReward.value}
            onChange={(e) => {
              if (type === 'number') {
                const value = e.target.value;
                // Allow empty string or valid positive numbers
                if (value === '' || (/^\d+$/.test(value) && Number(value) >= 0)) {
                  setEditingReward({
                    ...editingReward,
                    value: value === '' ? '' : Number(value)
                  });
                }
              } else {
                setEditingReward({
                  ...editingReward,
                  value: e.target.value
                });
              }
            }}
            className="flex-1 px-2 py-1 border rounded text-sm"
            autoFocus
            placeholder={type === 'number' ? 'Enter points' : ''}
            min={type === 'number' ? '1' : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (type === 'number' && (editingReward.value === '' || Number(editingReward.value) <= 0)) {
                  return; // Don't save invalid numbers
                }
                handleSaveEdit();
              }
              if (e.key === 'Escape') handleCancelEdit();
            }}
          />
          <button
            onClick={handleSaveEdit}
            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
            disabled={loading || (type === 'number' && (editingReward.value === '' || Number(editingReward.value) <= 0))}
          >
            ✓
          </button>
          <button
            onClick={handleCancelEdit}
            className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
          >
            ✕
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between group">
        <div>
          <span className="text-xs text-gray-500 block">{label}</span>
          <span className="font-medium">
            {type === 'number' && field === 'pointsCost' ? `${currentValue} points` : currentValue}
          </span>
        </div>
        <button
          onClick={() => handleEdit(rewardId, field, currentValue)}
          className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-all"
          disabled={!isConnected || loading}
        >
          Edit
        </button>
      </div>
    );
  };

  if (rewards.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-2 text-yellow-800">No Reward Templates</h3>
        <p className="text-sm text-yellow-700">
          You haven't created any reward templates yet. Create some rewards first to manage them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-2 text-blue-800">🎯 Reward Management</h3>
        <p className="text-sm text-blue-700">
          Manage your reward templates: edit descriptions, adjust point costs, update supply, or remove rewards.
        </p>
      </div>

      <div className="space-y-4">
        {rewards.map((reward) => (
          <div key={reward.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{reward.imageUrl}</div>
                <div className="flex-1">
                  {renderEditableField(reward.id, 'name', reward.name, 'Reward Name')}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(reward.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                  disabled={!isConnected || loading}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                {renderEditableField(reward.id, 'description', reward.description, 'Description')}
              </div>
              <div>
                {renderEditableField(reward.id, 'pointsCost', reward.pointsCost, 'Points Cost', 'number')}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                {renderEditableField(reward.id, 'imageUrl', reward.imageUrl, 'Image/Emoji')}
              </div>
              <div>
                {renderEditableField(reward.id, 'supply', reward.remaining, 'Remaining Supply', 'number')}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Add Supply
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={supplyToAdd[reward.id] || ''}
                    onChange={(e) => setSupplyToAdd(prev => ({
                      ...prev,
                      [reward.id]: Number(e.target.value)
                    }))}
                    placeholder="Enter amount to add"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={() => handleAddSupply(reward.id)}
                  disabled={!isConnected || loading || !supplyToAdd[reward.id] || supplyToAdd[reward.id] <= 0}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 transition-colors"
                >
                  Add Supply
                </button>
              </div>
            </div>

            {showDeleteConfirm === reward.id && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                  <h3 className="font-bold text-lg mb-2">Confirm Deletion</h3>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to delete "{reward.name}"? This action cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(reward.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      disabled={loading}
                    >
                      Delete Reward
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};