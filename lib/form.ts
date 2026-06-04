import { z } from "zod";

export function textValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function booleanValue(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

export function numberValue(formData: FormData, name: string) {
  const raw = textValue(formData, name);
  return raw === "" ? 0 : Number(raw);
}

export function actionError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }

  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Please check the form values.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
