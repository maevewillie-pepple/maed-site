const TO_EMAIL = 'hello@maed.ai';

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
  res.end(JSON.stringify(payload));
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
      json(res, 400, { error: 'Name and email are required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      json(res, 400, { error: 'Enter a valid email' });
      return;
    }

    const upstream = await fetch(`https://formsubmit.co/ajax/${TO_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        message: note || '(No note provided)',
        interest,
        ticket: ticketNo || 'n/a',
        _subject: `MAED ticket · ${interest}`,
        _template: 'table',
        _replyto: email,
      }),
    });

    const resultText = await upstream.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch (_) {
      result = { message: resultText };
    }

    if (!upstream.ok) {
      json(res, 502, {
        error: 'Could not deliver ticket',
        detail: result.message || result.error || 'Upstream error',
      });
      return;
    }

    json(res, 200, { ok: true, message: 'Ticket sent' });
  } catch (err) {
    json(res, 500, {
      error: 'Could not send ticket',
      detail: String(err && err.message ? err.message : err),
    });
  }
};
