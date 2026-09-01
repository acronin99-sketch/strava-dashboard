"use server";

import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { clearStoredPlan, writeStoredPlan } from "@/lib/coach/store";
import { toISODate } from "@/lib/coach/plan";
import { Terrain } from "@/lib/coach/types";

const TERRAINS = new Set<Terrain>(["road", "trail", "mountain"]);

/** Reads a required positive number, clamped to a sane range. */
function num(form: FormData, field: string, min: number, max: number): number {
  const value = Number(form.get(field));
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be a number`);
  }
  return Math.min(max, Math.max(min, value));
}

function optionalNum(
  form: FormData,
  field: string,
  min: number,
  max: number,
): number | undefined {
  const raw = form.get(field);
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

export async function createPlan(formData: FormData) {
  // The plan is scoped to the Strava session, so an unauthenticated caller has
  // nothing to build against. Checked here as well as in the page, since a
  // Server Action is a public endpoint regardless of where the form renders.
  const session = await readSession();
  if (!session) redirect("/");

  const terrain = String(formData.get("terrain") ?? "trail") as Terrain;
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Race date must be a valid date");
  }

  const goalHours = optionalNum(formData, "goalHours", 0.25, 60);

  await writeStoredPlan({
    race: {
      name: name || "Goal race",
      date,
      distanceMiles: num(formData, "distanceMiles", 1, 250),
      elevationGainFeet: num(formData, "elevationGainFeet", 0, 60000),
      terrain: TERRAINS.has(terrain) ? terrain : "trail",
      goalTimeMinutes: goalHours === undefined ? undefined : goalHours * 60,
    },
    profile: {
      weeklyMiles: num(formData, "weeklyMiles", 1, 200),
      longRunMiles: num(formData, "longRunMiles", 1, 100),
      weeklyElevationFeet: num(formData, "weeklyElevationFeet", 0, 40000),
      daysPerWeek: Math.round(num(formData, "daysPerWeek", 3, 7)),
      longRunDay: Math.round(num(formData, "longRunDay", 0, 6)),
      easyPaceMinPerMile: optionalNum(formData, "easyPaceMinPerMile", 4, 20),
      maxHeartrate: optionalNum(formData, "maxHeartrate", 120, 230),
    },
    startDate: toISODate(new Date()),
  });

  redirect("/coach");
}

export async function deletePlan() {
  await clearStoredPlan();
  redirect("/coach");
}
