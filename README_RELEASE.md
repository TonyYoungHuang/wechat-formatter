# Paibanmao Release Current

This folder is the single release snapshot to use for deployment.

Contents:
- dist/: confirmed latest frontend build based on the April 15 UI package, with the current Alipay checkout enhancement loaded from index.html.
- server/: current production backend source used for payments and membership activation.
- package.json / package-lock.json: runtime dependency manifest for the backend.
- .env.example / .env.production.example: environment templates only. Real secrets are not included.

Rules:
- Do not run `npm run build` in this release folder unless you have also restored the matching latest frontend source code.
- For deployment, upload `dist/` to the static site path and keep `server/` plus package files on the API server.
- Keep production `.env` on the server only.

Current frontend entry:
- dist/index.html loads `/assets/index-B4TAMhBw.js`, `/assets/index-8LzPuLJt.css`, and `/assets/alipay-checkout-enhance.js`.

Current backend entry:
- `node server/index.mjs`
