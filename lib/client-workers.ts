/** The full and only client-facing contract of public.get_client_worker_calendar(). */
export type ClientWorkerCalendarRow = {
  worker_name: string;
  phone: string | null;
  photo_bucket: string | null;
  photo_path: string | null;
  photo_mime_type: string | null;
  photo_updated_at: string | null;
  work_date: string;
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
};

export type ClientWorker = {
  name: string;
  phone: string | null;
  photoUrl: string | null;
  assignedDates: string[];
};

type WorkerAccumulator = Omit<ClientWorkerRecord, 'assignedDates'> & {
  assignedDates: Set<string>;
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
    // The RPC intentionally exposes no worker identifier. This ephemeral key is
    // derived only from allowed fields and is never sent to the browser.
    const key = workerGroupingKey(row.worker_name, row.phone, photo);
    const existing = workers.get(key);

    if (existing) {
      existing.assignedDates.add(workDate);
      continue;
    }

    workers.set(key, {
      name: row.worker_name.trim(),
      phone: normaliseNullableText(row.phone),
      photo,
      assignedDates: new Set([workDate]),
    });
  }

  return [...workers.values()]
    .map(({ assignedDates, ...worker }) => ({
      ...worker,
      assignedDates: [...assignedDates].sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-AU'));
}

export function withSignedPhotoUrls(
  workers: ClientWorkerRecord[],
  photoUrls: Map<string, string>,
): ClientWorker[] {
  return workers.map((worker) => ({
    name: worker.name,
    phone: worker.phone,
    photoUrl: worker.photo
      ? (photoUrls.get(photoLocationKey(worker.photo)) ?? null)
      : null,
    assignedDates: worker.assignedDates,
  }));
}

export function photoLocationKey(photo: WorkerPhotoSource): string {
  return `${photo.bucket}\u0000${photo.path}`;
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

function isClientWorkerCalendarRow(
  value: unknown,
): value is ClientWorkerCalendarRow {
  if (!value || typeof value !== 'object') return false;

  const row = value as Record<string, unknown>;
  return (
    typeof row.worker_name === 'string' &&
    row.worker_name.trim().length > 0 &&
    isNullableString(row.phone) &&
    isNullableString(row.photo_bucket) &&
    isNullableString(row.photo_path) &&
    isNullableString(row.photo_mime_type) &&
    isNullableString(row.photo_updated_at) &&
    typeof row.work_date === 'string'
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
