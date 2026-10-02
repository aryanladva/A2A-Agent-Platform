export interface SanitizationResult {
  sanitized: Record<string, unknown>;
  isSafe: boolean;
  warnings: string[];
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s+prompt:/i,
  /disregard\s+all\s+prior/i,
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/i,
  /exec\(|eval\(/i,
];

export function sanitizeLlmInput(input: unknown): SanitizationResult {
  const warnings: string[] = [];
  let isSafe = true;

  if (!input || typeof input !== 'object') {
    return {
      sanitized: {},
      isSafe: false,
      warnings: ['Input is not a valid object'],
    };
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'string') {
      let cleaned = value;

      for (const pattern of PROMPT_INJECTION_PATTERNS) {
        if (pattern.test(cleaned)) {
          isSafe = false;
          warnings.push(`Detected prompt injection pattern in field '${key}'`);
          cleaned = cleaned.replace(pattern, '[REDACTED_UNSAFE_INPUT]');
        }
      }

      // Basic HTML tag stripping / escaping
      cleaned = cleaned.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      sanitized[key] = cleaned;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nestedResult = sanitizeLlmInput(value);
      sanitized[key] = nestedResult.sanitized;
      if (!nestedResult.isSafe) {
        isSafe = false;
        warnings.push(...nestedResult.warnings);
      }
    } else {
      sanitized[key] = value;
    }
  }

  return {
    sanitized,
    isSafe,
    warnings,
  };
}
