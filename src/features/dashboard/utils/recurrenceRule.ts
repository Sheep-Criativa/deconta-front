import { RRule } from "rrule";

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type RecurrenceEndMode = "NEVER" | "UNTIL" | "COUNT";
export type WeekdayId = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export interface RecurrenceRuleFormModel {
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endMode: RecurrenceEndMode;
  untilDate?: string;
  count?: number;
  byweekday: WeekdayId[];
  bymonthday?: number;
}

export interface ParseRecurrenceRuleResult {
  model: RecurrenceRuleFormModel;
  advancedRequired: boolean;
  rawRule: string;
}

export const WEEKDAY_OPTIONS: Array<{
  id: WeekdayId;
  shortLabel: string;
  fullLabel: string;
}> = [
  { id: "MO", shortLabel: "S", fullLabel: "Seg" },
  { id: "TU", shortLabel: "T", fullLabel: "Ter" },
  { id: "WE", shortLabel: "Q", fullLabel: "Qua" },
  { id: "TH", shortLabel: "Q", fullLabel: "Qui" },
  { id: "FR", shortLabel: "S", fullLabel: "Sex" },
  { id: "SA", shortLabel: "S", fullLabel: "Sab" },
  { id: "SU", shortLabel: "D", fullLabel: "Dom" },
];

const FREQ_TO_RRULE: Record<RecurrenceFrequency, number> = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
  YEARLY: RRule.YEARLY,
};

const RRULE_TO_FREQ: Record<number, RecurrenceFrequency> = {
  [RRule.DAILY]: "DAILY",
  [RRule.WEEKLY]: "WEEKLY",
  [RRule.MONTHLY]: "MONTHLY",
  [RRule.YEARLY]: "YEARLY",
};

const WEEKDAY_TO_RRULE = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
} as const;

const WEEKDAY_FROM_INDEX: WeekdayId[] = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU",
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toUtcRRuleDate(date: Date) {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
}

function parseRRuleDateToken(value: string): Date | null {
  const cleaned = value.trim();
  const match = cleaned.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/,
  );
  if (!match) return null;

  const [, yyyy, mm, dd, hh = "00", min = "00", ss = "00"] = match;
  const date = new Date(
    Date.UTC(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
      Number(ss),
    ),
  );
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseLocalDateInput(
  dateInput: string,
): { year: number; month: number; day: number } | null {
  const [year, month, day] = dateInput.split("-").map((v) => Number(v));
  if (!year || !month || !day) return null;
  return { year, month, day };
}

export function toDateInputValueUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function defaultRecurrenceStartDate() {
  return toDateInputValueUTC(new Date());
}

function getRRuleClause(rule: RRule): string {
  const serializedLines = rule
    .toString()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rruleLine = serializedLines.find((line) => line.startsWith("RRULE:"));
  if (rruleLine) {
    return rruleLine.replace(/^RRULE:/, "").trim();
  }

  const rawRuleLine = serializedLines.find((line) => line.includes("FREQ="));
  if (rawRuleLine) {
    return rawRuleLine.replace(/^RRULE:/, "").trim();
  }

  throw new Error("Nao foi possivel montar uma RRULE valida.");
}

export function buildRecurrenceRule(model: RecurrenceRuleFormModel): string {
  const parsedStart =
    parseLocalDateInput(model.startDate) ??
    parseLocalDateInput(defaultRecurrenceStartDate());
  if (!parsedStart) {
    throw new Error("Data inicial invalida para recorrencia.");
  }

  const dtstart = new Date(
    Date.UTC(
      parsedStart.year,
      parsedStart.month - 1,
      parsedStart.day,
      12,
      0,
      0,
    ),
  );

  const options: ConstructorParameters<typeof RRule>[0] = {
    freq: FREQ_TO_RRULE[model.frequency],
    interval: Math.max(1, model.interval || 1),
    dtstart,
  };

  if (model.frequency === "WEEKLY" && model.byweekday.length > 0) {
    options.byweekday = model.byweekday.map((day) => WEEKDAY_TO_RRULE[day]);
  }

  if (model.frequency === "MONTHLY" && model.bymonthday) {
    options.bymonthday = [model.bymonthday];
  }

  if (model.endMode === "COUNT" && model.count) {
    options.count = model.count;
  }

  if (model.endMode === "UNTIL" && model.untilDate) {
    const untilParts = parseLocalDateInput(model.untilDate);
    if (!untilParts) {
      throw new Error("Data final invalida para recorrencia.");
    }

    // Use o final do dia em UTC para evitar encerrar um dia antes por offset de timezone.
    options.until = new Date(
      Date.UTC(
        untilParts.year,
        untilParts.month - 1,
        untilParts.day,
        23,
        59,
        59,
      ),
    );
  }

  const rruleString = getRRuleClause(new RRule(options));
  return `DTSTART:${toUtcRRuleDate(dtstart)}\nRRULE:${rruleString}`;
}

function extractParts(ruleInput: string): { dtstart?: string; rrule: string } {
  const trimmed = ruleInput.trim();
  if (!trimmed) {
    throw new Error("RRULE vazia.");
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let dtstart: string | undefined;
  let rrule = "";

  for (const line of lines) {
    if (line.startsWith("DTSTART")) {
      const token = line.includes(":") ? line.split(":").pop() : "";
      if (token) dtstart = token;
      continue;
    }

    if (line.startsWith("RRULE:")) {
      rrule = line.replace(/^RRULE:/, "").trim();
      continue;
    }

    if (!rrule && line.includes("FREQ=")) {
      rrule = line.replace(/^RRULE:/, "").trim();
    }
  }

  if (!rrule) {
    throw new Error("Nao foi possivel encontrar RRULE.");
  }

  return { dtstart, rrule };
}

function toNormalizedRuleString(ruleInput: string): string {
  const { dtstart, rrule } = extractParts(ruleInput);
  return dtstart ? `DTSTART:${dtstart}\nRRULE:${rrule}` : `RRULE:${rrule}`;
}

function getByWeekdayIds(byweekday: unknown): WeekdayId[] {
  if (!Array.isArray(byweekday)) return [];

  const ids = byweekday
    .map((entry) => {
      if (typeof entry === "number") {
        return WEEKDAY_FROM_INDEX[entry] ?? null;
      }
      if (typeof entry === "object" && entry !== null && "weekday" in entry) {
        const dayIndex = Number((entry as { weekday: number }).weekday);
        return WEEKDAY_FROM_INDEX[dayIndex] ?? null;
      }
      return null;
    })
    .filter((entry): entry is WeekdayId => !!entry);

  return Array.from(new Set(ids));
}

function extractRuleKeys(rawRrule: string): string[] {
  return rawRrule
    .split(";")
    .map((part) => part.split("=")[0]?.trim().toUpperCase())
    .filter((key): key is string => !!key);
}

function isAdvancedRule(
  rawRrule: string,
  model: RecurrenceRuleFormModel,
): boolean {
  const supported = new Set([
    "FREQ",
    "INTERVAL",
    "BYDAY",
    "BYMONTHDAY",
    "COUNT",
    "UNTIL",
    "WKST",
  ]);
  const keys = extractRuleKeys(rawRrule);
  if (keys.some((key) => !supported.has(key))) {
    return true;
  }

  if (
    model.frequency === "MONTHLY" &&
    model.byweekday.length > 0 &&
    !model.bymonthday
  ) {
    return true;
  }

  const bymonthdayRaw = rawRrule
    .split(";")
    .find((part) => part.toUpperCase().startsWith("BYMONTHDAY="));

  if (bymonthdayRaw && bymonthdayRaw.includes(",")) {
    return true;
  }

  return false;
}

export function parseRecurrenceRule(
  ruleInput: string,
): ParseRecurrenceRuleResult {
  const normalized = toNormalizedRuleString(ruleInput);
  const { dtstart, rrule } = extractParts(ruleInput);

  const parsed = RRule.fromString(normalized);
  const options = parsed.options;

  const freq = RRULE_TO_FREQ[options.freq];
  if (!freq) {
    throw new Error("Frequencia da RRULE nao suportada.");
  }

  const startDate = options.dtstart
    ? toDateInputValueUTC(options.dtstart)
    : dtstart
      ? toDateInputValueUTC(parseRRuleDateToken(dtstart) ?? new Date())
      : defaultRecurrenceStartDate();

  const bymonthdayArray = Array.isArray(options.bymonthday)
    ? options.bymonthday
    : [];
  const bymonthday = bymonthdayArray.find(
    (day) => typeof day === "number" && day >= 1 && day <= 31,
  );

  const model: RecurrenceRuleFormModel = {
    frequency: freq,
    interval: Math.max(1, options.interval || 1),
    startDate,
    endMode: options.until ? "UNTIL" : options.count ? "COUNT" : "NEVER",
    untilDate: options.until ? toDateInputValueUTC(options.until) : undefined,
    count: options.count ?? undefined,
    byweekday: getByWeekdayIds(options.byweekday),
    bymonthday: typeof bymonthday === "number" ? bymonthday : undefined,
  };

  return {
    model,
    advancedRequired: isAdvancedRule(rrule, model),
    rawRule: normalized,
  };
}

export function validateRecurrenceRule(ruleInput: string): string | null {
  try {
    const normalized = toNormalizedRuleString(ruleInput);
    RRule.fromString(normalized);
    return null;
  } catch (error) {
    if (error instanceof Error) return error.message;
    return "RRULE invalida.";
  }
}

export function getRecurrencePreviewDates(
  ruleInput: string,
  maxOccurrences = 4,
): Date[] {
  try {
    const normalized = toNormalizedRuleString(ruleInput);
    const parsed = RRule.fromString(normalized);
    const now = new Date();
    const limit = new Date();
    limit.setFullYear(now.getFullYear() + 2);
    return parsed.between(now, limit, true).slice(0, maxOccurrences);
  } catch {
    return [];
  }
}

export function recurrenceRuleSummary(model: RecurrenceRuleFormModel): string {
  const freqLabel: Record<RecurrenceFrequency, string> = {
    DAILY: "todo dia",
    WEEKLY: "semanal",
    MONTHLY: "mensal",
    YEARLY: "anual",
  };

  const pieces: string[] = [];

  if (model.interval > 1) {
    pieces.push(`A cada ${model.interval}`);
  } else {
    pieces.push("Todo");
  }

  if (model.frequency === "DAILY") {
    pieces.push(model.interval > 1 ? "dias" : "dia");
  } else if (model.frequency === "WEEKLY") {
    pieces.push(model.interval > 1 ? "semanas" : "semana");
    if (model.byweekday.length > 0) {
      const labels = model.byweekday
        .map(
          (id) => WEEKDAY_OPTIONS.find((day) => day.id === id)?.fullLabel ?? id,
        )
        .join(", ");
      pieces.push(`(${labels})`);
    }
  } else if (model.frequency === "MONTHLY") {
    pieces.push(model.interval > 1 ? "meses" : "mes");
    if (model.bymonthday) {
      pieces.push(`no dia ${model.bymonthday}`);
    }
  } else {
    pieces.push(model.interval > 1 ? "anos" : "ano");
  }

  if (model.endMode === "UNTIL" && model.untilDate) {
    pieces.push(`ate ${model.untilDate}`);
  }

  if (model.endMode === "COUNT" && model.count) {
    pieces.push(`por ${model.count} ocorrencia${model.count > 1 ? "s" : ""}`);
  }

  if (pieces.length === 0) {
    return freqLabel[model.frequency];
  }

  return pieces.join(" ");
}

export function toRRuleExpression(ruleInput: string): string {
  return extractParts(ruleInput).rrule;
}
