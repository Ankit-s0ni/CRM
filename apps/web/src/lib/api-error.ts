import axios from "axios";

/**
 * The API returns a stable machine-readable `code` alongside every error message.
 * Branch on the code, never on the message — messages are for humans and change freely.
 */
export function getApiErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError<{ code?: string }>(error)) {
    return error.response?.data?.code;
  }

  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
