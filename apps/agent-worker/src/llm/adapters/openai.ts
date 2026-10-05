import { ILlmAdapter, LlmRequestOptions, LlmResponse } from './types';
import { getSecureApiKey } from '../../security/credentials';

export class OpenAiAdapter implements ILlmAdapter {
  public readonly name = 'openai';

  public async generateCompletion(options: LlmRequestOptions): Promise<LlmResponse> {
    const apiKey = options.apiKey || (await getSecureApiKey('openai'));
    if (!apiKey) {
      throw new Error(
        "OpenAI API key is missing. Store it securely via OS Credential Vault or set OPENAI_API_KEY / LLM_API_KEY environment variable."
      );
    }

    const model = options.model || process.env.LLM_MODEL || 'gpt-4o';
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.prompt });

    const payload: Record<string, unknown> = {
      model,
      messages,
      max_tokens: options.maxTokens || 4096,
    };

    if (typeof options.temperature === 'number') {
      payload.temperature = options.temperature;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API request failed (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    const textOutput = data.choices?.[0]?.message?.content || '';

    return {
      text: textOutput,
      model: data.model || model,
      provider: this.name,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
      },
      rawResponse: data,
    };
  }
}
