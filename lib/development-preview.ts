import type { ClientWorker, ClientWorkerBooking } from '@/lib/client-workers';
import { businessTodayKey, localDateFromKey } from '@/lib/business-date';

export const developmentPreviewClientName = 'Client';

/**
 * This branch exists only to make `next dev` useful before a Supabase account
 * is available. It never runs in a Vercel production or preview deployment.
 */
export function isDevelopmentPreview(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Isolated fixture data for the unauthenticated local preview.
 * Do not reuse this data in production or make the workforce RPC anonymous.
 * Classification is included solely to preview the requested booking summary.
 */
export function getDevelopmentPreviewWorkers(): ClientWorker[] {
  const monday = mondayFor(localDateFromKey(businessTodayKey()));
  const day = (offset: number) => dateKey(addDays(monday, offset));

  return [
    {
      name: 'Jordan Mitchell',
      phone: '0412 345 678',
      photoUrl: '/mock-workers/jordan-mitchell.png',
      assignedDates: [day(0), day(1), day(2), day(3), day(4)],
      classification: 'Forklift',
      bookings: [
        fixtureBooking(
          'jordan-mitchell-week-1',
          day(-4),
          day(4),
          true,
          [day(0), day(1), day(2), day(3), day(4)],
        ),
      ],
    },
    {
      name: 'Priya Nair',
      phone: '0438 691 420',
      photoUrl: null,
      assignedDates: [day(0), day(1), day(3), day(4)],
      classification: 'Forklift',
      bookings: [
        fixtureBooking(
          'priya-nair-week-1',
          day(-3),
          day(7),
          false,
          [day(0), day(1), day(3), day(4)],
        ),
      ],
    },
    {
      name: 'Alex Morgan',
      phone: null,
      photoUrl: null,
      assignedDates: [day(1), day(2), day(3), day(4), day(5)],
      classification: 'Forklift',
      bookings: [
        fixtureBooking(
          'alex-morgan-week-1',
          day(-14),
          null,
          false,
          [day(1), day(2), day(3), day(4), day(5)],
        ),
      ],
    },
    {
      name: 'Tahlia Wood',
      phone: '0401 853 279',
      photoUrl: null,
      assignedDates: [day(0), day(2), day(4)],
      classification: 'Forklift',
      bookings: [
        fixtureBooking(
          'tahlia-wood-week-1',
          day(-2),
          day(10),
          false,
          [day(0), day(2), day(4)],
        ),
      ],
    },
    {
      name: 'Samuel O’Connor-Williams',
      phone: '0427 710 496',
      photoUrl: null,
      assignedDates: [day(0), day(1), day(2), day(3), day(4)],
      classification: 'Forklift',
      bookings: [
        fixtureBooking(
          'samuel-oconnor-williams-week-1',
          day(0),
          day(4),
          true,
          [day(0), day(1), day(2), day(3), day(4)],
        ),
      ],
    },
    {
      name: 'Mia Clarke',
      phone: '0450 230 118',
      photoUrl: null,
      assignedDates: [day(1), day(2), day(4), day(5)],
      classification: 'HR',
      bookings: [
        fixtureBooking(
          'mia-clarke-week-1',
          day(-1),
          day(8),
          true,
          [day(1), day(2), day(4), day(5)],
        ),
      ],
    },
    {
      name: 'Daniel Hart',
      phone: '0419 562 310',
      photoUrl: null,
      assignedDates: [day(0), day(1), day(2), day(3)],
      classification: 'Labourer',
      bookings: [
        fixtureBooking(
          'daniel-hart-week-1',
          day(-7),
          day(3),
          false,
          [day(0), day(1), day(2), day(3)],
        ),
      ],
    },
    {
      name: 'Aisha Khan',
      phone: '0408 984 507',
      photoUrl: null,
      assignedDates: [day(2), day(3), day(4), day(6)],
      classification: 'Supervisor',
      bookings: [
        fixtureBooking(
          'aisha-khan-week-1',
          day(-5),
          null,
          false,
          [day(2), day(3), day(4), day(6)],
        ),
      ],
    },
  ];
}

function fixtureBooking(
  key: string,
  startDate: string | null,
  endDate: string | null,
  endDateConfirmed: boolean,
  assignedDates: string[],
): ClientWorkerBooking {
  return {
    key,
    startDate,
    endDate,
    endDateConfirmed,
    assignedDates,
  };
}

function mondayFor(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
