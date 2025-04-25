import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { browserLog } from '@/lib/utils/logger';

// Predefined color palette
const COLOR_PALETTE = [
  // Vibrant colors
  '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55',
  // Pastel colors
  '#FFD3B6', '#FFAAA5', '#FF8B94', '#A8E6CF', '#DCEDC1', '#FFD3B6', '#D5C6E0', '#F7DBF0',
  // Dark colors
  '#1A1A1A', '#2C3E50', '#34495E', '#7F8C8D', '#8E44AD', '#2980B9', '#16A085', '#27AE60',
  // Light colors
  '#ECF0F1', '#BDC3C7', '#DAE1E7', '#D6EAF8', '#E8DAEF', '#FADBD8', '#F9EBEA', '#F5EEF8'
];

interface ModelColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  models: Array<{ id: string; name: string }>;
  currentColors: Record<string, string>;
  onColorChange: (modelId: string, color: string) => void;
}

export function ModelColorPicker({
  isOpen,
  onClose,
  models,
  currentColors,
  onColorChange
}: ModelColorPickerProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState('#000000');

  // Set initial selected model
  useEffect(() => {
    if (isOpen && models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
      
      // Find the current color for this model
      const model = models[0];
      const modelColor = currentColors[model.name] || '#000000';
      setCustomColor(modelColor);
      
      // Log the initial model selection
      browserLog('color-picker-init', {
        selectedModel: models[0].id,
        modelName: models[0].name,
        initialColor: modelColor,
        allModels: models.map(m => m.name),
        allColors: currentColors
      });
    }
  }, [isOpen, models, selectedModel, currentColors]);

  // Update custom color when selected model changes
  useEffect(() => {
    if (selectedModel) {
      const model = models.find(m => m.id === selectedModel);
      if (model) {
        const modelColor = currentColors[model.name] || '#000000';
        setCustomColor(modelColor);
        
        // Log the model selection change
        browserLog('color-picker-model-change', {
          selectedModel,
          modelName: model.name,
          color: modelColor
        });
      }
    }
  }, [selectedModel, models, currentColors]);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    const model = models.find(m => m.id === modelId);
    if (model) {
      const modelColor = currentColors[model.name] || '#000000';
      setCustomColor(modelColor);
      
      // Log the model selection
      browserLog('color-picker-select-model', {
        selectedModel: modelId,
        modelName: model.name,
        color: modelColor
      });
    }
  };

  const handleColorSelect = (color: string) => {
    if (selectedModel) {
      setCustomColor(color);
      onColorChange(selectedModel, color);
      
      // Log the color selection
      browserLog('color-picker-select-color', {
        selectedModel,
        color,
        modelName: models.find(m => m.id === selectedModel)?.name
      });
    }
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (selectedModel) {
      onColorChange(selectedModel, color);
      
      // Log the custom color change
      browserLog('color-picker-custom-color', {
        selectedModel,
        color,
        modelName: models.find(m => m.id === selectedModel)?.name
      });
    }
  };

  // Function to get the current color for a model
  const getModelColor = (modelId: string): string => {
    const model = models.find(m => m.id === modelId);
    if (!model) return '#000000';
    return currentColors[model.name] || '#000000';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Model Colors</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4 py-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="model-select">Select Model</Label>
            <div className="grid grid-cols-2 gap-2">
              {models.map((model) => (
                <Button
                  key={model.id}
                  variant={selectedModel === model.id ? "default" : "outline"}
                  onClick={() => handleModelSelect(model.id)}
                  className="justify-start overflow-hidden"
                >
                  <div 
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                    style={{ backgroundColor: getModelColor(model.id) }}
                  />
                  <span className="truncate">{model.name}</span>
                </Button>
              ))}
            </div>
          </div>
          
          {selectedModel && (
            <>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="color-palette">Color Palette</Label>
                <div className="grid grid-cols-8 gap-2">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        customColor === color ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Label htmlFor="custom-color">Custom Color</Label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-8 h-8 rounded-full border border-input" 
                    style={{ backgroundColor: customColor }}
                  />
                  <input
                    id="custom-color"
                    type="color"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    className="h-10 w-full"
                  />
                </div>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 