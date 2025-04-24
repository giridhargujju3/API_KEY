import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OllamaConnectionForm } from "./OllamaConnectionForm";
import { OllamaEndpointConfig } from "@/lib/types/model-config";
import { ModelSettings } from "@/lib/model-service";

interface ConnectionListProps {
  settings: ModelSettings;
  onSave: (settings: ModelSettings) => void;
}

export function ConnectionList({ settings, onSave }: ConnectionListProps) {
  const [activeTab, setActiveTab] = useState<string>("ollama");
  const [editingConnection, setEditingConnection] = useState<OllamaEndpointConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleSaveConnection = (config: OllamaEndpointConfig) => {
    const newSettings = { ...settings };
    
    // Update Ollama connections
    if (config.provider === "ollama") {
      newSettings.ollama = {
        ...newSettings.ollama,
        [config.id]: config
      };
    }
    
    onSave(newSettings);
    setEditingConnection(null);
    setIsAddingNew(false);
  };

  const handleDeleteConnection = (id: string, provider: string) => {
    const newSettings = { ...settings };
    
    if (provider === "ollama") {
      const { [id]: _, ...rest } = newSettings.ollama;
      newSettings.ollama = rest;
    }
    
    onSave(newSettings);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    
    // Create a new connection based on the active tab
    if (activeTab === "ollama") {
      setEditingConnection({
        id: `ollama-${Date.now()}`,
        name: "New Ollama Connection",
        enabled: true,
        provider: "ollama",
        baseUrl: "http://localhost:11434",
        modelName: "llama2"
      });
    }
  };

  const renderConnectionList = () => {
    if (isAddingNew || editingConnection) {
      if (activeTab === "ollama" && editingConnection?.provider === "ollama") {
        return (
          <OllamaConnectionForm
            connection={editingConnection}
            onSubmit={handleSaveConnection}
            onCancel={() => {
              setEditingConnection(null);
              setIsAddingNew(false);
            }}
          />
        );
      }
      return null;
    }

    return (
      <>
        <TabsContent value="ollama" className="space-y-4">
          {Object.values(settings.ollama || {}).map((connection) => (
            <Card key={connection.id} className="relative">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between">
                  <span>{connection.name}</span>
                  <div className="space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingConnection(connection as OllamaEndpointConfig)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConnection(connection.id, "ollama")}
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
                </div>
              </CardContent>
            </Card>
          ))}
          {Object.keys(settings.ollama || {}).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No Ollama connections configured
            </div>
          )}
        </TabsContent>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Model Connections</h2>
        {!isAddingNew && !editingConnection && (
          <Button onClick={handleAddNew}>Add Connection</Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="ollama">Ollama</TabsTrigger>
        </TabsList>
        {renderConnectionList()}
      </Tabs>
    </div>
  );
} 