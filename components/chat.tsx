import { Message, ModelType } from '@/lib/types'
import { GroqService } from '@/lib/groq'
import { GeminiService } from '@/lib/gemini'
import { FC } from 'react'
import { ChatMessage } from './chat-message'

interface ChatProps {
  selectedModel: ModelType;
  messages: Message[];
  groqApiKey: string;
  geminiApiKey: string;
}

export const Chat: FC<ChatProps> = ({
  selectedModel,
  messages,
  groqApiKey,
  geminiApiKey
}) => {
  return (
    <div className="flex flex-col space-y-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          role={message.role}
          content={message.content}
          timestamp={message.timestamp}
          modelType={selectedModel}
        />
      ))}
    </div>
  );
}; 