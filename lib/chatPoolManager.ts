import { GeminiService } from './gemini';
import { GroqService } from './groq';
import { ChatHistoryMessage, ModelType } from './types';
import { Part } from '@google/generative-ai';
import { QwenService } from './qwen';

interface ChatInstance {
  service: GeminiService | GroqService | QwenService;
  chat: any;
  history: ChatHistoryMessage[];
  modelType: ModelType;
}

export class ChatPoolManager {
  private static instance: ChatPoolManager;
  private pool: Map<number, ChatInstance> = new Map();

  private constructor() {}

  static getInstance() {
    if (!ChatPoolManager.instance) {
      ChatPoolManager.instance = new ChatPoolManager();
    }
    return ChatPoolManager.instance;
  }

  async getOrCreateChat(
    conversationId: number,
    modelType: ModelType,
    apiKey: string,
    history?: ChatHistoryMessage[]
  ) {
    const existingInstance = this.pool.get(conversationId);
    if (existingInstance && existingInstance.modelType === modelType) {
      return existingInstance;
    }

    let service: GeminiService | GroqService | QwenService;
    let chat;

    if (modelType === "Gemini 1.5 Flash") {
      service = new GeminiService(apiKey);
      chat = service.startNewChat({
        history: history?.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.parts[0].text || "" }]
        }))
      });
    } else if (modelType === "Llama 3.1 70B") {
      service = new GroqService(apiKey, modelType);
      chat = service.startNewChat({ history });
    } else if (modelType === "Qwen/Qwen2.5-72B-Instruct") {
      service = new QwenService(apiKey);
      chat = service.startNewChat({ history });
    } else {
      throw new Error(`Unsupported model type: ${modelType}`);
    }

    const chatInstance: ChatInstance = {
      service,
      chat,
      history: history || [],
      modelType
    };
    this.pool.set(conversationId, chatInstance);

    return chatInstance;
  }

  updateHistory(conversationId: number, history: ChatHistoryMessage[]) {
    const instance = this.pool.get(conversationId);
    if (instance) {
      instance.history = [...history];
    }
  }

  removeChat(conversationId: number) {
    this.pool.delete(conversationId);
  }

  clearPool() {
    this.pool.clear();
  }
} 