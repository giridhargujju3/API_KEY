import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ConnectionList } from "./settings/ConnectionList";
import { ModelSettings as ModelSettingsType } from "@/lib/model-service";

interface ModelSettingsProps {
  settings: ModelSettingsType;
  onSave: (settings: ModelSettingsType) => void;
  onClose: () => void;
}

export function ModelSettings({ settings, onSave, onClose }: ModelSettingsProps) {
  const [localSettings, setLocalSettings] = useState<ModelSettingsType>(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Model Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ConnectionList 
          settings={localSettings}
          onSave={setLocalSettings}
        />
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 