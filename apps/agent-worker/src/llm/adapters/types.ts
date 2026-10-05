export interface LlmRequestOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export interface LlmResponse {
  text: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  rawResponse?: unknown;
}

export interface ILlmAdapter {
  readonly name: string;
  generateCompletion(options: LlmRequestOptions): Promise<LlmResponse>;
}
