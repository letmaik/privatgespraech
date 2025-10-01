# Privatgespräch

https://letmaik.github.io/privatgespraech/

A privacy-focused AI chat interface that runs language models entirely in your browser using WebGPU acceleration. Designed for desktop and laptop computers.

## Privacy & Offline Operation

- **Complete Privacy**: All AI processing happens locally in your browser - no data is ever sent to external servers
- **Offline Capable**: After initial model download, the application works completely offline
- **No Tracking**: No analytics, telemetry, or data collection of any kind
- **Local Storage**: Models and conversations stay on your device

## Device Compatibility

**Recommended**: Desktop and laptop computers with dedicated or integrated GPU  
**Not Recommended**: Mobile phones or tablets (limited WebGPU support and performance)

**For Mobile**: Consider [EnclaveAI](https://enclaveai.app/) for privacy-focused mobile AI chat

## Features

- **Local Processing**: AI inference runs entirely in the browser
- **Multiple Models**: Support for Llama 3.2 1B, Phi-3.5 Mini, SmolLM2 1.7B, and Qwen3 0.6B
- **WebGPU Acceleration**: Hardware-accelerated inference using GPU
- **Syntax Highlighting**: Code blocks with full syntax highlighting
- **Copy Functionality**: Copy code snippets and full responses
- **Reasoning Support**: Collapsible thinking blocks for reasoning models

## Technology Stack

- **React 18**: UI framework with modern hooks
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Transformers.js**: Browser-based transformer model execution
- **ONNX Runtime Web**: WebGPU-accelerated model runtime
- **react-markdown**: Markdown rendering
- **react-syntax-highlighter**: Code syntax highlighting

## Requirements

### Browser Compatibility
- WebGPU support (Chrome 113+, Edge 113+)
- Modern JavaScript (ES2020+)

### System Requirements
- GPU with WebGPU support
- 4GB+ RAM recommended
- 2-3GB storage for model cache

**Note**: This application is optimized for desktop and laptop computers. Mobile devices have limited WebGPU support and may not provide adequate performance.

## Installation

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

## Usage

1. Open the application (default: `http://localhost:5173`)
2. Select a model from the dropdown
3. Wait for initial model download and loading
4. Start conversation by typing a message
5. **Go offline**: After initial setup, disconnect from internet - the app continues working

**Privacy Note**: All conversations and AI processing remain on your device. No data leaves your computer.

## Architecture

### Frontend Structure
```
src/
├── App.jsx                 # Main application component
├── main.jsx               # React app entry point
├── worker.js              # Web Worker for AI processing
├── components/
│   ├── Chat.jsx           # Chat interface with message rendering
│   ├── ModelSelector.jsx  # Model selection dropdown
│   ├── LoadingModal.jsx   # Model loading progress modal
│   ├── Progress.jsx       # Progress bar component
│   └── icons/             # Icon components
└── index.css              # Global styles
```

### Components

- **Web Worker** (`worker.js`): Handles model loading and inference
- **Chat Component** (`Chat.jsx`): Message rendering with markdown support
- **Model Selector** (`ModelSelector.jsx`): Model selection interface
- **Think Blocks**: Collapsible reasoning blocks for compatible models

### Supported Models

| Model | Size | ID | Features |
|-------|------|----|---------| 
| Llama 3.2 1B | 1.2 GB | `onnx-community/Llama-3.2-1B-Instruct-q4f16` | General chat |
| Phi-3.5 Mini | 2.1 GB | `onnx-community/Phi-3.5-mini-instruct-onnx-web` | Code generation |
| SmolLM2 1.7B | 1.1 GB | `HuggingFaceTB/SmolLM2-1.7B-Instruct` | Efficient chat |
| Qwen3 0.6B | 0.5 GB | `onnx-community/Qwen3-0.6B-ONNX` | Reasoning support |

## Configuration

To add new models, update both `worker.js` and `ModelSelector.jsx`:

```javascript
// worker.js - Add model configuration
static getModelConfig(model_id) {
  const configs = {
    "new-model-id": {
      dtype: "q4f16",
      device: "webgpu"
    }
  };
}
```

```javascript
// ModelSelector.jsx - Add to AVAILABLE_MODELS
{
  id: 'model-key',
  name: 'Model Name',
  description: 'Description and size',
  url: 'new-model-id',
  hasReasoningBlocks: false
}
```

## Troubleshooting

### WebGPU Issues
- Use Chrome 113+ or Edge 113+
- Check WebGPU support at chrome://gpu
- Enable WebGPU in browser flags if needed

### Model Loading
- Verify stable internet connection
- Check browser console for errors
- Clear browser cache if needed

### Performance
- Close GPU-intensive applications
- Use smaller models for better performance
- Ensure sufficient RAM (4GB+)

## License

Open source project. See license file for details.
