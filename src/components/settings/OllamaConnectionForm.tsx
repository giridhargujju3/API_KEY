import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OllamaEndpointConfig } from "@/lib/types/model-config";
import { OllamaService } from "@/lib/services/ollama-service";

interface OllamaConnectionFormProps {
  connection?: OllamaEndpointConfig;
  onSubmit: (config: OllamaEndpointConfig) => void;
  onCancel: () => void;
}

export function OllamaConnectionForm({
  connection,
  onSubmit,
  onCancel,
}: OllamaConnectionFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(connection?.name || "");
  const [baseUrl, setBaseUrl] = useState(connection?.baseUrl || "http://localhost:11434");
  const [modelName, setModelName] = useState(connection?.modelName || "");
  const [contextSize, setContextSize] = useState(connection?.context_size?.toString() || "4096");
  const [threads, setThreads] = useState(connection?.threads?.toString() || "");
  const [temperature, setTemperature] = useState(connection?.temperature?.toString() || "0.7");
  const [maxTokens, setMaxTokens] = useState(connection?.maxTokens?.toString() || "2048");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (baseUrl) {
      loadModels();
    }
  }, [baseUrl]);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const service = new OllamaService({
        id: connection?.id || "temp",
        name: "temp",
        enabled: true,
        provider: 'ollama',
        baseUrl,
        modelName: "temp",
      });
      const models = await service.listModels();
      setAvailableModels(models);
      if (models.length === 0) {
        setError("No models found. Make sure Ollama is running and has models installed.");
      }
    } catch (error) {
      console.error("Failed to load models:", error);
      setError("Failed to connect to Ollama server. Please check the URL and make sure Ollama is running.");
      toast({
        title: "Connection Error",
        description: "Failed to connect to Ollama server. Please check the URL and make sure Ollama is running.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: connection?.id || crypto.randomUUID(),
      name,
      enabled: connection?.enabled ?? true,
      provider: 'ollama',
      baseUrl,
      modelName,
      context_size: contextSize ? parseInt(contextSize) : undefined,
      threads: threads ? parseInt(threads) : undefined,
      temperature: temperature ? parseFloat(temperature) : undefined,
      maxTokens: maxTokens ? parseInt(maxTokens) : undefined,
    });
  };

  const testConnection = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const service = new OllamaService({
        id: connection?.id || "temp",
        name: "temp",
        enabled: true,
        provider: 'ollama',
        baseUrl,
        modelName: modelName || "temp",
      });
      await service.listModels();
      toast({
        title: "Connection Successful",
        description: "Successfully connected to Ollama server.",
      });
    } catch (error) {
      console.error("Failed to test connection:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Ollama server. Please check the URL and make sure Ollama is running.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Connection Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Ollama Connection"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="baseUrl">Base URL</Label>
        <div className="flex space-x-2">
          <Input
            id="baseUrl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434"
            required
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={testConnection}
            disabled={isLoading}
          >
            {isLoading ? "Testing..." : "Test"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          The URL where your Ollama instance is running
        </p>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select value={modelName} onValueChange={setModelName} required>
          <SelectTrigger id="model" className="flex-1">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="loading" disabled>
                Loading models...
              </SelectItem>
            ) : availableModels.length === 0 ? (
              <SelectItem value="none" disabled>
                No models found
              </SelectItem>
            ) : (
              availableModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contextSize">Context Size</Label>
          <Input
            id="contextSize"
            type="number"
            value={contextSize}
            onChange={(e) => setContextSize(e.target.value)}
            placeholder="4096"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="threads">Threads</Label>
          <Input
            id="threads"
            type="number"
            value={threads}
            onChange={(e) => setThreads(e.target.value)}
            placeholder="Auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="temperature">Temperature</Label>
          <Input
            id="temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="0.7"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            placeholder="2048"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {connection ? "Update" : "Add"} Connection
        </Button>
      </div>
    </form>
  );
} 