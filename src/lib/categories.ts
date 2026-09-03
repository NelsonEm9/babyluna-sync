import type { TaskCategory } from "@/lib/database.types";

export const CATEGORY_ORDER: TaskCategory[] = [
  "feeding",
  "sleep",
  "diapers",
  "tummy_time",
  "bath",
  "medicine",
];

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  feeding: "Feeding",
  sleep: "Sleep",
  diapers: "Diapers",
  tummy_time: "Tummy Time",
  bath: "Bath",
  medicine: "Medicine",
};
