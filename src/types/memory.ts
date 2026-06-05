export type MemoryEntry = {
  id: string;
  text: string;
  capturedAt: number;
};

export type PersonMemory = {
  summary: string;
  entries: MemoryEntry[];
};

export function emptyMemory(): PersonMemory {
  return { summary: '', entries: [] };
}

export function hasMemoryContent(memory: PersonMemory): boolean {
  return memory.entries.length > 0 || memory.summary.trim().length > 0;
}
