'use client';

import {
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import type { ClientWorker, ClientWorkerBooking } from '@/lib/client-workers';
import { localDateFromKey } from '@/lib/business-date';
import { Brand } from '@/components/brand';
import { LogoutButton } from '@/components/logout-button';
import { WorkerAvatar } from '@/components/worker-avatar';

type ClientPortalProps = {
  workers: ClientWorker[];
  clientName: string;
  siteName?: string | null;
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
  status: WorkerBookingStatus;
};

type WorkerBookingStatus = 'upcoming' | 'finishing-today' | 'working';

type ScheduleTickKind = 'standard' | 'start' | 'confirmed-end';

type MobileDayWorker = {
  worker: ClientWorker;
  classifications: string[];
  tickKind: ScheduleTickKind;
};

type MobileDaySummary = {
  day: Date;
  dayKey: string;
  classificationCounts: ClassificationCount[];
  workers: MobileDayWorker[];
};

const portalTabs: ReadonlyArray<{ id: PortalTab; label: string }> = [
  { id: 'schedule', label: 'Weekly schedule' },
  { id: 'bookings', label: 'Worker bookings' },
];

const shortWeekday = new Intl.DateTimeFormat('en-AU', { weekday: 'short' });
const longWeekday = new Intl.DateTimeFormat('en-AU', { weekday: 'long' });
const dayNumber = new Intl.DateTimeFormat('en-AU', { day: 'numeric' });
const calendarDate = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
});
const bookingDate = new Intl.DateTimeFormat('en-AU', {
  weekday: 'short',
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
  siteName,
  title: titleOverride,
  initialBusinessDate,
  mode,
}: ClientPortalProps) {
  const currentWeekStart = useMemo(
    () => mondayFor(localDateFromKey(initialBusinessDate)),
    [initialBusinessDate],
  );
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [activeTab, setActiveTab] = useState<PortalTab>('schedule');
  const currentWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index)),
    [currentWeekStart],
  );
  const nextWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index + 7)),
    [currentWeekStart],
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const scheduledWorkers = useMemo(
    () => workers.filter((worker) => workerHasScheduledDayInWeek(worker, days)),
    [workers, days],
  );
  const thisWeekWorkers = useMemo(
    () => workers.filter((worker) => workerHasScheduledDayInWeek(worker, currentWeekDays)),
    [workers, currentWeekDays],
  );
  const nextWeekWorkers = useMemo(
    () => workers.filter((worker) => workerHasScheduledDayInWeek(worker, nextWeekDays)),
    [workers, nextWeekDays],
  );
  const thisWeekClassificationCounts = useMemo(
    () => workerClassificationCountsForWeek(thisWeekWorkers, currentWeekDays),
    [thisWeekWorkers, currentWeekDays],
  );
  const isCurrentWeek = dateKey(weekStart) === dateKey(currentWeekStart);
  const weekRange = formatWeekRange(days[0], days[6]);
  const isDevelopmentPreview = mode === 'development-preview';
  const isAdminPreview = mode === 'admin-preview';
  const clientHeading = clientName + (siteName ? ' (' + siteName + ')' : '');

  const scheduleProps: WeeklyScheduleProps = {
    workers: scheduledWorkers,
    days,
    weekRange,
    isCurrentWeek,
    todayKey: initialBusinessDate,
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
            {titleOverride ? (
              titleOverride
            ) : (
              <>
                <span className="portal-client-title">{clientHeading}</span>
                <span className="portal-product-title">BCP Workers</span>
              </>
            )}
          </h1>
          <div
            className="workforce-summary"
            aria-label={
              String(thisWeekWorkers.length) +
              (thisWeekWorkers.length === 1
                ? ' worker scheduled this week and '
                : ' workers scheduled this week and ') +
              String(nextWeekWorkers.length) +
              (nextWeekWorkers.length === 1
                ? ' worker scheduled next week'
                : ' workers scheduled next week')
            }
          >
            <div className="workforce-summary-heading">
              <span className="summary-count">{thisWeekWorkers.length}</span>
              <span className="workforce-summary-copy">
                <strong>This week</strong>
                <span>
                  {thisWeekWorkers.length === 1
                    ? 'worker scheduled'
                    : 'workers scheduled'}
                </span>
              </span>
            </div>
            <div className="workforce-summary-next-week">
              <span>Next week</span>
              <strong>{nextWeekWorkers.length}</strong>
              <span>
                {nextWeekWorkers.length === 1 ? 'worker scheduled' : 'workers scheduled'}
              </span>
            </div>
            <MobileWorkforceClassifications counts={thisWeekClassificationCounts} />
            <div className="schedule-tick-key" aria-label="Weekly schedule tick meanings">
              <span className="schedule-tick-key-item">
                <span className="assignment-mark assignment-mark--start" aria-hidden="true">
                  ✓
                </span>
                First day
              </span>
              <span className="schedule-tick-key-item">
                <span className="assignment-mark" aria-hidden="true">✓</span>
                Working
              </span>
              <span className="schedule-tick-key-item">
                <span
                  className="assignment-mark assignment-mark--confirmed-end"
                  aria-hidden="true"
                >
                  ✓
                </span>
                Last day confirmed
              </span>
            </div>
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
              <WorkerBookings
                workers={scheduledWorkers}
                days={days}
                todayKey={initialBusinessDate}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MobileWorkforceClassifications({
  counts,
}: {
  counts: ClassificationCount[];
}) {
  if (counts.length === 0) return null;

  return (
    <ul className="mobile-workforce-classifications" aria-label="Workers by classification">
      {counts.map(({ classification, count }) => (
        <li key={classification}>
          <strong>{count}</strong>
          <span>
            {classification === 'Labourer' && count !== 1
              ? 'Labourers'
              : classification}
          </span>
        </li>
      ))}
    </ul>
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
    <div
      className={'week-controls' + (isCurrentWeek ? '' : ' week-controls--away')}
      aria-label="Calendar week controls"
    >
      <button
        className="button button--calendar button--week-previous"
        type="button"
        onClick={onPreviousWeek}
      >
        Previous
      </button>
      <button
        className={
          'button button--calendar' + (isCurrentWeek ? '' : ' button--return-week')
        }
        type="button"
        onClick={onCurrentWeek}
        disabled={isCurrentWeek}
      >
        {isCurrentWeek ? 'This week' : 'Return to this week'}
      </button>
      <button
        className="button button--calendar button--week-next"
        type="button"
        onClick={onNextWeek}
      >
        Next
      </button>
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
          <tr className="calendar-date-row">
            <th scope="col" aria-label="Worker details" />
            {days.map((day) => (
              <th
                key={dateKey(day)}
                scope="col"
                data-today={dateKey(day) === todayKey}
              >
                <span className="calendar-weekday">{longWeekday.format(day)}</span>
                <span className="calendar-date">{calendarDate.format(day)}</span>
              </th>
            ))}
          </tr>
          <tr className="calendar-count-row">
            <th aria-hidden="true" />
            {days.map((day) => {
              const dayCounts = dailyClassificationCounts(workers, day);

              return (
                <th key={dateKey(day)} scope="col">
                  {dayCounts.length > 0 ? (
                    <span className="calendar-day-summary">
                      {dayCounts.map(({ classification, count }) => (
                        <span key={classification}>
                          {dailyClassificationLabel(classification, count)}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </th>
              );
            })}
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
                  const dayKey = dateKey(day);
                  const tickKind = scheduleTickKind(worker, dayKey);
                  const assigned = tickKind !== null;

                  return (
                    <td
                      key={dayKey}
                      data-today={dayKey === todayKey}
                      aria-label={
                        worker.name +
                        ': ' +
                        scheduleTickDescription(tickKind) +
                        ' on ' +
                        calendarDate.format(day)
                      }
                    >
                      {assigned ? (
                        <span
                          className={scheduleTickClassName(tickKind)}
                          aria-hidden="true"
                        >
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
  const activeDays = days
    .map((day) => mobileDaySummary(workers, day))
    .filter((summary) => summary.workers.length > 0);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const selectedDay =
    activeDays.find((summary) => summary.dayKey === selectedDayKey) ??
    activeDays.find((summary) => summary.dayKey === todayKey) ??
    activeDays[0];

  if (!selectedDay) {
    return (
      <div className="mobile-schedule">
        <section className="mobile-empty-week" aria-labelledby="mobile-empty-week-title">
          <h2 id="mobile-empty-week-title">No workers scheduled this week</h2>
          <p>Choose another week to review upcoming workforce coverage.</p>
        </section>
      </div>
    );
  }

  const mobileWeekGridStyle = {
    '--mobile-week-columns': `repeat(${activeDays.length}, minmax(0, 1fr))`,
  } as CSSProperties;

  return (
    <div className="mobile-schedule" style={mobileWeekGridStyle}>
      <MobileWeekSpread
        activeDays={activeDays}
        selectedDay={selectedDay}
        setSelectedDayKey={setSelectedDayKey}
        todayKey={todayKey}
      />
      <section className="mobile-roster" aria-labelledby="mobile-roster-title">
        <div className="mobile-roster-heading">
          <h2 id="mobile-roster-title">Worker schedule</h2>
          <MobileScheduleTickKey />
        </div>
        <div className="mobile-roster-day-labels" aria-hidden="true">
          {activeDays.map(({ day, dayKey }) => (
            <span key={dayKey}>
              <strong>{shortWeekday.format(day)}</strong>
              <small>{dayNumber.format(day)}</small>
            </span>
          ))}
        </div>
        <div className="mobile-roster-list">
          {workers.map((worker) => {
            const classifications = classificationsForWeek(worker, days);

            return (
              <article className="mobile-roster-worker" key={workerKey(worker)}>
                <WorkerScheduleIdentity
                  worker={worker}
                  classification={classifications.join(' · ') || null}
                />
                <div className="mobile-worker-day-grid" aria-label={worker.name + "'s weekly assignments"}>
                  {activeDays.map(({ day, dayKey }) => {
                    const tickKind = scheduleTickKind(worker, dayKey);
                    const assigned = tickKind !== null;

                    return (
                      <span
                        className="mobile-worker-day"
                        data-today={dayKey === todayKey}
                        key={dayKey}
                        role="img"
                        aria-label={
                          shortWeekday.format(day) +
                          ' ' +
                          calendarDate.format(day) +
                          ': ' +
                          scheduleTickDescription(tickKind)
                        }
                      >
                        {assigned ? (
                          <span
                            className={scheduleTickClassName(tickKind)}
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        ) : (
                          <span className="no-assignment" aria-hidden="true">
                            —
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MobileWeekSpread({
  activeDays,
  selectedDay,
  setSelectedDayKey,
  todayKey,
}: {
  activeDays: MobileDaySummary[];
  selectedDay: MobileDaySummary;
  setSelectedDayKey: (dayKey: string) => void;
  todayKey: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = activeDays.findIndex(
      (summary) => summary.dayKey === selectedDay.dayKey,
    );
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % activeDays.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + activeDays.length) % activeDays.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = activeDays.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextDay = activeDays[nextIndex];
    setSelectedDayKey(nextDay.dayKey);
    document.getElementById('mobile-day-tab-' + nextDay.dayKey)?.focus();
  }

  return (
    <section className="mobile-week-overview" aria-labelledby="mobile-coverage-title">
      <div className="mobile-week-overview-heading">
        <div>
          <h2 id="mobile-coverage-title">Daily coverage</h2>
          <p>Tap a day to see who is scheduled.</p>
        </div>
      </div>
      <div className="mobile-week-strip" role="tablist" aria-label="Daily workforce coverage">
        {activeDays.map((summary) => {
          const isSelected = summary.dayKey === selectedDay.dayKey;
          const workerLabel = summary.workers.length === 1 ? 'worker' : 'workers';

          return (
            <button
              aria-controls="mobile-day-detail"
              aria-selected={isSelected}
              className="mobile-week-strip-day"
              data-selected={isSelected}
              data-today={summary.dayKey === todayKey}
              id={'mobile-day-tab-' + summary.dayKey}
              key={summary.dayKey}
              onClick={() => setSelectedDayKey(summary.dayKey)}
              onKeyDown={onKeyDown}
              role="tab"
              tabIndex={isSelected ? 0 : -1}
              type="button"
            >
              <span className="mobile-week-day-date">
                <strong>{shortWeekday.format(summary.day)}</strong>
                <span>{calendarDate.format(summary.day)}</span>
              </span>
              <span className="mobile-week-day-worker-count">
                <strong>{summary.workers.length}</strong>
                <span>{workerLabel} scheduled</span>
              </span>
              <span className="mobile-week-day-classifications">
                {summary.classificationCounts.map(({ classification, count }) => (
                  <span key={classification}>
                    {dailyClassificationLabel(classification, count)}
                  </span>
                ))}
              </span>
              <span className="mobile-week-day-action" aria-hidden="true">
                {isSelected ? 'Showing workers' : 'View workers'}
                <span>›</span>
              </span>
            </button>
          );
        })}
      </div>
      <div
        aria-labelledby={'mobile-day-tab-' + selectedDay.dayKey}
        className="mobile-day-detail"
        id="mobile-day-detail"
        role="tabpanel"
      >
        <div className="mobile-day-detail-heading">
          <div>
            <h3>
              {longWeekday.format(selectedDay.day)} {calendarDate.format(selectedDay.day)}
            </h3>
            <p>
              {selectedDay.workers.length}{' '}
              {selectedDay.workers.length === 1 ? 'worker scheduled' : 'workers scheduled'}
            </p>
          </div>
          <span className="mobile-day-detail-selected">Selected day</span>
        </div>
        <ul className="mobile-day-detail-worker-list">
          {selectedDay.workers.map(({ worker, classifications, tickKind }) => (
            <li key={workerKey(worker)}>
              <span className={scheduleTickClassName(tickKind)} aria-hidden="true">
                ✓
              </span>
              <WorkerAvatar
                name={worker.name}
                photoUrl={worker.photoUrl}
                hasPhotoSource={worker.hasPhotoSource}
                photoSigningError={worker.photoSigningError}
                compact
              />
              <span className="mobile-day-detail-worker-copy">
                <strong>{worker.name}</strong>
                <span>{classifications.join(' · ') || 'Classification not listed'}</span>
                <WorkerContact
                  worker={worker}
                  className="mobile-day-detail-worker-phone"
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MobileScheduleTickKey() {
  return (
    <div className="mobile-schedule-tick-key" aria-label="Weekly schedule tick meanings">
      <span>
        <span className="assignment-mark assignment-mark--start" aria-hidden="true">✓</span>
        First day
      </span>
      <span>
        <span className="assignment-mark" aria-hidden="true">✓</span>
        Working
      </span>
      <span>
        <span className="assignment-mark assignment-mark--confirmed-end" aria-hidden="true">✓</span>
        Last day confirmed
      </span>
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
      <WorkerAvatar
        name={worker.name}
        photoUrl={worker.photoUrl}
        hasPhotoSource={worker.hasPhotoSource}
        photoSigningError={worker.photoSigningError}
        compact
      />
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
  days,
  todayKey,
}: Pick<WeeklyScheduleProps, 'workers' | 'days' | 'todayKey'>) {
  const rows = visibleWorkerBookings(workers, days, todayKey);

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
        <>
          <div className="booking-table-wrap">
            <table className="booking-table">
              <thead>
                <tr>
                  <th scope="col">Worker</th>
                  <th scope="col">Status</th>
                  <th scope="col">Start Date</th>
                  <th scope="col">End Date (planned)</th>
                  <th scope="col">Last day confirmed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ worker, booking, status }) => {
                  const duration = bookingDurationLabel(booking);

                  return (
                    <tr key={workerKey(worker) + '\u0000' + booking.key}>
                      <td>
                        <div className="booking-worker">
                          <WorkerAvatar
                            name={worker.name}
                            photoUrl={worker.photoUrl}
                            hasPhotoSource={worker.hasPhotoSource}
                            photoSigningError={worker.photoSigningError}
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
                      <td className="booking-status-cell" data-label="Status">
                        <span className={workerBookingStatusClass(status)}>
                          {workerBookingStatusLabel(status)}
                        </span>
                      </td>
                      <td className="booking-date-cell" data-label="Start date">
                        {booking.startDate
                          ? formatBookingDate(booking.startDate)
                          : 'Not supplied'}
                      </td>
                      <td className="booking-date-cell" data-label="End date (planned)">
                        {booking.endDate !== null && !booking.ongoingAssignment
                          ? bookingEndDateLabel(booking)
                          : null}
                      </td>
                      <td className="booking-confirmation-cell" data-label="Last day confirmed">
                        <div className="booking-confirmation-stack">
                          {booking.endDate !== null && !booking.ongoingAssignment ? (
                            <span className={bookingConfirmationClass(booking)}>
                              {bookingConfirmationLabel(booking)}
                            </span>
                          ) : null}
                          {booking.ongoingAssignment ? (
                            <span className="booking-status booking-status--ongoing">
                              Ongoing
                            </span>
                          ) : null}
                          {duration || booking.ongoingAssignment ? (
                            <span className="booking-duration">
                              Booking length · {duration ?? 'Ongoing'}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <MobileWorkerBookings rows={rows} />
        </>
      )}
    </section>
  );
}

function MobileWorkerBookings({ rows }: { rows: WorkerBookingRow[] }) {
  return (
    <div className="mobile-booking-list" aria-label="Worker bookings">
      {rows.map(({ worker, booking, status }) => (
        <article className="mobile-booking-card" key={workerKey(worker) + '\u0000' + booking.key}>
          <header className="mobile-booking-card-header">
            <div className="mobile-booking-worker">
              <WorkerAvatar
                name={worker.name}
                photoUrl={worker.photoUrl}
                hasPhotoSource={worker.hasPhotoSource}
                photoSigningError={worker.photoSigningError}
                compact
              />
              <div className="mobile-booking-worker-copy">
                <strong className="worker-name">{worker.name}</strong>
                <WorkerClassification
                  classification={booking.classification}
                  className="worker-classification"
                />
                <WorkerContact worker={worker} className="worker-phone" />
              </div>
            </div>
            <span className={workerBookingStatusClass(status)}>
              {workerBookingStatusLabel(status)}
            </span>
          </header>
          <dl className="mobile-booking-facts">
            <div>
              <dt>Starts</dt>
              <dd>{booking.startDate ? formatBookingDate(booking.startDate) : 'Not supplied'}</dd>
            </div>
            <div>
              <dt>Planned end</dt>
              <dd>
                {booking.endDate !== null && !booking.ongoingAssignment
                  ? bookingEndDateLabel(booking)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Last day</dt>
              <dd>
                {booking.ongoingAssignment ? (
                  <span className="booking-status booking-status--ongoing">Ongoing</span>
                ) : booking.endDate !== null ? (
                  <span className={bookingConfirmationClass(booking)}>
                    {bookingConfirmationLabel(booking)}
                  </span>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>Booking length</dt>
              <dd>
                {bookingDurationLabel(booking) ??
                  (booking.ongoingAssignment ? 'Ongoing' : 'Not supplied')}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function WorkerClassification({
  classification,
  className,
}: {
  classification: string | null | undefined;
  className: string;
}) {
  const value = clientClassificationLabel(classification);
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

function classificationsForWeek(worker: ClientWorker, days: Date[]): string[] {
  const classifications = new Set<string>();

  for (const booking of workerBookings(worker)) {
    const classification = clientClassificationLabel(booking.classification);
    const isBookedThisWeek = days.some((day) =>
      bookingWorksOnScheduleDay(booking, dateKey(day)),
    );
    if (classification && isBookedThisWeek) classifications.add(classification);
  }

  return [...classifications].sort((left, right) =>
    left.localeCompare(right, 'en-AU'),
  );
}

function workerClassificationCountsForWeek(
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

function dailyClassificationCounts(
  workers: ClientWorker[],
  day: Date,
): ClassificationCount[] {
  const workDate = dateKey(day);
  const counts = new Map<string, number>();

  for (const worker of workers) {
    const classifications = new Set<string>();

    for (const booking of workerBookings(worker)) {
      const classification = clientClassificationLabel(booking.classification);
      if (classification && bookingWorksOnScheduleDay(booking, workDate)) {
        classifications.add(classification);
      }
    }

    for (const classification of classifications) {
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

function mobileDaySummary(workers: ClientWorker[], day: Date): MobileDaySummary {
  const dayKey = dateKey(day);

  return {
    day,
    dayKey,
    classificationCounts: dailyClassificationCounts(workers, day),
    workers: workers.flatMap((worker) => {
      const tickKind = scheduleTickKind(worker, dayKey);

      return tickKind
        ? [
            {
              worker,
              classifications: classificationsForDay(worker, dayKey),
              tickKind,
            },
          ]
        : [];
    }),
  };
}

function classificationsForDay(worker: ClientWorker, dayKey: string): string[] {
  const classifications = new Set<string>();

  for (const booking of workerBookings(worker)) {
    const classification = clientClassificationLabel(booking.classification);
    if (classification && bookingWorksOnScheduleDay(booking, dayKey)) {
      classifications.add(classification);
    }
  }

  return [...classifications].sort((left, right) =>
    left.localeCompare(right, 'en-AU'),
  );
}

function workerHasScheduledDayInWeek(worker: ClientWorker, days: Date[]): boolean {
  return days.some((day) => scheduleTickKind(worker, dateKey(day)) !== null);
}

function clientClassificationLabel(classification: string | null | undefined): string | null {
  const value = classification?.trim();
  if (!value) return null;

  return value.toLocaleLowerCase('en-AU') === 'clab' ? 'Labourer' : value;
}

function dailyClassificationLabel(classification: string, count: number): string {
  return String(count) + ' ' + (classification === 'Labourer' && count !== 1
    ? 'Labourers'
    : classification);
}

function visibleWorkerBookings(
  workers: ClientWorker[],
  days: Date[],
  todayKey: string,
): WorkerBookingRow[] {
  return workers
    .flatMap((worker) =>
      workerBookings(worker)
        .filter(
          (booking) =>
            shouldShowWorkerBooking(booking, todayKey) &&
            days.some((day) => bookingWorksOnScheduleDay(booking, dateKey(day))),
        )
        .map((booking) => ({
          worker,
          booking,
          status: workerBookingStatus(booking, todayKey),
        })),
    )
    .sort((left, right) => {
      // Future-starting workers are deliberately shown before people already
      // working, so clients can see upcoming starts at a glance.
      const statusDifference = workerBookingStatusOrder(left.status) -
        workerBookingStatusOrder(right.status);
      if (statusDifference !== 0) return statusDifference;

      return (
        (left.booking.startDate ?? '').localeCompare(
          right.booking.startDate ?? '',
          'en-AU',
        ) ||
        left.worker.name.localeCompare(right.worker.name, 'en-AU')
      );
    });
}

function workerBookingStatus(
  booking: ClientWorkerBooking,
  todayKey: string,
): WorkerBookingStatus {
  if (booking.startDate !== null && booking.startDate > todayKey) {
    return 'upcoming';
  }

  if (
    booking.endDate !== null &&
    booking.endDateConfirmed === true &&
    booking.endDate === todayKey
  ) {
    return 'finishing-today';
  }

  return 'working';
}

function workerBookingStatusOrder(status: WorkerBookingStatus): number {
  if (status === 'upcoming') return 0;
  if (status === 'finishing-today') return 1;
  return 2;
}

function workerBookingStatusLabel(status: WorkerBookingStatus): string {
  if (status === 'upcoming') return 'Upcoming';
  if (status === 'finishing-today') return 'Finishing today';
  return 'Working';
}

function workerBookingStatusClass(status: WorkerBookingStatus): string {
  if (status === 'upcoming') return 'booking-status booking-status--upcoming';
  if (status === 'finishing-today') {
    return 'booking-status booking-status--finishing-today';
  }
  return 'booking-status booking-status--working';
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
  return booking.endDate === null ? '' : formatBookingDate(booking.endDate);
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

function bookingDurationLabel(booking: ClientWorkerBooking): string | null {
  if (booking.ongoingAssignment || !booking.startDate || !booking.endDate) {
    return null;
  }

  const durationInDays = inclusiveCalendarDays(booking.startDate, booking.endDate);
  if (durationInDays === null) return null;

  if (durationInDays < 7) return pluralDuration(durationInDays, 'day');
  if (durationInDays < 30) return roundedHalfDuration(durationInDays / 7, 'week');

  return roundedHalfDuration(durationInDays / 30.4375, 'month');
}

function inclusiveCalendarDays(startDate: string, endDate: string): number | null {
  const start = utcDateFromKey(startDate);
  const end = utcDateFromKey(endDate);
  if (start === null || end === null || end < start) return null;

  return Math.floor((end - start) / 86_400_000) + 1;
}

function utcDateFromKey(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? timestamp
    : null;
}

function roundedHalfDuration(value: number, unit: 'week' | 'month'): string {
  const roundedValue = Math.round(value * 2) / 2;
  const quantity = Number.isInteger(roundedValue)
    ? String(roundedValue)
    : roundedValue.toFixed(1);

  return quantity + ' ' + unit + (roundedValue === 1 ? '' : 's');
}

function pluralDuration(value: number, unit: 'day'): string {
  return String(value) + ' ' + unit + (value === 1 ? '' : 's');
}

function scheduleTickKind(
  worker: ClientWorker,
  dayKey: string,
): ScheduleTickKind | null {
  const bookingsForDay = workerBookings(worker).filter((booking) =>
    bookingWorksOnScheduleDay(booking, dayKey),
  );

  if (bookingsForDay.length === 0) return null;

  // The confirmed end day takes precedence if a worker has overlapping
  // assignment records. Explicit assignment_days determine a booking day;
  // a sparse/no-day assignment otherwise falls back only to weekdays within
  // its assignment window.
  if (
    bookingsForDay.some(
      (booking) =>
        booking.endDateConfirmed === true && booking.endDate === dayKey,
    )
  ) {
    return 'confirmed-end';
  }

  if (bookingsForDay.some((booking) => booking.startDate === dayKey)) {
    return 'start';
  }

  return 'standard';
}

function bookingWorksOnScheduleDay(
  booking: ClientWorkerBooking,
  dayKey: string,
): boolean {
  // Only confirmed assignments create schedule ticks.
  if (booking.assignmentStatus !== 'confirmed') return false;

  // The date window applies before any explicit day override is considered.
  if (booking.startDate === null || dayKey < booking.startDate) return false;
  if (booking.endDate !== null && dayKey > booking.endDate) return false;

  // An explicit inactive assignment_days row removes normal weekday work.
  if (booking.inactiveDates.includes(dayKey)) return false;

  // An explicit active (or nullable-is_active) row is working, including
  // Saturday and Sunday.
  if (booking.assignedDates.includes(dayKey)) return true;

  // No day row: Work-Force falls back to Monday–Friday only. No continuous
  // Monday–Sunday range is inferred from dates or ongoing_assignment.
  if (!isWeekday(dayKey)) return false;

  return true;
}

function isWeekday(dayKey: string): boolean {
  const dayOfWeek = localDateFromKey(dayKey).getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

function scheduleTickClassName(kind: ScheduleTickKind | null): string {
  return [
    'assignment-mark',
    kind === 'start' ? 'assignment-mark--start' : '',
    kind === 'confirmed-end' ? 'assignment-mark--confirmed-end' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function scheduleTickDescription(kind: ScheduleTickKind | null): string {
  if (kind === 'start') return 'assigned, first day';
  if (kind === 'confirmed-end') return 'assigned, confirmed end date';
  return kind === 'standard' ? 'assigned' : 'not assigned';
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
