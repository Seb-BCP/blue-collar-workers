import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';

export const alt = 'Blue Collar People Client Portal';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';
export const runtime = 'nodejs';

export default async function OpenGraphImage() {
  const logo = 'data:image/png;base64,' + (
    await readFile(
      new URL('../public/blue-collar-people-logo@2x.png', import.meta.url),
    )
  ).toString('base64');

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #eef4ff, #ffffff 64%, #e9f1ff)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'center',
          padding: '42px 74px',
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            backgroundColor: '#ffffff',
            border: '1px solid #d6e3fa',
            borderRadius: 30,
            boxShadow: '0 20px 50px rgba(7, 27, 149, 0.12)',
            display: 'flex',
            height: 436,
            justifyContent: 'center',
            padding: '28px 54px',
            width: 930,
          }}
        >
          <img
            alt=""
            height={380}
            src={logo}
            style={{ objectFit: 'contain' }}
            width={738}
          />
        </div>
        <div
          style={{
            alignItems: 'center',
            backgroundColor: '#071b95',
            border: '7px solid #ffffff',
            borderRadius: 999,
            color: '#ffffff',
            display: 'flex',
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            marginTop: -46,
            minHeight: 94,
            padding: '0 48px',
          }}
        >
          Client Portal
        </div>
      </div>
    ),
    size,
  );
}
