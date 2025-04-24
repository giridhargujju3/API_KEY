import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { toast } from "./ui/use-toast";
import { ComparisonCard } from "./ComparisonCard";
import { AdvancedPerformanceChart } from "./AdvancedPerformanceChart";
import { ModelSettings } from "./ModelSettings";
import { ModelColorPicker } from "./ModelColorPicker";
import { LogViewer } from "./LogViewer";
import { MetricsVerifier } from "./MetricsVerifier";
import { EmptyState } from "./EmptyState";
import { OllamaService } from "@/lib/services/ollama-service";
import type { OllamaEndpointConfig, ModelMetrics } from "@/lib/types/model-config";
import type { ModelSettings as ModelSettingsType } from "@/lib/model-service";
import { generateModelColor } from "@/lib/utils/chart-utils";
import { browserLog } from "@/lib/utils/logger";
import { LineChart, BarChart3, Settings2, Wrench, FileText, CheckSquare, RefreshCw, Palette, ScrollText } from "lucide-react";
import { PostmanTester } from './PostmanTester';
import { ComparisonService } from "@/lib/services/comparison-service";

interface ModelProgress {
  startTime: number;
  isComplete: boolean;
  progress?: number;
  metrics?: ModelMetrics;
}

interface ExtendedModelResponse {
  modelId: string;
  modelName: string;
  responseTime: number;
  tokensPerSecond: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  processingTime: number;
}

interface PerformanceDataPoint {
  timestamp: string;
  [key: string]: number | string;
}

interface ModelConfig {
  name?: string;
  enabled?: boolean;
  baseUrl?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  context_size?: number;
  threads?: number;
}

export function ComparisonDashboard() {
  const [prompt, setPrompt] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [results, setResults] = useState<ExtendedModelResponse[]>([]);
  const [modelProgress, setModelProgress] = useState<Record<string, ModelProgress>>({});
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceDataPoint[]>([]);
  const [settings, setSettings] = useState<ModelSettingsType>({ ollama: {} });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [modelColors, setModelColors] = useState<Record<string, string>>({});
  const [enabledModels, setEnabledModels] = useState<Array<{
    id: string;
    provider: string;
    name: string;
    enabled: boolean;
    baseUrl?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    context_size?: number;
    threads?: number;
  }>>([]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [isMetricsVerifierOpen, setIsMetricsVerifierOpen] = useState(false);
  const [isPostmanTesterOpen, setIsPostmanTesterOpen] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("model-settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && typeof parsed === 'object') {
          setSettings({
            ollama: parsed.ollama || {}
          });
        }
      }
    } catch (error) {
      console.error("Error loading settings from localStorage:", error);
    }
  }, []);

  // Process settings to get enabled models
  useEffect(() => {
    try {
      const models = [];
      
      if (settings && settings.ollama) {
        for (const [id, modelConfig] of Object.entries(settings.ollama)) {
          if (!modelConfig) continue;
          
          const model = {
            id,
            provider: 'ollama',
            name: modelConfig.name || id,
            enabled: modelConfig.enabled || false,
            baseUrl: modelConfig.baseUrl,
            modelName: modelConfig.modelName,
            temperature: modelConfig.temperature,
            maxTokens: modelConfig.maxTokens,
            context_size: modelConfig.context_size,
            threads: modelConfig.threads
          };
          
          if (model.enabled) {
            models.push(model);
          }
        }
      }
      
      setEnabledModels(models);
    } catch (error) {
      console.error("Error processing settings:", error);
      setEnabledModels([]);
    }
  }, [settings]);

  // Update selectedModelIds when enabledModels changes - ONLY for initial setup
  useEffect(() => {
    // Only set selectedModelIds if it's empty (initial load)
    // This prevents overriding user selections
    if (selectedModelIds.length === 0 && enabledModels.length > 0) {
      setSelectedModelIds(enabledModels.map(model => model.id));
    }
  }, [enabledModels, selectedModelIds.length]);

  // Initialize model colors when enabled models change
  useEffect(() => {
    // Only generate colors for models that don't already have a custom color
    const newColors: Record<string, string> = { ...modelColors };
    
    enabledModels.forEach((model, index) => {
      if (!newColors[model.id]) {
        newColors[model.id] = generateModelColor(model.name, index, enabledModels.length);
      }
    });
    
    setModelColors(newColors);
  }, [enabledModels, modelColors]);

  const handleModelToggle = (modelId: string, checked: boolean) => {
    setSelectedModelIds(prev => {
      const newSelection = checked 
        ? [...prev, modelId]
        : prev.filter(id => id !== modelId);
      
      // Log the selection change
      browserLog('model-selection-change', {
        modelId,
        checked,
        previousSelection: prev,
        newSelection
      });
      
      return newSelection;
    });
  };

  const handleColorChange = (modelId: string, color: string) => {
    // Find the model by ID
    const model = enabledModels.find(m => m.id === modelId);
    if (!model) return;
    
    // Store the color by model name for the chart
    setModelColors(prev => {
      const newColors = {
        ...prev,
        [model.name]: color
      };
      
      // Log the color change
      browserLog('color-change', {
        modelId,
        modelName: model.name,
        color,
        allColors: newColors
      });
      
      return newColors;
    });
  };

  // Function to create a performance data point
  const createPerformanceDataPoint = useCallback((modelMetrics: ExtendedModelResponse[] = []): PerformanceDataPoint => {
    const dataPoint: PerformanceDataPoint = {
      timestamp: new Date().toISOString()
    };
    
    // Add metrics for each model
    modelMetrics.forEach(metric => {
      if (metric && metric.modelName) {
        dataPoint[metric.modelName] = metric.tokensPerSecond;
      }
    });
    
    // Also add data from model progress for models that are still processing
    Object.entries(modelProgress).forEach(([modelId, progress]) => {
      const model = enabledModels.find(m => m.id === modelId);
      if (!model || !selectedModelIds.includes(modelId)) return;
      
      if (progress.metrics && model.name) {
        // Only add if not already added from modelMetrics
        if (dataPoint[model.name] === undefined) {
          dataPoint[model.name] = progress.metrics.tokensPerSecond;
        }
      }
    });
    
    return dataPoint;
  }, [modelProgress, enabledModels, selectedModelIds]);

  // Add interval for updating performance data
  useEffect(() => {
    if (!isComparing) return;

    let lastUpdate = performance.now();
    const updateInterval = 50; // Update every 50ms for smoother lines

    const interval = setInterval(() => {
      const now = performance.now();
      const timeDiff = now - lastUpdate;
      
      if (timeDiff > updateInterval) {
        const dataPoint = createPerformanceDataPoint(results);
        
        // Update performance history with the new data point
        setPerformanceHistory(prev => {
          // Keep a reasonable number of points for performance
          const maxPoints = 100;
          const newHistory = [...prev, dataPoint];
          
          // If we have too many points, remove older ones
          return newHistory.length > maxPoints 
            ? newHistory.slice(-maxPoints) 
            : newHistory;
        });
        
        lastUpdate = now;
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isComparing, results, modelProgress, createPerformanceDataPoint]);

  // Add event listener for model progress updates
  useEffect(() => {
    const handleModelProgress = (event: CustomEvent) => {
      const { modelId, progress, metrics } = event.detail;
      
      // Update model progress
      setModelProgress(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          progress: progress * 100,
          metrics
        }
      }));
      
      // Add a new data point if progress is significant
      if (progress > 0) {
        // Find the model name
        const model = enabledModels.find(m => m.id === modelId);
        if (model && metrics) {
          // Create a new data point with the current metrics
          const newDataPoint = createPerformanceDataPoint(results);
          // Add this model's current metrics
          newDataPoint[model.name] = metrics.tokensPerSecond;
          
          // Add to performance history
          setPerformanceHistory(prev => [...prev, newDataPoint]);
        }
      }
    };
    
    // Add event listener
    window.addEventListener('model-progress', handleModelProgress as EventListener);
    
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('model-progress', handleModelProgress as EventListener);
    };
  }, [enabledModels, results, createPerformanceDataPoint]);

  const handleSettingsChange = (newSettings: ModelSettingsType) => {
    // Ensure the settings have the correct structure
    const validatedSettings: ModelSettingsType = {
      ollama: newSettings.ollama || {}
    };
    
    // Log the settings change
    browserLog('settings-change', {
      previousSettings: settings,
      newSettings: validatedSettings
    });
    
    setSettings(validatedSettings);
    localStorage.setItem("model-settings", JSON.stringify(validatedSettings));
  };

  const handleCompare = async () => {
    if (isComparing) return;
    
    // Validate input
    if (prompt.trim() === "") {
      toast({
        title: "Empty prompt",
        description: "Please enter a prompt to compare models.",
        variant: "destructive",
      });
      return;
    }

    if (selectedModelIds.length === 0) {
      toast({
        title: "No models selected",
        description: "Please select at least one model to compare.",
        variant: "destructive",
      });
      return;
    }

    setIsComparing(true);
    setResults([]);
    setModelProgress({});
    setPerformanceHistory([]);
    
    // Only use selected models
    const modelsToCompare = enabledModels.filter(model => 
      selectedModelIds.includes(model.id)
    );
    
    // Initialize progress tracking for each model
    const initialProgress: Record<string, ModelProgress> = {};
    modelsToCompare.forEach(model => {
      initialProgress[model.id] = {
        startTime: Date.now(),
        isComplete: false
      };
    });
    setModelProgress(initialProgress);
    
    // Log the comparison start
    browserLog('comparison-start', {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      selectedModelIds,
      selectedModels: modelsToCompare.map(model => ({ id: model.id, name: model.name }))
    });
    
    try {
      // Start with initial data point
      const initialDataPoint = createPerformanceDataPoint([]);
      setPerformanceHistory([initialDataPoint]);
      
      // Process each selected model in parallel
      const promises = modelsToCompare.map(async (model) => {
        try {
          const ollamaConfig: OllamaEndpointConfig = {
            id: model.id,
            name: model.name,
            enabled: true,
            provider: 'ollama',
            baseUrl: model.baseUrl || "http://localhost:11434",
            modelName: model.modelName || "llama2",
            temperature: model.temperature,
            maxTokens: model.maxTokens,
            context_size: model.context_size,
            threads: model.threads
          };
          
          const service = new OllamaService(ollamaConfig);
          
          let lastProgressUpdate = 0;
          const metrics = await service.generateCompletion(prompt, (progress, metrics) => {
            const now = performance.now();
            if (now - lastProgressUpdate > 50) { // Update every 50ms
              setModelProgress(prev => ({
                ...prev,
                [model.id]: {
                  ...prev[model.id],
                  progress: progress * 100,
                  metrics
                }
              }));
              lastProgressUpdate = now;
            }
          });
          
          // Update progress to complete
          setModelProgress(prev => ({
            ...prev,
            [model.id]: {
              ...prev[model.id],
              isComplete: true,
              progress: 100,
              metrics
            }
          }));

          const result: ExtendedModelResponse = {
            modelId: model.id,
            modelName: model.name,
            responseTime: metrics.responseTime,
            tokensPerSecond: metrics.tokensPerSecond,
            totalTokens: metrics.totalTokens || 0,
            promptTokens: metrics.promptTokens || 0,
            completionTokens: metrics.completionTokens || 0,
            processingTime: metrics.processingTime || 0
          };

          // Log the individual model result
          browserLog(`model-result-${model.id}`, {
            modelId: model.id,
            modelName: model.name,
            metrics,
            result
          });

          return result;
        } catch (error) {
          console.error(`Error processing model ${model.id}:`, error);
          
          // Log the error
          browserLog(`model-error-${model.id}`, {
            modelId: model.id,
            modelName: model.name,
            error: error.message,
            stack: error.stack
          });
          
          setModelProgress(prev => ({
            ...prev,
            [model.id]: {
              ...prev[model.id],
              isComplete: true,
              progress: 0
            }
          }));
          return null;
        }
      });

      const results = (await Promise.all(promises)).filter(Boolean) as ExtendedModelResponse[];
      
      // Log the final results
      browserLog('comparison-complete', {
        duration: performance.now() - initialProgress[modelsToCompare[0]?.id]?.startTime || 0,
        results
      });
      
      setResults(results);
    } catch (error) {
      console.error("Error comparing models:", error);
      
      // Log the error
      browserLog('comparison-error', {
        error: error.message,
        stack: error.stack
      });
      
      toast({
        title: "Error",
        description: "An error occurred while comparing models.",
        variant: "destructive",
      });
    } finally {
      setIsComparing(false);
    }
  };

  const handleRefresh = () => {
    // Reload the page to refresh everything
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Model Comparison</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsLogViewerOpen(true)}
            title="View Logs"
          >
            <ScrollText size={20} />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsMetricsVerifierOpen(true)}
            title="Verify Metrics"
          >
            <CheckSquare className="h-4 w-4 mr-1" />
            Verify
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsColorPickerOpen(true)}
            title="Customize Colors"
          >
            <Palette size={20} />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPostmanTesterOpen(true)}
            title="API Tester"
          >
            <Wrench className="h-4 w-4 mr-1" />
            API Test
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            title="Refresh Models"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Test Prompt</h2>
        <Textarea
                placeholder="Enter your test prompt here..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Select Models to Compare</h2>
              {enabledModels.length === 0 ? (
                <EmptyState
                  title="No Models Configured"
                  description="You need to add and enable models in the settings before you can compare them."
                  actionText="Open Settings"
                  onAction={() => setIsSettingsOpen(true)}
                  icon={<Settings2 size={48} />}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enabledModels.map((model) => (
                    <div key={model.id} className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id={`model-${model.id}`}
                        checked={selectedModelIds.includes(model.id)}
                        onCheckedChange={(checked) => 
                          handleModelToggle(model.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={`model-${model.id}`} className="flex-1">
                        {model.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
        <Button
          onClick={handleCompare}
                disabled={isComparing || selectedModelIds.length === 0 || prompt.trim() === ""}
        >
                {isComparing ? "Processing..." : "Compare Models"}
        </Button>
      </div>
          </div>
        </CardContent>
      </Card>

      {Object.keys(modelProgress).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(modelProgress).map(([modelId, progress]) => {
            const model = enabledModels.find(m => m.id === modelId);
            if (!model) return null;
            
            return (
              <ComparisonCard
                key={model.id}
                model={model.name}
                responseTime={progress.metrics?.responseTime || 0}
                tokensPerSecond={progress.metrics?.tokensPerSecond || 0}
                qualityScore={0}
                startTime={progress.startTime}
                isComplete={progress.isComplete}
                progress={progress.progress}
                totalTokens={progress.metrics?.totalTokens}
                promptTokens={progress.metrics?.promptTokens}
                completionTokens={progress.metrics?.completionTokens}
                processingTime={progress.metrics?.processingTime}
              />
            );
          })}
        </div>
      ) : (
        results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(result => (
          <ComparisonCard
                key={result.modelId}
                model={result.modelName}
            responseTime={result.responseTime}
            tokensPerSecond={result.tokensPerSecond}
                totalTokens={result.totalTokens}
                promptTokens={result.promptTokens}
                completionTokens={result.completionTokens}
                processingTime={result.processingTime}
                isComplete={true}
          />
        ))}
      </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Select models and enter a prompt to compare</p>
          </div>
        )
      )}

      {/* Performance Chart */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>
            Visualizing model performance over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performanceHistory.length > 0 ? (
            <AdvancedPerformanceChart
              data={performanceHistory}
              customColors={modelColors}
              selectedModels={enabledModels
                .filter(model => selectedModelIds.includes(model.id))
                .map(model => model.name)
              }
              isRealtime={isComparing}
            />
          ) : (
            <EmptyState
              title="No Performance Data"
              description="Run a comparison to see performance metrics visualized here."
              icon={<BarChart3 size={48} />}
            />
          )}
        </CardContent>
      </Card>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <ModelSettings 
              settings={settings}
              onSave={handleSettingsChange}
              onClose={() => setIsSettingsOpen(false)}
            />
          </div>
        </div>
      )}

      {isColorPickerOpen && (
        <ModelColorPicker
          isOpen={isColorPickerOpen}
          onClose={() => setIsColorPickerOpen(false)}
          models={enabledModels.map(model => ({ id: model.id, name: model.name }))}
          currentColors={modelColors}
          onColorChange={handleColorChange}
        />
      )}
      
      <LogViewer
        isOpen={isLogViewerOpen}
        onClose={() => setIsLogViewerOpen(false)}
      />
      
      {isMetricsVerifierOpen && (
        <MetricsVerifier 
          isOpen={isMetricsVerifierOpen} 
          onClose={() => setIsMetricsVerifierOpen(false)}
          selectedModels={enabledModels.map(m => m.name)}
        />
      )}
      
      <PostmanTester 
        isOpen={isPostmanTesterOpen} 
        onClose={() => setIsPostmanTesterOpen(false)} 
      />
    </div>
  );
}