import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { getBrowserLogs, LoggableData, browserLog } from '@/lib/utils/logger';
import { AlertCircle, CheckCircle2, RefreshCw, Download } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { formatProcessingTime, formatResponseTime } from '@/lib/utils/time-format';

interface MetricsVerifierProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModels?: string[];
}

interface MetricResult {
  model: string;
  timestamp: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  processingTime: number;
  responseTime: number;
  reportedTokensPerSecond: number;
  expectedTokensPerSecond: number;
  tokenRateAccuracy: string;
  isAccurate: boolean;
  rawStats?: Record<string, unknown>;
  logKey: string;
}

export function MetricsVerifier({ isOpen, onClose, selectedModels = [] }: MetricsVerifierProps) {
  const [verificationResults, setVerificationResults] = useState<Record<string, MetricResult>>({});
  const [rawLogs, setRawLogs] = useState<Record<string, LoggableData>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  
  const verifyMetrics = useCallback(() => {
    setIsVerifying(true);
    
    const logs = getBrowserLogs();
    setRawLogs(logs);
    
    const results: Record<string, MetricResult> = {};
    
    // Find all model completion logs from the last 30 seconds
    const now = Date.now();
    const relevantLogs = Object.entries(logs)
      .filter(([key, value]) => {
        if (!key.startsWith('completion-')) return false;
        const logData = value as Record<string, unknown>;
        if (typeof logData !== 'object' || !logData || !('timestamp' in logData)) return false;
        const logTime = new Date(String(logData.timestamp)).getTime();
        return (now - logTime) < 30000; // Within last 30 seconds
      })
      .map(([key, value]) => {
        const logData = value as Record<string, unknown>;
        
        // Extract model name
        const modelName = String(logData.model || '');
        
        // Skip if not in selected models
        if (selectedModels.length > 0 && !selectedModels.includes(modelName)) {
          return null;
        }
        
        return {
          key,
          model: modelName,
          timestamp: String(logData.timestamp || new Date().toISOString()),
          totalTokens: Number(logData.totalTokens || 0),
          promptTokens: Number(logData.promptTokens || 0),
          completionTokens: Number(logData.completionTokens || 0),
          processingTime: Number(logData.processingTime || 0),
          responseTime: Number(logData.responseTime || 0),
          tokensPerSecond: Number(logData.tokensPerSecond || 0),
          rawStats: logData.rawStats as Record<string, unknown> || {}
        };
      })
      .filter((log): log is NonNullable<typeof log> => log !== null);
    
    if (relevantLogs.length === 0) {
      results['no-data'] = {
        model: 'No Data Available',
        timestamp: new Date().toISOString(),
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        processingTime: 0,
        responseTime: 0,
        reportedTokensPerSecond: 0,
        expectedTokensPerSecond: 0,
        tokenRateAccuracy: 'N/A',
        isAccurate: false,
        rawStats: { message: 'No recent completion logs found. Run a comparison first.' },
        logKey: 'no-data'
      };
      
      setVerificationResults(results);
      setIsVerifying(false);
      return;
    }
    
    // Group logs by model and take the most recent for each
    const modelGroups = new Map<string, typeof relevantLogs[0]>();
    relevantLogs.forEach(log => {
      const existing = modelGroups.get(log.model);
      if (!existing || new Date(log.timestamp) > new Date(existing.timestamp)) {
        modelGroups.set(log.model, log);
      }
    });
    
    // Process each model's metrics
    modelGroups.forEach(log => {
      let expectedTokensPerSecond = 0;
      
      // Calculate expected tokens per second based on completion tokens and processing time
      if (log.completionTokens > 0 && log.processingTime > 0) {
        expectedTokensPerSecond = log.completionTokens / (log.processingTime);
      }
      
      const reportedTokensPerSecond = log.tokensPerSecond;
      const tokenRateAccuracy = expectedTokensPerSecond > 0 && reportedTokensPerSecond > 0
        ? (reportedTokensPerSecond / expectedTokensPerSecond) * 100 
        : 0;
      
      results[log.key] = {
        model: log.model,
        timestamp: log.timestamp,
        totalTokens: log.totalTokens,
        promptTokens: log.promptTokens,
        completionTokens: log.completionTokens,
        processingTime: log.processingTime,
        responseTime: log.responseTime,
        reportedTokensPerSecond,
        expectedTokensPerSecond,
        tokenRateAccuracy: `${tokenRateAccuracy.toFixed(2)}%`,
        isAccurate: Math.abs(tokenRateAccuracy - 100) < 10, // Allow 10% variance
        rawStats: log.rawStats,
        logKey: log.key
      };
    });
    
    setVerificationResults(results);
    setIsVerifying(false);
  }, [selectedModels]);
  
  // Auto-verify when opened
  useEffect(() => {
    if (isOpen) {
      verifyMetrics();
    }
  }, [isOpen, verifyMetrics]);
  
  const downloadLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rawLogs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `llm-metrics-logs-${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    browserLog('metrics-logs-downloaded', {
      timestamp: new Date().toISOString(),
      logCount: Object.keys(rawLogs).length
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Metrics Verification</DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-between mb-4">
          <Button onClick={verifyMetrics} disabled={isVerifying}>
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Metrics
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={downloadLogs}>
            <Download className="h-4 w-4 mr-2" />
            Download Logs
          </Button>
        </div>
        
        <Tabs defaultValue="results">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results">Verification Results</TabsTrigger>
            <TabsTrigger value="raw">Raw Log Data</TabsTrigger>
          </TabsList>
          
          <TabsContent value="results">
            <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/20 h-[500px]">
              {Object.keys(verificationResults).length > 0 ? (
                <div className="space-y-6">
                  {Object.values(verificationResults).map((result, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{result.model}</h3>
                          {result.isAccurate ? 
                            <CheckCircle2 className="text-green-500" size={18} /> : 
                            <AlertCircle className="text-amber-500" size={18} />
                          }
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="text-sm">Total Tokens:</div>
                          <div className="text-sm font-medium">{result.totalTokens}</div>
                          
                          <div className="text-sm">Prompt Tokens:</div>
                          <div className="text-sm font-medium">{result.promptTokens}</div>
                          
                          <div className="text-sm">Completion Tokens:</div>
                          <div className="text-sm font-medium">{result.completionTokens}</div>
                          
                          <div className="text-sm">Processing Time:</div>
                          <div className="text-sm font-medium">{formatProcessingTime(result.processingTime)}</div>
                          
                          <div className="text-sm">Response Time:</div>
                          <div className="text-sm font-medium">{formatResponseTime(result.responseTime)}</div>
                          
                          <div className="text-sm">Reported Tokens/Second:</div>
                          <div className="text-sm font-medium">{result.reportedTokensPerSecond.toFixed(2)}</div>
                          
                          <div className="text-sm">Expected Tokens/Second:</div>
                          <div className="text-sm font-medium">{result.expectedTokensPerSecond.toFixed(2)}</div>
                          
                          <div className="text-sm">Accuracy:</div>
                          <div className={`text-sm font-medium ${result.isAccurate ? 'text-green-500' : 'text-amber-500'}`}>
                            {result.tokenRateAccuracy}
                          </div>
                        </div>
                        
                        {result.rawStats && Object.keys(result.rawStats).length > 0 && (
                          <div className="mt-4">
                            <details>
                              <summary className="text-sm font-medium cursor-pointer">Raw Stats</summary>
                              <pre className="text-xs mt-2 p-2 bg-muted rounded-md overflow-x-auto">
                                {JSON.stringify(result.rawStats, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  {isVerifying ? 'Verifying metrics...' : 'No metrics data available. Run a comparison first.'}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="raw">
            <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/20 h-[500px]">
              <div className="space-y-4">
                {Object.entries(rawLogs)
                  .filter(([key]) => key.startsWith('completion-') || key.startsWith('model-result-'))
                  .map(([key, value], index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-4">
                        <h3 className="text-sm font-semibold mb-2">{key}</h3>
                        <pre className="text-xs p-2 bg-muted rounded-md overflow-x-auto">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                
                {Object.entries(rawLogs).filter(([key]) => 
                  key.startsWith('completion-') || key.startsWith('model-result-')).length === 0 && (
                  <div className="text-center py-4">
                    No completion logs found. Run a comparison first.
                  </div>
                )}
              </div>
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