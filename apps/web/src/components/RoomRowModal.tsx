'use client';

import React, { useState } from 'react';
import { X, Layers, Plus, Check, Armchair, Hash } from 'lucide-react';

interface RoomRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (data: { roomName: string; rowNames: string[]; seatsPerRow?: number; startNumber?: number }) => void;
}

export function RoomRowModal({ isOpen, onClose, onCreated }: RoomRowModalProps) {
  const [roomName, setRoomName] = useState('');
  const [rowInputs, setRowInputs] = useState<string[]>(['Row A', 'Row B']);
  const [seatsPerRow, setSeatsPerRow] = useState<number | ''>(10);
  const [startNumber, setStartNumber] = useState<number | ''>(1);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddRow = () => {
    const nextLetter = String.fromCharCode(65 + rowInputs.length);
    setRowInputs((prev) => [...prev, `Row ${nextLetter}`]);
  };

  const handleRemoveRow = (index: number) => {
    if (rowInputs.length <= 1) return;
    setRowInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const numStart = startNumber === '' ? 1 : Math.max(1, Number(startNumber));
  const numSeats = seatsPerRow === '' ? 0 : Math.max(0, Number(seatsPerRow));
  const validRows = rowInputs.filter((r) => r.trim().length > 0);
  const totalSeatsToCreate = rowInputs.length * numSeats;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = roomName.trim() || 'Ground Floor - Silent Hall';
    const finalRows = validRows.length > 0 ? validRows : ['Row A', 'Row B'];

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onCreated({
        roomName: finalName,
        rowNames: finalRows,
        seatsPerRow: numSeats,
        startNumber: numStart,
      });
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-6 h-6 text-indigo-400" />
            <h3 className="text-xl font-bold">Add Room & Rows</h3>
          </div>
          <p className="text-xs text-slate-300">
            Define study halls, rows, and auto-generate seat inventory
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Room / Hall Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Ground Floor - Silent Hall"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Rows / Aisles in Room</label>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {rowInputs.map((rowVal, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={rowVal}
                    onChange={(e) => {
                      const newRows = [...rowInputs];
                      newRows[idx] = e.target.value;
                      setRowInputs(newRows);
                    }}
                    placeholder={`Row ${String.fromCharCode(65 + idx)}`}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
                  />
                  {rowInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete row"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Seats per Row & Starting Number in a 2-Column Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Seats per Row
              </label>
              <input
                type="number"
                min={0}
                max={150}
                value={seatsPerRow}
                onChange={(e) => setSeatsPerRow(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                placeholder="10"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Starting Seat #
                </label>
                <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5">
                  <Hash className="w-2.5 h-2.5" /> Seq
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={9999}
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                placeholder="1"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-colors"
              />
            </div>
          </div>

          {/* Sequential Preview Box across rows */}
          {numSeats > 0 && validRows.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-150">
              <span className="font-semibold text-slate-900 block text-[11px]">
                Seat Sequence Preview (Continuous Numbering):
              </span>
              <div className="space-y-1">
                {validRows.map((r, i) => {
                  const rowStart = numStart + (i * numSeats);
                  const rowEnd = rowStart + numSeats - 1;
                  const startPadded = rowStart < 10 ? `0${rowStart}` : `${rowStart}`;
                  const endPadded = rowEnd < 10 ? `0${rowEnd}` : `${rowEnd}`;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <span className="font-bold text-slate-800">{r}:</span>
                      <span className="font-mono text-indigo-600 font-bold">
                        {startPadded} → {endPadded}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">({numSeats} seats)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Armchair className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>{rowInputs.length} rows</strong> • <strong>{totalSeatsToCreate} seats total</strong>
              </span>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
              Starts #{numStart}
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isLoading ? 'Generating Layout...' : `Save & Generate ${totalSeatsToCreate} Seats`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
