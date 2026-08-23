# Capturing your Udemy session for the API (one-time, ~2 min)

The runner authenticates as **you** by reusing your logged-in instructor session cookie.
No password is stored; 2FA stays on. The cookie lasts a few weeks; re-capture when the
runner prints an "AUTH FAILED / re-capture" error.

## Steps
1. Log in to Udemy in Chrome and open any instructor page (e.g. your Courses list).
2. Open **DevTools → Network** tab.
3. Click any request to `api-2.0/...` (reload the page if the list is empty).
4. In **Headers → Request Headers**, find the **`cookie:`** line. Right-click → Copy value
   (it's a long `name=value; name=value; …` string, including `access_token`, `client_id`,
   `csrftoken`, and `ud_*`).
5. Create `.env` in the `udemy-autopublish/` folder (or the repo root) with:
   ```
   UDEMY_COOKIE="<paste the whole cookie string here>"
   UDEMY_BASE=https://www.udemy.com
   ```
   `UDEMY_CSRF` is auto-read from the cookie's `csrftoken`; set it explicitly only if needed.
6. Verify:
   ```
   npm run auth:check      # prints: OK as <your name>
   ```

## Security notes
- The cookie grants access to your instructor account — treat `.env` like a password.
  It is git-ignored by convention; never commit it.
- Nothing is sent anywhere except `www.udemy.com`.
- To revoke: log out of that Udemy browser session (invalidates the token), or change
  your password.
