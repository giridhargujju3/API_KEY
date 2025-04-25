interface GGUFServerConfig {
  modelPath: string;
  temperature?: number;
  maxTokens?: number;
  port?: number;
}

class GGUFService {
  private static instance: GGUFService;
  private serverProcess: any = null;
  private serverPort: number = 8080;

  private constructor() {}

  public static getInstance(): GGUFService {
    if (!GGUFService.instance) {
      GGUFService.instance = new GGUFService();
    }
    return GGUFService.instance;
  }

  public async uploadModel(file: File): Promise<string> {
    try {
      // In a real implementation, you would:
      // 1. Create a FormData object
      const formData = new FormData();
      formData.append('file', file);

      // 2. Send the file to your backend
      const response = await fetch('/api/gguf/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload model');
      }

      const data = await response.json();
      return data.path; // Return the saved file path
    } catch (error) {
      throw new Error(`Failed to upload model: ${error.message}`);
    }
  }

  public async startServer(config: GGUFServerConfig): Promise<void> {
    try {
      // In a real implementation, you would:
      // 1. Call your backend to start the llama.cpp server
      const response = await fetch('/api/gguf/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelPath: config.modelPath,
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 1000,
          port: config.port || this.serverPort,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start server');
      }

      // Store the server port
      const data = await response.json();
      this.serverPort = data.port;
    } catch (error) {
      throw new Error(`Failed to start server: ${error.message}`);
    }
  }

  public async stopServer(): Promise<void> {
    try {
      // In a real implementation, you would:
      // 1. Call your backend to stop the llama.cpp server
      const response = await fetch('/api/gguf/stop', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to stop server');
      }

      this.serverProcess = null;
    } catch (error) {
      throw new Error(`Failed to stop server: ${error.message}`);
    }
  }

  public async isServerRunning(): Promise<boolean> {
    try {
      // In a real implementation, you would:
      // 1. Call your backend to check server status
      const response = await fetch('/api/gguf/status');
      const data = await response.json();
      return data.running;
    } catch {
      return false;
    }
  }

  public getServerPort(): number {
    return this.serverPort;
  }
}

export type { GGUFServerConfig };
export { GGUFService }; 