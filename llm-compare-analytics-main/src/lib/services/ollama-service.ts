import { OllamaEndpointConfig, ModelResponse, ModelMetrics } from '../types/model-config';
import { browserLog } from '@/lib/utils/logger';

interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level?: string;
  };
}

export class OllamaService {
  private config: OllamaEndpointConfig;
  private modelInfo: Record<string, OllamaModelInfo> = {};

  constructor(config: OllamaEndpointConfig) {
    this.config = config;
    this.loadModelInfo();
  }

  private async loadModelInfo() {
    try {
      const models = await this.listModels();
      for (const modelName of models) {
        await this.fetchModelInfo(modelName);
      }
    } catch (error) {
      console.error('Failed to load model info:', error);
    }
  }

  private async fetchModelInfo(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch model info');
      }

      const info = await response.json();
      this.modelInfo[modelName] = info;
    } catch (error) {
      console.error(`Failed to get info for model ${modelName}:`, error);
    }
  }

  public async generateCompletion(prompt: string, onProgress?: (progress: number, metrics: ModelMetrics) => void): Promise<ModelMetrics> {
    try {
      const startTime = performance.now();
      let totalTokens = 0;
      let completionTokens = 0;
      let promptTokens = 0;
      let lastStats: any = {};
      let fullText = '';
      
      // Log the request
      browserLog(`request-${this.config.modelName}`, {
        timestamp: new Date().toISOString(),
        model: this.config.modelName,
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        config: {
          ...this.config,
          prompt: undefined
        }
      });

      // Report initial progress
      if (onProgress) {
        onProgress(0.1, {
          responseTime: 0,
          tokensPerSecond: 0,
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          processingTime: 0
        });
      }

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.modelName,
          prompt,
          stream: true,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 128,
            ...(this.config.context_size ? { num_ctx: this.config.context_size } : {}),
            ...(this.config.threads ? { num_thread: this.config.threads } : {})
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            fullText += data.response;
            
            if (data.done) {
              lastStats = {
                total_duration: data.total_duration,
                eval_count: data.eval_count,
                eval_duration: data.eval_duration,
                prompt_eval_count: data.prompt_eval_count,
                prompt_eval_duration: data.prompt_eval_duration
              };
            }
            
            // Update stats
            if (data.eval_count) {
              const now = performance.now();
              const timeSinceStart = (now - startTime) / 1000; // Convert to seconds
              
              completionTokens = data.eval_count;
              
              // Fix for negative prompt tokens
              if (data.prompt_eval_count >= data.eval_count) {
                promptTokens = Math.max(0, data.prompt_eval_count - data.eval_count);
                totalTokens = data.prompt_eval_count;
              } else {
                promptTokens = Math.max(0, data.prompt_eval_count);
                totalTokens = promptTokens + completionTokens;
              }

              // Calculate and report progress with current metrics
              if (onProgress) {
                const metrics = {
                  responseTime: timeSinceStart * 1000, // Convert to milliseconds
                  tokensPerSecond: completionTokens / (data.eval_duration / 1e9 || timeSinceStart),
                  totalTokens,
                  promptTokens,
                  completionTokens,
                  processingTime: data.total_duration / 1e9
                };
                
                // Calculate progress more accurately
                const progress = data.eval_count / (this.config.maxTokens || 128);
                onProgress(Math.min(progress, 0.99), metrics);
              }
            }
          } catch (e) {
            console.warn('Error parsing streaming response:', e);
          }
        }
      }

      const endTime = performance.now();
      const responseTime = lastStats.total_duration ? lastStats.total_duration / 1e6 : endTime - startTime;
      const processingTime = (lastStats.prompt_eval_duration + lastStats.eval_duration) / 1e9 || (endTime - startTime) / 1000;
      
      // Ensure non-negative prompt tokens
      if (promptTokens < 0) promptTokens = 0;
      
      // Recalculate total tokens to ensure consistency
      totalTokens = promptTokens + completionTokens;
      
      const tokensPerSecond = completionTokens / (lastStats.eval_duration / 1e9 || processingTime);

      // Create final metrics
      const metrics: ModelMetrics = {
        responseTime,
        tokensPerSecond: isFinite(tokensPerSecond) ? tokensPerSecond : 0,
        totalTokens,
        promptTokens,
        completionTokens,
        processingTime,
        contextSize: this.config.context_size
      };
      
      // Log completion
      browserLog(`completion-${this.config.modelName}`, {
        timestamp: new Date().toISOString(),
        model: this.config.modelName,
        ...metrics,
        rawStats: lastStats
      });

      // Report final progress
      if (onProgress) {
        onProgress(1, metrics);
      }

      return metrics;
    } catch (error) {
      console.error("Error generating Ollama completion:", error);
      
      // Log error
      browserLog(`error-${this.config.modelName}`, {
        timestamp: new Date().toISOString(),
        model: this.config.modelName,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  public async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error("Error listing Ollama models:", error);
      return [];
    }
  }

  public async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/pull`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error pulling Ollama model:", error);
      throw error;
    }
  }

  public getModelInfo(modelName: string): OllamaModelInfo | undefined {
    return this.modelInfo[modelName];
  }
}