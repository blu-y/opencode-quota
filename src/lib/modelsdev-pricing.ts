import { readFileSync } from "fs";

export type CostBuckets = {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
  reasoning?: number;
};

type Snapshot = {
  _meta: {
    source: string;
    generatedAt: number;
    providers: string[];
    units: string;
  };
  providers: Record<string, Record<string, CostBuckets>>;
};

let SNAPSHOT: Snapshot | null = null;

function ensureLoaded(): Snapshot {
  if (SNAPSHOT) return SNAPSHOT;
  const url = new URL("../data/modelsdev-pricing.min.json", import.meta.url);
  const raw = readFileSync(url, "utf-8");
  SNAPSHOT = JSON.parse(raw) as Snapshot;
  return SNAPSHOT;
}

export function getPricingSnapshotMeta(): Snapshot["_meta"] {
  return ensureLoaded()._meta;
}

export function hasProvider(providerId: string): boolean {
  return !!ensureLoaded().providers[providerId];
}

export function getProviderModelCount(providerId: string): number {
  return Object.keys(ensureLoaded().providers[providerId] || {}).length;
}

export function listProviders(): string[] {
  return Object.keys(ensureLoaded().providers);
}

export function lookupCost(providerId: string, modelId: string): CostBuckets | null {
  const p = ensureLoaded().providers[providerId];
  if (!p) return null;
  const c = p[modelId];
  if (!c) return null;
  return c;
}
