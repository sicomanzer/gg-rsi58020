import { updateSet100FromPdfUrl } from "../src/set100/updateSet100FromPdfUrl.js";

function arg(name, fallback = null) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function main() {
  const url =
    arg("url") ||
    // Default: the official PDF we used originally (user can override when SET updates)
    "https://media.set.or.th/set/Documents/2025/Feb/SET50_100_H1_2025_revise.pdf";

  const { meta } = await updateSet100FromPdfUrl({ url });
  console.log(`Updated data/set100.json (${meta.count} symbols)`);
  console.log(`Source: ${meta.sourceUrl}`);
  console.log(`FetchedAt: ${meta.fetchedAt}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

