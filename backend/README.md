# Spoko Academy Portal — Production Cloud Backend

Complete standalone REST API and Database Server for **Spoko Academy Portal** (Web, Windows PC Desktop App, and Mobile Android APK).

---

## 🚀 Instant Deployment to Render

### Option A: Deploy via GitHub (Recommended)
1. Push this project (or this `backend/` folder) to your GitHub repository.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** ➔ **Web Service**.
4. Connect your GitHub repository.
5. Configure the following fields:
   - **Name**: `spoko-portal-api` (or any name you prefer)
   - **Region**: Oregon (US West) or closest to your location
   - **Branch**: `main` (or your active branch)
   - **Root Directory**: `backend` *(Leave blank if you created a standalone repository containing only the backend files)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Click **Advanced** ➔ Add **Health Check Path**: `/health`.
7. Click **Create Web Service**.

Once deployed, Render will generate your live URL:
```
https://your-service-name.onrender.com
```

### Option B: Deploy via Blueprint (`render.yaml`)
1. Click **New +** ➔ **Blueprint**.
2. Select your repository. Render automatically reads `render.yaml`.
3. Click **Apply**.

---

## 🔍 Verification & Health Check

Visit your deployed endpoint in any browser:
```
https://your-service-name.onrender.com/health
```

Expected Response:
```json
{
  "status": "online",
  "service": "Spoko Academy Portal Cloud API",
  "uptime": 12,
  "database": {
    "status": "connected",
    "path": "db.json",
    "totalUsers": 2
  },
  "timestamp": "2026-11-06T02:00:00.000Z"
}
```

---

## 🔑 Default Credentials
- **Admin Username / ID**: `Spoko`
- **Admin Password**: `Spoko@123`
- **Student ID**: `12234`
- **Student Password**: `Spoko@123`

---

## 🛠 Local Development
To run this backend locally:
```bash
npm install
npm start
```
The server will run on `http://localhost:3001`.
