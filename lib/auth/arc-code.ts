const ARC_PREFIX = "ARC";
const ARC_SEGMENT_LENGTH = 6;
const ARC_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSegment(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let segment = "";

  for (let index = 0; index < length; index += 1) {
    segment += ARC_ALPHABET[bytes[index]! % ARC_ALPHABET.length];
  }

  return segment;
}

export function formatArcCode(segment: string): string {
  return `${ARC_PREFIX}-${segment}`;
}

/** Generate a candidate ARC code segment (uniqueness checked by caller). */
export function generateArcCodeCandidate(): string {
  return formatArcCode(randomSegment(ARC_SEGMENT_LENGTH));
}
