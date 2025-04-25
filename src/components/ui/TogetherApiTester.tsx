import { useState } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { ScrollArea } from './scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { Copy, Send, Download } from 'lucide-react';
import { browserLog } from '@/lib/utils/logger';

interface TogetherApiTesterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TogetherApiTester({ isOpen, onClose }: TogetherApiTesterProps) {
  const [baseUrl, setBaseUrl] = useState('https://api.together.xyz/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('llama-2-70b-chat');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateCurl = () => {
    return `curl -X POST ${baseUrl}/chat/completions \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${apiKey}' \\
  -d '{
    "model": "${modelName}",
    "messages": [{"role": "user", "content": "Hello, how are you?"}],
    "temperature": 0.7,
    "max_tokens": 1024
  }'`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    browserLog('together-api-curl-copied', {
      timestamp: new Date().toISOString()
    });
  };

  const generatePostmanCollection = () => {
    const collection = {
      info: {
        name: "Together API Tests",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: "Chat Completion",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              },
              {
                key: "Authorization",
                value: `Bearer ${apiKey}`
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                model: modelName,
                messages: [{ role: "user", content: "Hello, how are you?" }],
                temperature: 0.7,
                max_tokens: 1024
              }, null, 2)
            },
            url: {
              raw: `${baseUrl}/chat/completions`,
              host: [baseUrl.replace(/^https?:\/\//, '')],
              path: ["chat", "completions"]
            }
          }
        }
      ]
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(collection, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "together_api_collection.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const testApi = async () => {
    setIsLoading(true);
    setResponse('');

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: "user", content: "Hello, how are you?" }],
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      const data = await response.json();
      setResponse(JSON.stringify(data, null, 2));

      browserLog('together-api-test-success', {
        timestamp: new Date().toISOString(),
        statusCode: response.status
      });
    } catch (error) {
      setResponse(`Error: ${error.message}`);
      browserLog('together-api-test-error', {
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
          <DialogTitle>Together API Tester</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="request">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request">Request Builder</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.together.xyz/v1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Together API key"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://api.together.xyz/settings/api-keys', '_blank')}
                  >
                    Get Key
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="llama-2-70b-chat"
                />
              </div>

              <div className="space-y-2">
                <Label>cURL Command</Label>
                <div className="relative">
                  <ScrollArea className="h-[100px] w-full rounded-md border p-4 font-mono text-sm">
                    {generateCurl()}
                  </ScrollArea>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={copyCurl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={generatePostmanCollection}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Postman Collection
                </Button>

                <Button onClick={testApi} disabled={isLoading}>
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? 'Testing...' : 'Test API'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="response">
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              {response ? (
                <pre className="text-sm whitespace-pre-wrap">{response}</pre>
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