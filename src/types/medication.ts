export type Medication = {
  id: string;
  name: string;
  strength: string;
  form: string;
  instructions: string;
  scheduleTimes: string[];
  enabled: boolean;
  createdAt: number;
};

export function newMedicationId(): string {
  return `med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
