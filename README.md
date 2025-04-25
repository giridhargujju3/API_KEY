# LLM Comparison Analytics Dashboard

A comprehensive dashboard for comparing and analyzing the performance of different Large Language Models (LLMs).

## Features

### Performance Metrics Visualization

- **Advanced Performance Chart**: Visualizes performance metrics with continuous lines, proper data handling, and dynamic color generation.
- **Multiple Chart Types**: Line, area, bar, and composed charts for different visualization needs.
- **Metric Selection**: Compare models based on tokens per second, total tokens, response time, or processing time.
- **Smoothing Controls**: Adjust data smoothing for clearer trend visualization.
- **Zoom Controls**: Focus on specific time ranges of the performance data.

### Model Comparison

- **Side-by-Side Comparison**: Compare multiple models simultaneously with real-time updates.
- **Metrics Cards**: View detailed metrics for each model including response time, tokens per second, and token counts.
- **Dynamic Progress Tracking**: Real-time progress indicators for each model during processing.

### Debugging and Verification

- **Metrics Verifier**: Verify the accuracy of reported metrics against expected calculations.
- **API Request Tester**: Test API requests directly from the UI with Postman collection export.
- **Debug Tools**: Built-in debugging for chart data and performance metrics.
- **Logging System**: Comprehensive logging with downloadable logs for analysis.

### User Experience

- **Theme Support**: Dark and light mode with system preference detection.
- **Responsive Design**: Works on various screen sizes and devices.
- **Accessibility**: Keyboard navigation and screen reader support.

## Technical Improvements

### Metrics Calculation

- **Fixed Negative Token Values**: Properly handles the Ollama API's occasional negative prompt token values.
- **Accurate Tokens Per Second**: Calculates tokens per second based on completion tokens and evaluation duration.
- **Processing Time Tracking**: Tracks and displays processing time separately from response time.

### Data Visualization

- **Continuous Lines**: Ensures continuous line rendering even with gaps in data.
- **Null Value Handling**: Properly handles null and undefined values in the chart data.
- **Dynamic Color Generation**: Generates visually distinct colors for each model based on name.
- **Theme-Aware Styling**: Adjusts chart colors and styles based on the current theme.

### API Integration

- **Robust Error Handling**: Gracefully handles API errors and timeouts.
- **Progress Tracking**: Accurately tracks and displays model generation progress.
- **Flexible Configuration**: Supports various model parameters and configurations.

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- Ollama running locally or on a remote server

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/llm-comparo-analytics.git
   cd llm-comparo-analytics
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Configuration

The application can be configured to connect to different Ollama instances:

1. Use the Settings panel to configure the Ollama endpoint URL
2. Select models to compare from the available models list
3. Adjust parameters like temperature, max tokens, and context size

## Troubleshooting

### Common Issues

- **Negative Prompt Tokens**: If you see negative prompt token values in the logs, this is a known issue with the Ollama API. The application handles this by converting negative values to zero.
- **No Data in Charts**: Ensure that the models you've selected are available in your Ollama instance and that the API endpoint is correctly configured.
- **API Connection Errors**: Check that Ollama is running and accessible at the configured URL.

### Debugging Tools

- Use the **API Tester** to verify API connectivity and responses
- Use the **Metrics Verifier** to check the accuracy of reported metrics
- Use the **Debug** button on the chart to log current chart state
- Download logs for detailed analysis

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 