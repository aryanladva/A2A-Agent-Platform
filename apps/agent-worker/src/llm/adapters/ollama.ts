import { ILlmAdapter, LlmRequestOptions, LlmResponse } from './types';

export class OllamaAdapter implements ILlmAdapter {
  public readonly name = 'ollama';

  public async generateCompletion(options: LlmRequestOptions): Promise<LlmResponse> {
    const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    const model = options.model || process.env.LLM_MODEL || 'llama3';
    const endpoint = `${host.replace(/\/$/, '')}/api/generate`;

    const payload: Record<string, unknown> = {
      model,
      prompt: options.prompt,
      stream: false,
    };

    if (options.systemPrompt) {
      payload.system = options.systemPrompt;
    }

    if (typeof options.temperature === 'number') {
      payload.options = { temperature: options.temperature };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama request failed (${res.status}) on ${host}: ${errText}`);
    }

    const data: any = await res.json();
    const textOutput = data.response || '';

    return {
      text: textOutput,
      model: data.model || model,
      provider: this.name,
      usage: {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      rawResponse: data,
    };
  }
}
