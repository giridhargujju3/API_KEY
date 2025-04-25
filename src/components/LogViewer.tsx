import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Card, CardContent } from './ui/card';
import { getBrowserLogs, clearBrowserLogs, LoggableData } from '@/lib/utils/logger';
import { Search, Download, Trash2, RefreshCw, Clock, Filter } from 'lucide-react';

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

type LogCategory = 'all' | 'metrics' | 'chart' | 'model' | 'error' | 'other';

interface LogEntry {
  key: string;
  timestamp: string;
  category: LogCategory;
  data: LoggableData;
}

export function LogViewer({ isOpen, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<Record<string, LoggableData>>({});
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LogCategory>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Function to determine log category
  const getLogCategory = useCallback((key: string): LogCategory => {
    if (key.includes('metrics') || key.includes('token')) return 'metrics';
    if (key.includes('chart') || key.includes('graph')) return 'chart';
    if (key.includes('model') || key.includes('ollama') || key.includes('comparison')) return 'model';
    if (key.includes('error')) return 'error';
    return 'other';
  }, []);

  // Function to process and filter logs
  const processLogs = useCallback(() => {
    const entries: LogEntry[] = Object.entries(logs).map(([key, value]) => {
      // Extract timestamp from the log data or from the key
      let timestamp = '';
      if (typeof value === 'object' && value !== null && 'timestamp' in value) {
        timestamp = String(value.timestamp);
      } else {
        // Try to extract timestamp from key (format: key-timestamp)
        const matches = key.match(/-(\d+)$/);
        if (matches && matches[1]) {
          timestamp = new Date(parseInt(matches[1])).toISOString();
        } else {
          timestamp = new Date().toISOString();
        }
      }

      return {
        key,
        timestamp,
        category: getLogCategory(key),
        data: value
      };
    });

    // Apply category filter
    let filtered = entries;
    if (selectedCategory !== 'all') {
      filtered = entries.filter(entry => entry.category === selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.key.toLowerCase().includes(query) || 
        JSON.stringify(entry.data).toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredLogs(filtered);
  }, [logs, searchQuery, selectedCategory, sortOrder, getLogCategory]);

  // Load logs when the component opens
  useEffect(() => {
    if (isOpen) {
      refreshLogs();
    }
  }, [isOpen]);

  // Process logs whenever they change or filters change
  useEffect(() => {
    processLogs();
  }, [processLogs]);

  // Function to refresh logs
  const refreshLogs = () => {
    setLogs(getBrowserLogs());
  };

  // Function to clear logs
  const handleClearLogs = () => {
    clearBrowserLogs();
    setLogs({});
  };

  // Function to download logs as JSON
  const handleDownloadLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `llm-comparison-logs-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Function to format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  // Function to get category color
  const getCategoryColor = (category: LogCategory) => {
    switch (category) {
      case 'metrics': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'chart': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'model': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Log Viewer</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4">
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={refreshLogs}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearLogs}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadLogs}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 w-[200px]"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as LogCategory)}>
                <SelectTrigger className="h-9 w-[130px]">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="metrics">Metrics</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="model">Model</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'newest' | 'oldest')}>
                <SelectTrigger className="h-9 w-[120px]">
                  <Clock className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {Object.keys(logs).length} logs
          </div>
          
          <ScrollArea className="h-[500px] border rounded-md">
            <div className="p-4 space-y-4">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <Card key={log.key} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="font-medium truncate flex-1">{log.key}</div>
                        <div className={`px-2 py-0.5 rounded-full text-xs ${getCategoryColor(log.category)}`}>
                          {log.category}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded-md overflow-x-auto">
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  {Object.keys(logs).length === 0 
                    ? "No logs available. Run a comparison to generate logs." 
                    : "No logs match your current filters."}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 