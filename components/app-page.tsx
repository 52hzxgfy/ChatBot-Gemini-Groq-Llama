"use client";
import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Send, Paperclip, X, Copy, Search, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { GeminiService } from '@/lib/gemini'
import { ChatMessage } from '@/components/chat-message'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import copy from 'clipboard-copy'
import cn from 'classnames'
import { Message, Conversation, ModelType, ApiKeys, ChatHistoryMessage } from '@/lib/types'
import { GroqService } from '@/lib/groq';
import { Chat } from '@/components/chat';
import { ChatPoolManager } from '@/lib/chatPoolManager';
import { QwenService } from '@/lib/qwen';
import { Settings as SettingsIcon } from 'lucide-react';
import { Settings } from './settings';

export function Page() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedModel, setSelectedModel] = useState("Llama 3.1 70B")
  const [inputMessage, setInputMessage] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [isSystemPromptEnabled, setIsSystemPromptEnabled] = useState(false)
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    "Llama 3.1 70B": "",
    "Gemini 1.5 Flash": "",
    "Qwen/Qwen2.5-72B-Instruct": ""
  })
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const geminiService = useRef<GeminiService | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [currentChat, setCurrentChat] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const groqService = useRef<GroqService | null>(null);
  const chatPool = useRef(ChatPoolManager.getInstance());
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 添加useEffect来初始化验证状态
  useEffect(() => {
    // 从localStorage读取验证状态
    const verified = localStorage.getItem('isVerified') === 'true';
    setIsVerified(verified);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const openSettings = () => setIsSettingsOpen(true)
  const closeSettings = () => setIsSettingsOpen(false)

  const addConversation = () => {
    handleNewConversation(); // 直接调用 handleNewConversation
  };

  const editConversation = (id: number, newTitle: string) => {
    const updatedConversations = conversations.map(conv => 
      conv.id === id ? { ...conv, title: newTitle, isEditing: false } : conv
    );
    setConversations(updatedConversations);
    // 保存到 localStorage
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));
  }

  const deleteConversation = (id: number) => {
    setConversations(conversations.filter(conv => conv.id !== id))
    if (currentConversationId === id) {
      setMessages([]);
      setCurrentConversationId(null);
    }
  }
  useEffect(() => {
    if (selectedModel in apiKeys && apiKeys[selectedModel as keyof ApiKeys]) {
      geminiService.current = new GeminiService(apiKeys[selectedModel as keyof ApiKeys]);
      // 创建新的对话
      const chat = geminiService.current.startNewChat();
      setCurrentChat(chat);
    }
  }, [apiKeys, selectedModel]);

  const handleSendMessage = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    // 如果是键盘事件且不是回车键，直接返回
    if (e?.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') {
      return;
    }
    
    // 如果是回车键但同时按着 Shift 键，不处理（允许换行）
    if (e?.type === 'keydown' && (e as React.KeyboardEvent).shiftKey) {
      return;
    }

    // 阻止默认行为
    e?.preventDefault();

    if (selectedModel !== "Gemini 1.5 Flash" && 
        selectedModel !== "Llama 3.1 70B" &&
        selectedModel !== "Qwen/Qwen2.5-72B-Instruct") {
      alert("请先选择支持的模型");
      return;
    }

    if ((!inputMessage.trim() && !selectedFile) || !geminiService.current) {
      return;
    }

    let messageContent = inputMessage;
    if (selectedFile) {
      // 修改文件上传消息的格式，突出用户的处理需求
      messageContent = `[文件上传] ${selectedFile.name} (${selectedFile.type})\n处理需求：${inputMessage || "请分析这个文件的内容"}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // 添加这段代码来重置输入框高度
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.style.height = '40px'; // 设置回初始高度
    }
    
    setIsProcessing(true);

    try {
      let chatInstance;
      let newId = currentConversationId;
      let response: string;
      
      if (!currentConversationId) {
        // 创建新对话
        newId = Date.now();
        chatInstance = await chatPool.current.getOrCreateChat(
          newId,
          selectedModel,
          apiKeys[selectedModel]
        );
        setCurrentConversationId(newId);
        setCurrentChat(chatInstance.chat);

        // 创建新的对话记录
        const newConversation: Conversation = {
          id: newId,
          title: messageContent.slice(0, 10) + '...',
          messages: [userMessage],
          lastUpdated: new Date(),
          isEditing: false,
          modelType: selectedModel as ModelType
        };
        setConversations(prev => [...prev, newConversation]);
      } else {
        chatInstance = await chatPool.current.getOrCreateChat(
          currentConversationId,
          selectedModel,
          apiKeys[selectedModel],
          messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }))
        );
      }

      // 处理文件上传
      if (selectedFile) {
        if (selectedModel !== "Gemini 1.5 Flash") {
          alert("文件处理功能仅支持 Gemini 1.5 Flash 模型");
          return;
        }

        const geminiService = chatInstance.service as GeminiService;
        
        // 根据文件类型选择处理方法
        if (selectedFile.type.startsWith('audio/')) {
          response = await geminiService.processAudio(
            selectedFile,
            inputMessage || "请分析这个音频文件的内容"
          );
        } else {
          response = await geminiService.processFile(
            selectedFile,
            inputMessage || "请分析这个文件的内容"
          );
        }
      } else {
        // 普通文本消息处理，添加系统提示词支持
        response = await chatInstance.service.sendMessage(
          messageContent,
          isSystemPromptEnabled ? systemPrompt : undefined,
          chatInstance.chat
        );
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.trim(),
        timestamp: new Date()
      };

      const updatedMessages = [...messages, userMessage, assistantMessage];
      setMessages(updatedMessages);

      // 更新会话池中的历史记录
      chatPool.current.updateHistory(
        currentConversationId!,
        updatedMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      );

      // 更新对话列表
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === newId 
            ? {
                ...conv,
                messages: updatedMessages,
                lastUpdated: new Date()
              }
            : conv
        )
      );

      // 清除已处理的文件
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('发送消息失败，请检查网络连接或 API 密钥是否正确');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 验证文类型
    const supportedTypes = [
      // 图片类型
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/heic',
      'image/heif',
      // 视频类型
      'video/mp4',
      'video/mpeg',
      'video/mov',
      'video/avi',
      'video/x-flv',
      'video/mpg',
      'video/webm',
      'video/wmv',
      'video/3gpp',
      // 音频类型
      'audio/wav',
      'audio/mp3',
      'audio/aiff',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
      // 文档类型
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain' // .txt
    ];

    if (!supportedTypes.includes(file.type)) {
      alert('不支持的文件类型。请上传图片、视频、音频或文档文件(PDF/Word/TXT)。');
      return;
    }

    setSelectedFile(file);
  };

  const handleApiKeySave = async (model: string) => {
    try {
      const updatedKeys = { ...apiKeys };
      // 保存到localStorage
      localStorage.setItem('apiKeys', JSON.stringify(updatedKeys));
      // 重新初始化GeminiService
      if (model === "Gemini 1.5 Flash") {
        geminiService.current = new GeminiService(updatedKeys[model]);
        const chat = geminiService.current.startNewChat();
        setCurrentChat(chat);
      }
      alert(`${model} API密钥已保存`);
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('保存API密钥失败');
    }
  };
  const handleApiKeyTest = async (model: ModelType) => {
    if (!apiKeys[model]) {
      alert('请先输入API密钥');
      return;
    }

    try {
      let isConnected: boolean = false;
      if (model === "Llama 3.1 70B") {
        const service = new GroqService(apiKeys[model], model);
        isConnected = await service.testConnection();
      } else if (model === "Gemini 1.5 Flash") {
        const service = new GeminiService(apiKeys[model]);
        isConnected = await service.testConnection();
      } else if (model === "Qwen/Qwen2.5-72B-Instruct") {
        const service = new QwenService(apiKeys[model]);
        isConnected = await service.testConnection();
      } else {
        alert('暂不支持该模型的连接测试');
        return;
      }
      
      if (isConnected) {
        alert('连接测试成功!');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      const errorMessage = error instanceof Error ? error.message : '请检查网络连接和 API 密钥';
      alert(`连接测试失败:\n${errorMessage}`);
    }
  };

  // 组件加载时读取保存的API密钥
  useEffect(() => {
    const savedKeys = localStorage.getItem('apiKeys');
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    }
  }, []);

  // 处理模型选择
  const handleModelSelect = (model: ModelType) => {
    if (model !== "Gemini 1.5 Flash" && 
        model !== "Llama 3.1 70B" &&
        model !== "Qwen/Qwen2.5-72B-Instruct") {
      alert("目前只支持 Gemini 1.5 Flash、Llama 3.1 70B 和 Qwen/Qwen2.5-72B-Instruct 模型");
      return;
    }
    setSelectedModel(model);
  };

  // 复制消息到剪贴板
  const handleCopyMessage = async (content: string) => {
    try {
      await copy(content);
      alert('已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 保存当前对话
  const saveCurrentConversation = () => {
    if (messages.length === 0) return;
    
    const title = messages[0].content.slice(0, 10) + '...';
    const newConversation: Conversation = {
      id: Date.now(),
      title,
      messages: [...messages],
      lastUpdated: new Date(),
      modelType: 'Llama 3.1 70B'
    };
    
    setConversations(prev => [...prev, newConversation]);
  };

  // 新建对话时重置 chat
  const handleNewConversation = () => {
    if (currentConversationId) {
      chatPool.current.removeChat(currentConversationId);
    }
    setMessages([]);
    setCurrentConversationId(null);
    setInputMessage('');
    setCurrentChat(null);
  };

  // 加载历史对话
  const loadConversation = async (id: number) => {
    const conversation = conversations.find(conv => conv.id === id);
    if (!conversation) return;

    try {
      // 切换到对话使用的模型
      setSelectedModel(conversation.modelType);

      const history = conversation.messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const chatInstance = await chatPool.current.getOrCreateChat(
        id,
        conversation.modelType, // 使用对话保存的型类型
        apiKeys[conversation.modelType],
        history.map(msg => ({
          role: msg.role as "user" | "model",
          parts: msg.parts
        }))
      );

      setCurrentChat(chatInstance.chat);
      setMessages(conversation.messages);
      setCurrentConversationId(id);
    } catch (error) {
      console.error('Error loading conversation:', error);
      alert('加载对话失败，请重试');
    }
  };

  // 监听第一轮对话完成
  useEffect(() => {
    // 只有当没有当对话ID且刚完成第一轮对话时才创建新的对话记录
    if (messages.length === 2 && !currentConversationId) {
      const title = messages[0].content.slice(0, 10) + (messages[0].content.length > 10 ? '...' : '');
      const newConversation: Conversation = {
        id: Date.now(),
        title,
        messages: [...messages],
        lastUpdated: new Date(),
        isEditing: false,
        modelType: selectedModel as ModelType
      };
      setConversations(prev => [...prev, newConversation]);
      setCurrentConversationId(newConversation.id);
    }
  }, [messages, currentConversationId, selectedModel]);

  // 在组件加载时读取保存的对话记录
  useEffect(() => {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations);
      // 转换日期字符串回 Date 对象，并确保包含模型类型
      const conversations = parsed.map((conv: any) => ({
        ...conv,
        lastUpdated: new Date(conv.lastUpdated),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        modelType: conv.modelType || selectedModel // 为旧数据提供默认值
      }));
      setConversations(conversations);
    }
  }, []);

  // 对话记录更新时保存 localStorage
  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
  }, [conversations]);

  const handleClearFile = () => {
    setSelectedFile(null);
  };

  // 添加系统提示词相关的处理函数
  const handleSystemPromptToggle = (enabled: boolean) => {
    setIsSystemPromptEnabled(enabled);
    // 保存到 localStorage
    localStorage.setItem('isSystemPromptEnabled', JSON.stringify(enabled));
  };

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    // 保存到 localStorage
    localStorage.setItem('systemPrompt', value);
  };

  // 在组件加载时读取保存的系统提示词设置
  useEffect(() => {
    const savedSystemPrompt = localStorage.getItem('systemPrompt');
    const savedIsEnabled = localStorage.getItem('isSystemPromptEnabled');
    
    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt);
    }
    if (savedIsEnabled) {
      setIsSystemPromptEnabled(JSON.parse(savedIsEnabled));
    }
  }, []);

  const handleVerify = async (code: string) => {
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Verification response:', errorText);
        throw new Error('验证失败，请稍后重试');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || '验证失败');
      }

      setIsVerified(true);
      localStorage.setItem('isVerified', 'true');
      alert('验证成功！');
    } catch (error) {
      console.error('Verification error:', error);
      alert(error instanceof Error ? error.message : '验证失败，请稍后重试');
    }
  };

  useEffect(() => {
    const verified = localStorage.getItem('isVerified') === 'true';
    setIsVerified(verified);
  }, []);

  // 添加重置验证状态的函数
  const resetVerification = () => {
    localStorage.removeItem('isVerified');
    setIsVerified(false);
  };

  // 添加搜索过滤函数
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-100 to-indigo-200">
      {/* Sidebar */}
      <div className={`bg-white bg-opacity-80 backdrop-blur-md w-64 p-4 flex flex-col ${isSidebarOpen ? '' : 'hidden'}`}>
        <Button 
          onClick={handleNewConversation} 
          className="mb-4 w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> 新建对话
        </Button>
        
        {/* 添加搜索框 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="搜索对话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full bg-gray-50 border-gray-200 focus:border-purple-300 focus:ring-purple-300"
          />
        </div>

        <div className="flex-grow overflow-y-auto space-y-2">
          {filteredConversations.map(conv => (
            <div 
              key={conv.id} 
              className={cn(
                "flex items-center justify-between p-4 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg cursor-pointer transition-colors duration-200",
                currentConversationId === conv.id && "bg-purple-100"
              )}
              onClick={() => loadConversation(conv.id)}
            >
              <div className="flex-1">
                {conv.isEditing ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.querySelector('input');
                      if (input) {
                        editConversation(conv.id, input.value);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center"
                    id={`form-${conv.id}`}
                  >
                    <input
                      type="text"
                      defaultValue={conv.title}
                      className="w-full bg-transparent border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-300 rounded px-2 py-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          editConversation(conv.id, e.currentTarget.value);
                        } else if (e.key === 'Escape') {
                          setConversations(conversations.map(c => 
                            c.id === conv.id ? { ...c, isEditing: false } : c
                          ));
                        }
                      }}
                      onBlur={(e) => {
                        // 不再在失焦时自动取消编辑状态
                        // 让用户必须通过确认按钮或Enter键来保存
                      }}
                      autoFocus
                    />
                  </form>
                ) : (
                  <span className="px-2 py-1">{conv.title}</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (conv.isEditing) {
                      // 如果正在编辑，点击确认按钮保存更改
                      const form = document.getElementById(`form-${conv.id}`);
                      const input = form?.querySelector('input');
                      if (input) {
                        editConversation(conv.id, input.value);
                      }
                    } else {
                      // 如果不在编辑状态，进入编辑模式
                      setConversations(conversations.map(c => 
                        c.id === conv.id ? { ...c, isEditing: true } : c
                      ));
                    }
                  }}
                >
                  {conv.isEditing ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Edit2 className="h-4 w-4 text-indigo-500" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={openSettings}>
          <SettingsIcon className="mr-2 h-4 w-4" /> 设置
        </Button>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="p-4 flex items-center">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-4 text-indigo-600 hover:bg-indigo-100">
            {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </Button>
          <Select value={selectedModel} onValueChange={handleModelSelect}>
            <SelectTrigger className="w-[180px] bg-white bg-opacity-70 backdrop-blur-sm border-indigo-300">
              <SelectValue placeholder="择模型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Llama 3.1 70B">Llama 3.1 70B</SelectItem>
              <SelectItem value="Gemini 1.5 Flash">Gemini 1.5 Flash</SelectItem>
              <SelectItem value="Qwen/Qwen2.5-72B-Instruct">Qwen/Qwen2.5-72B-Instruct</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <Chat
            selectedModel={selectedModel as ModelType}
            messages={messages}
            groqApiKey={apiKeys["Llama 3.1 70B"]}
            geminiApiKey={apiKeys["Gemini 1.5 Flash"]}
          />
          {isProcessing && (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          )}
        </div>
        {/* 一个包装容器来控制输入框宽度 */}
        <div className="w-full flex justify-center p-4">
          <div className="w-[70%]">
            <div className="flex flex-col space-y-2">
              {selectedFile && (
                <div className="flex items-center space-x-2 bg-white bg-opacity-60 rounded-lg p-2">
                  <div className="flex-1 text-sm text-gray-600">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearFile}
                    className="h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center space-x-2 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="absolute left-2 h-6 w-6"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt"
                />
                <textarea
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={handleSendMessage}
                  placeholder={selectedFile 
                    ? "请输入您希望AI如何处理这个文件（例如：分析文件内容、提取关键信息等）..." 
                    : "在这里输入您的消息..."}
                  className="flex-1 pl-10 p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white bg-opacity-60 resize-none min-h-[40px] max-h-[200px] overflow-y-auto scrollbar-hide"
                  rows={1}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isProcessing || (!inputMessage.trim() && !selectedFile)}
                  className="absolute right-2 bg-indigo-600 hover:bg-indigo-700 text-white h-6 w-6 p-0 min-w-[24px]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <Settings
          isOpen={isSettingsOpen}
          onClose={closeSettings}
          apiKeys={apiKeys}
          onApiKeySave={handleApiKeySave}
          onApiKeyTest={handleApiKeyTest}
          onApiKeyChange={(key: ModelType, value: string) => setApiKeys({...apiKeys, [key]: value})}
          systemPrompt={systemPrompt}
          isSystemPromptEnabled={isSystemPromptEnabled}
          onSystemPromptChange={handleSystemPromptChange}
          onSystemPromptToggle={handleSystemPromptToggle}
          isVerified={isVerified}
          onVerify={handleVerify}
        />
      )}
    </div>
  )
}
