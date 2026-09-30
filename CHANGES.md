# VYRO — review & upgrade notes

## Security fixes (important)
- **Anyone who signed up became TENANT_ADMIN of the RPM restaurant** (orders, customer phones, payment proofs, payment accounts). Sign-up now grants nothing; only the first account on an empty platform is bootstrapped (lock it with `VYRO_OWNER_EMAIL`). Everyone else joins through an **invite link** (`/join/<token>`, single-use, 7 days).
- **Roles were never enforced** (`requireRole` was unused). Every admin server function now checks a minimum role: STAFF < BRANCH_MANAGER < TENANT_ADMIN < TENANT_OWNER.
- **Stored XSS via links** — profile URLs were rendered as `href` without validation (`javascript:` possible). All links are https-only now (also in the public loader).
- **Payment proofs**: real magic-byte check (JPEG/PNG/WebP), size cap, max 5 per order, rate limit; a customer can no longer flip a PAID order back to "pending" by uploading again.
- **Delivery fee was client-controlled** (customer could send 0). Fee, minimum order and totals are computed server-side from the business settings.
- Server-side validation of variants, add-ons and required/min/max groups (previously invalid ids were silently ignored).
- Open-redirect guard on `/login?redirect=`; whitelist of public platform settings; public tracking page no longer returns internal columns; unbounded rate-limit map now swept; analytics endpoint restricted to a fixed event list + rate limit.

## Bug fixes
- Dashboard revenue counted **cancelled** orders; "today" used UTC (wrong for Cairo) → now local-day based and excludes cancelled. Top sellers count units, not rows.
- Offers created in the dashboard 404'd and couldn't be ordered (no matching catalog item) → now mirrored automatically.
- QR destinations `offers/checkout/location` all went to the menu.
- Order status could jump anywhere (COMPLETED → PENDING) → proper state machine + compare-and-set.
- Egyptian numbers (`010…`) produced dead `wa.me` links → normalized to `20…`.
- Seed could fail forever after a crash / cold-start race → idempotent + single-flight; demo data no longer pollutes a real database.
- Checkout: order was "created" but the proof upload could fail with a scary error → resilient, images auto-compressed on the phone; default fulfillment no longer "dine in" without a table.
- Product page: tracking fired inside `useMemo`, unavailable variants selectable, no required-group validation.
- Removed a dev leftover (`isolationProbe`, hard-coded tenant ids in diagnostics).

## New features
- **Live orders board**: auto-refresh, chime for new orders, filters + search, one-tap next status, proof viewer, WhatsApp notify, kitchen ticket print, CSV export, "pause orders" switch.
- **Customer tracking page** with live timeline + proof re-upload.
- **Staff management**: invites, roles, per-branch assignment.
- Business settings: delivery fee, minimum order, pause switch, **opening hours** (overnight ranges, Cairo time) with Open/Closed indicator on the storefront.
- **Branding editor** (color → storefront theme with auto contrast), QR: choose destination, PNG download, enable/disable.
- Menu: search/filter, sold-out toggle, compare-at price. Analytics: funnel + views-vs-carts.
- **Categories**: add / edit / hide / delete + up-down ordering (products are kept when a category is deleted).
- **Branches**: add / edit / deactivate; can't delete the last branch or one that has orders (deactivate instead).
- Migration `0003_vyro_ops.sql` (auto-applied).

## Still open
- Payment proofs are stored in the database (fine for a start; the Diagnostics page warns when it grows). Moving them to S3/Blob needs storage credentials, so it was left out.

## Not verified
No network in the review sandbox → dependencies weren't installed, so `npm run build/lint` and a browser run were **not** executed. Pure logic is covered by 51 passing `node --test` tests; TypeScript was checked with stubbed libs (only stub-related `key` prop noise remains). Run `npm i && npm run build && npm test` before deploying.
