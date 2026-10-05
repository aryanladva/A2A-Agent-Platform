import { ILlmAdapter, LlmRequestOptions, LlmResponse } from './types';
import { AnthropicAdapter } from './anthropic';
import { OpenAiAdapter } from './openai';
import { OllamaAdapter } from './ollama';
import { MockAdapter } from './mock';

const adapterRegistry: Record<string, ILlmAdapter> = {
  anthropic: new AnthropicAdapter(),
  openai: new OpenAiAdapter(),
  ollama: new OllamaAdapter(),
  mock: new MockAdapter(),
};

/**
 * Retrieves an LLM provider adapter driven entirely by configuration or explicit selection.
 */
export function getLlmAdapter(providerName?: string): ILlmAdapter {
  const targetProvider = (
    providerName ||
    process.env.LLM_PROVIDER ||
    'mock'
  ).toLowerCase();

  return adapterRegistry[targetProvider] || adapterRegistry['mock'];
}

/**
 * Execute completion via the configured single LLM Gateway interface.
 */
export async function executeGatewayCompletion(
  prompt: string,
  options: Partial<LlmRequestOptions> & { provider?: string } = {}
): Promise<LlmResponse> {
  const adapter = getLlmAdapter(options.provider);
  return adapter.generateCompletion({
    prompt,
    systemPrompt: options.systemPrompt,
    model: options.model || process.env.LLM_MODEL,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    apiKey: options.apiKey,
  });
}
