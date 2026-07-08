# ChaiSpot 🍵

Chai shop discovery & rewards platform — MERN stack prototype.

**Live URL:** _add your deployed URL here after deploying (see Deployment below)_
**Repo:** _add your GitHub URL here_

## Features implemented

- Email/password auth (JWT)
- Add a chai shop by address — server-side geocoding via Mapbox (no manual lat/lng entry)
- Map view with all shops as markers; click a marker to see name, average rating, and get directions
- Directions from either browser geolocation or a manually entered start point (geolocation is flaky in test environments, so both are supported)
- Reviews: 1–5 rating + text, one review per user per shop (DB-level unique index, not just UI validation), editable
- Points: +10 per review, +15 bonus for the first review on a shop with zero existing reviews
- Coupon redemption once a user has ≥50 points, with points deducted **atomically and server-side** so a user can never redeem more than they have (even under concurrent requests)
- Leaderboard and redemption history endpoints (stretch goals)
- Unit tests for the points/redemption logic (`backend/tests/pointsLogic.test.js`)

## Tech stack

- **Frontend:** React + Vite, Leaflet / react-leaflet (OpenStreetMap tiles), react-router-dom, axios
- **Backend:** Node.js, Express, Mongoose
- **DB:** MongoDB (Atlas free tier recommended)
- **Maps:** OpenStreetMap tiles (via Leaflet, no key), Nominatim for geocoding (address → coordinates, no key), OSRM public demo server for routing (no key)

> **Why not Mapbox:** Mapbox now requires a credit card on file to activate even its free tier. To keep this a genuinely no-cost, no-card setup, it uses the OpenStreetMap ecosystem instead (Leaflet + Nominatim + OSRM), which the assignment explicitly allows ("any alternative of Mapbox"). Trade-off: Nominatim and the public OSRM server are rate-limited shared services, fine for a prototype/demo but not meant for production-scale traffic — see Known limitations.

## Data model

**User**
```
email (unique), passwordHash, name, points
```

**Shop**
```
name, address, description, photoUrl,
location: { type: "Point", coordinates: [lng, lat] }  // GeoJSON, 2dsphere indexed
avgRating, reviewCount   // denormalized, recomputed on every review create/edit
createdBy → User
```

**Review**
```
shop → Shop, user → User, rating (1-5), text
unique compound index on (shop, user) — this is what makes "one review per shop per user"
a database guarantee rather than something only enforced in application code.
```

**Redemption**
```
user → User, shop → Shop, pointsSpent, couponCode
```

`avgRating`/`reviewCount` are denormalized onto `Shop` and recomputed via aggregation
whenever a review is created or edited, so the map/listing view never needs to
join across collections to show a rating.

## Key edge cases handled

- **Bad/unresolvable address:** geocoding failures return `422` with a clear message instead of crashing or silently storing `null` coordinates.
- **No route found:** the Directions API call is wrapped separately from geocoding; a failed route returns `422`, not a `500`.
- **Duplicate review:** enforced by a unique Mongo index on `(shop, user)`. The route catches the resulting `E11000` error and returns a friendly `409` telling the user to edit instead.
- **Over-redemption / race conditions:** redemption uses a single atomic `findOneAndUpdate({ _id, points: { $gte: spend } }, { $inc: { points: -spend } })`. If two redemption requests fire at once, only one can succeed — the second sees the now-lower balance and fails cleanly. This is deliberately not a "check balance, then update" pattern, which would have a race window.
- **First-review bonus:** the shop's *existing* review count is read before the new review is inserted, so the bonus is based on the state of the world at request time, not on the review that's about to be created.

## Setup (local, should take < 5 minutes)

### Prerequisites
- Node.js 18+
- A MongoDB connection string (local `mongod` or a free MongoDB Atlas cluster)
- Nothing else — geocoding, routing, and map tiles all use free, keyless OpenStreetMap-based services

### 1. Backend
```bash
cd backend
cp .env.example .env
# edit .env: set MONGO_URI, JWT_SECRET
npm install
npm run dev
# API runs on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env
# .env only needs VITE_API_URL, which already defaults correctly for local dev
npm install
npm run dev
# App runs on http://localhost:5173
```

### 3. Run tests
```bash
cd backend
npm test
```

## Deployment (free tiers)

1. **MongoDB Atlas** — create a free M0 cluster, add a database user, allow access from anywhere (0.0.0.0/0) for simplicity, copy the connection string into `MONGO_URI`.
2. **Backend → Render or Railway** — new Web Service from your GitHub repo, root directory `backend`, build command `npm install`, start command `npm start`. Set the same env vars as `.env.example` (`MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` = your deployed frontend URL, `POINTS_PER_REVIEW`, `POINTS_FIRST_REVIEW_BONUS`, `REDEMPTION_THRESHOLD`).
3. **Frontend → Vercel or Netlify** — import the repo, root directory `frontend`, build command `npm run build`, output directory `dist`. Set `VITE_API_URL` to your deployed backend's `/api` URL.
4. Once both are live, update `CLIENT_ORIGIN` on the backend to the real frontend URL (for CORS) and redeploy the backend.

## Known limitations / what I'd do differently with more time

- No refresh tokens — JWT is long-lived (7 days) with no revocation list.
- `avgRating`/`reviewCount` recomputation does a full aggregation on every write; fine at this scale, would move to incremental updates at higher volume.
- No pagination on shop/review lists.
- No image upload — photo is a URL only, and there's no validation that it's a real image.
- No rate-limiting on review submission (listed as a stretch goal, skipped for time).
- Geocoding (Nominatim) and routing (OSRM demo server) are free public services with usage limits — fine for a prototype/demo, but a production version would move to a paid provider or self-hosted instance to get reliability guarantees and higher throughput.
- No search/filter or leaderboard UI (backend endpoints exist for leaderboard; not wired into the frontend).
- Redemption doesn't verify the shop is a "participating" shop specifically — any shop can be picked, since the assignment didn't define what makes a shop participating.
- Test coverage is limited to the pure points/redemption logic; no integration tests against a real/in-memory MongoDB due to time constraints.
