import { ChatHistoryMessage } from './types';

export class QwenService {
  private apiKey: string;
  private static readonly API_ENDPOINT = 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1/chat/completions';
  private history: ChatHistoryMessage[] = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(QwenService.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 50,
          stream: false
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  startNewChat(options?: { history?: ChatHistoryMessage[] }) {
    if (options?.history) {
      this.history = [...options.history];
    } else {
      this.history = [];
    }
    return {
      getHistory: () => this.history
    };
  }

  async sendMessage(
    message: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      // 添加历史消息
      this.history.forEach(msg => {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.parts[0].text
        });
      });

      // 添加当前消息
      messages.push({
        role: 'user',
        content: message
      });

      const response = await fetch(QwenService.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-72B-Instruct",
          messages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Qwen API Error:', errorData);
        throw new Error('Failed to get response from Qwen API');
      }

      const data = await response.json();
      const responseText = data.choices[0].message.content;

      // 更新历史记录
      this.history.push({
        role: 'user',
        parts: [{ text: message }]
      });
      this.history.push({
        role: 'model',
        parts: [{ text: responseText }]
      });

      return responseText;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  getHistory() {
    return this.history;
  }
} 