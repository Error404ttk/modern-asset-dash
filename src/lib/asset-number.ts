export interface AssetNumberInfo {
  base: string;
  sequence: string;
  formatted: string;
}

const sanitizeSequence = (value: string | number | null | undefined): string => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value).toString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const numeric = parseInt(trimmed, 10);
      if (numeric > 0) {
        return numeric.toString();
      }
    }
  }

  return "1";
};

export const normalizeAssetNumber = (
  raw: string | null | undefined,
  fallbackSequence?: string | number | null
): AssetNumberInfo => {
  const fallback = sanitizeSequence(fallbackSequence);

  if (!raw) {
    return {
      base: "",
      sequence: fallback,
      formatted: fallback,
    };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      base: "",
      sequence: fallback,
      formatted: fallback,
    };
  }

  let base = trimmed;
  let sequence = fallback;

  const slashIndex = trimmed.lastIndexOf("/");
  if (slashIndex !== -1) {
    const baseCandidate = trimmed.slice(0, slashIndex).trim();
    const sequenceCandidate = trimmed.slice(slashIndex + 1).trim();

    if (baseCandidate) {
      base = baseCandidate;
    }

    if (/^\d+$/.test(sequenceCandidate)) {
      const numeric = parseInt(sequenceCandidate, 10);
      if (numeric > 0) {
        sequence = numeric.toString();
      }
    }
  }

  if (!base) {
    base = trimmed;
  }

  if (!sequence || !/^\d+$/.test(sequence)) {
    sequence = "1";
  }

  return {
    base,
    sequence,
    formatted: base ? `${base}/${sequence}` : sequence,
  };
};

export const extractSequenceFromAssetNumber = (
  raw: string | null | undefined
): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const slashIndex = trimmed.lastIndexOf("/");
  if (slashIndex === -1) return null;
  const sequenceCandidate = trimmed.slice(slashIndex + 1).trim();
  return /^\d+$/.test(sequenceCandidate) ? sequenceCandidate : null;
};

export const joinAssetNumber = (base: string, sequence: string | number): string => {
  const cleanedBase = base.trim();
  const sanitizedSequence = sanitizeSequence(sequence);
  return cleanedBase ? `${cleanedBase}/${sanitizedSequence}` : sanitizedSequence;
};
