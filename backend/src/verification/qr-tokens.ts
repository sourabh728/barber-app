import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

const SERVICE_START_TTL_MS = 10 * 60 * 1000; // 10 minutes

function secret(): string {
  return (
    process.env.QR_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    'trimshim-dev-qr-secret'
  );
}

export type ShopQrPayload = {
  t: 'shop';
  v: 1;
  token: string;
};

export type ServiceStartQrPayload = {
  t: 'svc';
  v: 1;
  aid: string;
  jti: string;
  exp: number;
  sig: string;
};

export function buildShopQrValue(qrToken: string): string {
  return JSON.stringify({ t: 'shop', v: 1, token: qrToken } satisfies ShopQrPayload);
}

export function parseShopQrValue(raw: string): ShopQrPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ShopQrPayload>;
    if (parsed?.t !== 'shop' || parsed.v !== 1 || typeof parsed.token !== 'string') {
      return null;
    }
    return { t: 'shop', v: 1, token: parsed.token };
  } catch {
    // Also accept trimshim:shop:<token>
    const match = /^trimshim:shop:([a-zA-Z0-9-]+)$/.exec(raw.trim());
    if (match) {
      return { t: 'shop', v: 1, token: match[1] };
    }
    return null;
  }
}

function signServiceStart(aid: string, jti: string, exp: number): string {
  return createHmac('sha256', secret())
    .update(`${aid}.${jti}.${exp}`)
    .digest('base64url');
}

export function issueServiceStartQr(appointmentId: string): {
  payload: ServiceStartQrPayload;
  raw: string;
  jti: string;
  expiresAt: Date;
} {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + SERVICE_START_TTL_MS);
  const exp = Math.floor(expiresAt.getTime() / 1000);
  const sig = signServiceStart(appointmentId, jti, exp);
  const payload: ServiceStartQrPayload = {
    t: 'svc',
    v: 1,
    aid: appointmentId,
    jti,
    exp,
    sig,
  };
  return { payload, raw: JSON.stringify(payload), jti, expiresAt };
}

export function parseAndVerifyServiceStartQr(
  raw: string,
): ServiceStartQrPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceStartQrPayload>;
    if (
      parsed?.t !== 'svc' ||
      parsed.v !== 1 ||
      typeof parsed.aid !== 'string' ||
      typeof parsed.jti !== 'string' ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.sig !== 'string'
    ) {
      return null;
    }
    const expected = signServiceStart(parsed.aid, parsed.jti, parsed.exp);
    const a = Buffer.from(expected);
    const b = Buffer.from(parsed.sig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null;
    }
    if (parsed.exp * 1000 < Date.now()) {
      return null;
    }
    return {
      t: 'svc',
      v: 1,
      aid: parsed.aid,
      jti: parsed.jti,
      exp: parsed.exp,
      sig: parsed.sig,
    };
  } catch {
    return null;
  }
}
