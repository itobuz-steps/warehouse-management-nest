type ApiEnvelope<T = unknown> = {
  success?: unknown;
  message?: unknown;
  data?: T;
};

export function unwrapToolResponse(result: unknown): unknown {
  if (!result || typeof result !== 'object') {
    return result;
  }

  const candidate = result as ApiEnvelope;
  const hasEnvelopeKeys =
    'data' in candidate && ('success' in candidate || 'message' in candidate);

  if (!hasEnvelopeKeys) {
    return result;
  }

  return candidate.data;
}
