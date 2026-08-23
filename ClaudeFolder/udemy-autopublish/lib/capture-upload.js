/* scripts/udemy/capture-upload.js  — ONE-TIME upload-endpoint capture.
 *
 * WHY: the pipeline uploads video/image files via Udemy's API, but the exact
 * "create upload" endpoint can't be observed headless. This snippet reveals it.
 *
 * HOW:
 *   1. Open any of your courses in the Udemy instructor site and go to Curriculum.
 *   2. Open DevTools -> Console, paste this ENTIRE file, press Enter.
 *   3. Open the Bulk Uploader and drag in ONE small video (any file).
 *   4. Copy everything the console prints under [CAPTURE] and send it back —
 *      it shows the create-asset endpoint + the storage (S3/Azure) request shape.
 *      I'll hard-wire CREATE_ASSET_ENDPOINT in scripts/udemy/assets.js from it.
 *   5. This only LOGS; it changes nothing. Reload the page to stop capturing.
 */
(() => {
  const tag = '[CAPTURE]';
  const interesting = (u) => /asset|upload|media|s3|amazonaws|blob\.core|credential|openupload|storage/i.test(u);

  const origFetch = window.fetch;
  window.fetch = async function (input, init = {}) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (interesting(url)) {
      console.log(tag, 'fetch', (init.method || 'GET'), url);
      if (init.body && typeof init.body === 'string' && init.body.length < 2000) console.log(tag, '  body:', init.body);
    }
    return origFetch.apply(this, arguments);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__cap = { method, url };
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    if (this.__cap && interesting(this.__cap.url)) {
      console.log(tag, 'xhr', this.__cap.method, this.__cap.url);
      if (typeof body === 'string' && body.length < 2000) console.log(tag, '  body:', body);
    }
    return origSend.apply(this, arguments);
  };

  console.log(tag, 'armed — now drag ONE video into the Bulk Uploader and copy the [CAPTURE] lines.');
})();
