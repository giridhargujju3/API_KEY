// Define API provider types
export type ApiProviderType = 'openai' | 'google' | 'anthropic' | 'together' | 'mistral' | 'custom';

export interface BaseApiConfig {
  id: string;
  name: string;
  enabled: boolean;
  provider: ApiProviderType;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenAIConfig extends BaseApiConfig {
  provider: 'openai';
  organization?: string;
}

export interface GoogleAIConfig extends BaseApiConfig {
  provider: 'google';
  projectId?: string;
}

export interface AnthropicConfig extends BaseApiConfig {
  provider: 'anthropic';
  version?: string;
}

export interface TogetherAIConfig extends BaseApiConfig {
  provider: 'together';
}

export interface MistralConfig extends BaseApiConfig {
  provider: 'mistral';
}

export interface CustomAPIConfig extends BaseApiConfig {
  provider: 'custom';
  headers?: Record<string, string>;
  requestFormat?: 'openai' | 'anthropic' | 'custom';
}

export type ApiConfig = 
  | OpenAIConfig 
  | GoogleAIConfig 
  | AnthropicConfig 
  | TogetherAIConfig
  | MistralConfig
  | CustomAPIConfig;

// Default configuration values
export const DEFAULT_API_CONFIGS: Record<ApiProviderType, Partial<ApiConfig>> = {
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1024
  },
  google: {
    provider: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    modelName: 'gemini-pro',
    temperature: 0.7,
    maxTokens: 1024
  },
  anthropic: {
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    modelName: 'claude-2',
    temperature: 0.7,
    maxTokens: 1024
  },
  together: {
    provider: 'together',
    baseUrl: 'https://api.together.xyz/v1',
    modelName: 'llama-2-70b-chat',
    temperature: 0.7,
    maxTokens: 1024
  },
  mistral: {
    provider: 'mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    modelName: 'mistral-medium',
    temperature: 0.7,
    maxTokens: 1024
  },
  custom: {
    provider: 'custom',
    baseUrl: '',
    modelName: '',
    temperature: 0.7,
    maxTokens: 1024,
    requestFormat: 'openai'
  }
};

// Provider display names
export const PROVIDER_DISPLAY_NAMES: Record<ApiProviderType, string> = {
  openai: 'OpenAI',
  google: 'Google AI',
  anthropic: 'Anthropic',
  together: 'Together AI',
  mistral: 'Mistral AI',
  custom: 'Custom API'
};

// Available models by provider
export const AVAILABLE_MODELS: Record<ApiProviderType, string[]> = {
  openai: [
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    'gpt-4',
    'gpt-4-32k',
    'gpt-4-turbo',
    'gpt-4o'
  ],
  google: [
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
  ],
  anthropic: [
    'claude-instant-1',
    'claude-2',
    'claude-2.1',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku'
  ],
  together: [
    'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
    'deepseek-ai/DeepSeek-R1',
    'mistralai/Mistral-Small-24B-Instruct-2501',
    'Qwen/QwQ-32B',
    'Qwen/Qwen2.5-Coder-32B-Instruct',
    'meta-llama/Meta-Llama-Guard-3-8B'
  ],
  mistral: [
    'mistral-tiny',
    'mistral-small',
    'mistral-medium',
    'mistral-large'
  ],
  custom: []
};