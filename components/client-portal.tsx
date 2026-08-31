'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import type { ClientWorker, ClientWorkerBooking } from '@/lib/client-workers';
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
};

type ClassificationCount = {
  classification: string;
  count: number;
};

type PortalTab = 'schedule' | 'bookings';

type WorkerBookingRow = {
  worker: ClientWorker;
  booking: ClientWorkerBooking;
};

const portalTabs: ReadonlyArray<{ id: PortalTab; label: string }> = [
  { id: 'schedule', label: 'Weekly schedule' },
  { id: 'bookings', label: 'Worker bookings' },
];

const shortWeekday = new Intl.DateTimeFormat('en-AU', { weekday: 'short' });
const dayNumber = new Intl.DateTimeFormat('en-AU', { day: 'numeric' });
const calendarDate = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
});
const bookingDate = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
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
  initialBusinessDate,
  mode,
}: ClientPortalProps) {
  const currentWeekStart = mondayFor(localDateFromKey(initialBusinessDate));
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [activeTab, setActiveTab] = useState<PortalTab>('schedule');
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
  const title = titleOverride ?? clientName + ' – BCP Workers';
  const isDevelopmentPreview = mode === 'development-preview';
  const isAdminPreview = mode === 'admin-preview';

  const scheduleProps: WeeklyScheduleProps = {
    workers,
    days,
    weekRange,
    isCurrentWeek,
    todayKey: initialBusinessDate,
    classificationCounts,
    onPreviousWeek: () => setWeekStart((week) => addDays(week, -7)),
    onNextWeek: () => setWeekStart((week) => addDays(week, 7)),
    onCurrentWeek: () => setWeekStart(currentWeekStart),
  };

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
            aria-label={
              String(workers.length) +
              (workers.length === 1 ? ' current worker' : ' current workers')
            }
          >
            <span className="summary-count">{workers.length}</span>
            {workers.length === 1 ? 'current worker' : 'current workers'}
          </div>
        </section>

        {workers.length === 0 ? (
          <EmptyWorkforce />
        ) : (
          <div className="portal-workforce">
            <PortalTabs activeTab={activeTab} onSelect={setActiveTab} />
            {activeTab === 'schedule' ? (
              <WeeklySchedule {...scheduleProps} />
            ) : (
              <WorkerBookings workers={workers} todayKey={initialBusinessDate} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function PortalTabs({
  activeTab,
  onSelect,
}: {
  activeTab: PortalTab;
  onSelect: (tab: PortalTab) => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = portalTabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % portalTabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + portalTabs.length) % portalTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = portalTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = portalTabs[nextIndex];
    onSelect(nextTab.id);
    document.getElementById('portal-tab-' + nextTab.id)?.focus();
  }

  return (
    <div className="portal-tabs" role="tablist" aria-label="Portal views">
      {portalTabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            aria-controls={'portal-panel-' + tab.id}
            aria-selected={isActive}
            className="portal-tab"
            id={'portal-tab-' + tab.id}
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            onKeyDown={onKeyDown}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
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
    <section
      aria-labelledby="portal-tab-schedule"
      className="schedule-section tab-panel"
      id="portal-panel-schedule"
      role="tabpanel"
    >
      <div className="calendar-card">
        <div className="calendar-toolbar">
          <p className="week-label" aria-live="polite">
            {weekRange}
          </p>
          <WeekControls
            isCurrentWeek={isCurrentWeek}
            onCurrentWeek={onCurrentWeek}
            onNextWeek={onNextWeek}
            onPreviousWeek={onPreviousWeek}
          />
        </div>

        <ClassificationSummary counts={classificationCounts} />
        <DesktopCalendar workers={workers} days={days} todayKey={todayKey} />
        <MobileCalendar workers={workers} days={days} todayKey={todayKey} />
      </div>
    </section>
  );
}

function WeekControls({
  isCurrentWeek,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
}: Pick<
  WeeklyScheduleProps,
  'isCurrentWeek' | 'onPreviousWeek' | 'onNextWeek' | 'onCurrentWeek'
>) {
  return (
    <div className="week-controls" aria-label="Calendar week controls">
      <button className="button button--calendar" type="button" onClick={onPreviousWeek}>
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
      <button className="button button--calendar" type="button" onClick={onNextWeek}>
        Next <span aria-hidden="true">›</span>
      </button>
    </div>
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
          {workers.map((worker) => {
            const classifications = classificationsForWeek(worker, days);

            return (
              <tr key={workerKey(worker)}>
                <td>
                  <WorkerScheduleIdentity
                    worker={worker}
                    classification={classifications.join(' · ') || null}
                  />
                </td>
                {days.map((day) => {
                  const assigned = worker.assignedDates.includes(dateKey(day));

                  return (
                    <td
                      key={dateKey(day)}
                      data-today={dateKey(day) === todayKey}
                      aria-label={
                        worker.name +
                        ': ' +
                        (assigned ? 'assigned' : 'not assigned') +
                        ' on ' +
                        calendarDate.format(day)
                      }
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
            );
          })}
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
      {workers.map((worker) => {
        const classifications = classificationsForWeek(worker, days);

        return (
          <article className="mobile-schedule-worker" key={workerKey(worker)}>
            <WorkerScheduleIdentity
              worker={worker}
              classification={classifications.join(' · ') || null}
            />
            <div className="mobile-days" aria-label={worker.name + "'s weekly assignments"}>
              {days.map((day) => {
                const assigned = worker.assignedDates.includes(dateKey(day));
                const isToday = dateKey(day) === todayKey;

                return (
                  <div
                    className={mobileDayClassName(assigned, isToday)}
                    key={dateKey(day)}
                    aria-label={
                      shortWeekday.format(day) +
                      ' ' +
                      calendarDate.format(day) +
                      ': ' +
                      (assigned ? 'assigned' : 'not assigned')
                    }
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
        );
      })}
    </div>
  );
}

function WorkerScheduleIdentity({
  worker,
  classification,
}: {
  worker: ClientWorker;
  classification: string | null;
}) {
  return (
    <div className="calendar-worker">
      <WorkerAvatar name={worker.name} photoUrl={worker.photoUrl} compact />
      <div className="calendar-worker-copy">
        <span className="calendar-worker-name">{worker.name}</span>
        <WorkerClassification
          classification={classification}
          className="calendar-worker-classification"
        />
        <WorkerContact worker={worker} className="calendar-worker-phone" />
      </div>
    </div>
  );
}

function WorkerBookings({
  workers,
  todayKey,
}: Pick<WeeklyScheduleProps, 'workers' | 'todayKey'>) {
  const rows = visibleWorkerBookings(workers, todayKey);

  return (
    <section
      aria-labelledby="portal-tab-bookings"
      className="worker-bookings tab-panel"
      id="portal-panel-bookings"
      role="tabpanel"
    >
      {rows.length === 0 ? (
        <EmptyBookings />
      ) : (
        <div className="booking-table-wrap">
          <table className="booking-table">
            <thead>
              <tr>
                <th scope="col">Worker</th>
                <th scope="col">Start Date</th>
                <th scope="col">End Date (planned)</th>
                <th scope="col">Last day confirmed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ worker, booking }) => (
                <tr key={workerKey(worker) + '\u0000' + booking.key}>
                  <td>
                    <div className="booking-worker">
                      <WorkerAvatar
                        name={worker.name}
                        photoUrl={worker.photoUrl}
                        compact
                      />
                      <div className="booking-worker-copy">
                        <strong className="worker-name">{worker.name}</strong>
                        <WorkerClassification
                          classification={booking.classification}
                          className="worker-classification"
                        />
                        <WorkerContact worker={worker} className="worker-phone" />
                      </div>
                    </div>
                  </td>
                  <td className="booking-date-cell">
                    {booking.startDate
                      ? formatBookingDate(booking.startDate)
                      : 'Not supplied'}
                  </td>
                  <td className="booking-date-cell">{bookingEndDateLabel(booking)}</td>
                  <td className="booking-confirmation-cell">
                    {booking.endDate !== null ? (
                      <span className={bookingConfirmationClass(booking)}>
                        {bookingConfirmationLabel(booking)}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    <a className={className} href={'tel:' + phoneHref(worker.phone)}>
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

function EmptyBookings() {
  return (
    <section className="empty-state" aria-labelledby="empty-bookings-title">
      <div className="empty-state-icon" aria-hidden="true">
        —
      </div>
      <h2 id="empty-bookings-title">No active worker bookings</h2>
      <p>Current worker bookings will appear here when they are available.</p>
    </section>
  );
}

function weeklyClassificationCounts(
  workers: ClientWorker[],
  days: Date[],
): ClassificationCount[] {
  const counts = new Map<string, number>();

  for (const worker of workers) {
    for (const classification of classificationsForWeek(worker, days)) {
      counts.set(classification, (counts.get(classification) ?? 0) + 1);
    }
  }

  return [...counts]
    .map(([classification, count]) => ({ classification, count }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.classification.localeCompare(right.classification, 'en-AU'),
    );
}

function classificationsForWeek(worker: ClientWorker, days: Date[]): string[] {
  const weekDates = new Set(days.map(dateKey));
  const classifications = new Set<string>();

  for (const booking of workerBookings(worker)) {
    const classification = booking.classification?.trim();
    const isBookedThisWeek = booking.assignedDates.some((date) => weekDates.has(date));
    if (classification && isBookedThisWeek) classifications.add(classification);
  }

  return [...classifications].sort((left, right) =>
    left.localeCompare(right, 'en-AU'),
  );
}

function visibleWorkerBookings(
  workers: ClientWorker[],
  todayKey: string,
): WorkerBookingRow[] {
  return workers.flatMap((worker) =>
    workerBookings(worker)
      .filter((booking) => shouldShowWorkerBooking(booking, todayKey))
      .map((booking) => ({ worker, booking })),
  );
}

function shouldShowWorkerBooking(
  booking: ClientWorkerBooking,
  todayKey: string,
): boolean {
  return !(
    booking.endDate !== null &&
    booking.endDateConfirmed === true &&
    todayKey > booking.endDate
  );
}

function workerBookings(worker: ClientWorker): ClientWorkerBooking[] {
  return worker.bookings;
}

function bookingEndDateLabel(booking: ClientWorkerBooking): string {
  return booking.endDate === null ? 'Ongoing' : formatBookingDate(booking.endDate);
}

function bookingConfirmationLabel(booking: ClientWorkerBooking): string {
  return booking.endDateConfirmed === true
    ? 'End Date Confirmed'
    : 'End date not confirmed';
}

function bookingConfirmationClass(booking: ClientWorkerBooking): string {
  if (booking.endDateConfirmed === true) {
    return 'booking-status booking-status--confirmed';
  }

  return 'booking-status booking-status--pending';
}

function mobileDayClassName(assigned: boolean, isToday: boolean): string {
  return [
    'mobile-day',
    assigned ? 'mobile-day--assigned' : '',
    isToday ? 'mobile-day--today' : '',
  ]
    .filter(Boolean)
    .join(' ');
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
  return year + '-' + month + '-' + day;
}

function formatBookingDate(value: string): string {
  return bookingDate.format(localDateFromKey(value));
}

function formatWeekRange(start: Date, end: Date): string {
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  return sameMonth
    ? rangeEndSameMonth.format(start) + ' – ' + rangeStart.format(end) + ' ' + end.getFullYear()
    : rangeStart.format(start) + ' – ' + rangeEndDifferentMonth.format(end);
}

function workerKey(worker: ClientWorker): string {
  return [worker.name, worker.phone ?? '', worker.photoUrl ?? ''].join('\u0000');
}

function phoneHref(phone: string): string {
  return phone.replace(/[^+\d]/g, '');
}
