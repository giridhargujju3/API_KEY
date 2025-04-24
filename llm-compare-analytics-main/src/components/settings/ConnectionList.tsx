import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { OllamaConnectionForm } from "./OllamaConnectionForm";
import { ApiConnectionForm } from "./ApiConnectionForm";
import { OllamaEndpointConfig } from "@/lib/types/model-config";
import { ApiConfig, ApiProviderType, PROVIDER_DISPLAY_NAMES } from "@/lib/types/api-config";
import { ModelSettings } from "@/lib/model-service";

interface ConnectionListProps {
  settings: ModelSettings;
  onSave: (settings: ModelSettings) => void;
}

export function ConnectionList({ settings, onSave }: ConnectionListProps) {
  const [activeTab, setActiveTab] = useState<string>("ollama");
  const [editingOllama, setEditingOllama] = useState<OllamaEndpointConfig | null>(null);
  const [editingApi, setEditingApi] = useState<ApiConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleSaveOllama = (config: OllamaEndpointConfig) => {
    const newSettings = { ...settings };
    
    newSettings.ollama = {
      ...newSettings.ollama,
      [config.id]: config
    };
    
    onSave(newSettings);
    setEditingOllama(null);
    setIsAddingNew(false);
  };

  const handleSaveApi = (config: ApiConfig) => {
    const newSettings = { ...settings };
    
    newSettings.api = {
      ...newSettings.api,
      [config.id]: config
    };
    
    onSave(newSettings);
    setEditingApi(null);
    setIsAddingNew(false);
  };

  const handleDeleteConnection = (id: string, type: 'ollama' | 'api') => {
    const newSettings = { ...settings };
    
    if (type === 'ollama') {
      const { [id]: _, ...rest } = newSettings.ollama;
      newSettings.ollama = rest;
    } else {
      const { [id]: _, ...rest } = newSettings.api;
      newSettings.api = rest;
    }
    
    onSave(newSettings);
  };

  const handleToggleConnection = (id: string, enabled: boolean, type: 'ollama' | 'api') => {
    const newSettings = { ...settings };
    
    if (type === 'ollama') {
      const connection = settings.ollama[id];
      if (connection) {
        newSettings.ollama = {
          ...newSettings.ollama,
          [id]: { ...connection, enabled }
        };
      }
    } else {
      const connection = settings.api[id];
      if (connection) {
        newSettings.api = {
          ...newSettings.api,
          [id]: { ...connection, enabled }
        };
      }
    }
    
    onSave(newSettings);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    
    if (activeTab === "ollama") {
      setEditingOllama({
        id: `ollama-${Date.now()}`,
        name: "New Ollama Connection",
        enabled: true,
        provider: "ollama",
        baseUrl: "http://localhost:11434",
        modelName: "llama2"
      });
    } else {
      // Default to "together" as the API provider
      setEditingApi({
        id: `api-${Date.now()}`,
        name: "New API Connection",
        enabled: true,
        provider: "together",
        baseUrl: "https://api.together.xyz/v1",
        apiKey: "",
        modelName: "llama-2-70b-chat"
      });
    }
  };

  const renderConnectionsList = () => {
    if (isAddingNew) {
      if (activeTab === "ollama" && editingOllama) {
        return (
          <OllamaConnectionForm
            connection={editingOllama}
            onSubmit={handleSaveOllama}
            onCancel={() => {
              setEditingOllama(null);
              setIsAddingNew(false);
            }}
          />
        );
      } else if (activeTab === "api" && editingApi) {
        return (
          <ApiConnectionForm
            connection={editingApi}
            onSubmit={handleSaveApi}
            onCancel={() => {
              setEditingApi(null);
              setIsAddingNew(false);
            }}
          />
        );
      }
      return null;
    }

    if (activeTab === "ollama") {
      if (editingOllama) {
        return (
          <OllamaConnectionForm
            connection={editingOllama}
            onSubmit={handleSaveOllama}
            onCancel={() => setEditingOllama(null)}
          />
        );
      }

      const ollamaConnections = Object.values(settings.ollama || {});
      
      return (
        <div className="space-y-4">
          {ollamaConnections.length > 0 ? (
            ollamaConnections.map((connection) => (
              <Card key={connection.id} className="bg-background border-gray-800 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <Switch
                        checked={connection.enabled}
                        onCheckedChange={(checked) => handleToggleConnection(connection.id, checked, 'ollama')}
                      />
                      <span>{connection.name}</span>
                      <Badge variant={connection.enabled ? "default" : "secondary"} className="ml-2">
                        {connection.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingOllama(connection as OllamaEndpointConfig)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteConnection(connection.id, 'ollama')}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <div>URL: {connection.baseUrl}</div>
                    <div>Model: {connection.modelName}</div>
                    {connection.context_size && <div>Context Size: {connection.context_size}</div>}
                    {connection.threads && <div>Threads: {connection.threads}</div>}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No Ollama connections configured
            </div>
          )}
        </div>
      );
    } else {
      if (editingApi) {
        return (
          <ApiConnectionForm
            connection={editingApi}
            onSubmit={handleSaveApi}
            onCancel={() => setEditingApi(null)}
          />
        );
      }

      const apiConnections = Object.values(settings.api || {});
      
      return (
        <div className="space-y-4">
          {apiConnections.length > 0 ? (
            apiConnections.map((connection) => (
              <Card key={connection.id} className="bg-background border-gray-800 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <Switch
                        checked={connection.enabled}
                        onCheckedChange={(checked) => handleToggleConnection(connection.id, checked, 'api')}
                      />
                      <span>{connection.name}</span>
                      <Badge variant={connection.enabled ? "default" : "secondary"} className="ml-2">
                        {connection.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingApi(connection as ApiConfig)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteConnection(connection.id, 'api')}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <div>Provider: {PROVIDER_DISPLAY_NAMES[connection.provider as ApiProviderType]}</div>
                    <div>Model: {connection.modelName}</div>
                    <div>URL: {connection.baseUrl}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No API connections configured
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Model Connections</h2>
        {!isAddingNew && !editingOllama && !editingApi && (
          <Button onClick={handleAddNew}>
            Add Connection
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ollama">Ollama</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>
        <div className="mt-6">
          {renderConnectionsList()}
        </div>
      </Tabs>
    </div>
  );
}