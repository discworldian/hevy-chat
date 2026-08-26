export type Location = 'home' | 'gym';

export interface EquipmentItem {
  id: string;
  type: 'dumbbell' | 'barbell' | 'machine' | 'cable' | 'band' | 'kettlebell' | 'plate' | 'bar' | 'other';
  name: string;
  minWeightKg?: number;
  maxWeightKg?: number;
  increment?: number; // if fixed (e.g., 2kg), otherwise assume continuous
  notes?: string;
}

export interface EquipmentProfile {
  home: EquipmentItem[];
}
