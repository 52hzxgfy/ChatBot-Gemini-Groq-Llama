import { Part } from '@google/generative-ai';

export interface VerificationCode {
  code: string;
  usageCount: number;
  isValid: boolean;
}

// 添加新的验证状态类型
export interface VerificationStatus {
  isVerified: boolean;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  code?: string;
  remainingUses: number;
}

export interface AdminResponse {
  success: boolean;
  message?: string;
  codes?: VerificationCode[];
}

export type ModelType = 
  | "Llama 3.1 70B"
  | "Gemini 1.5 Flash"
  | "Qwen/Qwen2.5-72B-Instruct";

export interface ApiKeys {
  "Llama 3.1 70B": string;
  "Gemini 1.5 Flash": string;
  "Qwen/Qwen2.5-72B-Instruct": string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: number;
  title: string;
  messages: Message[];
  lastUpdated: Date;
  isEditing?: boolean;
  modelType: ModelType;
}

export interface ChatHistoryMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface FileData {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export interface FileContent {
  fileData: FileData;
  text?: string;
}
