import { ApiConfig } from '../types/api-config';
import { ModelMetrics } from '../types/model-config';
import { browserLog } from '@/lib/utils/logger';

export class ApiService {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  public async generateCompletion(prompt: string, onProgress?: (progress: number, metrics: ModelMetrics) => void): Promise<ModelMetrics> {
    try {
      const startTime = performance.now();
      
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

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 1024,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Calculate metrics
      const totalTokens = data.usage?.total_tokens || 0;
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const processingTime = responseTime / 1000; // Convert to seconds
      const tokensPerSecond = completionTokens / processingTime;

      const metrics: ModelMetrics = {
        responseTime,
        tokensPerSecond: isFinite(tokensPerSecond) ? tokensPerSecond : 0,
        totalTokens,
        promptTokens,
        completionTokens,
        processingTime
      };

      // Report final progress
      if (onProgress) {
        onProgress(1, metrics);
      }

      // Log completion
      browserLog(`completion-${this.config.provider}`, {
        timestamp: new Date().toISOString(),
        model: this.config.modelName,
        ...metrics,
        rawStats: data.usage
      });

      return metrics;
    } catch (error) {
      console.error(`Error in ${this.config.provider} API request:`, error);
      
      // Log error
      browserLog(`error-${this.config.provider}`, {
        timestamp: new Date().toISOString(),
        model: this.config.modelName,
        error: error.message
      });
      
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}