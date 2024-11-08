import React from 'react';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import copy from 'clipboard-copy';
import { ModelType } from '@/lib/types';
import { useState } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  onCopy?: (content: string) => void;
  modelType?: ModelType;
}

export function ChatMessage({ role, content, onCopy, modelType }: ChatMessageProps) {
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(content);
    } else {
      try {
        await copy(content);
        alert('已复制到剪贴板');
      } catch (error) {
        console.error('复制失败:', error);
      }
    }
  };

  const getModelIcon = () => {
    if (role === 'assistant') {
      switch (modelType) {
        case 'Gemini 1.5 Flash':
          return '/Google.png';
        case 'Llama 3.1 70B':
          return '/Llama 3.png';
        case 'Qwen/Qwen2.5-72B-Instruct':
          return '/Qianwen.png';
        default:
          return null;
      }
    }
    return null;
  };

  const handleCopyCodeBlock = async (code: string, blockId: string) => {
    try {
      await copy(code);
      setCopiedBlockId(blockId);
      setTimeout(() => setCopiedBlockId(null), 2000); // 2秒后重置状态
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  return (
    <div className={cn(
      "flex",
      role === 'user' 
        ? "justify-end w-full"
        : "justify-start w-full"
    )}>
      <div className={cn(
        "rounded-lg p-4",
        role === 'user' 
          ? "bg-purple-100 ml-auto max-w-[50%]"
          : "bg-white mr-auto max-w-[70%]"
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {role === 'assistant' && getModelIcon() && (
              <img 
                src={getModelIcon() || undefined}
                alt={modelType}
                className="w-6 h-6 object-contain" 
              />
            )}
          </div>
          {role === 'assistant' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-6 w-6"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert break-words">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !Array.isArray(node?.properties?.className) || 
                  !node.properties.className.some((cls: string | number) => 
                    typeof cls === 'string' && cls.startsWith('language-')
                  );
                
                if (!isInline) {
                  const codeString = String(children).replace(/\n$/, '');
                  const blockId = `code-block-${Math.random().toString(36).substr(2, 9)}`;
                  
                  return (
                    <div className="relative group">
                      <div className="absolute right-2 top-2">
                        <Button
                          onClick={() => handleCopyCodeBlock(codeString, blockId)}
                          size="icon"
                          className="bg-purple-500 hover:bg-purple-600 text-white h-6 w-6 p-1 rounded-md"
                        >
                          {copiedBlockId === blockId ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <pre className="bg-gray-100 dark:bg-gray-800 rounded-md p-4 mt-2 overflow-x-auto">
                        <code className={cn(
                          "text-sm",
                          match && `language-${match[1]}`
                        )} {...props}>
                          {codeString}
                        </code>
                      </pre>
                    </div>
                  );
                }
                
                return (
                  <code className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5" {...props}>
                    {children}
                  </code>
                );
              },
              // 链接渲染
              a: ({ node, ...props }) => (
                <a
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              // 列表渲染
              ul: ({ node, ...props }) => (
                <ul className="list-disc list-inside" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal list-inside" {...props} />
              ),
              // 标题渲染
              h1: ({ node, ...props }) => (
                <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-xl font-bold mt-5 mb-3" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-lg font-bold mt-4 mb-2" {...props} />
              ),
              // 引用块渲染
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-gray-300 pl-4 italic" {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
