const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const materialDir = __dirname;
const pdfDir = path.join(materialDir, "pdf");

const materials = [
  "accountant-referral-one-pager",
  "client-retirement-questions-handout",
  "referral-fit-guide",
];

function fileUrl(filePath) {
  return `file:///${filePath.replace(/\\/g, "/").replace(/ /g, "%20")}`;
}

async function main() {
  await fs.mkdir(pdfDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-crash-reporter",
      "--disable-breakpad",
    ],
  });

  try {
    for (const name of materials) {
      const page = await browser.newPage({
        viewport: { width: 816, height: 1056 },
        deviceScaleFactor: 1,
      });

      await page.goto(fileUrl(path.join(materialDir, `${name}.html`)), {
        waitUntil: "load",
      });
      await page.emulateMedia({ media: "print" });
      await page.pdf({
        path: path.join(pdfDir, `${name}.pdf`),
        format: "Letter",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      await page.close();
    }
  } finally {
    await browser.close();
  }

  for (const name of materials) {
    const output = path.join(pdfDir, `${name}.pdf`);
    const stat = await fs.stat(output);
    console.log(`${output} (${stat.size} bytes)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
