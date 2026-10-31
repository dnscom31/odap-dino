const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 한국 시간 기준 오늘 날짜 (YYYY-MM-DD) */
export function kstToday(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** YYYY-MM-DD 에 날짜 더하기 */
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** 11/1(토) 형태 */
export function shortDate(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]})`;
}

/** 11/1(토) ~ 11/7(금), 하루짜리는 날짜 하나 */
export function dateRange(start: string, end: string): string {
  return start === end ? shortDate(start) : `${shortDate(start)} ~ ${shortDate(end)}`;
}

/** 두 날짜 사이 일수 (b - a) */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** 3일 이상 활동이 없으면 공룡이 잠들어요 (벌칙 없음) */
export function isSleeping(lastActive: string | null, today: string): boolean {
  return lastActive !== null && daysBetween(lastActive, today) >= 3;
}

export function isOpenOn(tab: { start_date: string; end_date: string }, day: string): boolean {
  return tab.start_date <= day && day <= tab.end_date;
}
