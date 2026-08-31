import Link from 'next/link';

export function Brand() {
  return (
    <Link className="brand" href="/portal" aria-label="Blue Collar People portal home">
      <span className="brand-mark" aria-hidden="true">
        <span>BC</span>
      </span>
      <span>Blue Collar People</span>
    </Link>
  );
}
