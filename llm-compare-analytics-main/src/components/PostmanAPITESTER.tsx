import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Copy, Send, Download, ExternalLink } from 'lucide-react';
import { browserLog } from '@/lib/utils/logger';

interface PostmanTesterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PostmanTester({ isOpen, onClose }: PostmanTesterProps) {
  const [baseUrl, setBaseUrl] = useState('https://api.together.xyz/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('llama-2-70b-chat');
  const [content, setContent] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate cURL command
  const generateCurl = () => {
    const curlCommand = `curl -X POST ${baseUrl}/chat/completions \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${apiKey}' \\
  -d '{
    "model": "${modelName}",
    "messages": [{"role": "user", "content": "${content.replace(/"/g, '\\"')}"}],
    "temperature": 0.7,
    "max_tokens": 1024
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

  // Generate Postman collection
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
                messages: [{ role: "user", content }],
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

  // Test the API
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
          messages: [{ role: "user", content }],
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-red-500">Together API</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="request" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request">Request Builder</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-red-500">Base URL</Label>
                <Input 
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <Label className="text-red-500">API Key</Label>
                  <a 
                    href="https://api.together.xyz/settings/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                  >
                    Get Key
                    <ExternalLink size={14} />
                  </a>
                </div>
                <Input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-red-500">Model Name</Label>
                <Input 
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-red-500">Content</Label>
                <Textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 min-h-[100px]"
                />
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-red-500">cURL Command</Label>
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
                  Test API
                </Button>
              </div>
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-red-500">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}