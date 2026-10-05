import { ILlmAdapter, LlmRequestOptions, LlmResponse } from './types';

export class MockAdapter implements ILlmAdapter {
  public readonly name = 'mock';

  public async generateCompletion(options: LlmRequestOptions): Promise<LlmResponse> {
    const model = options.model || process.env.LLM_MODEL || 'mock-coding-model';

    return {
      text: `[Mock LLM Output] Completed request for prompt: "${options.prompt.substring(0, 50)}..."`,
      model,
      provider: this.name,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };
  }
}
