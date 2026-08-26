/**
 * Displays approved Core Teaching on the Founder Welcome surface.
 * Does not add a separate progress step and does not rewrite curriculum.
 */
export function CoreTeachingBlock({
  heading,
  lines,
}: {
  heading: string;
  lines: readonly string[];
}) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="bh-onboarding-prose mt-10" data-bh-core-teaching="">
      <h3 className="bh-onboarding-subheading">{heading}</h3>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
