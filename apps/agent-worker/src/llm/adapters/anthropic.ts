import { ILlmAdapter, LlmRequestOptions, LlmResponse } from './types';
import { getSecureApiKey } from '../../security/credentials';

export class AnthropicAdapter implements ILlmAdapter {
  public readonly name = 'anthropic';

  public async generateCompletion(options: LlmRequestOptions): Promise<LlmResponse> {
    const apiKey = options.apiKey || (await getSecureApiKey('anthropic'));
    if (!apiKey) {
      throw new Error(
        "Anthropic API key is missing. Store it securely via OS Credential Vault or set ANTHROPIC_API_KEY / LLM_API_KEY environment variable."
      );
    }

    const model = options.model || process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022';
    const endpoint = 'https://api.anthropic.com/v1/messages';

    const messages = [{ role: 'user', content: options.prompt }];

    const payload: Record<string, unknown> = {
      model,
      max_tokens: options.maxTokens || 4096,
      messages,
    };

    if (options.systemPrompt) {
      payload.system = options.systemPrompt;
    }

    if (typeof options.temperature === 'number') {
      payload.temperature = options.temperature;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API request failed (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    const textOutput = data.content?.[0]?.text || '';

    return {
      text: textOutput,
      model: data.model || model,
      provider: this.name,
      usage: {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      rawResponse: data,
    };
  }
}
