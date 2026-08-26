/** @type {import("puppeteer").Configuration} */
module.exports = {
  // Vercel build logs for dpl_8668NfDrMhiaan6xgtDW7g2mvauU showed ENOSPC while
  // deploying outputs: Puppeteer had downloaded Chrome (264 MB) + headless-shell
  // (179 MB) into the build container. Skip that download on Vercel only.
  skipDownload:
    process.env.VERCEL === "1" ||
    process.env.PUPPETEER_SKIP_DOWNLOAD === "1" ||
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === "1",
};
