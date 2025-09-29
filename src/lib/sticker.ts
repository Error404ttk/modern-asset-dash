export const DEFAULT_STICKER_WIDTH_MM = 70;
export const DEFAULT_STICKER_HEIGHT_MM = 25;

export const clampStickerWidth = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_STICKER_WIDTH_MM;
  return Math.min(Math.max(value, 20), 200);
};

export const clampStickerHeight = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_STICKER_HEIGHT_MM;
  return Math.min(Math.max(value, 10), 120);
};
