export type Location = 'home' | 'gym';

export const EQUIPMENT_TYPES = [
  'dumbbell',
  'barbell',
  'machine',
  'cable',
  'band',
  'kettlebell',
  'plate',
  'bar',
  'other',
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export interface EquipmentItem {
  id: string;
  type: EquipmentType;
  name: string;
  minWeightKg?: number;
  maxWeightKg?: number;
  increment?: number; // if fixed (e.g., 2kg), otherwise assume continuous
  notes?: string;
}

export interface EquipmentProfile {
  home: EquipmentItem[];
}
