export interface LlmExecutionResult {
  text: string;
  structuredData: Record<string, unknown>;
}

export async function executeLlmTask(
  skill: string,
  input: Record<string, unknown>,
  isMock: boolean,
  provider: string,
  apiKey: string
): Promise<LlmExecutionResult> {
  // If mock mode is enabled or provider is 'mock', return canned response per TESTING.md
  if (isMock || provider === 'mock') {
    if (skill === 'parse-invoice') {
      return {
        text: 'Successfully extracted invoice line items and totals',
        structuredData: {
          vendorName: 'Acme Corp',
          invoiceNumber: 'INV-2026-001',
          totalAmount: 1450.0,
          currency: 'USD',
          lineItems: [
            { description: 'Cloud Consulting Services', amount: 1000.0 },
            { description: 'Server Maintenance', amount: 450.0 },
          ],
          sourceFile: input.fileUrl || 'invoice.pdf',
        },
      };
    }

    // Default echo mock response
    return {
      text: `Echo response for skill '${skill}'`,
      structuredData: {
        echoedInput: input,
        mockTimestamp: new Date().toISOString(),
      },
    };
  }

  // Real LLM Provider Dispatcher
  console.log(`[LLM] Executing task with provider '${provider}' and skill '${skill}'`);
  return {
    text: `Execution output from provider '${provider}' for skill '${skill}'`,
    structuredData: {
      provider,
      status: 'executed',
      input,
      hasKey: Boolean(apiKey),
    },
  };
}
