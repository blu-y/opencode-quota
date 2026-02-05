/**
 * Environment variable template resolution.
 *
 * Supports {env:VAR_NAME} syntax for referencing environment variables in config values.
 */

/**
 * Resolve {env:VAR_NAME} syntax in a string value.
 *
 * If the value matches the pattern `{env:VAR_NAME}`, looks up the environment
 * variable and returns its trimmed value. Returns null if the env var is
 * not set or is empty/whitespace-only.
 *
 * If the value does not match the pattern, returns the original value unchanged.
 *
 * @param value - The string value to resolve
 * @returns The resolved value, or null if env var is missing/empty
 *
 * @example
 * // With OPENAI_API_KEY="sk-123" in environment:
 * resolveEnvTemplate("{env:OPENAI_API_KEY}") // => "sk-123"
 * resolveEnvTemplate("{env:MISSING_VAR}")    // => null
 * resolveEnvTemplate("literal-value")        // => "literal-value"
 */
export function resolveEnvTemplate(value: string): string | null {
  const match = value.match(/^\{env:([^}]+)\}$/);
  if (!match) return value;

  const envVar = match[1];
  const envValue = process.env[envVar];
  return envValue && envValue.trim().length > 0 ? envValue.trim() : null;
}
