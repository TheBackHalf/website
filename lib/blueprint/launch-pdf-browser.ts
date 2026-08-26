import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Resolve a Chrome/Chromium binary Puppeteer can actually launch.
 * Cursor/sandbox installs often set PUPPETEER_CACHE_DIR to a missing cache;
 * fall back to the system browser so Decision Statement downloads still work.
 */
export function resolvePdfBrowserExecutable(): string | undefined {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  const candidates: string[] = [];
  if (fromEnv) candidates.push(fromEnv);

  if (process.platform === "win32") {
    const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
    const programFilesX86 =
      process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA || "";
    candidates.push(
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(
        programFilesX86,
        "Google",
        "Chrome",
        "Application",
        "chrome.exe",
      ),
      path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    );
  }

  return candidates.find((candidate) => candidate && existsSync(candidate));
}

export async function launchPdfBrowser() {
  const { isHostedProduction } = await import("@/lib/analytics/db");
  if (isHostedProduction() || process.env.VERCEL === "1") {
    throw new Error("blueprint_chrome_unavailable");
  }
  const puppeteer = await import("puppeteer");
  let bundled: string | undefined;
  try {
    const bundledPath = puppeteer.default.executablePath();
    if (bundledPath && existsSync(bundledPath)) {
      bundled = bundledPath;
    }
  } catch {
    bundled = undefined;
  }

  const executablePath = bundled || resolvePdfBrowserExecutable();

  return puppeteer.default.launch({
    headless: true,
    protocolTimeout: 300_000,
    args: ["--disable-dev-shm-usage"],
    ...(executablePath ? { executablePath } : {}),
  });
}
