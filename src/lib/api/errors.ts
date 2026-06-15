export type DppErrorEnvelope = {
  error: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
};

export class DppApiError extends Error {
  status: number;
  envelope: DppErrorEnvelope;

  constructor(status: number, envelope: DppErrorEnvelope) {
    super(envelope.message);
    this.name = "DppApiError";
    this.status = status;
    this.envelope = envelope;
  }
}

export function isDppError(value: unknown): value is DppApiError {
  return value instanceof DppApiError;
}

export function userFacingError(error: unknown) {
  if (isDppError(error)) {
    return `${error.envelope.error}: ${error.envelope.message}`;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
