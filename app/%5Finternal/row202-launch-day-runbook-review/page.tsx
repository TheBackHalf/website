import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow202ReviewModel } from "@/lib/fab-5/row202-review";

export const dynamic = "force-dynamic";

function assertLocalhostOnly(hostHeader: string | null) {
  const host = (hostHeader ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return;
  }
  notFound();
}

function tone(value: string) {
  if (value === "PASS" || value === "NO") return "text-emerald-800";
  if (value === "FAIL") return "text-red-800";
  return "text-amber-900";
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-bh-purple/10 py-2">
      <span className="font-sans text-sm font-light text-bh-muted">{label}</span>
      <span className={`text-right font-sans text-sm font-medium ${tone(value)}`}>
        {value}
      </span>
    </li>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-medium text-bh-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function RunbookBody({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith("|")) {
        tableLines.push(lines[index] ?? "");
        index += 1;
      }
      const rows = tableLines
        .filter((row) => !/^\|\s*-+/.test(row))
        .map((row) =>
          row
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim()),
        );
      const header = rows[0] ?? [];
      const body = rows.slice(1);
      blocks.push(
        <div
          key={`table-${index}`}
          className="overflow-x-auto rounded-lg border border-bh-purple/10"
        >
          <table className="w-full min-w-[36rem] border-collapse text-left font-sans text-sm font-light">
            <thead className="bg-bh-purple/5">
              <tr>
                {header.map((cell) => (
                  <th key={cell} className="px-3 py-2 font-medium text-bh-ink">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={`r-${rowIndex}`} className="border-t border-bh-purple/10">
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${index}`} className="font-serif text-3xl text-bh-ink">
          {line.slice(2)}
        </h1>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${index}`} className="pt-4 font-serif text-2xl text-bh-ink">
          {line.slice(3)}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${index}`} className="font-serif text-xl text-bh-ink">
          {line.slice(4)}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("---")) {
      index += 1;
      continue;
    }

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    blocks.push(
      <p key={`p-${index}`} className="font-sans text-sm font-light leading-relaxed">
        {renderInline(line)}
      </p>,
    );
    index += 1;
  }

  return <div className="space-y-4">{blocks}</div>;
}

export default async function Row202LaunchDayRunbookReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow202ReviewModel();

  return (
    <main className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink md:px-8 md:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-4">
          <p className="bh-eyebrow">Row 202 · Founder Review</p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            Launch-Day Runbook
          </h1>
          <p className="max-w-3xl font-sans text-base font-light leading-relaxed text-bh-muted">
            Consolidated from existing approved operations. No new operational
            design. Row 202 is not marked Complete.
          </p>
          <p className="font-sans text-sm font-medium text-bh-ink">
            {model.status}
          </p>
          <p className="font-sans text-xs font-light text-bh-muted">
            Artifact: {model.namedRunbookPath}
          </p>
        </header>

        <section className="rounded-2xl border border-bh-purple/10 bg-white/80 p-5 md:p-8">
          <h2 className="font-serif text-2xl">Scorecard</h2>
          <ul className="mt-4">
            {Object.entries(model.scorecard).map(([label, value]) => (
              <Status key={label} label={label} value={String(value)} />
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-bh-purple/10 bg-white/80 p-5 md:p-8">
          <h2 className="font-serif text-2xl">Current launch alignment</h2>
          <ul className="mt-4">
            {Object.entries(model.alignment).map(([label, value]) => (
              <Status key={label} label={label} value={String(value)} />
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-bh-purple/10 bg-white/80 p-5 md:p-8">
          <h2 className="font-serif text-2xl">Consolidated runbook</h2>
          <p className="mt-2 font-sans text-xs font-light text-bh-muted">
            Complete operational artifact. Underlying rows are not re-audited
            here.
          </p>
          <div className="mt-6">
            <RunbookBody markdown={model.markdown} />
          </div>
        </section>

        <section className="rounded-2xl border border-bh-purple/10 bg-white/80 p-5 md:p-8">
          <h2 className="font-serif text-2xl">Remaining</h2>
          <p className="mt-3 font-sans text-sm font-light">Dependencies</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-sm font-light">
            {model.remainingDependencies.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 font-sans text-sm font-light">Blockers</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-sm font-light">
            {model.remainingBlockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
