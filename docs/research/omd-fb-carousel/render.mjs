import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "out");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1080, height: 1350 },
  deviceScaleFactor: 2,
});

await page.goto(`file://${join(root, "slides.html")}`, { waitUntil: "load" });
await page.evaluate(async () => {
  if (document.fonts?.ready) await document.fonts.ready;
});

const slides = await page.$$(".slide");
for (let i = 0; i < slides.length; i++) {
  const file = join(outDir, `0${i + 1}-slide.png`);
  await slides[i].screenshot({ path: file, type: "png" });
  console.log("wrote", file);
}

await browser.close();
