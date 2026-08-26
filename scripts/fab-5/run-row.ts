import { completeAugustLaunchRow, runFounderCommand } from "@/lib/fab-5";

async function main(): Promise<void> {
  const input = process.argv.slice(2).join(" ").trim();
  if (!input) {
    console.error('Usage: npx tsx scripts/fab-5/run-row.ts "Complete August Launch Row 15."');
    process.exit(1);
  }
  const rowMatch = input.match(/row\s+(\d+)/i);
  const result = rowMatch
    ? await completeAugustLaunchRow(Number.parseInt(rowMatch[1], 10), { readOnly: true })
    : await runFounderCommand(input, { mode: "normal" });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
