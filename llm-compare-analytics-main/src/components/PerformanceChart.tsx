import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateModelColor, formatAxisTime, formatTooltipValue, calculateChartDomain } from '../lib/utils/chart-utils';
import { ChartStyles, getChartStyles, PerformanceDataPoint } from '../lib/types/performance-types';
import { useTheme } from '../hooks/useTheme';
import { useMemo } from 'react';

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  className?: string;
  customColors?: Record<string, string>;
  selectedModels?: string[];
}

export function PerformanceChart({ 
  data, 
  className = '',
  customColors = {},
  selectedModels = []
}: PerformanceChartProps) {
  const { isDarkMode } = useTheme();
  const styles = getChartStyles(isDarkMode);

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
    // This is crucial for continuous line rendering
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
    
    for (let i = 0; i < normalizedData.length - 1; i++) {
      const currentPoint = normalizedData[i];
      const nextPoint = normalizedData[i + 1];
      
      // Add the current point
      points.push(currentPoint);
      
      // Calculate time difference between points
      const currentTime = new Date(currentPoint.timestamp).getTime();
      const nextTime = new Date(nextPoint.timestamp).getTime();
      const timeDiff = nextTime - currentTime;
      
      // Only interpolate if there's a significant gap
      if (timeDiff > timeStep * 2) {
        const steps = Math.min(Math.floor(timeDiff / timeStep), 20); // Limit to 20 interpolation points
        
        for (let step = 1; step < steps; step++) {
          const progress = step / steps;
          const interpolatedPoint: PerformanceDataPoint = {
            timestamp: new Date(currentTime + (timeDiff * progress)).toISOString()
          };
          
          // Interpolate each model's value using cubic interpolation for smoother curves
          Array.from(allModelKeys).forEach(key => {
            if (typeof currentPoint[key] === 'number' && typeof nextPoint[key] === 'number') {
              // Use cubic interpolation for smoother curves
              interpolatedPoint[key] = cubicInterpolate(
                currentPoint[key] as number,
                nextPoint[key] as number,
                progress
              );
            } else if (currentPoint[key] !== undefined) {
              // If not a number, just use the current point's value
              interpolatedPoint[key] = currentPoint[key];
            }
          });
          
          points.push(interpolatedPoint);
        }
      }
    }
    
    // Add the last point
    points.push(normalizedData[normalizedData.length - 1]);
    
    return points;
  }, [data, selectedModels]);

  // Cubic interpolation function for smoother curves
  function cubicInterpolate(start: number, end: number, progress: number): number {
    // Use cubic easing function: progress^2 * (3 - 2 * progress)
    const t = progress * progress * (3 - 2 * progress);
    return start + (end - start) * t;
  }

  // Get active models and their colors
  const activeModels = useMemo(() => {
    if (processedData.length === 0) return [];
    
    let models = Object.keys(processedData[0]).filter(key => 
      key !== 'timestamp' && typeof processedData[0][key] === 'number' || processedData[0][key] === null
    );
    
    // Filter by selected models if provided
    if (selectedModels.length > 0) {
      models = models.filter(model => selectedModels.includes(model));
    }
    
    return models;
  }, [processedData, selectedModels]);

  const modelColors = useMemo(() => {
    // Start with custom colors
    const colors: Record<string, string> = { ...customColors };
    
    // For models without custom colors, generate them
    activeModels.forEach((model, index) => {
      // If we don't have a custom color for this model, generate one
      if (!colors[model]) {
        colors[model] = generateModelColor(model, index, activeModels.length);
      }
    });
    
    return colors;
  }, [activeModels, customColors]);

  // Calculate Y axis domain with padding for better visualization
  const [minDomain, maxDomain] = useMemo(() => {
    const allValues = processedData.flatMap(point => 
      Object.entries(point)
        .filter(([key]) => key !== 'timestamp' && activeModels.includes(key))
        .map(([, value]) => Number(value))
        .filter(value => !isNaN(value))
    );
    
    if (allValues.length === 0) return [0, 10];
    
    const [min, max] = calculateChartDomain(allValues);
    
    // Add 10% padding to the top for better visualization
    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding];
  }, [processedData, activeModels]);

  if (processedData.length === 0) {
    return null;
  }

  return (
    <div className={`w-full h-[400px] mt-6 p-4 rounded-lg border bg-card ${className}`}>
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
            domain={[minDomain, maxDomain]}
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
                  backgroundColor: modelColors[value],
                  display: 'inline-block'
                }}/>
                {value}
              </span>
            )}
          />
          {activeModels.map((model) => (
            <Line
              key={model}
              type="monotone"
              dataKey={model}
              name={model}
              stroke={modelColors[model]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 1 }}
              isAnimationActive={false}
              connectNulls={true}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.25))`,
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}