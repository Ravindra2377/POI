export type CivicRecordKind =
  | "scheme"
  | "project"
  | "budget"
  | "public_money"
  | "procurement"
  | "officeholder"
  | "election_result";

export interface CivicRecordReference {
  id: string;
  kind: CivicRecordKind;
  title: string;
  href: string;
}

export interface CivicTrackedRecord extends CivicRecordReference {
  followed_at: string;
}

export interface CivicDiaryEntry {
  id: string;
  action: "followed" | "removed";
  record: CivicRecordReference;
  occurred_at: string;
}

interface CivicTrackingState {
  version: 1;
  watchlist: CivicTrackedRecord[];
  diary: CivicDiaryEntry[];
}

const STORAGE_KEY = "viksit_civic_tracking_v1";
const CHANGE_EVENT = "viksit:civic-tracking-changed";
const RECORD_LIMIT = 200;
const DIARY_LIMIT = 300;
const KINDS = new Set<CivicRecordKind>([
  "scheme",
  "project",
  "budget",
  "public_money",
  "procurement",
  "officeholder",
  "election_result",
]);

const emptyState = (): CivicTrackingState => ({
  version: 1,
  watchlist: [],
  diary: [],
});

function validReference(value: unknown): value is CivicRecordReference {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CivicRecordReference>;
  return (
    typeof record.id === "string" &&
    record.id.length > 2 &&
    record.id.length <= 240 &&
    typeof record.kind === "string" &&
    KINDS.has(record.kind as CivicRecordKind) &&
    typeof record.title === "string" &&
    record.title.trim().length > 0 &&
    record.title.length <= 300 &&
    typeof record.href === "string" &&
    record.href.startsWith("/") &&
    !record.href.startsWith("//") &&
    !record.href.includes("\\") &&
    record.href.length <= 500
  );
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function parseState(value: unknown): CivicTrackingState {
  if (!value || typeof value !== "object") return emptyState();
  const candidate = value as Partial<CivicTrackingState>;
  const watchlist = Array.isArray(candidate.watchlist)
    ? candidate.watchlist
        .filter(
          (record): record is CivicTrackedRecord =>
            validReference(record) && validDate(record.followed_at),
        )
        .slice(0, RECORD_LIMIT)
    : [];
  const diary = Array.isArray(candidate.diary)
    ? candidate.diary
        .filter(
          (entry): entry is CivicDiaryEntry =>
            Boolean(entry) &&
            typeof entry.id === "string" &&
            (entry.action === "followed" || entry.action === "removed") &&
            validReference(entry.record) &&
            validDate(entry.occurred_at),
        )
        .slice(0, DIARY_LIMIT)
    : [];
  return { version: 1, watchlist, diary };
}

export function readCivicTracking(): CivicTrackingState {
  if (typeof window === "undefined") return emptyState();
  try {
    return parseState(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return emptyState();
  }
}

function writeCivicTracking(state: CivicTrackingState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Tracking stays unavailable when browser storage is blocked or full.
  }
}

function cleanReference(record: CivicRecordReference): CivicRecordReference {
  if (!validReference(record))
    throw new Error("Invalid civic record reference");
  return {
    id: record.id,
    kind: record.kind,
    title: record.title.trim(),
    href: record.href,
  };
}

export function isCivicRecordFollowed(recordId: string): boolean {
  return readCivicTracking().watchlist.some((record) => record.id === recordId);
}

export function followCivicRecord(record: CivicRecordReference): void {
  const clean = cleanReference(record);
  const state = readCivicTracking();
  if (state.watchlist.some((item) => item.id === clean.id)) return;
  const now = new Date().toISOString();
  writeCivicTracking({
    version: 1,
    watchlist: [{ ...clean, followed_at: now }, ...state.watchlist].slice(
      0,
      RECORD_LIMIT,
    ),
    diary: [
      {
        id: `${clean.id}:followed:${now}`,
        action: "followed" as const,
        record: clean,
        occurred_at: now,
      },
      ...state.diary,
    ].slice(0, DIARY_LIMIT),
  });
}

export function unfollowCivicRecord(record: CivicRecordReference): void {
  const clean = cleanReference(record);
  const state = readCivicTracking();
  if (!state.watchlist.some((item) => item.id === clean.id)) return;
  const now = new Date().toISOString();
  writeCivicTracking({
    version: 1,
    watchlist: state.watchlist.filter((item) => item.id !== clean.id),
    diary: [
      {
        id: `${clean.id}:removed:${now}`,
        action: "removed" as const,
        record: clean,
        occurred_at: now,
      },
      ...state.diary,
    ].slice(0, DIARY_LIMIT),
  });
}

export function clearCivicDiary(): void {
  const state = readCivicTracking();
  writeCivicTracking({ ...state, diary: [] });
}

export function subscribeCivicTracking(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
