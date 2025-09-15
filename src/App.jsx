import { useEffect, useState, useRef } from "react";

import Chat from "./components/Chat";
import SendIcon from "./components/icons/SendIcon";
import StopIcon from "./components/icons/StopIcon";
import GitHubIcon from "./components/icons/GitHubIcon";
import ModelSelector from "./components/ModelSelector";
import LoadingModal from "./components/LoadingModal";
import ModelSelectionModal from "./components/ModelSelectionModal";

const IS_WEBGPU_AVAILABLE = !!navigator.gpu;
const STICKY_SCROLL_THRESHOLD = 120;
const EXAMPLES = [
  "Suggest strategies to stay focused while studying.",
  "Explain the difference between HTTP and HTTPS.",
  "Show a short Python example computing the factorial of a number.",
];

// LocalStorage helpers
const STORAGE_KEY = 'privatgespraech-selected-model';

function getStoredModel() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('localStorage not available:', error);
    return null;
  }
}

function setStoredModel(modelId) {
  try {
    localStorage.setItem(STORAGE_KEY, modelId);
  } catch (error) {
    console.warn('localStorage not available:', error);
  }
}

function App() {
  // Create a reference to the worker object.
  const worker = useRef(null);

  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Model loading and progress
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedModel, setSelectedModel] = useState('onnx-community/Llama-3.2-1B-Instruct-q4f16');
  const [showModelSelectionModal, setShowModelSelectionModal] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Inputs and outputs
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [tps, setTps] = useState(null);
  const [numTokens, setNumTokens] = useState(null);

  function onEnter(message) {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setTps(null);
    setInput("");
    
    // Load model if not already loaded
    if (status !== "ready") {
      setStatus("loading");
      setIsRunning(false); // Don't set running yet, wait for model to load
      worker.current.postMessage({ 
        type: "load", 
        model_id: selectedModel 
      });
    } else {
      setIsRunning(true);
    }
  }

  function onInterrupt() {
    // NOTE: We do not set isRunning to false here because the worker
    // will send a 'complete' message when it is done.
    worker.current.postMessage({ type: "interrupt" });
  }

  function handleModelChange(modelId) {
    if (modelId === selectedModel) return;
    if (isRunning) return; // Prevent model switching during text generation
    
    setSelectedModel(modelId);
    setStoredModel(modelId); // Save to localStorage
    setStatus("loading");
    // Don't clear messages - keep chat history
    setProgressItems([]);
    
    worker.current.postMessage({ 
      type: "load",
      model_id: modelId
    });
  }

  function handleInitialModelSelect(modelId) {
    setSelectedModel(modelId);
    setStoredModel(modelId); // Save to localStorage
    setStatus("loading");
    setProgressItems([]);
    
    worker.current.postMessage({ 
      type: "load",
      model_id: modelId
    });
  }

  useEffect(() => {
    resizeInput();
  }, [input]);

  function resizeInput() {
    if (!textareaRef.current) return;

    const target = textareaRef.current;
    target.style.height = "auto";
    const newHeight = Math.min(Math.max(target.scrollHeight, 24), 200);
    target.style.height = `${newHeight}px`;
  }

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    // Create the worker if it does not yet exist.
    if (!worker.current) {
      worker.current = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
      });
      worker.current.postMessage({ type: "check" }); // Do a feature check
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case "loading":
          // Model file start load: add a new progress item to the list.
          setStatus("loading");
          setLoadingMessage(e.data.data);
          break;

        case "initiate":
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case "progress":
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, ...e.data };
              }
              return item;
            }),
          );
          break;

        case "done":
          // Model file loaded: remove the progress item from the list.
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file),
          );
          break;

        case "ready":
          // Pipeline ready: the worker is ready to accept messages.
          setStatus("ready");
          // If we have messages and were waiting for the model to load, start generation
          // Only set running to true if we have user messages waiting to be processed
          if (messages.length > 0 && messages[messages.length - 1].role === "user") {
            setIsRunning(true);
          }
          break;

        case "start":
          {
            // Start generation
            setIsRunning(true);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "" },
            ]);
          }
          break;

        case "update":
          {
            // Generation update: update the output text.
            // Parse messages
            const { output, tps, numTokens } = e.data;
            setTps(tps);
            setNumTokens(numTokens);
            setMessages((prev) => {
              const cloned = [...prev];
              const last = cloned.at(-1);
              cloned[cloned.length - 1] = {
                ...last,
                content: last.content + output,
              };
              return cloned;
            });
          }
          break;

        case "complete":
          // Generation complete: re-enable the "Generate" button
          setIsRunning(false);
          break;

        case "error":
          setError(e.data.data);
          setStatus(null);
          break;
      }
    };

    const onErrorReceived = (e) => {
      console.error("Worker error:", e);
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener("message", onMessageReceived);
    worker.current.addEventListener("error", onErrorReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => {
      worker.current.removeEventListener("message", onMessageReceived);
      worker.current.removeEventListener("error", onErrorReceived);
    };
  }, []);

  // Initialize model selection on app start
  useEffect(() => {
    if (!hasInitialized && worker.current) {
      const storedModel = getStoredModel();
      
      if (storedModel) {
        // User has selected a model before, automatically load it
        setSelectedModel(storedModel);
        setStatus("loading");
        worker.current.postMessage({ 
          type: "load", 
          model_id: storedModel 
        });
      } else {
        // First-time user, show model selection modal
        setShowModelSelectionModal(true);
      }
      
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Send the messages to the worker thread whenever the `messages` state changes.
  useEffect(() => {
    if (messages.filter((x) => x.role === "user").length === 0) {
      // No user messages yet: do nothing.
      return;
    }
    if (messages.at(-1).role === "assistant") {
      // Do not update if the last message is from the assistant
      return;
    }
    setTps(null);
    worker.current.postMessage({ 
      type: "generate", 
      data: messages, 
      model_id: selectedModel 
    });
  }, [messages, isRunning, selectedModel]);

  useEffect(() => {
    if (!chatContainerRef.current || !isRunning) return;
    const element = chatContainerRef.current;
    if (
      element.scrollHeight - element.scrollTop - element.clientHeight <
      STICKY_SCROLL_THRESHOLD
    ) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, isRunning]);

  return IS_WEBGPU_AVAILABLE ? (
    <div className="flex flex-col h-screen mx-auto items justify-end text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900">
      {/* New Chat button and Model selector - top left */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button
          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:dark:hover:bg-gray-700"
          disabled={isRunning}
          onClick={() => {
            worker.current.postMessage({ type: "reset" });
            setMessages([]);
          }}
        >
          New Chat
        </button>
        <ModelSelector 
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          disabled={status === "loading" || isRunning}
        />
      </div>
      
      {/* GitHub link - top right */}
      <div className="absolute top-4 right-4 z-10">
        <a
          href="https://github.com/letmaik/privatgespraech"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-10 h-10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
          title="View on GitHub"
        >
          <GitHubIcon className="w-5 h-5" />
        </a>
      </div>
      
      {/* Model Selection Modal for first-time users */}
      {showModelSelectionModal && (
        <ModelSelectionModal 
          onModelSelect={handleInitialModelSelect}
          onClose={() => setShowModelSelectionModal(false)}
        />
      )}
      
      {/* Loading Modal */}
      {status === "loading" && (
        <LoadingModal 
          loadingMessage={loadingMessage}
          progressItems={progressItems}
        />
      )}
      
      {(status === "ready" || status === "loading" || status === null) && (
        <div
          ref={chatContainerRef}
          className="overflow-y-auto scrollbar-thin w-full flex flex-col items-center h-full"
        >
          <Chat 
            messages={messages} 
            isRunning={isRunning} 
            loading={status === "loading"}
            selectedModel={selectedModel}
          />
          {messages.length === 0 && (status === "ready" || status === null) && (
            <div>
              {EXAMPLES.map((msg, i) => (
                <div
                  key={i}
                  className="m-1 border dark:border-gray-600 rounded-md p-2 bg-gray-100 dark:bg-gray-700 cursor-pointer"
                  onClick={() => onEnter(msg)}
                >
                  {msg}
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-sm min-h-6 text-gray-500 dark:text-gray-300">
            {tps && messages.length > 0 && (
              <>
                {!isRunning && (
                  <span>
                    Generated {numTokens} tokens in{" "}
                    {(numTokens / tps).toFixed(2)} seconds&nbsp;&#40;
                  </span>
                )}
                {
                  <>
                    <span className="font-medium text-center mr-1 text-black dark:text-white">
                      {tps.toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-300">
                      tokens/second
                    </span>
                  </>
                }
                {!isRunning && (
                  <span className="mr-1">&#41;.</span>
                )}
              </>
            )}
          </p>
        </div>
      )}

      <div className="mt-2 border dark:bg-gray-700 rounded-lg w-[800px] max-w-[80%] max-h-[200px] mx-auto relative mb-3 flex">
        <textarea
          ref={textareaRef}
          className="scrollbar-thin w-full dark:bg-gray-700 px-3 py-4 rounded-lg bg-transparent border-none outline-none text-gray-800 disabled:text-gray-400 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 disabled:placeholder-gray-200 resize-none disabled:cursor-not-allowed"
          placeholder="Type your message..."
          type="text"
          rows={1}
          value={input}
          disabled={status === "loading" || isRunning}
          title={status === "ready" ? "Model is ready" : status === "loading" ? "Loading model..." : "Send a message to load the model"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-form-type="other"
          onKeyDown={(e) => {
            if (
              input.length > 0 &&
              !isRunning &&
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              e.preventDefault(); // Prevent default behavior of Enter key
              onEnter(input);
            }
          }}
          onInput={(e) => setInput(e.target.value)}
        />
        {isRunning ? (
          <div className="cursor-pointer" onClick={onInterrupt}>
            <StopIcon className="h-8 w-8 p-1 rounded-md text-gray-800 dark:text-gray-100 absolute right-3 bottom-3" />
          </div>
        ) : input.length > 0 ? (
          <div className="cursor-pointer" onClick={() => onEnter(input)}>
            <SendIcon
              className={`h-8 w-8 p-1 bg-gray-800 dark:bg-gray-100 text-white dark:text-black rounded-md absolute right-3 bottom-3`}
            />
          </div>
        ) : (
          <div>
            <SendIcon
              className={`h-8 w-8 p-1 bg-gray-200 dark:bg-gray-600 text-gray-50 dark:text-gray-800 rounded-md absolute right-3 bottom-3`}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mb-3">
        Generated content may be inaccurate or false.
      </p>
    </div>
  ) : (
    <div className="fixed w-screen h-screen bg-black z-10 bg-opacity-[92%] text-white text-2xl font-semibold flex justify-center items-center text-center">
      WebGPU is not supported
      <br />
      by this browser :&#40;
    </div>
  );
}

export default App;
