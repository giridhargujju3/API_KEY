export interface BaseModelConfig {
  id: string;
  name: string;
  enabled: boolean;
  provider: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaEndpointConfig extends BaseModelConfig {
  provider: 'ollama';
  baseUrl: string;
  modelName: string;
  context_size?: number;
  threads?: number;
}

export interface ProviderConfigs {
  ollama: OllamaEndpointConfig[];
}

export interface ModelMetrics {
  responseTime: number;
  tokensPerSecond: number;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  processingTime?: number;
  cost?: number;
  contextSize?: number;
  memoryUsed?: number;
}

export interface ModelResponse {
  id: string;
  provider: string;
  model: string;
  text: string;
  metrics: ModelMetrics;
  error?: string;
}

export interface ComparisonResult {
  prompt: string;
  timestamp: string;
  responses: ModelResponse[];
  totalTime: number;
  errors?: string[];
} 