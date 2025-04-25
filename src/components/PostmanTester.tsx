import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Copy, Send, Download } from 'lucide-react';
import { browserLog } from '@/lib/utils/logger';

interface PostmanTesterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PostmanTester({ isOpen, onClose }: PostmanTesterProps) {
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [modelName, setModelName] = useState('llama2');
  const [prompt, setPrompt] = useState('Write a short story');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('2048');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Generate Postman collection
  const generatePostmanCollection = () => {
    const collection = {
      info: {
        name: "Ollama API Tests",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: "Generate Completion",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                model: modelName,
                prompt: prompt,
                stream: false,
                options: {
                  temperature: parseFloat(temperature),
                  num_predict: parseInt(maxTokens),
                }
              }, null, 2)
            },
            url: {
              raw: `${baseUrl}/api/generate`,
              host: [baseUrl.replace(/^https?:\/\//, '')],
              path: ["api", "generate"]
            }
          }
        },
        {
          name: "List Models",
          request: {
            method: "GET",
            url: {
              raw: `${baseUrl}/api/tags`,
              host: [baseUrl.replace(/^https?:\/\//, '')],
              path: ["api", "tags"]
            }
          }
        }
      ]
    };
    
    // Create a download link
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(collection, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ollama_collection.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    browserLog('postman-collection-generated', {
      timestamp: new Date().toISOString(),
      baseUrl,
      modelName
    });
  };
  
  // Generate cURL command
  const generateCurl = () => {
    const curlCommand = `curl -X POST ${baseUrl}/api/generate \\
  -H 'Content-Type: application/json' \\
  -d '{
    "model": "${modelName}",
    "prompt": "${prompt.replace(/"/g, '\\"')}",
    "stream": false,
    "options": {
      "temperature": ${parseFloat(temperature)},
      "num_predict": ${parseInt(maxTokens)}
    }
  }'`;
    
    return curlCommand;
  };
  
  // Copy cURL to clipboard
  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    browserLog('curl-command-copied', {
      timestamp: new Date().toISOString(),
      command: generateCurl()
    });
  };
  
  // Test the API
  const testApi = async () => {
    setIsLoading(true);
    setResponse('');
    
    try {
      const startTime = performance.now();
      
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: false,
          options: {
            temperature: parseFloat(temperature),
            num_predict: parseInt(maxTokens),
          }
        }),
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Format the response
      const formattedResponse = JSON.stringify(data, null, 2);
      setResponse(formattedResponse);
      
      // Log the response
      browserLog('api-test-response', {
        timestamp: new Date().toISOString(),
        responseTime,
        data
      });
    } catch (error) {
      setResponse(`Error: ${error.message}`);
      
      // Log the error
      browserLog('api-test-error', {
        timestamp: new Date().toISOString(),
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>API Request Tester</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="request">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request">Request Builder</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>
          
          <TabsContent value="request" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input 
                  id="base-url" 
                  value={baseUrl} 
                  onChange={(e) => setBaseUrl(e.target.value)} 
                  placeholder="http://localhost:11434"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model-name">Model Name</Label>
                <Input 
                  id="model-name" 
                  value={modelName} 
                  onChange={(e) => setModelName(e.target.value)} 
                  placeholder="llama2"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea 
                id="prompt" 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder="Enter your prompt here"
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input 
                  id="temperature" 
                  value={temperature} 
                  onChange={(e) => setTemperature(e.target.value)} 
                  placeholder="0.7"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Input 
                  id="max-tokens" 
                  value={maxTokens} 
                  onChange={(e) => setMaxTokens(e.target.value)} 
                  placeholder="2048"
                  type="number"
                  min="1"
                />
              </div>
            </div>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">cURL Command</h3>
                  <Button variant="outline" size="sm" onClick={copyCurl}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <ScrollArea className="h-[100px] w-full rounded-md border p-2 bg-muted/20">
                  <pre className="text-xs whitespace-pre-wrap">{generateCurl()}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={generatePostmanCollection}>
                <Download className="h-4 w-4 mr-1" />
                Download Postman Collection
              </Button>
              
              <Button onClick={testApi} disabled={isLoading}>
                <Send className="h-4 w-4 mr-1" />
                {isLoading ? 'Testing...' : 'Test API'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="response">
            <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/20">
              {response ? (
                <pre className="text-xs whitespace-pre-wrap">{response}</pre>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No response yet. Test the API to see results.
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 