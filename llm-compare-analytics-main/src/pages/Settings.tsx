import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ConnectionList } from "@/components/settings/ConnectionList";
import { OllamaEndpointConfig } from "@/lib/types/model-config";
import { ApiConfig } from "@/lib/types/api-config";
import { ComparisonService } from "@/lib/services/comparison-service";
import { ModelSettings } from "@/lib/model-service";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ModelSettings>({
    ollama: {},
    api: {}
  });

  useEffect(() => {
    // First try to load from localStorage
    try {
      const savedSettings = localStorage.getItem("model-settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        
        // Ensure we have both ollama and api objects
        const validatedSettings: ModelSettings = {
          ollama: parsed.ollama || {},
          api: parsed.api || {}
        };
        
        setSettings(validatedSettings);
        
        // Convert object structures to arrays for the service
        const ollamaConfigs = Object.values(validatedSettings.ollama);
        const apiConfigs = Object.values(validatedSettings.api);
        
        // Update the service configs
        const service = ComparisonService.getInstance();
        service.updateConfigs({
          ollama: ollamaConfigs as OllamaEndpointConfig[],
          api: apiConfigs as ApiConfig[]
        });
      }
    } catch (error) {
      console.error("Error loading settings from localStorage:", error);
    }
  }, []);

  const handleSettingsChange = (newSettings: ModelSettings) => {
    // Ensure the settings have the correct structure
    const validatedSettings: ModelSettings = {
      ollama: newSettings.ollama || {},
      api: newSettings.api || {}
    };
    
    // Update the state
    setSettings(validatedSettings);
    
    // Save to localStorage
    localStorage.setItem("model-settings", JSON.stringify(validatedSettings));
    
    // Convert object structures to arrays for the service
    const ollamaConfigs = Object.values(validatedSettings.ollama);
    const apiConfigs = Object.values(validatedSettings.api);
    
    // Update the service
    const service = ComparisonService.getInstance();
    service.updateConfigs({
      ollama: ollamaConfigs as OllamaEndpointConfig[],
      api: apiConfigs as ApiConfig[]
    });
    
    toast({
      title: "Settings saved",
      description: "Your model settings have been saved."
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <Card className="bg-background border-gray-800">
          <CardContent className="pt-6">
            <ConnectionList 
              settings={settings}
              onSave={handleSettingsChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}