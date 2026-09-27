#!/usr/bin/env node
/* Publish attached-but-unpublished video lectures across the 53 remediated courses.
 * load-curriculum.js attaches the video asset but never sets is_published on the lecture,
 * so num_published_lectures stays 0. This flips each lecture with a ready Video asset to
 * is_published:true (the state the working courses like NCP-AIN are already in).
 * Usage:  node scripts/publish-lectures.js --dry-run   # report only, no writes
 *         node scripts/publish-lectures.js             # publish
 */
const { UdemyClient } = require('./udemy/client');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DRY = process.argv.includes('--dry-run');

const COURSE_IDS = [
7343409,7343407,7343399,7343393,7343389,7339269,7339261,7339257,7339249,7339239,
7334799,7334795,7334789,7334785,7334783,7332861,7332787,7332781,7332779,7332775,
7329605,7329265,7329255,7329241,7329237,7328165,7328161,7328155,7325503,7325495,
7325489,7325483,7322129,7322123,7322091,7318107,7318105,7317953,7317285,7317283,
7314029,7314025,7311511,7311499,7309719,7309715,7309709,7309699,7305515,7303531,
7303525,7301147,7301139
];

(async () => {
  const client = new UdemyClient({ dryRun: DRY });
  let coursesOk = 0, coursesPartial = 0, totalPublished = 0, totalSkipped = 0;
  const problems = [];
  for (const cid of COURSE_IDS) {
    const base = `/api-2.0/users/me/taught-courses/${cid}`;
    let lecs;
    try {
      const r = await client.get(`${base}/lectures/`, { query: { page_size: 100, 'fields[lecture]': 'title,is_published,asset', 'fields[asset]': 'asset_type,status,length' } });
      lecs = r.results || [];
    } catch (e) { problems.push(`${cid}: list failed ${String(e.message).slice(0,80)}`); continue; }
    let pub = 0, already = 0, novideo = 0;
    for (const l of lecs) {
      const hasVideo = l.asset && l.asset.asset_type === 'Video';
      if (!hasVideo) { novideo++; continue; }
      if (l.is_published) { already++; continue; }
      try {
        await client.patch(`${base}/lectures/${l.id}/`, { is_published: true });
        pub++; totalPublished++;
        await sleep(120);
      } catch (e) { problems.push(`${cid}/lec ${l.id}: publish failed ${String(e.message).slice(0,80)}`); }
    }
    totalSkipped += already;
    const done = pub + already;
    const tag = DRY ? '[dry-run] would publish' : 'published';
    console.log(`  ${cid}: ${tag} ${pub}, already ${already}, no-video ${novideo}  (video lectures now ~${done}/${lecs.length})`);
    if (done >= 12) coursesOk++; else coursesPartial++;
  }
  console.log(`\n==== ${DRY ? 'DRY-RUN ' : ''}DONE  courses>=12: ${coursesOk}/${COURSE_IDS.length}  partial: ${coursesPartial}  lectures ${DRY?'to publish':'published'}: ${totalPublished}  already-published: ${totalSkipped} ====`);
  if (problems.length) { console.log('PROBLEMS:'); problems.forEach(p => console.log('  ' + p)); }
})().catch(e => { console.error('publish-lectures failed:', e.message); process.exit(1); });
