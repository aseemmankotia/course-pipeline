#!/usr/bin/env node
/**
 * upload-short.js — Upload a course promo Short to YouTube from the CLI.
 *
 * Reuses the pipeline's existing OAuth artifacts (client_secrets.json +
 * youtube-token.json from youtube-auth.js). Uploads the 9:16 promo video as a
 * YouTube Short with the Udemy course URL in the description and a pinned-URL
 * first comment.
 *
 * Usage:
 *   node scripts/upload-short.js \
 *     --video=render/promo/welcome-promo-short.mp4 \
 *     --title="Pass the AWS AI Practitioner in 12 hours #Shorts" \
 *     --udemy-url=https://www.udemy.com/course/... \
 *     [--description-file=path.txt] [--tags="aws,ai,certification"] \
 *     [--privacy=public|unlisted|private]   (default: unlisted — review, then flip)
 *
 * Deliberately defaults to UNLISTED so you can review before making public.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));

if (!args.publish && (!args.video || !args.title)) {
  console.error('Usage: node scripts/upload-short.js --video=<mp4> --title="..." [--udemy-url=...] [--privacy=unlisted]');
  console.error('       node scripts/upload-short.js --publish=<videoId>');
  process.exit(1);
}

const videoPath = args.video ? path.resolve(ROOT, args.video) : null;
if (videoPath && !fs.existsSync(videoPath)) { console.error(`❌ Video not found: ${videoPath}`); process.exit(1); }

const secrets = JSON.parse(fs.readFileSync(path.join(ROOT, 'client_secrets.json'), 'utf8'));
const client = secrets.web || secrets.installed;
const token = JSON.parse(fs.readFileSync(path.join(ROOT, 'youtube-token.json'), 'utf8'));

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: client.client_id,
      client_secret: client.client_secret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const j = await res.json();
  if (!j.access_token) {
    console.error('❌ Token refresh failed:', JSON.stringify(j).slice(0, 300));
    console.error('   Re-authorize with: node youtube-auth.js');
    process.exit(1);
  }
  return j.access_token;
}

(async () => {
  const at = await accessToken();

  // --publish=<videoId>: flip a previously uploaded video to public
  if (args.publish) {
    const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=status', {
      method: 'PUT',
      headers: { authorization: `Bearer ${at}`, 'content-type': 'application/json' },
      body: JSON.stringify({ id: args.publish, status: { privacyStatus: 'public', selfDeclaredMadeForKids: false } }),
    });
    console.log(res.ok ? `✅ Now public: https://youtube.com/shorts/${args.publish}` : `❌ Publish failed: ${res.status} ${await res.text()}`);
    return;
  }
  const description = args['description-file']
    ? fs.readFileSync(path.resolve(ROOT, args['description-file']), 'utf8')
    : `${args.title}\n\n🎓 Full course by Aseem Mankotia:\n${args['udemy-url'] || ''}\n\n#Shorts #certification`;
  const tags = (args.tags || 'certification,exam prep,tech').split(',').map(s => s.trim());
  const privacy = args.privacy || 'unlisted';

  const meta = {
    snippet: { title: args.title.slice(0, 100), description, tags, categoryId: '27' }, // 27 = Education
    status: { privacyStatus: privacy, selfDeclaredMadeForKids: false },
  };

  const size = fs.statSync(videoPath).size;
  console.log(`▶ Uploading ${path.basename(videoPath)} (${(size / 1e6).toFixed(1)} MB) as ${privacy}…`);

  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${at}`,
      'content-type': 'application/json',
      'x-upload-content-length': String(size),
      'x-upload-content-type': 'video/mp4',
    },
    body: JSON.stringify(meta),
  });
  if (!init.ok) { console.error('❌ Upload init failed:', init.status, await init.text()); process.exit(1); }
  const uploadUrl = init.headers.get('location');

  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': 'video/mp4', 'content-length': String(size) },
    body: fs.readFileSync(videoPath),
  });
  const result = await put.json();
  if (!result.id) { console.error('❌ Upload failed:', JSON.stringify(result).slice(0, 400)); process.exit(1); }

  console.log(`✅ Uploaded: https://youtube.com/shorts/${result.id}  (${privacy})`);

  if (args['udemy-url']) {
    const c = await fetch('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', {
      method: 'POST',
      headers: { authorization: `Bearer ${at}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          videoId: result.id,
          topLevelComment: { snippet: { textOriginal: `🎓 Get the full course: ${args['udemy-url']}` } },
        },
      }),
    });
    console.log(c.ok ? '✅ Course-link comment posted' : `⚠️ Comment failed (${c.status}) — add it manually`);
  }

  if (privacy !== 'public') {
    console.log(`\nReview it, then make public with:\n  node scripts/upload-short.js --publish=${result.id}`);
  }
})();
