'use client';

import { useMemo, useState } from 'react';
import type { ClientWorker } from '@/lib/client-workers';
import { localDateFromKey } from '@/lib/business-date';
import { Brand } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';
import { WorkerAvatar } from '@/components/worker-avatar';

type ClientPortalProps = {
  workers: ClientWorker[];
  clientName: string;
  title?: string;
  initialBusinessDate: string;
  mode: 'authenticated' | 'development-preview' | 'admin-preview';
  userEmail?: string;
};

type ClassificationCount = {
  classification: string;
  count: number;
};

const shortWeekday = new Intl.DateTimeFormat('en-AU', { weekday: 'short' });
const dayNumber = new Intl.DateTimeFormat('en-AU', { day: 'numeric' });
const calendarDate = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
});
const rangeStart = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
});
const rangeEndSameMonth = new Intl.DateTimeFormat('en-AU', { day: 'numeric' });
const rangeEndDifferentMonth = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function ClientPortal({
  workers,
  clientName,
  title: titleOverride,
  userEmail,
  initialBusinessDate,
  mode,
}: ClientPortalProps) {
  const currentWeekStart = mondayFor(localDateFromKey(initialBusinessDate));
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const classificationCounts = useMemo(
    () => weeklyClassificationCounts(workers, days),
    [workers, days],
  );
  const isCurrentWeek = dateKey(weekStart) === dateKey(currentWeekStart);
  const weekRange = formatWeekRange(days[0], days[6]);
  const title = titleOverride ?? `${clientName} – BCP Workers`;
  const isDevelopmentPreview = mode === 'development-preview';
  const isAdminPreview = mode === 'admin-preview';

  return (
    <div className="site-shell">
      <header className="topbar">
        <Brand />
        {isDevelopmentPreview ? (
          <span className="preview-badge">
            <span className="preview-badge-full">Development preview</span>
            <span className="preview-badge-short">Preview</span> · mock data
          </span>
        ) : (
          <div className="user-controls">
            <div className="user-context">
              <strong>Client portal</strong>
              <span>{userEmail}</span>
            </div>
            {isAdminPreview ? (
              <span className="preview-badge preview-badge--admin">
                <span className="preview-badge-full">Admin preview</span>
                <span className="preview-badge-short">Admin</span> · demo data
              </span>
            ) : null}
            <LogoutButton />
          </div>
        )}
      </header>

      <main className="portal-main">
        <section className="page-heading" aria-labelledby="portal-title">
          <h1 className="portal-title" id="portal-title">
            {title}
          </h1>
          <div
            className="workforce-summary"
            aria-label={`${workers.length} current workers`}
          >
            <span className="summary-count">{workers.length}</span>
            {workers.length === 1 ? 'current worker' : 'current workers'}
          </div>
        </section>

        {workers.length === 0 ? (
          <EmptyWorkforce />
        ) : (
          <>
            <WeeklySchedule
              workers={workers}
              days={days}
              weekRange={weekRange}
              isCurrentWeek={isCurrentWeek}
              todayKey={initialBusinessDate}
              classificationCounts={classificationCounts}
              onPreviousWeek={() => setWeekStart((week) => addDays(week, -7))}
              onNextWeek={() => setWeekStart((week) => addDays(week, 7))}
              onCurrentWeek={() => setWeekStart(currentWeekStart)}
            />
            <WorkerBookings workers={workers} days={days} />
          </>
        )}
      </main>
    </div>
  );
}

type WeeklyScheduleProps = {
  workers: ClientWorker[];
  days: Date[];
  weekRange: string;
  isCurrentWeek: boolean;
  todayKey: string;
  classificationCounts: ClassificationCount[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
};

function WeeklySchedule({
  workers,
  days,
  weekRange,
  isCurrentWeek,
  todayKey,
  classificationCounts,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
}: WeeklyScheduleProps) {
  return (
    <section className="schedule-section" aria-labelledby="weekly-schedule-title">
      <div className="section-tab">
        <h2 id="weekly-schedule-title">Weekly schedule</h2>
      </div>
      <div className="calendar-card">
        <div className="calendar-toolbar">
          <p className="week-label" aria-live="polite">
            {weekRange}
          </p>
          <div className="week-controls" aria-label="Calendar week controls">
            <button
              className="button button--calendar"
              type="button"
              onClick={onPreviousWeek}
            >
              <span aria-hidden="true">‹</span> Previous
            </button>
            <button
              className="button button--calendar"
              type="button"
              onClick={onCurrentWeek}
              disabled={isCurrentWeek}
            >
              This week
            </button>
            <button
              className="button button--calendar"
              type="button"
              onClick={onNextWeek}
            >
              Next <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>

        <ClassificationSummary counts={classificationCounts} />
        <DesktopCalendar workers={workers} days={days} todayKey={todayKey} />
        <MobileCalendar workers={workers} days={days} todayKey={todayKey} />
      </div>
    </section>
  );
}

function ClassificationSummary({ counts }: { counts: ClassificationCount[] }) {
  if (counts.length === 0) return null;

  return (
    <div className="classification-summary" aria-label="Weekly schedule by classification">
      <span className="classification-summary-label">By classification</span>
      <ul className="classification-list">
        {counts.map(({ classification, count }) => (
          <li className="classification-chip" key={classification}>
            <strong>{count}</strong> {classification}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DesktopCalendar({
  workers,
  days,
  todayKey,
}: Pick<WeeklyScheduleProps, 'workers' | 'days' | 'todayKey'>) {
  return (
    <div className="calendar-table-wrap">
      <table className="calendar-table">
        <thead>
          <tr>
            <th scope="col">Worker</th>
            {days.map((day) => (
              <th key={dateKey(day)} scope="col" data-today={dateKey(day) === todayKey}>
                {shortWeekday.format(day)}
                <span>{calendarDate.format(day)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {workers.map((worker) => (
            <tr key={workerKey(worker)}>
              <td>
                <div className="calendar-worker">
                  <WorkerAvatar
                    name={worker.name}
                    photoUrl={worker.photoUrl}
                    compact
                  />
                  <div className="calendar-worker-copy">
                    <span className="calendar-worker-name">{worker.name}</span>
                    <WorkerClassification
                      classification={worker.classification}
                      className="calendar-worker-classification"
                    />
                    <WorkerContact worker={worker} className="calendar-worker-phone" />
                  </div>
                </div>
              </td>
              {days.map((day) => {
                const assigned = worker.assignedDates.includes(dateKey(day));
                return (
                  <td
                    key={dateKey(day)}
                    data-today={dateKey(day) === todayKey}
                    aria-label={`${worker.name}: ${assigned ? 'assigned' : 'not assigned'} on ${calendarDate.format(day)}`}
                  >
                    {assigned ? (
                      <span className="assignment-mark" aria-hidden="true">
                        ✓
                      </span>
                    ) : (
                      <span className="no-assignment" aria-hidden="true">
                        —
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileCalendar({
  workers,
  days,
  todayKey,
}: Pick<WeeklyScheduleProps, 'workers' | 'days' | 'todayKey'>) {
  return (
    <div className="mobile-schedule">
      {workers.map((worker) => (
        <article className="mobile-schedule-worker" key={workerKey(worker)}>
          <div className="calendar-worker">
            <WorkerAvatar name={worker.name} photoUrl={worker.photoUrl} compact />
            <div className="calendar-worker-copy">
              <span className="calendar-worker-name">{worker.name}</span>
              <WorkerClassification
                classification={worker.classification}
                className="calendar-worker-classification"
              />
              <WorkerContact worker={worker} className="calendar-worker-phone" />
            </div>
          </div>
          <div className="mobile-days" aria-label={`${worker.name}'s weekly assignments`}>
            {days.map((day) => {
              const assigned = worker.assignedDates.includes(dateKey(day));
              return (
                <div
                  className={`mobile-day${assigned ? ' mobile-day--assigned' : ''}${
                    dateKey(day) === todayKey ? ' mobile-day--today' : ''
                  }`}
                  key={dateKey(day)}
                  aria-label={`${shortWeekday.format(day)} ${calendarDate.format(day)}: ${assigned ? 'assigned' : 'not assigned'}`}
                >
                  <span className="mobile-day-label">
                    {shortWeekday.format(day).slice(0, 2)}
                  </span>
                  <span className="mobile-day-number">{dayNumber.format(day)}</span>
                  <span className="mobile-day-check" aria-hidden="true">
                    {assigned ? '✓' : '·'}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

function WorkerBookings({ workers, days }: Pick<WeeklyScheduleProps, 'workers' | 'days'>) {
  const weekDates = new Set(days.map(dateKey));

  return (
    <section className="worker-bookings" aria-labelledby="worker-bookings-title">
      <div className="section-heading">
        <h2 id="worker-bookings-title">Worker bookings</h2>
      </div>
      <div className="worker-grid">
        {workers.map((worker) => {
          const bookingsThisWeek = worker.assignedDates.filter((date) => weekDates.has(date));

          return (
            <article className="worker-card" key={workerKey(worker)}>
              <WorkerAvatar name={worker.name} photoUrl={worker.photoUrl} />
              <div className="worker-card-copy">
                <strong className="worker-name">{worker.name}</strong>
                <WorkerClassification
                  classification={worker.classification}
                  className="worker-classification"
                />
                <WorkerContact worker={worker} className="worker-phone" />
                <p className="assignment-count">
                  {bookingsThisWeek.length === 1
                    ? '1 booking this week'
                    : `${bookingsThisWeek.length} bookings this week`}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function WorkerClassification({
  classification,
  className,
}: {
  classification: string | null | undefined;
  className: string;
}) {
  const value = classification?.trim();
  if (!value) return null;

  return <span className={className}>{value}</span>;
}

function WorkerContact({
  worker,
  className,
}: {
  worker: ClientWorker;
  className: string;
}) {
  return worker.phone ? (
    <a className={className} href={`tel:${phoneHref(worker.phone)}`}>
      {worker.phone}
    </a>
  ) : (
    <span className={className}>Phone not available</span>
  );
}

function EmptyWorkforce() {
  return (
    <section className="empty-state" aria-labelledby="empty-workforce-title">
      <div className="empty-state-icon" aria-hidden="true">
        ✓
      </div>
      <h2 id="empty-workforce-title">No workers are currently assigned</h2>
      <p>
        When workers are scheduled for your team, their contact details and
        weekly assignments will appear here.
      </p>
    </section>
  );
}

function weeklyClassificationCounts(
  workers: ClientWorker[],
  days: Date[],
): ClassificationCount[] {
  const weekDates = new Set(days.map(dateKey));
  const counts = new Map<string, number>();

  for (const worker of workers) {
    const classification = worker.classification?.trim();
    const isBookedThisWeek = worker.assignedDates.some((date) => weekDates.has(date));
    if (!classification || !isBookedThisWeek) continue;

    counts.set(classification, (counts.get(classification) ?? 0) + 1);
  }

  return [...counts]
    .map(([classification, count]) => ({ classification, count }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.classification.localeCompare(right.classification, 'en-AU'),
    );
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

function formatWeekRange(start: Date, end: Date): string {
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? `${rangeEndSameMonth.format(start)} – ${rangeStart.format(end)} ${end.getFullYear()}`
    : `${rangeStart.format(start)} – ${rangeEndDifferentMonth.format(end)}`;
}

function workerKey(worker: ClientWorker): string {
  return [worker.name, worker.phone ?? '', worker.photoUrl ?? ''].join('\u0000');
}

function phoneHref(phone: string): string {
  return phone.replace(/[^+\d]/g, '');
}
