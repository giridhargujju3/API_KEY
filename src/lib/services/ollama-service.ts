import { OllamaEndpointConfig, ModelResponse, ModelMetrics } from '../types/model-config';
import { browserLog, LoggableData } from '@/lib/utils/logger';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

interface ModelInfo {
  name: string;
  size: number;
  digest: string;
  details: {
    parameter_size: string;
    quantization_level: string;
  };
}

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

interface OllamaStats {
  total_duration?: number;
  load_duration?: number;
  sample_count?: number;
  sample_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaModelListItem {
  name: string;
  [key: string]: unknown;
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

  private async checkEndpoint(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateMetrics(stats: OllamaStats, responseTime: number, text: string): ModelMetrics {
    // Calculate tokens per second based on evaluation count and duration
    let tokensPerSecond = 0;
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let processingTime = 0;
    
    // Calculate processing time in seconds
    if (stats.eval_duration !== undefined && stats.prompt_eval_duration !== undefined) {
      // Convert nanoseconds to seconds
      processingTime = (stats.eval_duration + stats.prompt_eval_duration) / 1e9;
    } else {
      // Fallback to response time if processing time is not available
      processingTime = responseTime / 1000;
    }
    
    // Calculate completion tokens
    if (stats.eval_count !== undefined) {
      completionTokens = stats.eval_count;
    } else {
      // Estimate completion tokens if not provided
      completionTokens = this.estimateTokenCount(text);
    }
    
    // Calculate prompt tokens - fix the negative tokens issue
    if (stats.prompt_eval_count !== undefined) {
      // In Ollama API, prompt_eval_count can sometimes be less than eval_count
      // which would result in negative prompt tokens. This is a known issue.
      if (stats.prompt_eval_count >= completionTokens) {
        // Normal case: prompt_eval_count includes both prompt and completion
        promptTokens = Math.max(0, stats.prompt_eval_count - completionTokens);
        totalTokens = stats.prompt_eval_count; // This is already the total
      } else {
        // Abnormal case: prompt_eval_count is less than completion tokens
        // In this case, use prompt_eval_count as prompt tokens and add to completion tokens
        promptTokens = Math.max(0, stats.prompt_eval_count);
        totalTokens = promptTokens + completionTokens;
      }
    } else {
      // If no prompt tokens reported, estimate based on input
      promptTokens = this.estimateTokenCount(text);
      totalTokens = promptTokens + completionTokens;
    }
    
    // Ensure we don't have negative prompt tokens
    if (promptTokens < 0) promptTokens = 0;
    
    // Calculate tokens per second
    if (processingTime > 0 && completionTokens > 0) {
      // Focus on completion tokens per second as that's what users care about
      tokensPerSecond = completionTokens / processingTime;
    } else if (processingTime > 0 && totalTokens > 0) {
      // Fallback to total tokens
      tokensPerSecond = totalTokens / processingTime;
    }
    
    // Ensure we don't return NaN or Infinity
    if (!isFinite(tokensPerSecond)) {
      tokensPerSecond = 0;
    }
    
    // Log the calculation for debugging
    browserLog(`metrics-calculation-${this.config.modelName}`, {
      stats,
      responseTime,
      processingTime,
      promptTokens,
      completionTokens,
      totalTokens,
      tokensPerSecond,
      textLength: text.length,
      calculationMethod: stats.prompt_eval_count >= completionTokens ? 
        "prompt_tokens_subtracted" : "prompt_tokens_direct"
    });

    return {
      responseTime,
      tokensPerSecond,
      totalTokens,
      promptTokens,
      completionTokens,
      processingTime,
      contextSize: this.config.context_size,
      memoryUsed: undefined
    };
  }

  private getApiUrl(endpoint: string): string {
    // If baseUrl is provided, use it directly, otherwise use the proxy
    if (this.config.baseUrl && this.config.baseUrl !== 'http://localhost:11434') {
      return `${this.config.baseUrl}/api/${endpoint}`;
    }
    return `/api/ollama/${endpoint}`;
  }

  async generateCompletion(prompt: string, onProgress?: (progress: number, metrics: ModelMetrics) => void) {
    try {
      const startTime = performance.now();
      let totalTokens = 0;
      let completionTokens = 0;
      let promptTokens = 0;
      let lastStats: OllamaStats = {};
      let fullText = '';
      let finalResponse: OllamaResponse | null = null;
      
      // Log the request
      browserLog(`request-${this.config.modelName}`, {
        timestamp: new Date().toISOString(),
        model: this.config.modelName,
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        config: {
          ...this.config,
          // Don't log the full prompt for privacy
          prompt: undefined
        }
      });

      const response = await fetch(this.getApiUrl('generate'), {
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
        const errorText = await response.text();
        browserLog(`error-${this.config.modelName}`, {
          timestamp: new Date().toISOString(),
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
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
            const data: OllamaResponse = JSON.parse(line);
            fullText += data.response;
            
            // Store the final response for accurate metrics calculation
            if (data.done) {
              finalResponse = data;
            }
            
            // Update stats
            if (data.eval_count) {
              const now = performance.now();
              const timeSinceLastUpdate = (now - startTime) / 1000; // Convert to seconds
              
              completionTokens = data.eval_count;
              
              // Fix for negative prompt tokens
              if (data.prompt_eval_count >= data.eval_count) {
                promptTokens = Math.max(0, data.prompt_eval_count - data.eval_count);
                totalTokens = data.prompt_eval_count;
              } else {
                // Handle the case where prompt_eval_count is less than eval_count
                promptTokens = Math.max(0, data.prompt_eval_count);
                totalTokens = promptTokens + completionTokens;
              }
              
              lastStats = {
                total_duration: data.total_duration,
                eval_count: data.eval_count,
                eval_duration: data.eval_duration,
                prompt_eval_count: data.prompt_eval_count,
                prompt_eval_duration: data.prompt_eval_duration
              };

              // Calculate and report progress with current metrics
              if (onProgress) {
                const metrics = {
                  responseTime: timeSinceLastUpdate * 1000, // Convert to milliseconds
                  tokensPerSecond: completionTokens / (data.eval_duration / 1e9 || timeSinceLastUpdate),
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
      
      // Use the final response for accurate metrics if available
      if (finalResponse) {
        // Calculate accurate metrics from the final response
        const responseTime = finalResponse.total_duration / 1e6; // Convert to milliseconds
        
        // Calculate prompt tokens accurately
        promptTokens = Math.max(0, finalResponse.prompt_eval_count - finalResponse.eval_count);
        completionTokens = finalResponse.eval_count;
        totalTokens = promptTokens + completionTokens;
        
        // Calculate processing time in seconds
        const processingTime = finalResponse.total_duration / 1e9;
        
        // Calculate tokens per second based on completion tokens and eval_duration
        const tokensPerSecond = completionTokens / (finalResponse.eval_duration / 1e9);
        
        // Create final metrics
        const finalMetrics = {
          responseTime,
          tokensPerSecond: isFinite(tokensPerSecond) ? tokensPerSecond : 0,
          totalTokens,
          promptTokens,
          completionTokens,
          processingTime,
          contextSize: this.config.context_size
        };
        
        // Log final metrics
        browserLog(`completion-${this.config.modelName}`, {
          timestamp: new Date().toISOString(),
          model: this.config.modelName,
          ...finalMetrics,
          rawStats: finalResponse
        });
        
        if (onProgress) {
          onProgress(1, finalMetrics);
        }
        
        return finalMetrics;
      } else {
        // Fallback to the last stats if no final response
        const responseTime = lastStats.total_duration ? lastStats.total_duration / 1e6 : endTime - startTime;
        const totalProcessingTime = (lastStats.prompt_eval_duration + lastStats.eval_duration) / 1e9 || (endTime - startTime) / 1000;
        
        // Ensure non-negative prompt tokens in final metrics
        if (promptTokens < 0) promptTokens = 0;
        
        // Recalculate total tokens to ensure consistency
        totalTokens = promptTokens + completionTokens;
        
        const tokensPerSecond = completionTokens / (lastStats.eval_duration / 1e9 || totalProcessingTime);

        // Signal completion with final metrics
        const finalMetrics = {
        responseTime,
          tokensPerSecond: isFinite(tokensPerSecond) ? tokensPerSecond : 0,
        totalTokens,
          promptTokens,
          completionTokens,
        processingTime: totalProcessingTime,
          contextSize: this.config.context_size
        };
        
        // Log final metrics
        browserLog(`completion-${this.config.modelName}`, {
          timestamp: new Date().toISOString(),
          model: this.config.modelName,
          ...finalMetrics,
          rawStats: lastStats
        });

        if (onProgress) {
          onProgress(1, finalMetrics);
        }

        return finalMetrics;
      }
    } catch (error) {
      console.error("Error generating Ollama completion:", error);
      
      // Log the error
      browserLog(`error-${this.config.modelName}`, {
        timestamp: new Date().toISOString(),
        model: this.config.modelName,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(this.getApiUrl('tags'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models?.map((model: OllamaModelListItem) => model.name) || [];
    } catch (error) {
      console.error("Error listing Ollama models:", error);
      return []; // Return empty array instead of throwing
    }
  }

  async pullModel(modelName: string): Promise<void> {
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