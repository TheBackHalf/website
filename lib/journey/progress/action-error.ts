export function chapterActionErrorCode(result: {
  status: string;
  reason?: string;
}): string {
  if (result.status === "locked") {
    return "chapter_locked";
  }
  if (typeof result.reason === "string" && result.reason.length > 0) {
    return result.reason;
  }
  return result.status === "error" ? "error" : result.status;
}
