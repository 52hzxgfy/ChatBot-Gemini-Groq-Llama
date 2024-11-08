import { FC, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { X } from 'lucide-react'
import { ApiKeys, ModelType } from '@/lib/types'

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKeys;
  onApiKeySave: (model: string) => Promise<void>;
  onApiKeyTest: (model: ModelType) => Promise<void>;
  onApiKeyChange: (key: ModelType, value: string) => void;
  systemPrompt: string;
  isSystemPromptEnabled: boolean;
  onSystemPromptChange: (value: string) => void;
  onSystemPromptToggle: (enabled: boolean) => void;
  isVerified: boolean;
  onVerify: (code: string) => Promise<void>;
}

export const Settings: FC<SettingsProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onApiKeySave,
  onApiKeyTest,
  onApiKeyChange,
  systemPrompt,
  isSystemPromptEnabled,
  onSystemPromptChange,
  onSystemPromptToggle,
  isVerified,
  onVerify
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');

  const handleVerify = async () => {
    try {
      setVerificationError('');
      
      if (!verificationCode.trim()) {
        setVerificationError('请输入验证码');
        return;
      }

      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();
      
      if (!data.success) {
        setVerificationError(data.message || '验证失败');
        return;
      }

      await onVerify(verificationCode);
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError('验证过程发生错误，请重试');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white bg-opacity-90 p-6 rounded-lg w-[600px] max-h-[80vh] overflow-y-auto relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        
        {!isVerified ? (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">需要验证</h3>
            <p className="text-sm text-yellow-600 mb-4">请输入验证码以访问API设置</p>
            <Input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="请输入6位数字验证码"
              className="mb-2"
              maxLength={6}
            />
            {verificationError && (
              <p className="text-red-500 text-sm mb-2">{verificationError}</p>
            )}
            <Button 
              onClick={handleVerify}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              验证
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-indigo-800">设置</h2>
            <Tabs defaultValue="api-connection">
              <TabsList className="mb-4 bg-indigo-100">
                <TabsTrigger value="api-connection" className="data-[state=active]:bg-indigo-200">模型 API 连接</TabsTrigger>
                <TabsTrigger value="system-prompt" className="data-[state=active]:bg-indigo-200">系统提示词</TabsTrigger>
              </TabsList>
              <TabsContent value="api-connection">
                {/* Llama 3.1 70B API 配置 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-indigo-700 mb-2">Llama 3.1 70B API 密钥</label>
                  <Input
                    type="password"
                    value={apiKeys["Llama 3.1 70B"]}
                    onChange={(e) => onApiKeyChange("Llama 3.1 70B", e.target.value)}
                    placeholder="输入 Llama 3.1 70B API 密钥"
                    className="mb-2 border-indigo-300"
                  />
                  <div className="flex space-x-2">
                    <Button variant="outline" className="flex-1 border-indigo-300 text-indigo-700 hover:bg-indigo-100" onClick={() => onApiKeySave("Llama 3.1 70B")}>保存</Button>
                    <Button variant="outline" className="flex-1 border-indigo-300 text-indigo-700 hover:bg-indigo-100" onClick={() => onApiKeyTest("Llama 3.1 70B")}>测试连接</Button>
                  </div>
                </div>

                {/* Gemini 1.5 Flash API 配置 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-indigo-700 mb-2">Gemini 1.5 Flash API 密钥</label>
                  <Input
                    type="password"
                    value={apiKeys["Gemini 1.5 Flash"]}
                    onChange={(e) => onApiKeyChange("Gemini 1.5 Flash", e.target.value)}
                    placeholder="输入 Gemini 1.5 Flash API 密钥"
                    className="mb-2 border-indigo-300"
                  />
                  <div className="flex space-x-2">
                    <Button variant="outline" className="flex-1 border-indigo-300 text-indigo-700 hover:bg-indigo-100" onClick={() => onApiKeySave("Gemini 1.5 Flash")}>保存</Button>
                    <Button variant="outline" className="flex-1 border-indigo-300 text-indigo-700 hover:bg-indigo-100" onClick={() => onApiKeyTest("Gemini 1.5 Flash")}>测试连接</Button>
                  </div>
                </div>

                {/* Qwen API 配置 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-indigo-700 mb-2">Qwen/Qwen2.5-72B-Instruct API 密钥</label>
                  <Input
                    type="password"
                    value={apiKeys["Qwen/Qwen2.5-72B-Instruct"]}
                    onChange={(e) => onApiKeyChange("Qwen/Qwen2.5-72B-Instruct", e.target.value)}
                    placeholder="输入 Qwen/Qwen2.5-72B-Instruct API 密钥"
                    className="mb-2 border-indigo-300"
                  />
                  <div className="flex space-x-2">
                    <Button variant="outline" className="flex-1 border-indigo-300 text-indigo-700 hover:bg-indigo-100" onClick={() => onApiKeySave("Qwen/Qwen2.5-72B-Instruct")}>保存</Button>
                    <Button variant="outline" className="flex-1 border-indigo-300 text-indigo-700 hover:bg-indigo-100" onClick={() => onApiKeyTest("Qwen/Qwen2.5-72B-Instruct")}>测试连接</Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="system-prompt">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-indigo-700">启用系统提示词</label>
                  <Switch
                    checked={isSystemPromptEnabled}
                    onCheckedChange={onSystemPromptToggle}
                  />
                </div>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => onSystemPromptChange(e.target.value)}
                  placeholder="在这里输入全局系统提示词..."
                  className="w-full h-32 border-indigo-300"
                  disabled={!isSystemPromptEnabled}
                />
                <p className="mt-2 text-sm text-gray-500">
                  系统提示词将作为上下文添加到所有对话中。启用后，所有模型都会收到这个提示词作为系统级指令。
                </p>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}; 