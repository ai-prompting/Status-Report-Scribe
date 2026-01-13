export type TargetLanguage = 'en' | 'de';

export enum CardStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ContextFile {
  name: string;
  mimeType: string;
  data: string; // Base64
}

export interface ReportItem {
  id: string;
  speakerName: string;
  status: CardStatus;
  text: string;
  timestamp: number;
  durationSeconds: number;
  error?: string;
  
  // Context fields
  contextText?: string;
  contextFile?: ContextFile;
}

export interface AudioBlobData {
  blob: Blob;
  mimeType: string;
}