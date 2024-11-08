import { ChatHistoryMessage } from './types';

export class GroqService {
  private apiKey: string;
  private history: ChatHistoryMessage[] = [];
  private static readonly MODEL_IDS = {
    "Llama 3.1 70B": "mixtral-8x7b-32768"
  };
  private modelType: string;
  private static readonly API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(apiKey: string, modelType: string = "Llama 3.1 70B") {
    this.apiKey = apiKey;
    this.modelType = modelType;
  }
  private getModelId(): string {
    return GroqService.MODEL_IDS[this.modelType as keyof typeof GroqService.MODEL_IDS] || GroqService.MODEL_IDS["Llama 3.1 70B"];
  }

  // 开始新的对话
  startNewChat(options?: { history?: ChatHistoryMessage[] }) {
    try {
      if (options?.history) {
        console.log('Starting new chat with history:', options.history);
        this.history = [...options.history];
      } else {
        console.log('Starting new chat without history');
        this.history = [];
      }
      return {
        getHistory: () => this.history
      };
    } catch (error) {
      console.error('Error starting new chat:', error);
      throw error;
    }
  }

  // 测试API连接
  async testConnection(): Promise<boolean> {
    try {
      // 使用最简单的请求结构，与快速开始示例保持一致
      const response = await fetch(GroqService.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ 
            role: 'user', 
            content: 'Hello' 
          }],
          model: this.getModelId()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // 输出详细的错误信息
        console.error('Groq API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          error: data
        });
        
        // 抛出带有详细错误信息的错误
        throw new Error(
          `API Error: ${response.status} ${response.statusText}\n` +
          `Details: ${JSON.stringify(data, null, 2)}`
        );
      }

      return true;
    } catch (error) {
      // 确保错误信息被正确传播
      console.error('Connection test failed:', error);
      throw error; // 抛出错误而不是返回 false
    }
  }

  // 发送消息并获取回复
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
        content: `${message}\n\n请记住之前的对话上下文。请使用 Markdown 格式输出响应。`
      });

      const response = await fetch(GroqService.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          messages,
          model: this.getModelId(),
          temperature: 0.7,
          max_tokens: 2048,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Groq API Error:', errorData);
        throw new Error('Failed to get response from Groq API');
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

  // 获取当前对话历史
  getHistory() {
    return this.history;
  }
} 