'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, Check } from 'lucide-react';

interface EditRoomModalProps {
  isOpen: boolean;
  currentRoom: { id: string; name: string } | null;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export const EditRoomModal: React.FC<EditRoomModalProps> = ({
  isOpen,
  currentRoom,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (currentRoom) {
      setName(currentRoom.name);
    }
  }, [currentRoom]);

  if (!isOpen || !currentRoom) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f5f5f5] w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-[#262626] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 dark:bg-[#1c1c1e] p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <h3 className="text-lg font-bold">Edit Room Name</h3>
          </div>
          <p className="text-xs text-slate-300 dark:text-neutral-400">
            Rename this study room or hall
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
              Room / Hall Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ground Floor - Silent Hall"
              autoFocus
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-[#262626] rounded-xl text-sm font-semibold text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-[#121212] focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-[#1c1c1e] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
