import { FC } from 'react'
import { ModelType } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ModelSelectProps {
  selectedModel: ModelType;
  onModelSelect: (model: ModelType) => void;
}

export const ModelSelect: FC<ModelSelectProps> = ({
  selectedModel,
  onModelSelect
}) => {
  return (
    <Select value={selectedModel} onValueChange={onModelSelect}>
      <SelectTrigger className="w-[180px] bg-white bg-opacity-70 backdrop-blur-sm border-indigo-300">
        <SelectValue placeholder="选择模型" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Llama 3.1 70B">Llama 3.1 70B</SelectItem>
        <SelectItem value="Gemini 1.5 Flash">Gemini 1.5 Flash</SelectItem>
        <SelectItem value="Qwen/Qwen2.5-72B-Instruct">Qwen/Qwen2.5-72B-Instruct</SelectItem>
        <SelectItem value="Llama 3.2 90B (Preview)">Llama 3.2 90B (Preview)</SelectItem>
      </SelectContent>
    </Select>
  );
}; 