// POST /api/waitlist — adds one sign-up to the "Website waitlist" database in Notion.
// Needs two environment variables in Vercel: NOTION_TOKEN (an internal integration secret)
// and NOTION_WAITLIST_DB (the database id). The integration must be connected to that database.

const WHO = { buyer: 'Home buyer', builder: 'Homebuilder' };
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

// GET /api/waitlist — a status check that says which link in the chain is broken.
// It never shows the token; it only says whether each piece is in place.
async function status(res) {
  const token = process.env.NOTION_TOKEN, db = process.env.NOTION_WAITLIST_DB;
  const out = {
    function_deployed: true,
    env: process.env.VERCEL_ENV || 'unknown',
    NOTION_TOKEN_set: Boolean(token),
    NOTION_WAITLIST_DB_set: Boolean(db),
    NOTION_WAITLIST_DB_looks_right: Boolean(db) && /^[0-9a-f]{32}$/i.test(db.replace(/-/g, '').trim()),
  };
  if (token && db) {
    try {
      const r = await fetch(`https://api.notion.com/v1/databases/${db.trim()}`, {
        headers: { Authorization: `Bearer ${token.trim()}`, 'Notion-Version': '2022-06-28' },
      });
      const j = await r.json().catch(() => ({}));
      out.notion_status = r.status;
      out.notion_reached_database = r.ok;
      if (!r.ok) out.notion_error = j.code || 'unknown';
      if (r.ok) {
        const props = j.properties || {};
        out.database_title = (j.title || []).map(t => t.plain_text).join('');
        out.fields_match = props.Email?.type === 'title' && props.Who?.type === 'select' && props.Page?.type === 'rich_text';
      }
    } catch (e) {
      out.notion_error = 'could_not_reach_notion';
    }
  }
  out.verdict =
    !token || !db ? 'Add the missing variable(s) in Vercel for this environment, then redeploy.'
    : out.notion_error === 'unauthorized' ? 'Notion rejected the token. Re-copy it into NOTION_TOKEN (no spaces), then redeploy.'
    : out.notion_error === 'object_not_found' ? 'The token works but cannot see the database. In Notion, open Website waitlist, then ••• → Connections and add the connection.'
    : out.notion_error ? 'Notion said: ' + out.notion_error
    : out.fields_match === false ? 'The database fields changed. Email must be the title, Who a select, Page text.'
    : 'Everything is connected. Sign-ups should work.';
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(out);
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') return status(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Use POST.' });
  }

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  // Bots fill every field; people never see this one.
  if (body.website) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim().toLowerCase();
  const who = WHO[body.who] || WHO.buyer;
  const page = String(body.page || '').slice(0, 200);
  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: 'That email address doesn\'t look right.' });

  const token = (process.env.NOTION_TOKEN || '').trim(), db = (process.env.NOTION_WAITLIST_DB || '').trim();
  if (!token || !db) return res.status(500).json({ ok: false, error: 'The waitlist isn\'t connected yet.' });

  const r = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parent: { database_id: db },
      properties: {
        Email: { title: [{ text: { content: email } }] },
        Who: { select: { name: who } },
        Page: { rich_text: page ? [{ text: { content: page } }] : [] },
      },
    }),
  });

  if (!r.ok) {
    console.error('Notion write failed', r.status, await r.text());
    return res.status(502).json({ ok: false, error: 'Something went wrong on our side. Please try again.' });
  }
  return res.status(200).json({ ok: true });
};
