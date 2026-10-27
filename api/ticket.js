const TO_EMAIL = process.env.TICKET_TO_EMAIL || 'hello@maed.ai';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'MAED <onboarding@resend.dev>';

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string' && req.body) {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (_) {
      return Promise.resolve(Object.fromEntries(new URLSearchParams(req.body)));
    }
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        resolve(Object.fromEntries(new URLSearchParams(raw)));
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function buildEmailText({ name, email, note, interest, ticketNo }) {
  return [
    `New ticket from maed.ai`,
    ``,
    `Ticket: #${ticketNo || 'n/a'}`,
    `Interest: ${interest}`,
    `Name: ${name}`,
    `Email: ${email}`,
    ``,
    note || '(No note provided)',
  ].join('\n');
}

async function sendWithResend(payload) {
  const upstream = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [TO_EMAIL],
      reply_to: payload.email,
      subject: `MAED ticket · ${payload.interest}${payload.ticketNo ? ` · #${payload.ticketNo}` : ''}`,
      text: buildEmailText(payload),
    }),
  });

  const resultText = await upstream.text();
  let result = {};
  try {
    result = JSON.parse(resultText);
  } catch (_) {
    result = { message: resultText };
  }

  if (!upstream.ok) {
    const detail = result.message || result.error || resultText || `Resend ${upstream.status}`;
    const err = new Error(detail);
    err.status = upstream.status;
    throw err;
  }

  return result;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const note = String(body.note || body.body || body.message || '').trim();
    const interest = String(body.interest || 'General').trim();
    const ticketNo = String(body.ticketNo || body.ticket || '').trim();

    if (!name || !email) {
      json(res, 400, { error: 'Name and email are required', code: 'VALIDATION' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      json(res, 400, { error: 'Enter a valid email', code: 'VALIDATION' });
      return;
    }

    if (!RESEND_API_KEY) {
      json(res, 503, {
        error: 'Email delivery is not configured yet',
        code: 'NO_PROVIDER',
      });
      return;
    }

    await sendWithResend({ name, email, note, interest, ticketNo });
    json(res, 200, { ok: true, message: 'Ticket sent' });
  } catch (err) {
    json(res, 502, {
      error: 'Could not deliver ticket',
      code: 'DELIVERY_FAILED',
      detail: String(err && err.message ? err.message : err),
    });
  }
};
