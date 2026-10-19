import {
  buildShopQrValue,
  issueServiceStartQr,
  parseAndVerifyServiceStartQr,
  parseShopQrValue,
} from './qr-tokens';

describe('shop QR', () => {
  it('round-trips JSON payload', () => {
    const raw = buildShopQrValue('token-abc');
    expect(parseShopQrValue(raw)).toEqual({
      t: 'shop',
      v: 1,
      token: 'token-abc',
    });
  });

  it('parses trimshim:shop: scheme', () => {
    expect(parseShopQrValue('trimshim:shop:xyz')).toEqual({
      t: 'shop',
      v: 1,
      token: 'xyz',
    });
  });

  it('rejects garbage', () => {
    expect(parseShopQrValue('not-a-qr')).toBeNull();
  });
});

describe('service-start QR', () => {
  it('issues a verifiable signed payload', () => {
    const issued = issueServiceStartQr('appt-1');
    const parsed = parseAndVerifyServiceStartQr(issued.raw);
    expect(parsed?.aid).toBe('appt-1');
    expect(parsed?.jti).toBe(issued.jti);
  });

  it('rejects tampered signature', () => {
    const issued = issueServiceStartQr('appt-1');
    const tampered = issued.raw.replace(/"sig":"[^"]+"/, '"sig":"bad"');
    expect(parseAndVerifyServiceStartQr(tampered)).toBeNull();
  });
});
