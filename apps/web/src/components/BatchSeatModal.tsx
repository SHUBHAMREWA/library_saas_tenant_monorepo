'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Layers, AlertCircle } from 'lucide-react';

interface BatchSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoomName?: string;
  availableRows?: string[];
  existingSeats?: Array<{ seatNumber: string; rowName?: string }>;
  onGenerate: (data: { prefix: string; startNumber: number; count: number; rowName?: string }) => void;
}

export const BatchSeatModal: React.FC<BatchSeatModalProps> = () => {
  return null;
};

