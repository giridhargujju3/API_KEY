import { OllamaEndpointConfig } from './types/model-config';
import { ApiConfig } from './types/api-config';

export interface ModelSettings {
  ollama: Record<string, Partial<OllamaEndpointConfig>>;
  api: Record<string, Partial<ApiConfig>>;
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
    
    // Add Ollama models
    const ollamaConfigs = Object.values(this.settings.ollama || {});
    for (const config of ollamaConfigs) {
      if (config?.enabled && config?.baseUrl) {
        promises.push(this.callOllama(prompt));
      }
    }
    
    // Add API models
    const apiConfigs = Object.values(this.settings.api || {});
    for (const config of apiConfigs) {
      if (config?.enabled && config?.apiKey) {
        promises.push(this.callApiEndpoint(prompt, config as ApiConfig));
      }
    }

    return Promise.all(promises);
  }

  private async callApiEndpoint(prompt: string, config: ApiConfig): Promise<ModelResponse> {
    const start = Date.now();
    try {
      let endpoint = `${config.baseUrl}`;
      let headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add authorization header based on provider
      switch (config.provider) {
        case 'openai':
          endpoint += '/chat/completions';
          headers['Authorization'] = `Bearer ${config.apiKey}`;
          break;
        case 'google':
          endpoint += `/models/${config.modelName}:generateContent`;
          headers['x-goog-api-key'] = config.apiKey;
          break;
        case 'anthropic':
          endpoint += '/messages';
          headers['x-api-key'] = config.apiKey;
          headers['anthropic-version'] = '2023-06-01';
          break;
        case 'together':
          endpoint += '/chat/completions';
          headers['Authorization'] = `Bearer ${config.apiKey}`;
          break;
        case 'mistral':
          endpoint += '/chat/completions';
          headers['Authorization'] = `Bearer ${config.apiKey}`;
          break;
        case 'custom':
          if (config.headers) {
            headers = { ...headers, ...config.headers };
          }
          break;
      }

      // Prepare the request body based on provider
      let body: any;
      switch (config.provider) {
        case 'openai':
        case 'together':
        case 'mistral':
          body = {
            model: config.modelName,
            messages: [{ role: "user", content: prompt }],
            temperature: config.temperature || 0.7,
            max_tokens: config.maxTokens || 1000,
          };
          break;
        case 'anthropic':
          body = {
            model: config.modelName,
            messages: [{ role: "user", content: prompt }],
            temperature: config.temperature || 0.7,
            max_tokens: config.maxTokens || 1000,
          };
          break;
        case 'google':
          body = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: config.temperature || 0.7,
              maxOutputTokens: config.maxTokens || 1000,
            }
          };
          break;
        case 'custom':
          if (config.requestFormat === 'anthropic') {
            body = {
              model: config.modelName,
              messages: [{ role: "user", content: prompt }],
              temperature: config.temperature || 0.7,
              max_tokens: config.maxTokens || 1000,
            };
          } else {
            body = {
              model: config.modelName,
              messages: [{ role: "user", content: prompt }],
              temperature: config.temperature || 0.7,
              max_tokens: config.maxTokens || 1000,
            };
          }
          break;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const end = Date.now();

      // Extract response text based on provider API response format
      let responseText = '';
      let tokensPerSecond = 0;
      
      switch(config.provider) {
        case 'openai':
        case 'together':
        case 'mistral':
          responseText = data.choices[0]?.message?.content || '';
          tokensPerSecond = data.usage?.completion_tokens / ((end - start) / 1000) || 0;
          break;
        case 'anthropic':
          responseText = data.content[0]?.text || '';
          tokensPerSecond = (data.usage?.output_tokens || 0) / ((end - start) / 1000);
          break;
        case 'google':
          responseText = data.candidates[0]?.content?.parts[0]?.text || '';
          tokensPerSecond = (responseText.length / 4) / ((end - start) / 1000);
          break;
        case 'custom':
          if (data.choices && data.choices[0]?.message) {
            responseText = data.choices[0].message.content || '';
          } else if (data.content && data.content[0]) {
            responseText = data.content[0].text || '';
          } else if (data.candidates && data.candidates[0]?.content) {
            responseText = data.candidates[0].content.parts[0].text || '';
          } else if (data.response) {
            responseText = data.response;
          } else {
            responseText = JSON.stringify(data);
          }
          tokensPerSecond = (responseText.length / 4) / ((end - start) / 1000);
          break;
      }

      return {
        text: responseText,
        responseTime: end - start,
        tokensPerSecond,
        provider: config.provider,
        model: config.modelName,
      };
    } catch (error) {
      return {
        text: "",
        responseTime: 0,
        tokensPerSecond: 0,
        provider: config.provider,
        model: config.modelName || "Unknown",
        error: error.message,
      };
    }
  }
}

export { ModelService };