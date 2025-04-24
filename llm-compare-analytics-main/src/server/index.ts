import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { spawn } from 'child_process';
import { ComparisonService } from '../lib/services/comparison-service';

const app = express();
const port = process.env.PORT || 3001;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../models'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());

// Track GGUF server processes
const ggufServers: Record<string, any> = {};

// API Routes

// Compare models
app.post('/api/compare', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const comparisonService = ComparisonService.getInstance();
    const result = await comparisonService.compareModels(prompt);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload GGUF model
app.post('/api/gguf/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const modelPath = path.join('models', req.file.filename);
    res.json({ path: modelPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start GGUF server
app.post('/api/gguf/start', (req, res) => {
  try {
    const { modelPath, port } = req.body;
    if (!modelPath) {
      return res.status(400).json({ error: 'Model path is required' });
    }

    const serverPort = port || 8080;
    const absolutePath = path.join(__dirname, '../../', modelPath);

    // Check if server is already running
    if (ggufServers[serverPort]) {
      return res.status(400).json({ error: 'Server already running on this port' });
    }

    // Start llama.cpp server
    const server = spawn('./llama-server', [
      '--model', absolutePath,
      '--port', serverPort.toString(),
      '--ctx-size', '2048',
    ]);

    server.stdout.on('data', (data) => {
      console.log(`GGUF Server (${serverPort}):`, data.toString());
    });

    server.stderr.on('data', (data) => {
      console.error(`GGUF Server Error (${serverPort}):`, data.toString());
    });

    server.on('close', (code) => {
      console.log(`GGUF Server (${serverPort}) exited with code ${code}`);
      delete ggufServers[serverPort];
    });

    ggufServers[serverPort] = server;
    res.json({ port: serverPort });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop GGUF server
app.post('/api/gguf/stop', (req, res) => {
  try {
    const { port } = req.body;
    const serverPort = port || 8080;

    const server = ggufServers[serverPort];
    if (!server) {
      return res.status(400).json({ error: 'Server not running' });
    }

    server.kill();
    delete ggufServers[serverPort];
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check GGUF server status
app.get('/api/gguf/status', (req, res) => {
  try {
    const { port } = req.query;
    const serverPort = port || 8080;
    res.json({ running: !!ggufServers[serverPort] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate all connections
app.post('/api/validate', async (req, res) => {
  try {
    const comparisonService = ComparisonService.getInstance();
    const results = await comparisonService.validateConnections();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List Ollama models
app.get('/api/ollama/:endpointId/models', async (req, res) => {
  try {
    const { endpointId } = req.params;
    const comparisonService = ComparisonService.getInstance();
    const models = await comparisonService.getOllamaModels(endpointId);
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pull Ollama model
app.post('/api/ollama/:endpointId/pull', async (req, res) => {
  try {
    const { endpointId } = req.params;
    const { modelName } = req.body;
    if (!modelName) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    const comparisonService = ComparisonService.getInstance();
    const success = await comparisonService.pullOllamaModel(endpointId, modelName);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 