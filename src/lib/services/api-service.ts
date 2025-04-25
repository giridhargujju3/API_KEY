import { ApiConfig } from '../types/api-config';
import { ModelMetrics } from '../types/model-config';
import { browserLog } from '@/lib/utils/logger';

export class ApiService {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  public async testConnection(): Promise<boolean> {
    try {
      // For most providers, we'll just check if the API key works by making a simple request
      switch (this.config.provider) {
        case 'openai':
          const response = await fetch(`${this.config.baseUrl}/models`, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`
            }
          });
          return response.ok;
        
        case 'google':
          // For Google, we'll check if we can list models
          const googleResponse = await fetch(`${this.config.baseUrl}/models?key=${this.config.apiKey}`);
          return googleResponse.ok;
        
        case 'anthropic':
          // For Anthropic, we'll use a simple models list endpoint
          const anthropicResponse = await fetch(`${this.config.baseUrl}/models`, {
            headers: {
              'x-api-key': this.config.apiKey,
              'anthropic-version': '2023-06-01'
            }
          });
          return anthropicResponse.ok;
          
        case 'together':
        case 'mistral':
          // These follow OpenAI-like API design
          const standardResponse = await fetch(`${this.config.baseUrl}/models`, {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`
            }
          });
          return standardResponse.ok;
          
        case 'custom':
          // For custom, we can only verify with a real request, so we'll return true
          // and let the actual generation request handle any errors
          return true;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Error testing API connection:', error);
      return false;
    }
  }

  public async generateCompletion(prompt: string, onProgress?: (progress: number, metrics: ModelMetrics) => void): Promise<ModelMetrics> {
    try {
      const startTime = performance.now();
      let endpoint = `${this.config.baseUrl}`;
      let headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add authorization header based on provider
      switch (this.config.provider) {
        case 'openai':
          endpoint += '/chat/completions';
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
          break;
        case 'google':
          endpoint += `/models/${this.config.modelName}:generateContent`;
          headers['x-goog-api-key'] = this.config.apiKey;
          break;
        case 'anthropic':
          endpoint += '/messages';
          headers['x-api-key'] = this.config.apiKey;
          headers['anthropic-version'] = '2023-06-01';
          break;
        case 'together':
          endpoint += '/chat/completions';
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
          break;
        case 'mistral':
          endpoint += '/chat/completions';
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
          break;
        case 'custom':
          // For custom endpoints, we'll rely on the baseUrl being complete
          if (this.config.headers) {
            headers = { ...headers, ...this.config.headers };
          }
          break;
      }

      // Prepare the request body based on provider
      let body: any;
      switch (this.config.provider) {
        case 'openai':
        case 'together':
        case 'mistral':
          body = {
            model: this.config.modelName,
            messages: [{ role: "user", content: prompt }],
            temperature: this.config.temperature || 0.7,
            max_tokens: this.config.maxTokens || 1000,
          };
          break;
        case 'anthropic':
          body = {
            model: this.config.modelName,
            messages: [{ role: "user", content: prompt }],
            temperature: this.config.temperature || 0.7,
            max_tokens: this.config.maxTokens || 1000,
          };
          break;
        case 'google':
          body = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: this.config.temperature || 0.7,
              maxOutputTokens: this.config.maxTokens || 1000,
            }
          };
          break;
        case 'custom':
          // For custom, use OpenAI format as default unless specified
          if (this.config.requestFormat === 'anthropic') {
            body = {
              model: this.config.modelName,
              messages: [{ role: "user", content: prompt }],
              temperature: this.config.temperature || 0.7,
              max_tokens: this.config.maxTokens || 1000,
            };
          } else {
            // Default to OpenAI format
            body = {
              model: this.config.modelName,
              messages: [{ role: "user", content: prompt }],
              temperature: this.config.temperature || 0.7,
              max_tokens: this.config.maxTokens || 1000,
            };
          }
          break;
      }

      // Log the API request
      browserLog(`api-request-${this.config.provider}`, {
        timestamp: new Date().toISOString(),
        provider: this.config.provider,
        model: this.config.modelName,
        endpoint,
        promptLength: prompt.length
      });

      // Report initial progress
      if (onProgress) {
        onProgress(0.1, {
          responseTime: 0,
          tokensPerSecond: 0,
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0
        });
      }
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || response.statusText;
        
        browserLog(`api-error-${this.config.provider}`, {
          timestamp: new Date().toISOString(),
          status: response.status,
          statusText: response.statusText,
          error: errorMessage
        });
        
        throw new Error(`API error: ${errorMessage}`);
      }

      const data = await response.json();
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Extract metrics based on provider API response format
      let totalTokens = 0;
      let promptTokens = 0;
      let completionTokens = 0;
      
      switch(this.config.provider) {
        case 'openai':
        case 'together':
        case 'mistral':
          totalTokens = data.usage?.total_tokens || 0;
          promptTokens = data.usage?.prompt_tokens || 0;
          completionTokens = data.usage?.completion_tokens || 0;
          break;
        case 'anthropic':
          totalTokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
          promptTokens = data.usage?.input_tokens || 0;
          completionTokens = data.usage?.output_tokens || 0;
          break;
        case 'google':
          // Google doesn't provide token metrics, estimate based on characters
          const responseText = data.candidates[0]?.content?.parts[0]?.text || '';
          // Rough estimate: 1 token ≈ 4 characters
          completionTokens = Math.ceil(responseText.length / 4);
          promptTokens = Math.ceil(prompt.length / 4);
          totalTokens = promptTokens + completionTokens;
          break;
        case 'custom':
          // For custom APIs, try to extract token information if available or estimate
          if (data.usage?.total_tokens) {
            totalTokens = data.usage.total_tokens;
            promptTokens = data.usage.prompt_tokens || 0;
            completionTokens = data.usage.completion_tokens || 0;
          } else {
            // Estimate based on text length
            let responseText = '';
            if (data.choices && data.choices[0]?.message) {
              responseText = data.choices[0].message.content || '';
            } else if (data.content && data.content[0]) {
              responseText = data.content[0].text || '';
            } else if (data.candidates && data.candidates[0]?.content) {
              responseText = data.candidates[0].content.parts[0].text || '';
            } else if (data.response) {
              responseText = data.response;
            }
            completionTokens = Math.ceil(responseText.length / 4);
            promptTokens = Math.ceil(prompt.length / 4);
            totalTokens = promptTokens + completionTokens;
          }
          break;
      }
      
      // Calculate tokens per second
      const processingTime = responseTime / 1000; // Convert to seconds
      const tokensPerSecond = completionTokens / processingTime;
      
      const metrics: ModelMetrics = {
        responseTime,
        tokensPerSecond,
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
      browserLog(`api-completion-${this.config.provider}`, {
        timestamp: new Date().toISOString(),
        provider: this.config.provider,
        model: this.config.modelName,
        metrics,
        responseTime
      });
      
      return metrics;
    } catch (error) {
      console.error(`Error in ${this.config.provider} API request:`, error);
      
      // Log error
      browserLog(`api-error-${this.config.provider}`, {
        timestamp: new Date().toISOString(),
        provider: this.config.provider,
        model: this.config.modelName,
        error: error.message
      });
      
      // Return empty metrics
      const errorMetrics: ModelMetrics = {
        responseTime: 0,
        tokensPerSecond: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        processingTime: 0
      };
      
      // Report error to progress
      if (onProgress) {
        onProgress(1, errorMetrics);
      }
      
      throw error;
    }
  }
}