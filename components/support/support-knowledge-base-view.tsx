"use client";

import { useMemo, useState } from "react";
import {
  SUPPORT_OWNER_TITLES,
  SUPPORT_MAILBOX,
  supportCategoryLabel,
} from "@/lib/support/catalog";
import {
  LAUNCH_SUPPORT_ARTICLES,
  type LaunchSupportArticle,
} from "@/lib/support/knowledge-base";

export function SupportKnowledgeBaseView() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string>(LAUNCH_SUPPORT_ARTICLES[0]?.id ?? "");

  const articles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return LAUNCH_SUPPORT_ARTICLES;
    return LAUNCH_SUPPORT_ARTICLES.filter((article) => {
      const haystack = [
        article.title,
        article.id,
        article.ticketCategory,
        article.participantFacing,
        article.internal,
      ]
        .join("\n")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query]);

  const active =
    articles.find((article) => article.id === openId) ?? articles[0] ?? null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-bh-ink">
      <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
        Launch support knowledge base
      </h1>
      <p className="mt-3 max-w-3xl font-sans text-sm font-light text-bh-muted">
        Row 156 operating answers for Architect Support. Participant-facing
        scripts match production behavior. Internal notes are for operators
        only. Mailbox: {SUPPORT_MAILBOX}. Primary: Nia Prism — Chief Experience
        and Transformation Officer. Do not promise refunds. Do not say
        Community is live on August 31, 2026.
      </p>
      <p className="mt-4 font-sans text-sm">
        <a href="/ops/admin/support" className="underline decoration-bh-purple/30">
          Support tickets
        </a>
        {" · "}
        <a href="/ops/support" className="underline decoration-bh-purple/30">
          Account lookup
        </a>
      </p>

      <label className="mt-8 block max-w-xl font-sans text-sm">
        <span className="text-bh-muted">Find an answer</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-2 w-full rounded-sm border border-bh-purple/20 bg-white px-3 py-2"
          placeholder="login, receipt, Lumina, cancellation…"
        />
      </label>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label="Knowledge base topics">
          <ul className="space-y-1 font-sans text-sm">
            {articles.length === 0 ? (
              <li className="text-bh-muted">No matching articles.</li>
            ) : (
              articles.map((article) => (
                <li key={article.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(article.id)}
                    className={`w-full rounded-sm px-3 py-2 text-left ${
                      active?.id === article.id
                        ? "bg-bh-purple/10 text-bh-ink"
                        : "text-bh-muted hover:bg-bh-purple/5"
                    }`}
                  >
                    {article.title}
                  </button>
                </li>
              ))
            )}
          </ul>
        </nav>

        {active ? <ArticlePanel article={active} /> : null}
      </div>
    </main>
  );
}

function ArticlePanel({ article }: { article: LaunchSupportArticle }) {
  return (
    <article className="min-w-0">
      <p className="font-sans text-xs uppercase tracking-[0.14em] text-bh-muted">
        {supportCategoryLabel(article.ticketCategory)} · {article.priorityHint} ·{" "}
        {SUPPORT_OWNER_TITLES[article.owner]}
      </p>
      <h2 className="mt-2 font-display text-3xl">{article.title}</h2>

      <section className="mt-8">
        <h3 className="font-display text-xl">Participant-facing reply</h3>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-sm border border-bh-purple/15 bg-white px-4 py-4 font-sans text-sm font-light leading-relaxed text-bh-ink">
          {article.participantFacing}
        </pre>
      </section>

      <section className="mt-8">
        <h3 className="font-display text-xl">Internal</h3>
        <p className="mt-3 font-sans text-sm font-light leading-relaxed text-bh-muted">
          {article.internal}
        </p>
      </section>

      <section className="mt-8">
        <h3 className="font-display text-xl">Never</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 font-sans text-sm text-bh-muted">
          {article.never.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h3 className="font-display text-xl">Escalate when</h3>
        <p className="mt-3 font-sans text-sm font-light leading-relaxed text-bh-muted">
          {article.escalateWhen}
        </p>
      </section>
    </article>
  );
}
