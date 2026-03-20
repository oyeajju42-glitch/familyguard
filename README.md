# FamilyGuard

FamilyGuard is a parental monitoring system with:

- **FamilyGuardChild** (Android child app)
- **backend** (Node.js + Express + MongoDB + Socket.io)
- **dashboard** (React + Vite + Tailwind + Socket.io client)

---

## 1) Project Structure

```bash
familyguard/
├── backend/
├── dashboard/
└── FamilyGuardChild/
```

---

## 2) Backend Setup

### Install

```bash
cd backend
npm install
```

### Configure env

Create `backend/.env`:

```env
PORT=8001
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret-at-least-16-chars
PAIRING_CODE=FAMILYGUARD2026
CORS_ORIGIN=http://localhost:5173
```

### Run

```bash
node src/server.js
```

Health check:

```bash
GET /health
```

---

## 3) Dashboard Setup

### Install

```bash
cd dashboard
npm install
```

### Configure env

Create `dashboard/.env`:

```env
VITE_API_URL=http://localhost:8001
VITE_SOCKET_URL=http://localhost:8001
```

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## 4) Android (FamilyGuardChild) Setup

### Open and sync

1. Open `FamilyGuardChild/` in Android Studio
2. Wait for Gradle sync to complete
3. Ensure Android SDK 34 + Build Tools installed

### Build Debug APK

```bash
cd FamilyGuardChild
./gradlew assembleDebug
```

Output:

`FamilyGuardChild/app/build/outputs/apk/debug/app-debug.apk`

---

## 5) MongoDB Atlas Setup

1. Create a free MongoDB Atlas cluster
2. Create DB user and password
3. Add IP access (`0.0.0.0/0` for testing, then restrict later)
4. Copy connection string and put into `MONGO_URI`

---

## 6) Deploy Backend to Render

1. Push `backend/` to GitHub
2. In Render, create **Web Service** from repo
3. Build command: `npm install`
4. Start command: `node src/server.js`
5. Add env vars:
   - `PORT`
   - `MONGO_URI`
   - `JWT_SECRET`
   - `PAIRING_CODE`
   - `CORS_ORIGIN` (set to your dashboard URL)
6. Deploy and verify `GET /health`

---

## 7) Dashboard Deployment (Vercel)

1. Push `dashboard/` to GitHub
2. Import project in Vercel
3. Set env:
   - `VITE_API_URL=https://<your-render-backend-url>`
   - `VITE_SOCKET_URL=https://<your-render-backend-url>`
4. Deploy

---

## 8) Android Enrollment Flow

In the app, enter:

- API URL (backend URL, e.g. `https://your-backend.onrender.com/`)
- Parent ID
- Pairing Code

Tap **Enroll Device**. On success, app stores:

- `deviceId`
- `deviceToken`

All device API calls automatically include `x-device-token`.

---

## 9) Hardening Included

- Null safety guards in enrollment and sync
- Runtime permission edge-case handling
- Foreground service crash protection and sticky behavior
- WorkManager reliability with backoff and unique work
- Retrofit retries + timeout tuning
- Token-format checks and safe token clearing
- Backend route and auth hardening with better validation/error handling
