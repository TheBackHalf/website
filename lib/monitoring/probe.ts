export type HttpProbeResult = {
  url: string;
  origin: string;
  path: string;
  ok: boolean;
  status: number;
  ms: number;
  error?: string;
  classified: "healthy" | "failed" | "missing" | "unreachable";
};

function classifyStatus(
  status: number,
  acceptRedirect: boolean,
): HttpProbeResult["classified"] {
  if (status === 0) return "unreachable";
  if (status === 404) return "missing";
  if (status >= 500) return "failed";
  if (status >= 200 && status < 300) return "healthy";
  if (acceptRedirect && status >= 300 && status < 400) return "healthy";
  return "failed";
}

export async function probeHttp(
  origin: string,
  path: string,
  options?: { acceptRedirect?: boolean; timeoutMs?: number },
): Promise<HttpProbeResult> {
  const url = `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "TheBackHalf-Row61-Monitor/1.0" },
      signal: AbortSignal.timeout(options?.timeoutMs ?? 15000),
    });
    const classified = classifyStatus(
      response.status,
      options?.acceptRedirect === true,
    );
    return {
      url,
      origin,
      path,
      ok: classified === "healthy",
      status: response.status,
      ms: Date.now() - started,
      classified,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch_failed";
    const safe =
      /enotfound/i.test(message) || /getaddrinfo/i.test(message)
        ? "dns_not_found"
        : /timeout/i.test(message)
          ? "timeout"
          : "unreachable";
    return {
      url,
      origin,
      path,
      ok: false,
      status: 0,
      ms: Date.now() - started,
      error: safe,
      classified: "unreachable",
    };
  }
}
