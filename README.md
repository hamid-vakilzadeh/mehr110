# صندوق مهر۱۱۰ — Mehr-110 Family Fund

A read-write management app for a family **ROSCA** (rotating savings-and-loan
circle / «صندوق» / committee). One non-technical manager runs it for ~50 members
across ~12 families. Fully **Farsi / right-to-left**, mobile-first, currency in
**تومان (Toman)**, Persian digits and Jalali (Shamsi) dates throughout.

Everything is hosted on **Firebase**: Hosting (web) + Cloud Functions (the API)
+ Firestore (database) + Auth (manager login). **Every interaction goes through
an API** — the browser never writes the database directly.

> ⚠️ **This repository is PUBLIC.** No secrets are committed. See
> [Security](#security) — service-account keys, `.env` files and emulator data
> are all git-ignored, and the seed data is synthetic (fake names/numbers).

---

## Two run modes

| | DEMO (default) | LIVE |
|---|---|---|
| Data source | `web/data.js` (deterministic, in-browser) | Firestore via Cloud Functions |
| Network / backend | none | Firebase project required |
| Auth | accept-anything localStorage gate | Firebase Auth (email + password) |
| Secrets needed | **none** — safe for GitHub Pages | your own Firebase project |
| Switch | `web/firebase-config.js → FB_LIVE = false` | `FB_LIVE = true` + fill `FB_CONFIG` |

The app ships in **DEMO mode** so the public site is fully browsable with zero
configuration. Flip one flag to go LIVE against your own backend.

---

## Project layout

```
mehr110/
├── web/                      # Firebase Hosting — the design, implemented
│   ├── index.html            # login (landing page)
│   ├── dashboard.html        # manager dashboard (KPIs, charts, members, families)
│   ├── statement.html        # read-only member statement (?m=<id>)
│   ├── add-member.html       # add / edit member (?edit=<id>)
│   ├── record-payment.html   # record membership fee / share funding
│   ├── loan-order.html       # round-based loan rotation editor
│   ├── mobile.html           # mobile gallery · design-system.html · backend-prompt.html
│   ├── tokens.css            # design tokens (color/type/spacing)
│   ├── *.jsx                 # React-via-Babel components (the prototype design)
│   ├── firebase-config.js    # FB_LIVE flag + web config (placeholders; safe to commit)
│   ├── api.js                # the ONLY gateway: dashboard load + all mutation callables
│   ├── auth.js               # auth guard (demo localStorage / live Firebase Auth)
│   └── data.js               # deterministic demo dataset (DEMO mode only)
├── functions/                # Cloud Functions (TypeScript, 2nd gen, Node 20) — the API
│   ├── src/
│   │   ├── index.ts          # all callables (members, shares, payments, loans, rotation, settings, dashboard)
│   │   ├── types.ts          # Firestore data model
│   │   ├── money.ts          # integer-Toman validation/helpers (no floats)
│   │   ├── derive.ts         # authoritative→derived field recompute
│   │   ├── repo.ts           # Firestore reads + enriched member view
│   │   ├── dashboard.ts      # aggregates.dashboard payload
│   │   ├── seed.ts           # deterministic starter dataset (invariant-safe)
│   │   ├── auth.ts / admin.ts
│   └── scripts/
│       ├── setAdmin.js       # grant role=admin to the first manager (run locally)
│       ├── verify-local.js   # offline end-to-end invariant check (no emulator needed)
│       └── verify.js         # same check via the Firestore emulator (needs JDK 21+)
├── firestore.rules           # deny ALL client writes; scoped reads
├── firestore.indexes.json
├── firebase.json · .firebaserc
└── .gitignore                # blocks credentials / .env / emulator data
```

---

## Authoritative vs derived (the core of the model)

Only two stored numbers are **authoritative**; everything else is recomputed on
read so that changing settings can never corrupt history.

* `share.balance` — integer Toman actually paid into a share. Changes **only**
  via `payments.recordSeed` (`balance += amount`). **Never** recomputed from the
  fee or elapsed months.
* `loan.outstanding` — principal minus installments paid; decremented by
  `payments.recordInstallment`.

Derived every read (`functions/src/derive.ts`): per-share `funded` /
`fundedPct` / `loanEligible`; per-member `seedBalance`, `fundedShares`,
`loanEligible` (≥1 share funded to par), blended `fundedPct`, `behind`; fund
`totalPool` / `available` (= pool − outstanding) / `outstanding` / counts;
per-family aggregates; `loan.pct`; rotation next-up.

* `parValue` (۵۷۸۰) is the current full-funded value of a share; it rises by
  `membershipFee` each period (next ۵۸۴۰). `membershipFee` (۶۰) and
  `defaultInstallments` (۲۰) are **informational** — they drive no balance math.
* **Invariant:** a loan may only be issued to a loan-eligible member **and** only
  if `available ≥ principal`. Enforced in `loans.issue` and in the seed.

All 20 of these relationships are checked by `verify-local.js` (see below).

---

## API (callables)

Spec dotted names map to exported callable names:

| Spec | Callable | Spec | Callable |
|---|---|---|---|
| members.list | `membersList` | payments.recordSeed | `paymentsRecordSeed` |
| members.get | `membersGet` | payments.recordInstallment | `paymentsRecordInstallment` |
| members.create | `membersCreate` | payments.list | `paymentsList` |
| members.update | `membersUpdate` | loans.issue | `loansIssue` |
| members.delete | `membersDelete` | loans.get | `loansGet` |
| shares.add | `sharesAdd` | loanOrder.get | `loanOrderGet` |
| shares.get | `sharesGet` | loanOrder.reorder | `loanOrderReorder` |
| settings.get | `settingsGet` | loanOrder.markReceived | `loanOrderMarkReceived` |
| settings.update | `settingsUpdate` | loanOrder.startNewRound | `loanOrderStartNewRound` |
| aggregates.dashboard | `dashboard` | (seed) | `seedDatabase` · `setAdminRole` |

The client calls these through `web/api.js` (`window.API.*`). Each callable
verifies `request.auth` and the `role=admin` custom claim; member-facing reads
(statement) are scoped to `request.auth.uid == memberId`.

---

## Run it

### Demo (no backend)
```bash
cd web && python3 -m http.server 8000   # → http://localhost:8000  (login: anything)
```

### Verify the backend invariants (no emulator / no JDK needed)
```bash
cd functions && npm install && npm run build
node scripts/verify-local.js            # seeds in-memory, asserts 20 invariants
```

### Local Firebase Emulator Suite (Auth + Firestore + Functions + Hosting)
Requires **JDK 21+** for the Firestore emulator.
```bash
npm install -g firebase-tools
cd functions && npm install && npm run build && cd ..
firebase emulators:start --project demo-mehr110
# seed (open in the Functions emulator shell, or call seedDatabase once)
firebase functions:shell --project demo-mehr110   # > seedDatabase({})
```

### Go LIVE against your Firebase project
1. `firebase login` and create a project; `firebase use --add` (updates `.firebaserc`).
2. In `web/firebase-config.js`: set `FB_LIVE = true` and paste your **web** config.
3. Deploy:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,functions,hosting
   ```
4. Create the manager account in **Firebase Auth** (email/password), then grant
   admin once (uses your local credentials — never committed):
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccount.json
   node functions/scripts/setAdmin.js manager@example.com
   ```
5. Seed the database once (admin-only in production) via the `seedDatabase`
   callable, then sign in at the deployed URL.

---

## Security

* **Public repo, zero secrets.** `.gitignore` blocks `serviceAccount*.json`,
  `*-firebase-adminsdk-*.json`, `.env*`, runtime configs and emulator exports.
* A Firebase **web** config (`apiKey`, `appId`, …) is a public client identifier,
  **not** a secret — access is controlled by Auth + Security Rules + Functions,
  never by hiding it. The committed values are placeholders anyway.
* **Firestore rules deny ALL client writes** — every mutation goes through a
  Cloud Function (Admin SDK). Members can read only their own document subtree.
* Admin credentials / service accounts live server-side only and never reach the
  browser. The seed dataset is entirely synthetic.
