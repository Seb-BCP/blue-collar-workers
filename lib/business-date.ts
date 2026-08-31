/**
 * Work dates from the RPC are date-only values, not instants. Keep the portal's
 * definition of "current week" anchored to the operational Australian timezone
 * so an SSR response and a supervisor's device agree around Sunday/Monday.
 */
const BUSINESS_TIME_ZONE = 'Australia/Perth';

export function businessTodayKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');

  if (!year || !month || !day) {
    throw new Error('Could not calculate the operational date.');
  }

  return `${year}-${month}-${day}`;
}

export function localDateFromKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Expected an ISO date key.');

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
