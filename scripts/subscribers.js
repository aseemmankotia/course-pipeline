#!/usr/bin/env node
/**
 * Subscriber management CLI for the TechNuggets Academy email/WhatsApp pipeline.
 *
 *   node scripts/subscribers.js add --email=a@b.com [--name="A B"] [--whatsapp=+15551234567] [--source=manual]
 *   node scripts/subscribers.js import --file=owned-list.csv --source=past-students --consent=owned_list_import
 *   node scripts/subscribers.js unsubscribe --email=a@b.com        (or --token=…)
 *   node scripts/subscribers.js list [--status=active|unsubscribed]
 *   node scripts/subscribers.js stats
 *   node scripts/subscribers.js export [--csv] [--active]
 *
 * IMPORTANT (consent): only import lists you already have documented opt-in for
 * (past buyers, people who signed up). Do NOT import scraped/purchased lists —
 * that violates GDPR and gets your domain + WhatsApp number blocked. Website
 * sign-ups flow in automatically via marketing/email/server.js.
 */
const fs = require('fs');
const store = require('../marketing/email/store.js');

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const has = (k) => args.includes(`--${k}`);

function parseCSV(text) {
  // Minimal CSV: header row with at least an "email" column; optional name/whatsapp.
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const iEmail = header.findIndex((h) => /email/.test(h));
  const iName = header.findIndex((h) => /name/.test(h));
  const iWa = header.findIndex((h) => /whats|phone|mobile/.test(h));
  const start = iEmail === -1 ? 0 : 1; // if no header match, treat every line as a bare email
  const rows = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const email = iEmail === -1 ? cols[0] : cols[iEmail];
    if (!email) continue;
    rows.push({ email, name: iName >= 0 ? cols[iName] : '', whatsapp: iWa >= 0 ? cols[iWa] : '' });
  }
  return rows;
}

function main() {
  const db = store.loadDB();

  if (cmd === 'add') {
    const { subscriber, created } = store.addSubscriber(db, {
      email: flag('email'), name: flag('name', ''), whatsapp: flag('whatsapp', ''),
      source: flag('source', 'manual'), consentMethod: flag('consent', 'manual'),
    });
    store.saveDB(db);
    console.log(`${created ? 'Added' : 'Updated'}: ${subscriber.email} (token ${subscriber.token.slice(0, 8)}…)`);
    return;
  }

  if (cmd === 'import') {
    const file = flag('file');
    if (!file || !fs.existsSync(file)) { console.error('import needs --file=<path to .csv>'); process.exit(1); }
    const consent = flag('consent', 'owned_list_import');
    const source = flag('source', 'import');
    const rows = parseCSV(fs.readFileSync(file, 'utf8'));
    let added = 0, updated = 0, bad = 0;
    for (const r of rows) {
      if (!store.validEmail(r.email)) { bad++; continue; }
      const { created } = store.addSubscriber(db, { ...r, source, consentMethod: consent });
      created ? added++ : updated++;
    }
    store.saveDB(db);
    console.log(`Imported ${rows.length} rows from ${file}: +${added} new, ${updated} updated, ${bad} invalid.`);
    console.log(`Consent recorded as "${consent}", source "${source}". Only use for lists you have opt-in for.`);
    return;
  }

  if (cmd === 'unsubscribe') {
    const sub = store.unsubscribe(db, { token: flag('token'), email: flag('email') });
    if (!sub) { console.error('No matching subscriber.'); process.exit(1); }
    store.saveDB(db);
    console.log(`Unsubscribed: ${sub.email}`);
    return;
  }

  if (cmd === 'list') {
    const status = flag('status');
    const rows = db.subscribers.filter((s) => !status || s.status === status);
    rows.forEach((s) => console.log(`${s.status.padEnd(12)} ${s.email.padEnd(34)} ${s.channels.whatsapp ? 'WA ' : '   '}${s.source}`));
    console.log(`\n${rows.length} subscriber(s).`);
    return;
  }

  if (cmd === 'stats') { console.log(JSON.stringify(store.stats(db), null, 2)); return; }

  if (cmd === 'export') {
    let rows = db.subscribers;
    if (has('active')) rows = rows.filter((s) => s.status === 'active');
    if (has('csv')) {
      console.log('email,name,status,channels,source,subscribed_at');
      rows.forEach((s) => console.log([s.email, `"${s.name}"`, s.status,
        Object.keys(s.channels).filter((k) => s.channels[k]).join('|'), s.source, s.subscribed_at].join(',')));
    } else console.log(JSON.stringify(rows, null, 2));
    return;
  }

  console.log(`Usage:
  add        --email= [--name=] [--whatsapp=] [--source=] [--consent=]
  import     --file=<csv> [--source=] [--consent=owned_list_import]
  unsubscribe --email= | --token=
  list       [--status=active|unsubscribed]
  stats
  export     [--csv] [--active]`);
}

main();
