# 🩺 MedAI Health Assistant

MedAI is a premium, responsive health assistant web application featuring a symptom checker, vitals log, medical clinic sheets, and wellness recommendations.

## 🏗️ Architecture

- **Frontend**: React + Vite (deployed on **Vercel**)
- **Backend**: Node.js + Express (deployed on **Render**)
- **Database**: Supabase PostgreSQL (Row-Level Security bypassed via private service role token authority)

---

## 🚀 Deployment Instructions

### 1. Deploy the Backend on Render
1. Log in to [Render](https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository (`symptom-app`).
4. Set the following settings:
   - **Name**: `medai-backend` (or similar)
   - **Root Directory**: `medai-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. In the **Environment Variables** tab, add:
   - `PORT`: `3001` (or let Render assign it automatically)
   - `JWT_SECRET`: `your_jwt_secret_string`
   - `SUPABASE_URL`: `https://your-supabase-project.supabase.co`
   - `SUPABASE_KEY`: `your_service_role_secret_key`
6. Deploy the Web Service. Copy the public URL (e.g., `https://medai-backend.onrender.com`).

---

### 2. Deploy the Frontend on Vercel
1. Log in to [Vercel](https://vercel.com) using your GitHub account.
2. Click **Add New** -> **Project**.
3. Import the `symptom-app` repository.
4. Configure the following settings:
   - **Framework Preset**: `Vite` (automatically detected)
   - **Root Directory**: Leave blank (root of the repo)
5. Expand the **Environment Variables** section and add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-render-backend-url.onrender.com/api` (replace with your actual Render API URL, making sure to append `/api` to the end).
6. Click **Deploy**. Vercel will build and host your frontend.
