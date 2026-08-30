import type { FieldType } from "@prisma/client";

export const FIELD_SLUGS: Record<string, FieldType> = {
  calcetto: "CALCETTO",
  padel: "PADEL",
  tennis: "TENNIS",
};

export const FIELD_TYPE_TO_SLUG: Record<FieldType, string> = {
  CALCETTO: "calcetto",
  PADEL: "padel",
  TENNIS: "tennis",
};

export function slugToFieldType(slug: string): FieldType | null {
  return FIELD_SLUGS[slug.toLowerCase()] ?? null;
}
