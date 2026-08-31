import Link from 'next/link';

export function Brand() {
  return (
    <Link className="brand" href="/portal" aria-label="Blue Collar People portal home">
      <span className="brand-logo-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="brand-logo"
          src="/blue-collar-people-logo.png"
          alt="Blue Collar People"
        />
      </span>
    </Link>
  );
}
