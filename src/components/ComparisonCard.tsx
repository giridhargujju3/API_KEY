import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { DynamicTimeProgress } from "./DynamicTimeProgress";
import { formatProcessingTime, formatResponseTime } from "../lib/utils/time-format";

interface ComparisonCardProps {
  model: string;
  responseTime: number;
  tokensPerSecond: number;
  qualityScore?: number;
  startTime?: number;
  isComplete?: boolean;
  progress?: number;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  processingTime?: number;
}

export function ComparisonCard({ 
  model, 
  responseTime, 
  tokensPerSecond, 
  qualityScore,
  startTime,
  isComplete,
  progress,
  totalTokens,
  promptTokens,
  completionTokens,
  processingTime
}: ComparisonCardProps) {
  // Format response time with appropriate units
  const formattedResponseTime = formatResponseTime(responseTime);
  
  // Format processing time if available
  const formattedProcessingTime = processingTime ? formatProcessingTime(processingTime) : null;
  
  // Format tokens per second with appropriate precision
  const formattedTokensPerSecond = formatTokensPerSecond(tokensPerSecond);
  
  return (
    <Card className="relative">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-lg">{model}</CardTitle>
        {isComplete !== undefined && (
          <Badge variant={isComplete ? "default" : "secondary"}>
            {progress !== undefined && progress < 100 
              ? `${Math.round(progress)}%` 
              : isComplete ? "Complete" : "Processing"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {processingTime !== undefined && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Processing Time</div>
            <div className="text-2xl font-bold">{formattedProcessingTime}</div>
          </div>
        )}
        
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Response Time</div>
          <div className="text-2xl font-bold">{formattedResponseTime}</div>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Tokens/Second</div>
          <div className="text-2xl font-bold">{formattedTokensPerSecond}</div>
        </div>
        
        {totalTokens !== undefined && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Total Tokens</div>
            <div className="text-lg font-medium">{totalTokens.toLocaleString()}</div>
          </div>
        )}
        
        {promptTokens !== undefined && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Prompt Tokens</div>
            <div className="text-lg font-medium">{promptTokens.toLocaleString()}</div>
          </div>
        )}
        
        {completionTokens !== undefined && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Completion Tokens</div>
            <div className="text-lg font-medium">{completionTokens.toLocaleString()}</div>
          </div>
        )}
        
        {startTime && (
          <DynamicTimeProgress 
            startTime={startTime}
            isComplete={isComplete}
            progress={progress}
            className="mt-2"
          />
        )}
      </CardContent>
    </Card>
  );
}

// Helper function for formatting tokens per second
function formatTokensPerSecond(tokensPerSecond: number): string {
  if (tokensPerSecond === 0) return '0';
  if (tokensPerSecond < 0.1) return '<0.1';
  if (tokensPerSecond < 10) return tokensPerSecond.toFixed(1);
  return Math.round(tokensPerSecond).toString();
}