import { OllamaService } from './ollama-service';
import {
  ProviderConfigs,
  ComparisonResult,
  ModelResponse,
  ModelMetrics,
  OllamaEndpointConfig,
} from '../types/model-config';
import { browserLog } from '@/lib/utils/logger';

export class ComparisonService {
  private static instance: ComparisonService;
  private configs: ProviderConfigs;
  private services: {
    ollama: OllamaService[];
  };

  private constructor() {
    this.configs = {
      ollama: [],
    };
    this.services = {
      ollama: [],
    };
  }

  public static getInstance(): ComparisonService {
    if (!ComparisonService.instance) {
      ComparisonService.instance = new ComparisonService();
    }
    return ComparisonService.instance;
  }

  public updateConfigs(configs: ProviderConfigs): void {
    this.configs = configs;
    
    // Reinitialize services with new configs
    this.services = {
      ollama: configs.ollama
        .filter(config => config.enabled)
        .map(config => new OllamaService(config)),
    };
  }

  public async compareModels(prompt: string, options: { useStreaming?: boolean } = {}): Promise<ComparisonResult> {
    const startTime = performance.now();
    const activeConfigs = this.getActiveConfigs();
    const results: ModelResponse[] = [];
    const errors: string[] = [];
    
    // Default to streaming for real-time visualization
    const useStreaming = options.useStreaming !== false;
    
    // Log the comparison request
    browserLog('comparison-request', {
      timestamp: new Date().toISOString(),
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      modelCount: activeConfigs.ollama.length,
      models: activeConfigs.ollama.map(c => c.modelName),
      useStreaming
    });

    // Create a map to track progress for each model
    const progressMap = new Map<string, (progress: number, metrics: ModelMetrics) => void>();

    // Process Ollama models
    const ollamaPromises = activeConfigs.ollama.map(async (config) => {
      try {
        // Create a progress callback for this model
        const progressCallback = (progress: number, metrics: ModelMetrics) => {
          // Dispatch progress event
          const event = new CustomEvent('model-progress', {
            detail: {
              modelId: config.id,
              progress,
              metrics
            }
          });
          window.dispatchEvent(event);
        };

        // Store the progress callback
        progressMap.set(config.id, progressCallback);
        
        // Find the service by ID
        const serviceIndex = this.services.ollama.findIndex(s => {
          // Access the ID through the public methods or create a new service
          return s.getModelInfo(config.modelName)?.name === config.modelName;
        });
        
        let service: OllamaService;
        
        if (serviceIndex === -1) {
          // Create a new service if not found
          service = new OllamaService(config);
          this.services.ollama.push(service);
        } else {
          // Use the existing service
          service = this.services.ollama[serviceIndex];
        }
        
        // Generate completion with progress tracking
        const metrics = await service.generateCompletion(prompt, progressCallback);
        
        // Create the response object
        const response: ModelResponse = {
          id: config.id,
          provider: 'ollama',
          model: config.modelName,
          text: 'Response text will be available in the final result',
          metrics
        };
        
        // Send a final progress update with the accurate metrics
        progressCallback(1, metrics);
        
        return response;
      } catch (error) {
        const errorMessage = `Error with model ${config.modelName}: ${error.message}`;
        errors.push(errorMessage);
        
        // Create an error response
        const errorResponse: ModelResponse = {
          id: config.id,
          provider: 'ollama',
          model: config.modelName,
          text: '',
          metrics: {
            responseTime: 0,
            tokensPerSecond: 0,
            totalTokens: 0,
            promptTokens: 0,
            completionTokens: 0
          },
          error: error.message
        };
        
        return errorResponse;
      }
    });

    // Wait for all promises to resolve
    const responses = await Promise.all(ollamaPromises);
    results.push(...responses);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Create the final result
    const result: ComparisonResult = {
      prompt,
      timestamp: new Date().toISOString(),
      responses: results,
      totalTime,
      errors: errors.length > 0 ? errors : undefined
    };

    // Log the comparison result
    browserLog('comparison-result', {
      timestamp: new Date().toISOString(),
      totalTime,
      modelCount: results.length,
      errorCount: errors.length,
      models: results.map(r => r.model)
    });

    return result;
  }

  public async validateConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Test Ollama connections
    for (const service of this.services.ollama) {
      try {
        const models = await service.listModels();
        results[`ollama-${service['config'].id}`] = models.length > 0;
      } catch {
        results[`ollama-${service['config'].id}`] = false;
      }
    }

    return results;
  }

  public getActiveConfigs(): ProviderConfigs {
    return this.configs;
  }

  public async getOllamaModels(endpointId: string): Promise<string[]> {
    const service = this.services.ollama.find(
      s => s['config'].id === endpointId
    );
    if (!service) {
      return [];
    }
    return service.listModels();
  }

  public async pullOllamaModel(endpointId: string, modelName: string): Promise<boolean> {
    const service = this.services.ollama.find(
      s => s['config'].id === endpointId
    );
    if (!service) {
      return false;
    }
    try {
      await service.pullModel(modelName);
      return true;
    } catch (error) {
      console.error("Error pulling model:", error);
      return false;
    }
  }
} 