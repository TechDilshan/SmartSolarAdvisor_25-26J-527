# Smart Solar Advisor — Location-Aware Solar Prediction

**Project ID:** 25-26J-527  
**Student ID:** IT22341204  
**Student Name:** K Rangana Malmi Nadee  
**Student Phone:** 0754907285  

---

## Overview

This component implements **Nearby Site–Based and Location-Aware Solar Energy Forecasting** for the Smart Solar Advisor project. Users select a location on a map; the system finds the nearest site with historical prediction data, aggregates it by day or month, and shows energy estimates, weather, and financial analysis.

The system has two main parts:

- **Backend (ml-engine):** Flask API that reads prediction data from Firebase, uses a BallTree for nearest-neighbor search, and serves aggregated solar/weather data.
- **Frontend (webapp):** React + Vite app with customer dashboard (location analysis, charts, ROI, PDF report) and admin dashboard (sites, analytics, comparison).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  WEBAPP (React + Vite) — Port 8083                                │
│  Customer Dashboard · Admin Dashboard · Admin Sites · Analytics   │
│  API client → ml-engine  │  Weather → Open-Meteo                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP (JSON)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  ML-ENGINE (Flask) — Port 5007                                    │
│  /nearest-location  /aggregate-data  /sites-summary  /reload-data │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Firebase Realtime Database (predicted_units)                     │
│  customer → site → timestamp → SolarRecord                        │
└─────────────────────────────────────────────────────────────────┘
```

---

# Backend (ml-engine)

## Purpose

- Load solar prediction records from **Firebase Realtime Database** (`predicted_units`).
- Build a **BallTree** (Haversine) over all record coordinates for fast nearest-neighbor lookup.
- Expose REST endpoints for the frontend: nearest location, aggregated data (daily/monthly/hourly), sites summary, and admin data reload.

## Structure

| File / folder      | Description |
|--------------------|-------------|
| `app.py`           | Flask app: routes, validation, BallTree query, aggregation logic. |
| `firebase_config.py` | Firebase Admin init; `ref` points to `predicted_units`. |
| `AddD.py`          | Script to add sample prediction data to Firebase (e.g. 5‑min records). |
| `serviceAccountKey.json` | Firebase service account key (do not commit; use env for path). |
| `requirements.txt` / `requirements2.txt` | Python dependencies. |

## Data Model

**Firebase structure:** `predicted_units / {customer} / {site} / {timestamp} / record`

**SolarRecord (per 5‑minute interval):**

- `date`, `time`, `latitude`, `longitude`
- `temperature`, `humidity`, `irradiance`, `dust_level`, `rainfall`
- `panel_area_m2`, `predicted_kwh_per5min`

**Aggregate response (per bucket):**  
`average_temperature`, `average_humidity`, `average_irradiance`, `average_dust_level`, `average_rainfall`, `total_predicted_kwh_per5min`

## API Endpoints

| Method | Endpoint            | Description |
|--------|---------------------|-------------|
| POST   | `/nearest-location` | Body: `latitude`, `longitude`. Optional: `k`, `radius_km`, `include_distance`. Returns list of nearest records (with `distance_km` if requested). |
| POST   | `/aggregate-data`   | Body: `latitude`, `longitude`, `mode` (`"daily"` \| `"monthly"` \| `"hourly"`). Optional: `start_date`, `end_date` (YYYY-MM-DD). Returns `{ bucketKey: { stats } }`. |
| GET    | `/sites-summary`    | Returns list of sites: `customer`, `site`, `latitude`, `longitude`, `first_date`. |
| POST   | `/reload-data`      | Admin only. Header: `X-Admin-Token: <ADMIN_TOKEN>`. Reloads data from Firebase into memory. |

## Environment Variables (Backend)

| Variable                         | Description |
|----------------------------------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | Path to service account JSON (default: `./serviceAccountKey.json`). |
| `FIREBASE_DB_URL`                | Firebase Realtime Database URL. |
| `CORS_ORIGINS`                   | Optional; comma-separated origins for CORS. |
| `ADMIN_TOKEN`                    | Secret for `X-Admin-Token` on `/reload-data`. |

## How to Run (Backend)

1. **Python 3.10+** recommended.
2. Install dependencies (use the requirements in `ml-engine`; core ones: `Flask`, `flask-cors`, `firebase-admin`, `numpy`, `scikit-learn`):

   ```bash
   cd Location_Aware_Model/ml-engine
   pip install -r requirements.txt
   # or: pip install Flask flask-cors firebase-admin numpy scikit-learn
   ```

3. Place `serviceAccountKey.json` in `ml-engine` (or set `FIREBASE_SERVICE_ACCOUNT_KEY_PATH`).
4. Optionally set `FIREBASE_DB_URL` and `ADMIN_TOKEN`.
5. Run the app:

   ```bash
   python app.py
   ```

   Server runs at **http://localhost:5007** (debug mode).

6. (Optional) Populate sample data:

   ```bash
   python AddD.py
   ```

---

# Frontend (webapp)

## Purpose

- **Customer:** Choose location (map or search), system size (kW), view total energy, weather, nearest-site KPIs, daily/monthly charts, financial ROI, and **download a feasibility report (PDF)**.
- **Admin:** View all sites, open site detail (map, total energy, **paginated 5‑min records**, daily/monthly charts), and run analytics (daily charts, **compare two sites**).

## Structure

| Path | Description |
|------|-------------|
| `src/App.tsx` | Routes: `/`, `/dashboard`, `/admin`, `/admin/sites`, `/admin/sites/:siteId`, `/admin/analytics`. |
| `src/main.tsx` | Entry; mounts React app. |
| `src/services/api.ts` | Axios client; `fetchNearestLocation`, `fetchAggregateData`, `fetchSitesSummary`, `fetchRealtimeWeather` (Open-Meteo). |
| `src/context/AuthContext.tsx` | Simulated auth; role `customer` or `admin` (e.g. via `?role=admin`). |
| `src/pages/` | `Index`, `Login`, `CustomerDashboard`, `AdminDashboard`, `AdminSites`, `AdminSiteDetail`, `AdminAnalytics`, `NotFound`. |
| `src/components/` | `LocationInput`, `MapPicker`, `NearestDataCards`, `DailyCharts`, `MonthlyCharts`, `RealtimeWeather`, `FinancialCalculator`, `KPICard`, plus `ui/` (shadcn). |
| `src/utils/exportPdf.ts` | PDF export: `exportElementToPdf(element, options)` using `jspdf` + `html2canvas`. |
| `src/layouts/DashboardLayout.tsx` | Layout and navigation for dashboard pages. |

## Key Features

- **Location:** Map (Leaflet) + Nominatim search; lat/lng and system size (kW).
- **Customer dashboard:** Total predicted energy (scaled by kW), real-time weather (Open-Meteo), nearest-site KPIs and map, daily/monthly charts, financial ROI calculator, **Download Feasibility Report (PDF)**.
- **Admin:** Sites list (search, sort, pagination), site detail with **paginated “Latest 5‑Min Records”** (newest first), daily/monthly charts; analytics with daily charts and **site comparison** (energy, irradiance, temp, radar).

## Environment Variables (Frontend)

| Variable           | Description |
|--------------------|-------------|
| `VITE_API_BASE_URL` | Backend base URL (default: `http://localhost:5007`). |

## How to Run (Frontend)

1. **Node.js 18+** and npm.
2. Install dependencies (use `--legacy-peer-deps` if you hit peer dependency conflicts):

   ```bash
   cd Location_Aware_Model/webapp
   npm install
   # or: npm install --legacy-peer-deps
   ```

3. Set backend URL if needed:

   ```bash
   # .env or .env.local
   VITE_API_BASE_URL=http://localhost:5007
   ```

4. Start dev server:

   ```bash
   npm run dev
   ```

   App runs at **http://localhost:8083**.

5. Build for production:

   ```bash
   npm run build
   npm run preview   # optional: preview production build
   ```

---

# Integration

1. User picks location and system size on the customer dashboard.
2. Frontend calls:
   - `fetchNearestLocation(lat, lng)` → nearest records (and distance).
   - `fetchAggregateData(lat, lng, "monthly")` and `fetchAggregateData(lat, lng, "daily")`.
   - `fetchRealtimeWeather(lat, lng)` → Open-Meteo.
3. Backend finds nearest site via BallTree and returns records/aggregates from Firebase data.
4. Frontend shows KPIs, charts, financials; user can download a **Feasibility Report** PDF (location, energy summary, weather snapshot, KPIs, daily/monthly charts).

**Auth:** Simulated in frontend (e.g. `?role=admin` or stored role); no backend auth in ml-engine.

---

# Quick Start (Full Stack)

1. **Backend:**  
   `cd Location_Aware_Model/ml-engine` → install deps, set Firebase key/URL → `python app.py` (port 5007).

2. **Frontend:**  
   `cd Location_Aware_Model/webapp` → `npm install` (or `--legacy-peer-deps`) → `npm run dev` (port 8083).

3. Open **http://localhost:8083**, log in, use **Dashboard** (customer) or **Admin** (admin).

4. Ensure Firebase has data under `predicted_units` (e.g. run `AddD.py` once).

---

# Summary

- **Backend:** Flask API + Firebase + BallTree; serves nearest location and aggregated solar data.
- **Frontend:** React app with customer analysis (map, charts, ROI, PDF report) and admin tools (sites, **paginated 5‑min records**, analytics and site comparison).

This README describes the **Location_Aware_Model** backend and frontend as implemented in this repository.
