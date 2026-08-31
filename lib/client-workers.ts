/**
 * The full and only client-facing contract of
 * public.get_client_worker_calendar(). Booking fields remain optional until
 * that protected RPC is extended to return them.
 */
export type ClientWorkerCalendarRow = {
  worker_name: string;
  classification?: string | null;
  phone: string | null;
  photo_bucket: string | null;
  photo_path: string | null;
  photo_mime_type: string | null;
  photo_updated_at: string | null;
  work_date: string;
  /** Opaque only; never use this value in a browser-initiated lookup. */
  booking_key?: string | null;
  assignment_start_date?: string | null;
  assignment_end_date?: string | null;
  end_date_confirmed?: boolean | null;
  ongoing_assignment?: boolean | null;
};

export type ClientWorkerBooking = {
  /**
   * An opaque response key or a local fallback grouping key. It is used only
   * to preserve distinct bookings in the rendered response.
   */
  key: string;
  classification: string | null;
  startDate: string | null;
  endDate: string | null;
  endDateConfirmed: boolean | null;
  ongoing: boolean | null;
  assignedDates: string[];
};

type WorkerPhotoSource = {
  bucket: string;
  path: string;
  mimeType: string | null;
};

export type ClientWorkerRecord = {
  name: string;
  classification: string | null;
  phone: string | null;
  photo: WorkerPhotoSource | null;
  assignedDates: string[];
  bookings: ClientWorkerBooking[];
};

export type ClientWorker = {
  name: string;
  phone: string | null;
  photoUrl: string | null;
  assignedDates: string[];
  classification?: string | null;
  bookings?: ClientWorkerBooking[];
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
    const workDate = dateKey(row.work_date);
    if (!workDate) continue;

    const photo = photoSource(row);
    const classification = normaliseOptionalText(row.classification);
    // The RPC intentionally exposes no worker identifier. This ephemeral key
    // is derived only from allowed fields and is never sent back to Supabase.
    const key = workerGroupingKey(row.worker_name, row.phone, photo);
    const booking = bookingFromRow(row);
    const bookingKey = bookingGroupingKey(row, booking);
    const existing = workers.get(key);

    if (existing) {
      existing.assignedDates.add(workDate);
      existing.classification ??= classification;
      addBooking(existing.bookings, bookingKey, booking, workDate);
      continue;
    }

    const bookings = new Map<string, WorkerBookingAccumulator>();
    addBooking(bookings, bookingKey, booking, workDate);
    workers.set(key, {
      name: row.worker_name.trim(),
      classification,
      phone: normaliseNullableText(row.phone),
      photo,
      assignedDates: new Set([workDate]),
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
): ClientWorker[] {
  return workers.map((worker) => ({
    name: worker.name,
    classification: worker.classification,
    phone: worker.phone,
    photoUrl: worker.photo
      ? (photoUrls.get(photoLocationKey(worker.photo)) ?? null)
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
  return Boolean(
    photo &&
      photo.bucket &&
      photo.path &&
      (!photo.mimeType || photo.mimeType.toLowerCase().startsWith('image/')),
  );
}

function addBooking(
  bookings: Map<string, WorkerBookingAccumulator>,
  key: string,
  booking: Omit<ClientWorkerBooking, 'key' | 'assignedDates'>,
  workDate: string,
) {
  const existing = bookings.get(key);

  if (existing) {
    existing.assignedDates.add(workDate);
    existing.classification ??= booking.classification;
    existing.startDate ??= booking.startDate;
    existing.endDate ??= booking.endDate;
    existing.endDateConfirmed ??= booking.endDateConfirmed;
    existing.ongoing ??= booking.ongoing;
    return;
  }

  bookings.set(key, {
    key,
    ...booking,
    assignedDates: new Set([workDate]),
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
    isOptionalNullableString(row.classification) &&
    isNullableString(row.phone) &&
    isNullableString(row.photo_bucket) &&
    isNullableString(row.photo_path) &&
    isNullableString(row.photo_mime_type) &&
    isNullableString(row.photo_updated_at) &&
    isOptionalNullableString(row.booking_key) &&
    isOptionalNullableString(row.assignment_start_date) &&
    isOptionalNullableString(row.assignment_end_date) &&
    isOptionalNullableBoolean(row.end_date_confirmed) &&
    isOptionalNullableBoolean(row.ongoing_assignment) &&
    typeof row.work_date === 'string'
  );
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || isNullableString(value);
}

function isOptionalNullableBoolean(
  value: unknown,
): value is boolean | null | undefined {
  return value === undefined || typeof value === 'boolean' || value === null;
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
    classification: normaliseOptionalText(row.classification),
    startDate: optionalDateKey(row.assignment_start_date),
    endDate: optionalDateKey(row.assignment_end_date),
    endDateConfirmed: normaliseOptionalBoolean(row.end_date_confirmed),
    ongoing: normaliseOptionalBoolean(row.ongoing_assignment),
  };
}

function bookingGroupingKey(
  row: ClientWorkerCalendarRow,
  booking: Omit<ClientWorkerBooking, 'key' | 'assignedDates'>,
): string {
  const explicitKey = normaliseOptionalText(row.booking_key);
  if (explicitKey) return 'booking:' + explicitKey;

  // This keeps today's RPC compatible: without booking fields, all of a
  // worker's authorised dates form one local fallback booking.
  return [
    'fallback',
    booking.classification ?? '',
    booking.startDate ?? '',
    booking.endDate ?? '',
    booking.endDateConfirmed === true
      ? 'confirmed'
      : booking.endDateConfirmed === false
        ? 'pending'
        : '',
    booking.ongoing === true ? 'ongoing' : booking.ongoing === false ? 'closed' : '',
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

function normaliseOptionalText(value: string | null | undefined): string | null {
  return typeof value === 'string' ? normaliseNullableText(value) : null;
}

function normaliseOptionalBoolean(
  value: boolean | null | undefined,
): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function optionalDateKey(value: string | null | undefined): string | null {
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
