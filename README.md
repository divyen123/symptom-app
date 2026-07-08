# 🩺 MedAI Health Assistant

**MedAI** is a full-stack, AI-powered health companion web application that helps users analyze symptoms, track vitals, manage medications, and access emergency medical resources — all from a single, beautifully designed interface.

> 🔗 **Live Demo**: [medai-health.vercel.app](https://medai-health.vercel.app)

---

## ✨ Features

### 🔬 AI Symptom Analyzer
- Select symptoms through an interactive, categorized symptom picker
- Get AI-generated condition predictions with severity levels (Mild / Moderate / Severe)
- Receive personalized self-care tips and doctor-visit recommendations
- Save and export detailed analysis reports as PDF

### 💓 Vitals Log & Heart Rate Monitor
- Log blood pressure, blood sugar, SpO2, temperature, and weight
- Real-time heart rate measurement using your device camera (PPG-based)
- Visual vitals history with trends over time

### 🤖 Doctor AI Chatbot
- Conversational AI health assistant powered by Groq LLaMA 3.1
- Persistent chat history across sessions
- Context-aware medical guidance and wellness advice

### 🆔 Medical ID & Emergency Hub
- Store personal medical information (blood group, allergies, conditions)
- Emergency contacts with one-tap calling
- Nearby hospitals finder using GPS geolocation
- Exportable Medical ID card as PDF
- Built-in CPR & first-aid quick guides

### 📋 Symptom History & Reports
- Automatic tracking of every symptom analysis performed
- Separate saved reports section for long-term reference
- Bulk export and management of health reports

### 💊 MediTown — Medicine Explorer
- Browse medicines across categories: Pharmacy, Herbal, Nutrition, First Aid
- Search and filter with detailed medicine information
- Set medication reminders with custom schedules

### 🧘 Wellness & Lifestyle
- AI-generated personalized wellness routines
- Weather-based health recommendations
- Daily health tips and lifestyle suggestions

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Framer Motion, jsPDF |
| **Styling** | Vanilla CSS with glassmorphism & dark mode |
| **Backend** | Node.js, Express.js, JWT Authentication |
| **Database** | Supabase (PostgreSQL) |
| **AI Engine** | Groq API — LLaMA 3.1 8B Instant |
| **APIs** | Open-Meteo (Weather), ipapi (Geolocation) |
| **Deployment** | Vercel (Frontend) + Render (Backend) |

---

## 🏗️ Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│                 │        │                  │        │                 │
│   React + Vite  │◄──────►│  Express.js API  │◄──────►│    Supabase     │
│   (Vercel)      │  REST  │  (Render)        │        │  (PostgreSQL)   │
│                 │        │                  │        │                 │
└─────────────────┘        └────────┬─────────┘        └─────────────────┘
                                    │
                                    ▼
                           ┌──────────────────┐
                           │   Groq LLaMA 3.1 │
                           │   (AI Engine)     │
                           └──────────────────┘
```

---

## 📱 Key Highlights

- 🌙 **Dark Mode** — Sleek, modern dark UI with glassmorphism effects
- 📱 **Fully Responsive** — Works seamlessly on desktop, tablet, and mobile
- 🔒 **Secure** — JWT-based authentication with encrypted API communication
- ⚡ **Offline Support** — LocalStorage fallback ensures functionality without internet
- 📄 **PDF Export** — Generate and download Medical ID cards and health reports

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ using React, Node.js & AI
</p>
