/**
 * The full and only client-facing contract of
 * public.get_client_worker_calendar(). Assignment dates come only from
 * public.assignments; classification comes only from the assignment's linked
 * public.classifications row; work dates come only from public.assignment_days.
 */
export type ClientWorkerCalendarRow = {
  worker_name: string;
  classification: string | null;
  phone: string | null;
  photo_bucket: string | null;
  photo_path: string | null;
  photo_mime_type: string | null;
  photo_updated_at: string | null;
  work_date: string | null;
  start_date: string | null;
  end_date: string | null;
  end_date_confirmed: boolean;
};

export type ClientWorkerBooking = {
  /**
   * A local response grouping key. It is never sent back to Supabase or
   * displayed to a client.
   */
  key: string;
  classification: string | null;
  startDate: string | null;
  endDate: string | null;
  endDateConfirmed: boolean;
  assignedDates: string[];
};

type WorkerPhotoSource = {
  bucket: string;
  path: string;
  mimeType: string | null;
};

export type ClientWorkerRecord = {
  name: string;
  phone: string | null;
  photo: WorkerPhotoSource | null;
  assignedDates: string[];
  bookings: ClientWorkerBooking[];
};

export type ClientWorker = {
  name: string;
  phone: string | null;
  photoUrl: string | null;
  /** A photo source exists, even if signing or browser image loading failed. */
  hasPhotoSource: boolean;
  /** Server-reported Storage signing failure, if any. */
  photoSigningError: string | null;
  assignedDates: string[];
  bookings: ClientWorkerBooking[];
};

type WorkerBookingAccumulator = Omit<ClientWorkerBooking, 'assignedDates'> & {
  assignedDates: Set<string>;
};

type WorkerAccumulator = Omit<ClientWorkerRecord, 'assignedDates' | 'bookings'> & {
  assignedDates: Set<string>;
  bookings: Map<string, WorkerBookingAccumulator>;
};

export function readClientWorkerCalendarRows(
  input: unknown,
): ClientWorkerCalendarRow[] {
  if (!Array.isArray(input)) return [];

  return input.filter(isClientWorkerCalendarRow);
}

export function groupClientWorkers(
  rows: ClientWorkerCalendarRow[],
): ClientWorkerRecord[] {
  const workers = new Map<string, WorkerAccumulator>();

  for (const row of rows) {
    const workDate = row.work_date ? dateKey(row.work_date) : null;

    const photo = photoSource(row);
    // The RPC intentionally exposes no worker identifier. This ephemeral key
    // is derived only from allowed fields and is never sent back to Supabase.
    const key = workerGroupingKey(row.worker_name, row.phone, photo);
    const booking = bookingFromRow(row);
    const bookingKey = bookingGroupingKey(booking);
    const existing = workers.get(key);

    if (existing) {
      if (workDate) existing.assignedDates.add(workDate);
      addBooking(existing.bookings, bookingKey, booking, workDate);
      continue;
    }

    const bookings = new Map<string, WorkerBookingAccumulator>();
    addBooking(bookings, bookingKey, booking, workDate);
    workers.set(key, {
      name: row.worker_name.trim(),
      phone: normaliseNullableText(row.phone),
      photo,
      assignedDates: new Set(workDate ? [workDate] : []),
      bookings,
    });
  }

  return [...workers.values()]
    .map(({ assignedDates, bookings, ...worker }) => ({
      ...worker,
      assignedDates: [...assignedDates].sort(),
      bookings: [...bookings.values()]
        .map(({ assignedDates: bookingDates, ...booking }) => ({
          ...booking,
          assignedDates: [...bookingDates].sort(),
        }))
        .sort(
          (left, right) =>
            (left.startDate ?? '').localeCompare(right.startDate ?? '', 'en-AU') ||
            left.key.localeCompare(right.key, 'en-AU'),
        ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-AU'));
}

export function withSignedPhotoUrls(
  workers: ClientWorkerRecord[],
  photoUrls: Map<string, string>,
  photoSigningErrors: Map<string, string>,
): ClientWorker[] {
  return workers.map((worker) => ({
    name: worker.name,
    phone: worker.phone,
    photoUrl: worker.photo
      ? (photoUrls.get(photoLocationKey(worker.photo)) ?? null)
      : null,
    hasPhotoSource: Boolean(worker.photo),
    photoSigningError: worker.photo
      ? (photoSigningErrors.get(photoLocationKey(worker.photo)) ?? null)
      : null,
    assignedDates: worker.assignedDates,
    bookings: worker.bookings,
  }));
}

export function photoLocationKey(photo: WorkerPhotoSource): string {
  return photo.bucket + '\u0000' + photo.path;
}

export function canDisplayPhoto(
  photo: WorkerPhotoSource | null,
): photo is WorkerPhotoSource {
  // Legacy worker records can have a missing or generic MIME label even when
  // the object itself is a valid image. The authorised bucket/path is the
  // access boundary; the browser still safely falls back if the object cannot
  // render as an image.
  return Boolean(photo && photo.bucket && photo.path);
}

function addBooking(
  bookings: Map<string, WorkerBookingAccumulator>,
  key: string,
  booking: Omit<ClientWorkerBooking, 'key' | 'assignedDates'>,
  workDate: string | null,
) {
  const existing = bookings.get(key);

  if (existing) {
    if (workDate) existing.assignedDates.add(workDate);
    existing.startDate ??= booking.startDate;
    existing.endDate ??= booking.endDate;
    return;
  }

  bookings.set(key, {
    key,
    ...booking,
    assignedDates: new Set(workDate ? [workDate] : []),
  });
}

function isClientWorkerCalendarRow(
  value: unknown,
): value is ClientWorkerCalendarRow {
  if (!value || typeof value !== 'object') return false;

  const row = value as Record<string, unknown>;
  return (
    typeof row.worker_name === 'string' &&
    row.worker_name.trim().length > 0 &&
    isNullableString(row.classification) &&
    isNullableString(row.phone) &&
    isNullableString(row.photo_bucket) &&
    isNullableString(row.photo_path) &&
    isNullableString(row.photo_mime_type) &&
    isNullableString(row.photo_updated_at) &&
    isNullableString(row.work_date) &&
    isNullableString(row.start_date) &&
    isNullableString(row.end_date) &&
    typeof row.end_date_confirmed === 'boolean'
  );
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function photoSource(row: ClientWorkerCalendarRow): WorkerPhotoSource | null {
  const bucket = normaliseNullableText(row.photo_bucket);
  const path = normaliseNullableText(row.photo_path);
  if (!bucket || !path) return null;

  return {
    bucket,
    path,
    mimeType: normaliseNullableText(row.photo_mime_type),
  };
}

function bookingFromRow(
  row: ClientWorkerCalendarRow,
): Omit<ClientWorkerBooking, 'key' | 'assignedDates'> {
  return {
    classification: normaliseNullableText(row.classification),
    startDate: optionalDateKey(row.start_date),
    endDate: optionalDateKey(row.end_date),
    endDateConfirmed: row.end_date_confirmed,
  };
}

function bookingGroupingKey(
  booking: Omit<ClientWorkerBooking, 'key' | 'assignedDates'>,
): string {
  // The RPC deliberately exposes no assignment identifier. These authorised
  // assignment fields create a local grouping only; they are not a lookup key.
  return [
    'assignment',
    booking.classification ?? '',
    booking.startDate ?? '',
    booking.endDate ?? '',
    booking.endDateConfirmed ? 'confirmed' : 'not-confirmed',
  ].join('\u0000');
}

function workerGroupingKey(
  name: string,
  phone: string | null,
  photo: WorkerPhotoSource | null,
): string {
  return [
    name.trim().toLocaleLowerCase('en-AU'),
    normaliseNullableText(phone) ?? '',
    photo?.bucket ?? '',
    photo?.path ?? '',
  ].join('\u0000');
}

function normaliseNullableText(value: string | null): string | null {
  const normalised = value?.trim() ?? '';
  return normalised || null;
}

function optionalDateKey(value: string | null): string | null {
  return typeof value === 'string' ? dateKey(value) : null;
}

function dateKey(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return parsed.getFullYear() === Number(year) &&
    parsed.getMonth() === Number(month) - 1 &&
    parsed.getDate() === Number(day)
    ? value
    : null;
}
