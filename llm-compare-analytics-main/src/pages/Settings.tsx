import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { OllamaConnectionForm } from "@/components/settings/OllamaConnectionForm";
import { OllamaEndpointConfig } from "@/lib/types/model-config";
import { ComparisonService } from "@/lib/services/comparison-service";

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("ollama");
  const [configs, setConfigs] = useState<{
    ollama: OllamaEndpointConfig[];
  }>({
    ollama: []
  });
  const [editingConnection, setEditingConnection] = useState<OllamaEndpointConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    // First try to load from localStorage
    try {
      const savedSettings = localStorage.getItem("model-settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && parsed.ollama) {
          // Convert object to array if needed
          const ollamaConfigs = Array.isArray(parsed.ollama) 
            ? parsed.ollama 
            : Object.values(parsed.ollama);
          
          if (ollamaConfigs.length > 0) {
            setConfigs({
              ollama: ollamaConfigs
            });
            
            // Also update the service
            const service = ComparisonService.getInstance();
            service.updateConfigs({
              ollama: ollamaConfigs
            });
            
            return;
          }
        }
      }
    } catch (error) {
      console.error("Error loading settings from localStorage:", error);
    }
    
    // Fallback to service configs
    const service = ComparisonService.getInstance();
    const activeConfigs = service.getActiveConfigs();
    setConfigs({
      ollama: activeConfigs.ollama || []
    });
  }, []);

  const handleSaveConnection = (config: OllamaEndpointConfig) => {
    if (config.provider === "ollama") {
      const newConfigs = {
        ...configs,
        ollama: configs.ollama.filter(c => c.id !== config.id).concat(config)
      };
      setConfigs(newConfigs);
      
      // Update service configs
      const service = ComparisonService.getInstance();
      service.updateConfigs(newConfigs);
      
      // Save to localStorage
      localStorage.setItem("model-settings", JSON.stringify(newConfigs));
      
      toast({
        title: "Connection saved",
        description: `${config.name} has been saved successfully.`
      });
    }
    
    setEditingConnection(null);
    setIsAddingNew(false);
  };

  const handleDeleteConnection = (id: string, provider: string) => {
    if (provider === "ollama") {
      const newConfigs = {
        ...configs,
        ollama: configs.ollama.filter(c => c.id !== id)
      };
      setConfigs(newConfigs);
      
      // Update service configs
      const service = ComparisonService.getInstance();
      service.updateConfigs(newConfigs);
      
      // Save to localStorage
      localStorage.setItem("model-settings", JSON.stringify(newConfigs));
      
      toast({
        title: "Connection deleted",
        description: "The connection has been removed."
      });
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    
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

  const handleToggleConnection = (id: string, enabled: boolean) => {
    const connection = configs.ollama.find(c => c.id === id);
    if (connection) {
      const updatedConnection = { ...connection, enabled };
      const newConfigs = {
        ...configs,
        ollama: configs.ollama.map(c => c.id === id ? updatedConnection : c)
      };
      
      setConfigs(newConfigs);
      
      // Update service configs
      const service = ComparisonService.getInstance();
      service.updateConfigs(newConfigs);
      
      // Save to localStorage
      localStorage.setItem("model-settings", JSON.stringify(newConfigs));
      
      toast({
        title: enabled ? "Model Enabled" : "Model Disabled",
        description: `${connection.name} has been ${enabled ? "enabled" : "disabled"}.`
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
          {configs.ollama.map((connection) => (
            <Card key={connection.id} className="relative">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between">
                  <div className="flex items-center space-x-4">
                    <Switch
                      checked={connection.enabled}
                      onCheckedChange={(checked) => handleToggleConnection(connection.id, checked)}
                    />
                    <span>{connection.name}</span>
                    <Badge variant={connection.enabled ? "default" : "secondary"}>
                      {connection.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingConnection(connection)}
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
          {configs.ollama.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No Ollama connections configured
            </div>
          )}
        </TabsContent>
      </>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
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
    </div>
  );
} 