import type { Plan } from "@toolhub/db";

export interface PlanLimits {
  name: string;
  /** Server-processed tasks per UTC day. */
  tasksPerDay: number;
  /** AI credits granted every month. */
  monthlyCredits: number;
  /** Public API requests per day. 0 = no API access. */
  apiPerDay: number;
  ads: boolean;
  /** Use the tool's `proMB` file-size limit instead of `freeMB`. */
  bigFiles: boolean;
}

export const PLANS: Record<Plan, PlanLimits> = {
  FREE: { name: "Free", tasksPerDay: 15, monthlyCredits: 3, apiPerDay: 0, ads: true, bigFiles: false },
  PRO: { name: "Pro", tasksPerDay: 500, monthlyCredits: 100, apiPerDay: 1000, ads: false, bigFiles: true },
  TEAM: { name: "Team", tasksPerDay: 2000, monthlyCredits: 300, apiPerDay: 10000, ads: false, bigFiles: true },
};
/** Visitors who are not signed in. */
export const ANON = { tasksPerDay: 5, bigFiles: false } as const;

export const PRICES = { proMonthly: 8, proYearly: 72, creditPack: { credits: 100, price: 5 } };

export type CheckoutProduct = "pro_monthly" | "pro_yearly" | "team_monthly" | "credits_100";
/** Lemon Squeezy variant ids come from the environment so no secrets or ids live in code. */
export const variantFor = (p: CheckoutProduct) => ({ pro_monthly: process.env.LS_VARIANT_PRO_MONTHLY, pro_yearly: process.env.LS_VARIANT_PRO_YEARLY, team_monthly: process.env.LS_VARIANT_TEAM_MONTHLY, credits_100: process.env.LS_VARIANT_CREDITS_100 })[p];
export function planForVariant(id: string): Plan | null {
  if (id && (id === process.env.LS_VARIANT_PRO_MONTHLY || id === process.env.LS_VARIANT_PRO_YEARLY)) return "PRO";
  if (id && id === process.env.LS_VARIANT_TEAM_MONTHLY) return "TEAM";
  return null;
}
