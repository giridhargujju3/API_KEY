import React, { useState, useEffect } from "react";
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
import { ApiConfig, ApiProviderType, AVAILABLE_MODELS, DEFAULT_API_CONFIGS, PROVIDER_DISPLAY_NAMES } from "@/lib/types/api-config";
import { ExternalLink } from "lucide-react";

interface ApiConnectionFormProps {
  connection?: Partial<ApiConfig>;
  onSubmit: (config: ApiConfig) => void;
  onCancel: () => void;
}

export function ApiConnectionForm({
  connection,
  onSubmit,
  onCancel,
}: ApiConnectionFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(connection?.name || "");
  const [provider, setProvider] = useState<ApiProviderType>(connection?.provider || "openai");
  const [apiKey, setApiKey] = useState(connection?.apiKey || "");
  const [baseUrl, setBaseUrl] = useState(connection?.baseUrl || "");
  const [modelName, setModelName] = useState(connection?.modelName || "");
  const [temperature, setTemperature] = useState(connection?.temperature?.toString() || "0.7");
  const [maxTokens, setMaxTokens] = useState(connection?.maxTokens?.toString() || "1024");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Update form when provider changes
  useEffect(() => {
    const defaultConfig = DEFAULT_API_CONFIGS[provider];
    setBaseUrl(defaultConfig.baseUrl || "");
    // Only set a default model if modelName is empty or when provider changes
    if (!modelName || !connection?.modelName) {
      const defaultModel = defaultConfig.modelName;
      setModelName(defaultModel || "");
    }
  }, [provider]);

  // Update modelName when a custom model is entered
  useEffect(() => {
    if (isCustomModel && customModelName) {
      setModelName(customModelName);
    }
  }, [isCustomModel, customModelName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name) {
      setError("Connection name is required");
      return;
    }
    
    if (!apiKey) {
      setError("API key is required");
      return;
    }

    if (!baseUrl) {
      setError("Base URL is required");
      return;
    }

    if (!modelName) {
      setError("Model name is required");
      return;
    }

    // Create the API config
    const apiConfig: ApiConfig = {
      id: connection?.id || crypto.randomUUID(),
      name,
      enabled: connection?.enabled ?? true,
      provider,
      apiKey,
      baseUrl,
      modelName,
      temperature: parseFloat(temperature || "0.7"),
      maxTokens: parseInt(maxTokens || "1024"),
    };

    // Add provider-specific fields
    if (provider === 'openai' && 'organization' in connection) {
      (apiConfig as any).organization = connection.organization;
    } else if (provider === 'google' && 'projectId' in connection) {
      (apiConfig as any).projectId = connection.projectId;
    } else if (provider === 'anthropic' && 'version' in connection) {
      (apiConfig as any).version = connection.version;
    } else if (provider === 'custom' && 'headers' in connection) {
      (apiConfig as any).headers = connection.headers;
      (apiConfig as any).requestFormat = connection.requestFormat || 'openai';
    }

    onSubmit(apiConfig);
  };

  const handleProviderChange = (value: string) => {
    setProvider(value as ApiProviderType);
    const defaultConfig = DEFAULT_API_CONFIGS[value as ApiProviderType];
    setBaseUrl(defaultConfig.baseUrl || "");
    
    // Reset model selection
    setModelName(defaultConfig.modelName || "");
    setIsCustomModel(false);
    setCustomModelName("");
  };

  const handleModelChange = (value: string) => {
    if (value === "custom") {
      setIsCustomModel(true);
      setModelName("");
    } else {
      setIsCustomModel(false);
      setModelName(value);
    }
  };

  const getApiKeyPlaceholder = () => {
    switch (provider) {
      case 'openai': return 'sk-...';
      case 'google': return 'AIza...';
      case 'anthropic': return 'sk-ant-...';
      case 'together': return 'tok_...';
      case 'mistral': return 'mis_...';
      default: return 'Your API key';
    }
  };

  const getApiKeyLink = () => {
    switch (provider) {
      case 'openai': return 'https://platform.openai.com/api-keys';
      case 'google': return 'https://ai.google.dev/';
      case 'anthropic': return 'https://console.anthropic.com/settings/keys';
      case 'together': return 'https://api.together.xyz/settings/api-keys';
      case 'mistral': return 'https://console.mistral.ai/api-keys/';
      default: return null;
    }
  };

  const apiKeyLink = getApiKeyLink();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-4 py-2 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Connection Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My API Connection"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider">API Provider</Label>
        <Select value={provider} onValueChange={handleProviderChange}>
          <SelectTrigger id="provider">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROVIDER_DISPLAY_NAMES).map(([key, value]) => (
              <SelectItem key={key} value={key}>{value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="apiKey">API Key</Label>
          {apiKeyLink && (
            <a 
              href={apiKeyLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-500 dark:text-blue-400 flex items-center hover:underline"
            >
              Get API Key <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          )}
        </div>
        <Input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={getApiKeyPlaceholder()}
          required
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="baseUrl">Base URL</Label>
        <Input
          id="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="API endpoint URL"
          required
        />
        <p className="text-xs text-muted-foreground">
          The base URL for the API (usually you can keep the default)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select 
          value={isCustomModel ? "custom" : modelName} 
          onValueChange={handleModelChange}
        >
          <SelectTrigger id="model">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_MODELS[provider].map(model => (
              <SelectItem key={model} value={model}>{model}</SelectItem>
            ))}
            <SelectItem value="custom">Custom Model...</SelectItem>
          </SelectContent>
        </Select>
        
        {isCustomModel && (
          <div className="mt-2">
            <Input
              value={customModelName}
              onChange={(e) => setCustomModelName(e.target.value)}
              placeholder="Enter custom model name"
              className="mt-2"
            />
          </div>
        )}
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
            placeholder="1024"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-8">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {connection?.id ? "Update" : "Add"} Connection
        </Button>
      </div>
    </form>
  );
}