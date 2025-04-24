import { useState, useMemo } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Brush, ReferenceLine, Label, Scatter
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label as UILabel } from './ui/label';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { useTheme } from '../hooks/useTheme';
import { getChartStyles } from '../lib/utils/chart-utils';
import { browserLog } from '../lib/utils/logger';
import { 
  BarChart3, LineChart as LineChartIcon, PieChart, Activity, 
  ZoomIn, ZoomOut, RefreshCw, Download, Maximize2, Bug
} from 'lucide-react';

// Define the data point structure
export interface PerformanceDataPoint {
  timestamp: string;
  [key: string]: number | string | null;
}

// Define the chart props
interface AdvancedPerformanceChartProps {
  data: PerformanceDataPoint[];
  customColors: Record<string, string>;
  selectedModels: string[];
  className?: string;
  isRealtime?: boolean; // Flag to indicate if this is real-time data or final data
}

// Define the available metrics
type MetricType = 'tokensPerSecond' | 'totalTokens' | 'responseTime' | 'processingTime';

export function AdvancedPerformanceChart({
  data,
  customColors,
  selectedModels,
  className = '',
  isRealtime = false
}: AdvancedPerformanceChartProps) {
  const { isDarkMode } = useTheme();
  const styles = getChartStyles(isDarkMode);
  const [metricType, setMetricType] = useState<MetricType>('tokensPerSecond');
  const [smoothing, setSmoothing] = useState(55);
  const [showDataPoints, setShowDataPoints] = useState(false);
  const [syncedTooltip, setSyncedTooltip] = useState(true);
  const [zoomRange, setZoomRange] = useState([0, 100]);
  
  // Process data for continuous lines with better interpolation
  const processedData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Get all model keys except timestamp
    let modelKeys = Object.keys(data[0]).filter(key => key !== 'timestamp');
    
    // Filter by selected models if provided
    if (selectedModels.length > 0) {
      modelKeys = modelKeys.filter(key => selectedModels.includes(key));
    }
    
    // If we only have one data point, duplicate it to create a line
    if (data.length === 1) {
      const firstPoint = data[0];
      const secondPoint = { ...firstPoint };
      
      // Create a timestamp 100ms after the first point
      const firstTime = new Date(firstPoint.timestamp).getTime();
      secondPoint.timestamp = new Date(firstTime + 100).toISOString();
      
      return [firstPoint, secondPoint];
    }
    
    // Create continuous data points with proper interpolation
    const points: PerformanceDataPoint[] = [];
    const timeStep = 50; // 50ms between interpolated points for smoothness
    
    // Sort data by timestamp to ensure proper ordering
    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Ensure all data points have all model keys
    const allModelKeys = new Set<string>();
    sortedData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'timestamp' && (!selectedModels.length || selectedModels.includes(key))) {
          allModelKeys.add(key);
        }
      });
    });
    
    // Normalize all data points to have all model keys
    const normalizedData = sortedData.map(point => {
      const newPoint: Record<string, string | number | null> = { timestamp: point.timestamp };
      allModelKeys.forEach(key => {
        newPoint[key] = point[key] !== undefined ? point[key] : null;
      });
      return newPoint as PerformanceDataPoint;
    });
    
    // Apply smoothing
    const smoothingWindow = Math.max(2, Math.floor(normalizedData.length * (smoothing / 100)));
    const smoothedData = normalizedData.map((point, i) => {
      const smoothedPoint: PerformanceDataPoint = { timestamp: point.timestamp };
      allModelKeys.forEach(key => {
        const values = [];
        for (let j = Math.max(0, i - smoothingWindow); j <= Math.min(normalizedData.length - 1, i + smoothingWindow); j++) {
          const value = normalizedData[j][key];
          if (typeof value === 'number' && !isNaN(value)) {
            values.push(value);
          }
        }
        smoothedPoint[key] = values.length > 0 
          ? values.reduce((a, b) => a + b, 0) / values.length 
          : null;
      });
      return smoothedPoint;
    });
    
    return smoothedData;
  }, [data, selectedModels, smoothing]);
  
  // Format the timestamp for display
  const formatAxisTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
  };
  
  // Format the value for display
  const formatTooltipValue = (value: number | string) => {
    if (typeof value !== 'number') return value;
    
    if (value === 0) return '0';
    if (value < 0.01) return value.toExponential(2);
    if (value < 1) return value.toFixed(2);
    if (value < 10) return value.toFixed(1);
    if (value < 100) return value.toFixed(1);
    
    return Math.round(value).toString();
  };
  
  // Get the metric label
  const getMetricLabel = () => {
    switch (metricType) {
      case 'tokensPerSecond': return 'Tokens/Second';
      case 'totalTokens': return 'Total Tokens';
      case 'responseTime': return 'Response Time (ms)';
      case 'processingTime': return 'Processing Time (s)';
      default: return 'Value';
    }
  };
  
  // Handle metric type change
  const handleMetricTypeChange = (value: string) => {
    setMetricType(value as MetricType);
    browserLog('metric-type-change', { type: value });
  };
  
  // Handle smoothing change
  const handleSmoothingChange = (value: number[]) => {
    setSmoothing(value[0]);
    browserLog('smoothing-change', { value: value[0] });
  };
  
  // Handle zoom level change
  const handleZoomChange = (value: number[]) => {
    setZoomRange(value);
    browserLog('zoom-change', { value });
  };
  
  // Handle data points toggle
  const handleDataPointsToggle = (checked: boolean) => {
    setShowDataPoints(checked);
    browserLog('data-points-toggle', { checked });
  };
  
  // Handle synced tooltip toggle
  const handleSyncedTooltipToggle = (checked: boolean) => {
    setSyncedTooltip(checked);
    browserLog('synced-tooltip-toggle', { checked });
  };
  
  // Handle chart download
  const handleDownload = () => {
    try {
      // Create a canvas from the chart
      const svgElement = document.querySelector('.recharts-wrapper svg');
      if (!svgElement) return;
      
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions
      canvas.width = svgElement.clientWidth * 2;
      canvas.height = svgElement.clientHeight * 2;
      
      // Create an image from the SVG
      const img = new Image();
      img.onload = () => {
        if (!ctx) return;
        
        // Draw white background
        ctx.fillStyle = styles.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to PNG and download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `performance-chart-${new Date().toISOString()}.png`;
        link.href = dataUrl;
        link.click();
        
        browserLog('chart-download', { timestamp: new Date().toISOString() });
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error('Error downloading chart:', error);
    }
  };
  
  // Handle reset zoom
  const handleResetZoom = () => {
    setZoomRange([0, 100]);
    browserLog('zoom-reset', { timestamp: new Date().toISOString() });
  };
  
  // Log current chart state
  const logChartState = () => {
    browserLog('chart-state', `
    Models: ${selectedModels.map(model => 
      `${model}: ${processedData[processedData.length - 1]?.[model] || 'N/A'}`
    ).join(', ')}
    - Metric: ${metricType}
    - Smoothing: ${smoothing}%
    - Zoom: ${zoomRange[0]}% to ${zoomRange[1]}%
    `);
  };
  
  // Add a debug function
  const handleDebug = () => {
    // Log the current state for debugging
    browserLog('chart-debug', {
      timestamp: new Date().toISOString(),
      data: data.length,
      processedData: processedData.length,
      selectedModels,
      visibleModels: selectedModels.filter(model => 
        processedData.some(point => point[model] !== undefined && point[model] !== null)
      ),
      metricType,
      smoothing,
      zoomRange,
      showDataPoints,
      syncedTooltip,
      customColors
    });
    
    // Show an alert with some basic info
    alert(`Debug info logged:
- Data points: ${data.length}
- Processed points: ${processedData.length}
- Selected models: ${selectedModels.join(', ')}
- Visible models: ${selectedModels.filter(model => 
    processedData.some(point => point[model] !== undefined && point[model] !== null)
  ).join(', ')}
- Metric: ${metricType}
- Smoothing: ${smoothing}%
- Zoom: ${zoomRange[0]}% to ${zoomRange[1]}%
    `);
  };
  
  return (
    <Card className={`w-full mt-6 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Visualizing {getMetricLabel()} for {selectedModels.length} model(s)
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={handleDebug} title="Debug Chart">
              <Bug size={16} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleResetZoom} title="Reset Zoom">
              <RefreshCw size={16} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownload} title="Download Chart">
              <Download size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex flex-col space-y-1">
                <UILabel htmlFor="metric-type">Metric</UILabel>
                <Select value={metricType} onValueChange={(value) => setMetricType(value as MetricType)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tokensPerSecond">Tokens/Second</SelectItem>
                    <SelectItem value="totalTokens">Total Tokens</SelectItem>
                    <SelectItem value="responseTime">Response Time</SelectItem>
                    <SelectItem value="processingTime">Processing Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-data-points"
                  checked={showDataPoints}
                  onCheckedChange={handleDataPointsToggle}
                />
                <UILabel htmlFor="show-data-points">Show Data Points</UILabel>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="synced-tooltip"
                  checked={syncedTooltip}
                  onCheckedChange={handleSyncedTooltipToggle}
                />
                <UILabel htmlFor="synced-tooltip">Sync Tooltips</UILabel>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 justify-between">
            <div className="flex flex-col space-y-1 w-full max-w-xs">
              <UILabel htmlFor="smoothing">Smoothing: {smoothing}%</UILabel>
              <Slider
                id="smoothing"
                min={0}
                max={100}
                step={1}
                value={[smoothing]}
                onValueChange={handleSmoothingChange}
              />
            </div>
            
            <div className="flex flex-col space-y-1 w-full max-w-xs">
              <UILabel htmlFor="zoom">Zoom: {zoomRange[0]}% to {zoomRange[1]}%</UILabel>
              <div className="flex items-center space-x-2">
                <ZoomOut size={16} />
                <Slider
                  id="zoom"
                  min={0}
                  max={100}
                  step={10}
                  value={zoomRange}
                  onValueChange={handleZoomChange}
                  className="flex-1"
                />
                <ZoomIn size={16} />
              </div>
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={styles.gridColor} 
                  opacity={0.2} 
                />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatAxisTime}
                  stroke={styles.axisColor}
                  tick={{ fill: styles.textColor }}
                  axisLine={{ stroke: styles.borderColor }}
                />
                <YAxis 
                  stroke={styles.axisColor}
                  tickFormatter={formatTooltipValue}
                  domain={['auto', 'auto']}
                  tick={{ fill: styles.textColor }}
                  axisLine={{ stroke: styles.borderColor }}
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  labelFormatter={formatAxisTime}
                  contentStyle={{ 
                    backgroundColor: styles.tooltipBackground,
                    border: `1px solid ${styles.borderColor}`,
                    borderRadius: '6px',
                    padding: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: styles.textColor }}
                  labelStyle={{ 
                    color: styles.textColor, 
                    marginBottom: '4px', 
                    fontWeight: 500 
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: styles.textColor }}
                  formatter={(value) => (
                    <span style={{ 
                      color: styles.textColor, 
                      padding: '0 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px' 
                    }}>
                      <span style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        backgroundColor: customColors[value],
                        display: 'inline-block'
                      }}/>
                      {value}
                    </span>
                  )}
                />
                {selectedModels.map((model) => (
                  <Line
                    key={model}
                    type="monotone"
                    dataKey={model}
                    name={model}
                    stroke={customColors[model]}
                    strokeWidth={2.5}
                    dot={showDataPoints}
                    activeDot={{ r: 6, strokeWidth: 1 }}
                    isAnimationActive={false}
                    connectNulls={true}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {selectedModels.map(model => (
              <div 
                key={model} 
                className="flex items-center px-2 py-1 rounded-full text-xs"
                style={{ 
                  backgroundColor: `${customColors[model]}20`, 
                  color: customColors[model],
                  border: `1px solid ${customColors[model]}40`
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: customColors[model] }}
                />
                {model}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 