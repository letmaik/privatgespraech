import {
  AutoTokenizer,
  AutoModelForCausalLM,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "@huggingface/transformers";

/**
 * This class uses the Singleton pattern to enable lazy-loading of the pipeline
 */
class TextGenerationPipeline {
  static current_model_id = null;
  static tokenizer = null;
  static model = null;

  static getModelConfig(model_id) {
    const configs = {
      "onnx-community/Llama-3.2-1B-Instruct-q4f16": {
        dtype: "q4f16",
        device: "webgpu",
      },
      "onnx-community/Llama-3.2-3B-Instruct-onnx-web-gqa": {
        dtype: "q4f16",
        device: "webgpu",
      },
      "onnx-community/Phi-3.5-mini-instruct-onnx-web": {
        dtype: "q4f16",
        device: "webgpu",
        use_external_data_format: true,
      },
      "HuggingFaceTB/SmolLM2-1.7B-Instruct": {
        dtype: "q4f16",
        device: "webgpu",
      },
      "onnx-community/Qwen3-0.6B-ONNX": {
        dtype: "q4f16",
        device: "webgpu",
      },
      "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX": {
        dtype: "q4f16",
        device: "webgpu",
      }
    };
    
    if (!configs[model_id]) {
      throw new Error(`Unsupported model: ${model_id}`);
    }
    
    return configs[model_id];
  }

  static async getInstance(model_id, progress_callback = null) {
    // If model has changed, clear cache
    if (this.current_model_id !== model_id) {
      this.tokenizer = null;
      this.model = null;
      this.current_model_id = model_id;
    }

    const config = this.getModelConfig(model_id);

    this.tokenizer ??= AutoTokenizer.from_pretrained(model_id, {
      progress_callback,
    });

    this.model ??= AutoModelForCausalLM.from_pretrained(model_id, {
      ...config,
      progress_callback,
    });

    return Promise.all([this.tokenizer, this.model]);
  }
}

const stopping_criteria = new InterruptableStoppingCriteria();

let past_key_values_cache = null;
async function generate(messages, model_id) {
  // Retrieve the text-generation pipeline.
  const [tokenizer, model] = await TextGenerationPipeline.getInstance(model_id);

  const inputs = tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    return_dict: true,
  });

  let startTime;
  let numTokens = 0;
  let tps;
  const token_callback_function = () => {
    startTime ??= performance.now();

    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000;
    }
  };
  const callback_function = (output) => {
    self.postMessage({
      status: "update",
      output,
      tps,
      numTokens,
    });
  };

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function,
  });

  // Tell the main thread we are starting
  self.postMessage({ status: "start" });

  const { past_key_values, sequences } = await model.generate({
    ...inputs,
    // TODO: Add when model is fixed
    // past_key_values: past_key_values_cache,

    // Sampling
    do_sample: false,

    max_new_tokens: 1024,
    streamer,
    stopping_criteria,
    return_dict_in_generate: true,
  });
  // past_key_values_cache = past_key_values;

  const decoded = tokenizer.batch_decode(sequences, {
    skip_special_tokens: true,
  });

  // Send the output back to the main thread
  self.postMessage({
    status: "complete",
    output: decoded,
  });
}

async function check() {
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU is not supported (no adapter found)");
    }
  } catch (e) {
    self.postMessage({
      status: "error",
      data: e.toString(),
    });
  }
}

async function load(model_id) {
  try {
    self.postMessage({
      status: "loading",
      data: "Loading model...",
    });

    // Load the pipeline and save it for future use.
    const [tokenizer, model] = await TextGenerationPipeline.getInstance(model_id, (x) => {
      // We also add a progress callback to the pipeline so that we can
      // track model loading.
      self.postMessage(x);
    });

    self.postMessage({
      status: "loading",
      data: "Compiling shaders and warming up model...",
    });

    // Run model with dummy input to compile shaders
    const inputs = tokenizer("a");
    await model.generate({ ...inputs, max_new_tokens: 1 });
    
    self.postMessage({ status: "ready" });
  } catch (error) {
    // Check if this is an unsupported model error
    if (error.message && error.message.includes('Unsupported model:')) {
      self.postMessage({
        status: "unsupported_model",
        data: error.toString(),
        model_id: model_id
      });
    } else {
      self.postMessage({
        status: "error",
        data: error.toString(),
      });
    }
  }
}
// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
  const { type, data, model_id } = e.data;

  switch (type) {
    case "check":
      check();
      break;

    case "load":
      if (!model_id) {
        self.postMessage({
          status: "error",
          data: "model_id is required for load operation",
        });
        return;
      }
      load(model_id);
      break;

    case "generate":
      if (!model_id) {
        self.postMessage({
          status: "error",
          data: "model_id is required for generate operation",
        });
        return;
      }
      stopping_criteria.reset();
      generate(data, model_id);
      break;

    case "interrupt":
      stopping_criteria.interrupt();
      break;

    case "reset":
      // past_key_values_cache = null;
      stopping_criteria.reset();
      break;
  }
});
