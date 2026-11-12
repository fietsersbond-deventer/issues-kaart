import type { SanitizedHTML } from "./SanitizedHTML";

export type Tag = {
  id: number;
  tag: string;
  label: string | null;
  description: SanitizedHTML | null;
  icon: string | null;
};
