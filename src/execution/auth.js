require('dotenv').config();
const axios = require('axios');

let totp;
try {
  const OTPAuth = require('otpauth');
  totp = new OTPAuth.TOTP({ secret: process.env.ANGEL_TOTP_SECRET });
} catch { totp = null; }

let cachedToken = null;
let tokenExpiry = null;

async function getAuthToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) return cachedToken;

  const totpCode = totp ? totp.generate() : '000000';
  const { data } = await axios.post(
    'https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword',
    { clientcode: process.env.ANGEL_CLIENT_ID, password: process.env.ANGEL_PASSWORD, totp: totpCode },
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
        'X-UserType':   'USER',
        'X-SourceID':   'WEB',
        'X-PrivateKey': process.env.ANGEL_API_KEY,
      },
    }
  );
  if (!data.status) throw new Error(`Auth failed: ${data.message}`);
  cachedToken = data.data.jwtToken;
  tokenExpiry = Date.now() + 7 * 60 * 60 * 1000;
  console.log('[AUTH] Token obtained, expires in 7h');
  return cachedToken;
}

module.exports = { getAuthToken };
