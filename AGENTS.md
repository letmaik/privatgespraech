# Agent Development Notes

This document contains important notes and considerations for AI agents working on this project.

## Browser Compatibility

This project requires modern browsers with the following features:

- **Clipboard API**: The copy-to-clipboard functionality uses `navigator.clipboard.writeText()` which requires HTTPS in production and is not supported in older browsers.
- **WebGPU**: The core AI functionality requires WebGPU support, limiting compatibility to recent browser versions.
- **ES Modules**: The project uses modern JavaScript module syntax.

## Dependencies

- **react-syntax-highlighter**: Used for code block syntax highlighting with Prism.js
- **react-markdown**: Used for rendering markdown content with custom component renderers
- **@huggingface/transformers**: Core AI/ML functionality for running models in the browser

## Development Guidelines

1. **No Legacy Browser Support**: This project intentionally does not support older browsers
2. **Modern JavaScript**: Use modern ES6+ features freely
3. **React Patterns**: Prefer hooks and functional components
4. **Accessibility**: Ensure keyboard navigation and screen reader compatibility
5. **Performance**: Be mindful of re-renders during token streaming
