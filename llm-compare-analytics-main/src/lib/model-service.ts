import { OllamaEndpointConfig } from './types/model-config';

export interface ModelSettings {
  ollama: Record<string, Partial<OllamaEndpointConfig>>;
}

interface ModelResponse {
  text: string;
  responseTime: number;
  tokensPerSecond: number;
  provider: string;
  model: string;
  error?: string;
}

class ModelService {
  private settings: ModelSettings;

  constructor(settings: ModelSettings) {
    this.settings = settings;
  }

  private async callOllama(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    try {
      const config = Object.values(this.settings.ollama)[0] || {};
      const baseUrl = config.baseUrl || "http://localhost:11434";
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.modelName || "llama2",
          prompt: prompt,
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1000,
          context_size: config.context_size,
          threads: config.threads
        }),
      });

      const data = await response.json();
      const end = Date.now();

      return {
        text: data.response,
        responseTime: end - start,
        tokensPerSecond: data.eval_count / (data.eval_duration / 1e9) || 0,
        provider: "Ollama",
        model: config.modelName || "llama2",
      };
    } catch (error) {
      return {
        text: "",
        responseTime: 0,
        tokensPerSecond: 0,
        provider: "Ollama",
        model: "Unknown",
        error: error.message,
      };
    }
  }

  public async compareModels(prompt: string): Promise<ModelResponse[]> {
    const promises: Promise<ModelResponse>[] = [];
    const config = Object.values(this.settings.ollama)[0];
    
    if (config?.baseUrl) {
      promises.push(this.callOllama(prompt));
    }

    return Promise.all(promises);
  }
}

export { ModelService }; 