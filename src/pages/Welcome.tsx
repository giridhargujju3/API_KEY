import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Settings } from "lucide-react";

export function Welcome() {
  return (
    <div className="container relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center">
      <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:text-6xl lg:leading-[1.1]">
          Compare LLM Performance
          <br />
          Make Informed Decisions
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Test and compare different language models in real-time. Analyze performance, response times, and quality scores to choose the right model for your needs.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Configure Models
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/compare">
              Start Comparing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col items-center space-y-2 p-6 border rounded-lg">
          <h3 className="text-xl font-semibold">Multiple Providers</h3>
          <p className="text-center text-muted-foreground">
            Support for OpenAI, Anthropic, Google AI, Ollama, and HuggingFace models
          </p>
        </div>
        <div className="flex flex-col items-center space-y-2 p-6 border rounded-lg">
          <h3 className="text-xl font-semibold">Real-time Analysis</h3>
          <p className="text-center text-muted-foreground">
            Compare response times, token generation speed, and output quality
          </p>
        </div>
        <div className="flex flex-col items-center space-y-2 p-6 border rounded-lg">
          <h3 className="text-xl font-semibold">Easy Integration</h3>
          <p className="text-center text-muted-foreground">
            Simple setup with API keys and custom model configurations
          </p>
        </div>
      </div>
    </div>
  );
} 