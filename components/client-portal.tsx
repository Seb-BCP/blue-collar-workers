'use client';

import { useMemo, useState } from 'react';
import type { ClientWorker } from '@/lib/client-workers';
import { LogoutButton } from '@/components/logout-button';
import { WorkerAvatar } from '@/components/worker-avatar';

type ClientPortalProps = {
  workers: ClientWorker[];
  userEmail: string;
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

export function ClientPortal({ workers, userEmail }: ClientPortalProps) {
  const [weekStart, setWeekStart] = useState(() => mondayFor(new Date()));
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const currentWeekStart = mondayFor(new Date());
  const isCurrentWeek = dateKey(weekStart) === dateKey(currentWeekStart);
  const weekRange = formatWeekRange(days[0], days[6]);

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="brand" aria-label="Blue Collar People">
          <span className="brand-mark" aria-hidden="true">
            <span>BC</span>
          </span>
          <span>Blue Collar People</span>
        </div>
        <div className="user-controls">
          <div className="user-context">
            <strong>Client portal</strong>
            <span>{userEmail}</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="portal-main">
        <section className="page-heading" aria-labelledby="portal-title">
          <div>
            <p className="eyebrow">Current workforce</p>
            <h1 id="portal-title">Your team, at a glance.</h1>
            <p>
              See the people currently assigned to your workforce and their
              schedule for the week ahead.
            </p>
          </div>
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
          <PortalContent
            workers={workers}
            days={days}
            weekRange={weekRange}
            isCurrentWeek={isCurrentWeek}
            onPreviousWeek={() => setWeekStart((week) => addDays(week, -7))}
            onNextWeek={() => setWeekStart((week) => addDays(week, 7))}
            onCurrentWeek={() => setWeekStart(currentWeekStart)}
          />
        )}
      </main>
    </div>
  );
}

type PortalContentProps = {
  workers: ClientWorker[];
  days: Date[];
  weekRange: string;
  isCurrentWeek: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
};

function PortalContent({
  workers,
  days,
  weekRange,
  isCurrentWeek,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
}: PortalContentProps) {
  return (
    <div className="portal-sections">
      <section aria-labelledby="workers-title">
        <div className="section-heading">
          <div>
            <h2 id="workers-title">Current workers</h2>
            <p>Each person appears once, even when booked for multiple days.</p>
          </div>
        </div>
        <div className="worker-grid">
          {workers.map((worker) => (
            <article className="worker-card" key={workerKey(worker)}>
              <WorkerAvatar name={worker.name} photoUrl={worker.photoUrl} />
              <div className="worker-card-copy">
                <strong className="worker-name">{worker.name}</strong>
                {worker.phone ? (
                  <a className="worker-phone" href={`tel:${phoneHref(worker.phone)}`}>
                    {worker.phone}
                  </a>
                ) : (
                  <span className="worker-phone">Phone not available</span>
                )}
                <p className="assignment-count">
                  {worker.assignedDates.length === 1
                    ? '1 assigned day'
                    : `${worker.assignedDates.length} assigned days`}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="calendar-title">
        <div className="section-heading">
          <div>
            <h2 id="calendar-title">Weekly assignments</h2>
            <p>Green checks show days a worker is assigned.</p>
          </div>
        </div>
        <div className="calendar-card">
          <div className="calendar-toolbar">
            <p className="week-label" aria-live="polite">
              {weekRange}
            </p>
            <div className="week-controls" aria-label="Calendar week controls">
              <button
                className="icon-button"
                type="button"
                onClick={onPreviousWeek}
                aria-label="Previous week"
              >
                ‹
              </button>
              <button
                className="button"
                type="button"
                onClick={onCurrentWeek}
                disabled={isCurrentWeek}
              >
                This week
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={onNextWeek}
                aria-label="Next week"
              >
                ›
              </button>
            </div>
          </div>

          <DesktopCalendar workers={workers} days={days} />
          <MobileCalendar workers={workers} days={days} />
        </div>
      </section>
    </div>
  );
}

function DesktopCalendar({
  workers,
  days,
}: Pick<PortalContentProps, 'workers' | 'days'>) {
  return (
    <div className="calendar-table-wrap">
      <table className="calendar-table">
        <thead>
          <tr>
            <th scope="col">Worker</th>
            {days.map((day) => (
              <th key={dateKey(day)} scope="col">
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
                  <span className="calendar-worker-name">{worker.name}</span>
                </div>
              </td>
              {days.map((day) => {
                const assigned = worker.assignedDates.includes(dateKey(day));
                return (
                  <td
                    key={dateKey(day)}
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
}: Pick<PortalContentProps, 'workers' | 'days'>) {
  return (
    <div className="mobile-schedule">
      {workers.map((worker) => (
        <article className="mobile-schedule-worker" key={workerKey(worker)}>
          <div className="calendar-worker">
            <WorkerAvatar name={worker.name} photoUrl={worker.photoUrl} compact />
            <span className="calendar-worker-name">{worker.name}</span>
          </div>
          <div className="mobile-days" aria-label={`${worker.name}'s weekly assignments`}>
            {days.map((day) => {
              const assigned = worker.assignedDates.includes(dateKey(day));
              return (
                <div
                  className={`mobile-day${assigned ? ' mobile-day--assigned' : ''}`}
                  key={dateKey(day)}
                  aria-label={`${shortWeekday.format(day)} ${calendarDate.format(day)}: ${assigned ? 'assigned' : 'not assigned'}`}
                >
                  <span className="mobile-day-label">
                    {shortWeekday.format(day).slice(0, 1)}
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
    ? `${rangeStart.format(start)} – ${rangeEndSameMonth.format(end)} ${end.getFullYear()}`
    : `${rangeStart.format(start)} – ${rangeEndDifferentMonth.format(end)}`;
}

function workerKey(worker: ClientWorker): string {
  return [worker.name, worker.phone ?? '', worker.photoUrl ?? ''].join('\u0000');
}

function phoneHref(phone: string): string {
  return phone.replace(/[^+\d]/g, '');
}
