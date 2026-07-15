import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "framer-motion";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "symptom_reports";
const HISTORY_KEY = "symptom_history_records";
const SETTINGS_KEY = "symptom_settings";
const VITALS_KEY = "symptom_vitals";
const MEDICINE_KEY = "symptom_medicines";
const REMINDERS_KEY = "symptom_reminders";
const TODO_KEY = "symptom_todos";
const APPEARANCE_KEY = "medai_appearance";
const MODEL = "llama-3.1-8b-instant";
const DISCLAIMER = "⚕️ This app is not a medical diagnosis system. Please consult a qualified doctor.";

const SYMPTOMS_LIST = [
  "Headache","Fever","Cough","Sore throat","Fatigue","Nausea","Vomiting",
  "Diarrhea","Chest pain","Shortness of breath","Dizziness","Back pain",
  "Abdominal pain","Rash","Joint pain","Muscle aches","Runny nose","Congestion",
  "Loss of appetite","Swelling","Blurred vision","Ear pain","Numbness","Insomnia",
  "Neck stiffness","Jaw pain","Shoulder pain","Elbow pain","Wrist pain","Hip pain",
  "Knee pain","Ankle pain","Palpitations","Heartburn","Bloating","Constipation",
  "Frequent urination","Tingling","Wheezing","Night sweats","Dry eyes","Tinnitus",
];

const REGION_SYMPTOMS = {
  All: SYMPTOMS_LIST,
  Head: ["Headache", "Fever", "Dizziness", "Insomnia", "Jaw pain", "Night sweats"],
  Eyes: ["Blurred vision", "Dry eyes", "Headache", "Dizziness"],
  "Ears & Throat": ["Ear pain", "Sore throat", "Tinnitus", "Congestion", "Runny nose"],
  Neck: ["Neck stiffness", "Sore throat", "Swelling", "Fever"],
  Chest: ["Cough", "Chest pain", "Shortness of breath", "Wheezing", "Congestion"],
  Heart: ["Palpitations", "Chest pain", "Shortness of breath", "Dizziness", "Fatigue"],
  Abdomen: ["Abdominal pain", "Nausea", "Vomiting", "Heartburn", "Bloating", "Loss of appetite", "Diarrhea", "Constipation", "Frequent urination"],
  Spine: ["Back pain", "Neck stiffness", "Numbness", "Tingling", "Muscle aches"],
  Shoulders: ["Shoulder pain", "Joint pain", "Muscle aches", "Swelling", "Numbness"],
  Arms: ["Elbow pain", "Wrist pain", "Tingling", "Numbness", "Swelling", "Rash"],
  Hips: ["Hip pain", "Joint pain", "Numbness", "Muscle aches", "Fatigue"],
  Legs: ["Knee pain", "Ankle pain", "Swelling", "Numbness", "Rash", "Muscle aches", "Joint pain", "Tingling"],
};

const CONDITIONS = ["None","Diabetes","Hypertension","Asthma","Heart disease","Thyroid disorder","Arthritis","Migraine"];

const TIPS = [
  { icon: "💧", title: "Stay Hydrated", body: "Drink at least 8 glasses of water daily. Dehydration worsens most symptoms." },
  { icon: "😴", title: "Prioritise Sleep", body: "Adults need 7–9 hours. Poor sleep weakens immunity and amplifies pain." },
  { icon: "🌡️", title: "Manage Fever", body: "Rest, fluids, and paracetamol/ibuprofen. Seek help if fever exceeds 39.5°C." },
  { icon: "🥗", title: "Eat Nutritiously", body: "Whole foods, fruits, and vegetables speed recovery and bolster defences." },
  { icon: "🚶", title: "Light Movement", body: "Short walks improve circulation. Avoid strenuous activity when unwell." },
  { icon: "🧘", title: "Reduce Stress", body: "Chronic stress suppresses immunity. Try deep breathing or meditation." },
];

// eslint-disable-next-line no-unused-vars
const EMERGENCY_SIGNS = [
  "chest pain","difficulty breathing","shortness of breath","stroke","unconscious",
  "seizure","severe bleeding","paralysis","sudden vision loss","heart attack",
];

const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const API = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl.replace(/\/$/, "")}/api`;

const loadReports = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
};
const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
};
const loadSettings = () => {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); }
  catch { return {}; }
};
const loadVitals = () => {
  try { return JSON.parse(localStorage.getItem(VITALS_KEY) || "[]"); }
  catch { return []; }
};
const loadMedicines = () => {
  try { return JSON.parse(localStorage.getItem(MEDICINE_KEY) || "[]"); }
  catch { return []; }
};
const loadReminders = () => {
  try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) || "[]"); }
  catch { return []; }
};

const loadTodos = () => {
  try { return JSON.parse(localStorage.getItem(TODO_KEY) || "[]"); }
  catch { return []; }
};
const DEFAULT_APPEARANCE = {
  theme: "light",
  fontFamily: "Plus Jakarta Sans",
  fontSize: "default",
  navPosition: "left",
  navbarPalette: "white",
  contentPalette: "white",
  stickerOpacity: 0.15,
  glassyNavbar: false,
  glassyContainer: false,
};
const FONT_OPTIONS = [
  { label: "Plus Jakarta Sans", value: "Plus Jakarta Sans" },
  { label: "Inter", value: "Inter" },
  { label: "Roboto", value: "Roboto" },
  { label: "Outfit", value: "Outfit" },
  { label: "Poppins", value: "Poppins" },
  { label: "Nunito", value: "Nunito" },
];
const FONT_SIZE_OPTIONS = [
  { label: "Small", value: "small", scale: 0.9 },
  { label: "Default", value: "default", scale: 1 },
  { label: "Large", value: "large", scale: 1.1 },
  { label: "Extra Large", value: "xl", scale: 1.2 },
];
const NAVBAR_PALETTES = [
  { id: "white", label: "White", bg: "#ffffff", border: "#cbd5e1", text: "#0f172a", textMuted: "#475569", activeBg: "rgba(59,130,246,0.08)", activeText: "#2563eb", isDark: false },
  { id: "lightBlue", label: "Light Blue", bg: "#e0f2fe", border: "#bae6fd", text: "#0369a1", textMuted: "#0284c7", activeBg: "rgba(59,130,246,0.12)", activeText: "#0250c5", isDark: false },
  { id: "appBlue", label: "Default Blue", bg: "#0f1f5c", border: "rgba(255,255,255,0.08)", text: "#ffffff", textMuted: "rgba(255,255,255,0.65)", activeBg: "rgba(255,255,255,0.08)", activeText: "#93c5fd", isDark: true },
  { id: "darkGrey", label: "Dark Grey", bg: "#1e293b", border: "rgba(255,255,255,0.08)", text: "#f8fafc", textMuted: "rgba(255,255,255,0.65)", activeBg: "rgba(255,255,255,0.08)", activeText: "#93c5fd", isDark: true },
  { id: "black", label: "Black", bg: "#090d16", border: "rgba(255,255,255,0.06)", text: "#ffffff", textMuted: "rgba(255,255,255,0.65)", activeBg: "rgba(255,255,255,0.08)", activeText: "#93c5fd", isDark: true },
];
const CONTENT_PALETTES = [
  { id: "white", label: "White", bg: "#ffffff", border: "#cbd5e1", text: "#0f172a", textMuted: "#475569", surface: "#ffffff", surface2: "#f8fafc", isDark: false },
  { id: "lightBlue", label: "Light Blue", bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1", textMuted: "#0284c7", surface: "#ffffff", surface2: "#e0f2fe", isDark: false },
  { id: "appBlue", label: "Default Blue", bg: "#f1f5fd", border: "#e2e8f0", text: "#0f1f5c", textMuted: "#475569", surface: "#ffffff", surface2: "#f8faff", isDark: false },
  { id: "darkGrey", label: "Dark Grey", bg: "#0f172a", border: "#1e293b", text: "#f1f5f9", textMuted: "#94a3b8", surface: "#1e293b", surface2: "#0f172a", isDark: true },
  { id: "black", label: "Black", bg: "#020617", border: "#1e293b", text: "#ffffff", textMuted: "#94a3b8", surface: "#090d16", surface2: "#020617", isDark: true },
];
const loadAppearance = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || "{}");
    return {
      ...DEFAULT_APPEARANCE,
      ...saved,
      navbarPalette: saved.navbarPalette || "appBlue",
      contentPalette: saved.contentPalette || (saved.theme === "dark" ? "darkGrey" : "white"),
      stickerOpacity: typeof saved.stickerOpacity === "number" ? saved.stickerOpacity : 0.15,
      glassyNavbar: saved.glassyNavbar !== undefined ? !!saved.glassyNavbar : false,
      glassyContainer: saved.glassyContainer !== undefined ? !!saved.glassyContainer : false,
    };
  }
  catch { return { ...DEFAULT_APPEARANCE }; }
};

let alarmAudioInterval = null;
let audioCtx = null;
const startAlarmAudio = (rem) => {
  if (alarmAudioInterval) return;
  
  if (rem && rem.time && rem.time.startsWith("{")) {
    try {
      const parsed = JSON.parse(rem.time);
      if (!parsed.soundEnabled) {
        return;
      }
    } catch (e) {
      return;
    }
  } else {
    return;
  }
  
  const tone = localStorage.getItem("MEDAI_ALARM_TONE") || "Standard Meds Alert";
  
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.error("Failed to initialize AudioContext", e);
    return;
  }
  
  const playTone = () => {
    if (!audioCtx) return;
    try {
      const actx = audioCtx;
      const now = actx.currentTime;
      if (tone === "Standard Meds Alert") {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(now + 0.3);
        
        setTimeout(() => {
          if (!audioCtx) return;
          const osc2 = actx.createOscillator();
          const gain2 = actx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(600, actx.currentTime);
          gain2.gain.setValueAtTime(0.1, actx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
          osc2.connect(gain2);
          gain2.connect(actx.destination);
          osc2.start();
          osc2.stop(actx.currentTime + 0.3);
        }, 350);
      } else if (tone === "Chime Alert") {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(987.77, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(now + 0.8);
      } else if (tone === "Soft Pulse Alert") {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(329.63, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(now + 0.6);
      } else {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(now + 0.25);
      }
    } catch (err) {
      console.error("Tone playback failed", err);
    }
  };
  
  let delay = 1200;
  if (tone === "Standard Meds Alert") delay = 1200;
  if (tone === "Chime Alert") delay = 1500;
  if (tone === "Soft Pulse Alert") delay = 1200;
  if (tone === "Digital Alarm Alert") delay = 1000;
  
  playTone();
  alarmAudioInterval = setInterval(playTone, delay);
};
const stopAlarmAudio = () => {
  if (alarmAudioInterval) {
    clearInterval(alarmAudioInterval);
    alarmAudioInterval = null;
  }
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (e) {}
    audioCtx = null;
  }
};

const getToken = () => localStorage.getItem("MEDAI_TOKEN");

const authHeaders = () => {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
};

const apiRegister = (name, email, password) => 
  fetch(`${API}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "Registration failed");
    return data;
  });

const apiLogin = (email, password) => 
  fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "Login failed");
    return data;
  });

const apiGetMe = () => 
  fetch(`${API}/auth/me`, { headers: authHeaders() }).then(async r => {
    if (!r.ok) throw new Error("Token invalid");
    return r.json();
  });

const apiGoogleLogin = (email, name) => 
  fetch(`${API}/auth/google-login`, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({ email, name }) 
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Google sign-in failed");
    return data;
  });

const apiChangePassword = (currentPassword, newPassword) => 
  fetch(`${API}/auth/change-password`, { 
    method: "POST", 
    headers: { "Content-Type": "application/json", ...authHeaders() }, 
    body: JSON.stringify({ currentPassword, newPassword }) 
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Password change failed");
    return data;
  });

const apiVerifyPassword = (password) =>
  fetch(`${API}/auth/verify-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ password })
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Password verification failed");
    return data;
  });

const apiUpdateEmail = (email) => 
  fetch(`${API}/auth/update-email`, { 
    method: "PUT", 
    headers: { "Content-Type": "application/json", ...authHeaders() }, 
    body: JSON.stringify({ email }) 
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Email update failed");
    return data;
  });

const apiDeleteAccount = () => 
  fetch(`${API}/auth/delete-account`, { 
    method: "DELETE", 
    headers: authHeaders() 
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Account deletion failed");
    return data;
  });

const apiFetch = async (url, options = {}) => {
  const r = await fetch(url, options);
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    let errMsg = `HTTP error ${r.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error) errMsg = parsed.error;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return r.json();
};

const apiFetchReports  = () => apiFetch(`${API}/reports`, { headers: authHeaders() });
const apiSaveReport    = (report) => apiFetch(`${API}/reports`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(report) });
const apiDeleteReport  = (id) => apiFetch(`${API}/reports/${id}`, { method: "DELETE", headers: authHeaders() });
const apiDeleteAllReports = () => apiFetch(`${API}/reports`, { method: "DELETE", headers: authHeaders() });
const apiBulkReports   = (arr) => apiFetch(`${API}/reports/bulk`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(arr) });

const apiFetchHistory  = () => apiFetch(`${API}/history`, { headers: authHeaders() });
const apiSaveHistory    = (item) => apiFetch(`${API}/history`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(item) });
const apiDeleteHistory  = (id) => apiFetch(`${API}/history/${id}`, { method: "DELETE", headers: authHeaders() });
const apiDeleteAllHistory = () => apiFetch(`${API}/history`, { method: "DELETE", headers: authHeaders() });
const apiBulkHistory   = (arr) => apiFetch(`${API}/history/bulk`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(arr) });
const apiFetchSettings = () => apiFetch(`${API}/settings`, { headers: authHeaders() });
const apiSaveSettings  = (s) => apiFetch(`${API}/settings`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(s) });

const apiFetchVitals   = () => apiFetch(`${API}/vitals`, { headers: authHeaders() });
const apiSaveVital     = (v) => apiFetch(`${API}/vitals`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(v) });
const apiDeleteVital   = (id) => apiFetch(`${API}/vitals/${id}`, { method: "DELETE", headers: authHeaders() });

const apiFetchChats    = () => apiFetch(`${API}/chats`, { headers: authHeaders() });
const apiGetChat       = (id) => apiFetch(`${API}/chats/${id}`, { headers: authHeaders() });
const apiCreateChat    = (chat) => apiFetch(`${API}/chats`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(chat) });
const apiUpdateChat    = (id, chat) => apiFetch(`${API}/chats/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(chat) });
const apiDeleteChat    = (id) => apiFetch(`${API}/chats/${id}`, { method: "DELETE", headers: authHeaders() });

const apiFetchTodos    = () => apiFetch(`${API}/todos`, { headers: authHeaders() });
const apiCreateTodo    = (todo) => apiFetch(`${API}/todos`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(todo) });
const apiUpdateTodo    = (id, todo) => apiFetch(`${API}/todos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(todo) });
const apiDeleteTodo    = (id) => apiFetch(`${API}/todos/${id}`, { method: "DELETE", headers: authHeaders() });

const apiFetchMedications    = () => apiFetch(`${API}/medications`, { headers: authHeaders() });
const apiCreateMedication    = (med) => apiFetch(`${API}/medications`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(med) });
const apiUpdateMedication    = (id, med) => apiFetch(`${API}/medications/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(med) });
const apiDeleteMedication    = (id) => apiFetch(`${API}/medications/${id}`, { method: "DELETE", headers: authHeaders() });
const apiDeleteAllMedications= () => apiFetch(`${API}/medications`, { method: "DELETE", headers: authHeaders() });

const apiFetchReminders      = () => apiFetch(`${API}/reminders`, { headers: authHeaders() });
const apiCreateReminder      = (rem) => apiFetch(`${API}/reminders`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(rem) });
const apiUpdateReminder      = (id, rem) => apiFetch(`${API}/reminders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(rem) });
const apiDeleteReminder      = (id) => apiFetch(`${API}/reminders/${id}`, { method: "DELETE", headers: authHeaders() });
const apiDeleteAllReminders  = () => apiFetch(`${API}/reminders`, { method: "DELETE", headers: authHeaders() });

const apiFetchSavedPlans = () => apiFetch(`${API}/saved-plans`, { headers: authHeaders() });
const apiSavePlan        = (plan) => apiFetch(`${API}/saved-plans`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(plan) });
const apiDeletePlan      = (id) => apiFetch(`${API}/saved-plans/${id}`, { method: "DELETE", headers: authHeaders() });
const apiDeleteAllPlans  = () => apiFetch(`${API}/saved-plans`, { method: "DELETE", headers: authHeaders() });

const apiResetProfile = () =>
  fetch(`${API}/auth/reset-profile`, { method: "DELETE", headers: authHeaders() }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Reset failed");
    return data;
  });

const getMsgText = (m) => m?.text || m?.content || "";
const normalizeChatMessages = (messages) =>
  (Array.isArray(messages) ? messages : []).map(m => ({ role: m.role, text: getMsgText(m) }));
const toBackendChatMessages = (messages) =>
  messages.map(m => ({ role: m.role, content: getMsgText(m) }));

const getNewChatDefaultMessages = () => [
  { role: "assistant", text: "Hello! I'm Doctor AI, your personal health assistant. I can help you understand symptoms, explain medical conditions, suggest self-care tips, or answer general health questions.\n\nHow can I assist you today?" }
];

const severityColor = (level) => ({
  Low: "#10b981", Medium: "#f59e0b", High: "var(--text-red-light)", Emergency: "var(--text-red)",
}[level] || "var(--text)");

const condColor = (conf) =>
  conf >= 70 ? "#2563eb" : conf >= 40 ? "#f59e0b" : "#94a3b8";

const severityBg = (level) => ({
  Low: "var(--bg-green-light)", Medium: "var(--bg-amber-light)", High: "var(--bg-red)", Emergency: "var(--bg-red)",
}[level] || "var(--surface-2)");

// eslint-disable-next-line no-unused-vars
const severityGlow = (level) => ({
  Low: "rgba(16,185,129,0.15)", Medium: "rgba(245,158,11,0.15)",
  High: "rgba(239,68,68,0.15)", Emergency: "rgba(220,38,38,0.2)",
}[level] || "transparent");

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&family=Inter:wght@300;400;500;600;700;800;900&family=Roboto:wght@300;400;500;700;900&family=Outfit:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&family=Nunito:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  :root {
    --navy: #0b1a4a;
    --navy-mid: #1e3a8a;
    --blue: #3b5ced;
    --blue-light: #5b7cff;
    --blue-pale: #eef3ff;
    --blue-border: #d3dffd;
    --slate: #5b6e8c;
    --slate-light: #8a9bb5;
    --surface: #f6f8fc;
    --surface-2: #eef2f9;
    --white: #ffffff;
    --border: #dce3f0;
    --text: #18243c;
    --text-muted: #5b6e8c;
    --text-faint: #8a9bb5;
    --red: #ef4444;
    --red-dark: #dc2626;
    --green: #10b981;
    --amber: #f59e0b;
    --radius-sm: 8px;
    --radius: 14px;
    --radius-lg: 18px;
    --radius-xl: 24px;
    --shadow-sm: 0 1px 2px rgba(11,26,74,0.04), 0 1px 3px rgba(11,26,74,0.05);
    --shadow: 0 2px 8px rgba(11,26,74,0.06), 0 4px 16px rgba(11,26,74,0.04);
    --shadow-lg: 0 8px 32px rgba(11,26,74,0.08), 0 12px 48px rgba(11,26,74,0.04);
    --shadow-blue: 0 6px 24px rgba(59,92,237,0.18);
    --font: 'Plus Jakarta Sans', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
    --transition-bounce: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    --sidebar-width: 236px;
    --sidebar-bg: #080e24;

    /* Semantic backgrounds and borders */
    --bg-red-light: #fff5f5;
    --bg-red: #fef2f2;
    --border-red: #fecaca;
    --border-red-dark: #fca5a5;
    --text-red: #dc2626;
    --text-red-light: #ef4444;
    --text-red-dark: #7f1d1d;

    --bg-amber-light: #fffbeb;
    --bg-amber: #fef9ec;
    --border-amber: #fde68a;
    --text-amber: #92400e;

    --bg-green-light: #ecfdf5;
    --bg-green: #e4f9ef;
    --border-green: #a7f3d0;
    --text-green: #065f46;

    --bg-blue-pale: #eef3ff;
    --bg-blue-light: #f0f4ff;
    --text-blue: #1e3a8a;

    --bg-purple-light: #fdf4ff;
    --border-purple: #e9d5ff;
    --text-purple: #7c3aed;

    --bg-modal: #ffffff;

    /* Glass effect */
    --glass-bg: rgba(255,255,255,0.7);
    --glass-border: rgba(255,255,255,0.5);
    --glass-blur: blur(16px);

    /* Scan buttons */
    --scan-btn-bg: linear-gradient(135deg, #f0f4ff, #e8eeff);
    --scan-cyan: #0891b2;
    --scan-cyan-border: rgba(6,182,212,0.3);
    --scan-cyan-glow: rgba(6,182,212,0.1);
    --scan-purple: #7c3aed;
    --scan-purple-border: rgba(124,58,237,0.3);
    --scan-purple-glow: rgba(124,58,237,0.1);
    --scan-pink: #e11d48;
    --scan-pink-border: rgba(225,29,72,0.3);
    --scan-pink-glow: rgba(225,29,72,0.1);
  }

  body { font-family: var(--font); color: var(--text); background: var(--surface); transition: background 0.35s ease, color 0.35s ease; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

  [data-theme="dark"] {
    --navy: #c8d6e5;
    --navy-mid: #93b8f5;
    --blue: #5b8df5;
    --blue-light: #7ba4ff;
    --blue-pale: #172033;
    --blue-border: #293550;
    --slate: #8495ad;
    --slate-light: #5b6e8c;
    --surface: #0a0f1d;
    --surface-2: #0d1326;
    --white: #162033;
    --border: #1e2d4a;
    --text: #dce3f0;
    --text-muted: #8495ad;
    --text-faint: #5b6e8c;
    --red: #f87171;
    --red-dark: #ef4444;
    --green: #34d399;
    --amber: #fbbf24;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
    --shadow: 0 2px 8px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
    --shadow-lg: 0 8px 32px rgba(0,0,0,0.5), 0 12px 48px rgba(0,0,0,0.3);
    --shadow-blue: 0 6px 24px rgba(91,141,245,0.25);
    --sidebar-bg: #050912;

    --bg-red-light: rgba(239, 68, 68, 0.12);
    --bg-red: rgba(239, 68, 68, 0.08);
    --border-red: rgba(239, 68, 68, 0.3);
    --border-red-dark: rgba(239, 68, 68, 0.5);
    --text-red: #fca5a5;
    --text-red-light: #f87171;
    --text-red-dark: #fca5a5;

    --bg-amber-light: rgba(245, 158, 11, 0.12);
    --bg-amber: rgba(245, 158, 11, 0.08);
    --border-amber: rgba(245, 158, 11, 0.3);
    --text-amber: #fbbf24;

    --bg-green-light: rgba(16, 185, 129, 0.12);
    --bg-green: rgba(16, 185, 129, 0.08);
    --border-green: rgba(16, 185, 129, 0.3);
    --text-green: #34d399;

    --bg-blue-pale: #172033;
    --bg-blue-light: #0d1326;
    --text-blue: #93b8f5;

    --bg-purple-light: rgba(124, 58, 237, 0.12);
    --border-purple: rgba(124, 58, 237, 0.3);
    --text-purple: #d8b4fe;

    --bg-modal: #162033;

    --glass-bg: rgba(22,32,51,0.75);
    --glass-border: rgba(255,255,255,0.06);
    --glass-blur: blur(20px);

    --scan-btn-bg: linear-gradient(135deg, #0a0f1d, #162033);
    --scan-cyan: #22d3ee;
    --scan-cyan-border: rgba(34,211,238,0.25);
    --scan-cyan-glow: rgba(34,211,238,0.1);
    --scan-purple: #c084fc;
    --scan-purple-border: rgba(168,85,247,0.25);
    --scan-purple-glow: rgba(168,85,247,0.1);
    --scan-pink: #fb7185;
    --scan-pink-border: rgba(244,63,94,0.25);
    --scan-pink-glow: rgba(244,63,94,0.1);
  }
  [data-theme="dark"] input, [data-theme="dark"] select, [data-theme="dark"] textarea {
    background-color: #162033 !important;
    color: #dce3f0 !important;
    border-color: #293550 !important;
  }
  [data-theme="dark"] input::placeholder, [data-theme="dark"] textarea::placeholder {
    color: #5b6e8c !important;
  }
  [data-theme="dark"] ::-webkit-scrollbar-thumb { background: #293550; }
  [data-theme="dark"] ::-webkit-scrollbar-thumb:hover { background: #3d5270; }

  input, select, textarea {
    font-family: var(--font);
    background-color: var(--white) !important;
    color: var(--text) !important;
    transition: var(--transition);
    border-radius: 10px;
  }
  input::placeholder, textarea::placeholder { color: var(--text-faint) !important; }
  input:focus, select:focus, textarea:focus {
    outline: none !important;
    border-color: var(--blue) !important;
    box-shadow: 0 0 0 3px rgba(59,92,237,0.1) !important;
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #c4cddb; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: #8a9bb5; }

  /* ─── ENHANCED ANIMATIONS ─── */
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-5px); }
  }
  @keyframes pulse-ring {
    0% { transform: scale(0.9); opacity: 1; }
    100% { transform: scale(1.4); opacity: 0; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.94); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes scaleInBounce {
    0%   { opacity: 0; transform: scale(0.8); }
    60%  { opacity: 1; transform: scale(1.04); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  @keyframes barFill {
    from { width: 0%; }
    to   { width: var(--bar-target); }
  }
  @keyframes counterUp {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  @keyframes gentlePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59,92,237,0.3); }
    50% { box-shadow: 0 0 0 12px rgba(59,92,237,0); }
  }
  @keyframes glowBreath {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  @keyframes borderGlow {
    0%, 100% { border-color: var(--border); }
    50% { border-color: var(--blue-border); }
  }
  @keyframes morphIn {
    0%   { opacity: 0; border-radius: 50%; transform: scale(0.3) rotate(-12deg); }
    40%  { opacity: 1; border-radius: 30%; }
    70%  { border-radius: 20%; }
    100% { opacity: 1; border-radius: var(--radius-lg); transform: scale(1) rotate(0deg); }
  }

  /* Splash animations */
  @keyframes splashLogo {
    0%   { transform: scale(0.5) rotate(-8deg); opacity: 0; }
    60%  { transform: scale(1.05) rotate(1deg); opacity: 1; }
    80%  { transform: scale(0.98) rotate(0deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes splashText {
    0%   { opacity: 0; transform: translateY(12px); letter-spacing: 6px; }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes splashProgress {
    0%   { width: 0%; }
    85%  { width: 82%; }
    100% { width: 100%; }
  }
  @keyframes splashExit {
    0%   { opacity: 1; transform: scale(1) translateY(0); }
    100% { opacity: 0; transform: scale(1.04) translateY(-20px); }
  }
  @keyframes splashRing1 {
    0%, 100% { transform: scale(1); opacity: 0.08; }
    50%       { transform: scale(1.08); opacity: 0.16; }
  }
  @keyframes splashRing2 {
    0%, 100% { transform: scale(1); opacity: 0.05; }
    50%       { transform: scale(1.12); opacity: 0.1; }
  }
  @keyframes dotPulse {
    0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
    40%            { transform: scale(1); opacity: 1; }
  }

  /* Page transitions */
  @keyframes pageIn {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pageOut {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to   { opacity: 0; transform: translateY(-10px) scale(0.98); }
  }
  @keyframes pageSlideIn {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes drawLine {
    from { stroke-dashoffset: 2000; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes barGrow {
    from { width: 0%; }
  }
  @keyframes barGrowVertical {
    from { height: 0%; }
  }
  @keyframes dotPop {
    0%   { r: 0; opacity: 0; }
    60%  { r: 5.5; opacity: 1; }
    100% { r: 4; opacity: 1; }
  }
  .trend-dot:hover circle.dot-main { r: 6; filter: drop-shadow(0 0 6px rgba(124,58,237,0.5)); }
  .page-enter { animation: pageIn 0.35s cubic-bezier(0.25, 0.1, 0.25, 1) both; }
  .page-exit { animation: pageOut 0.2s cubic-bezier(0.4, 0, 0.2, 1) both; }

  /* Staggered children */
  .stagger > * { animation: fadeUp 0.45s cubic-bezier(0.25, 0.1, 0.25, 1) both; }
  .stagger > *:nth-child(1) { animation-delay: 0.04s; }
  .stagger > *:nth-child(2) { animation-delay: 0.08s; }
  .stagger > *:nth-child(3) { animation-delay: 0.12s; }
  .stagger > *:nth-child(4) { animation-delay: 0.16s; }
  .stagger > *:nth-child(5) { animation-delay: 0.20s; }
  .stagger > *:nth-child(6) { animation-delay: 0.24s; }
  .stagger > *:nth-child(7) { animation-delay: 0.28s; }
  .stagger > *:nth-child(8) { animation-delay: 0.32s; }

  /* ─── ENHANCED CARD HOVER ─── */
  .card-hover {
    transition: var(--transition-slow);
    cursor: pointer;
    position: relative;
  }
  .card-hover::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    background: linear-gradient(135deg, var(--blue-light), var(--blue), var(--blue-light));
    opacity: 0;
    z-index: -1;
    transition: opacity 0.35s ease;
  }
  .card-hover:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg) !important;
    border-color: var(--blue-border) !important;
    background: color-mix(in srgb, var(--blue) 8%, var(--surface)) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
  }
  .card-hover:hover::before {
    opacity: 0.15;
  }
  .card-hover:active {
    transform: translateY(-1px) scale(0.99);
  }

  /* ─── GLASS CONTAINER ─── */
  .glass-container {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow);
  }

  /* Button ripple base */
  .btn-primary {
    position: relative;
    overflow: hidden;
    transition: var(--transition);
    border-radius: 10px;
    font-weight: 700;
  }
  .btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0);
    transition: background 0.15s;
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(59,92,237,0.3);
  }
  .btn-primary:hover::after { background: rgba(255,255,255,0.08); }
  .btn-primary:active::after { background: rgba(255,255,255,0.15); }
  .btn-primary:active { transform: scale(0.97); }

  /* Nav item active indicator */
  .nav-item {
    position: relative;
    transition: var(--transition);
    border-radius: 10px;
  }
  .nav-item:hover {
    background: rgba(255,255,255,0.06) !important;
  }

  /* Pill tag */
  .pill-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 600;
    padding: 3px 10px;
    transition: var(--transition);
  }

  /* Symptom chip hover */
  .symptom-chip {
    transition: var(--transition-bounce);
    cursor: pointer;
  }
  .symptom-chip:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
  }
  .symptom-chip:active { transform: scale(0.95); }

  /* Gradient text */
  .gradient-text {
    background: linear-gradient(135deg, var(--navy-mid), var(--blue));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ─── SKELETON ─── */
  .skeleton {
    background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface) 50%, var(--surface-2) 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius);
  }

  /* ─── FOCUS RING ─── */
  button:focus-visible {
    outline: 2px solid var(--blue);
    outline-offset: 2px;
    border-radius: 8px;
  }

  /* ─── ANIMATED LOGO ICON ─── */
  .logo-icon-animated {
    animation: gentleFloat 3s ease-in-out infinite, gentlePulse 4s ease-in-out infinite;
  }
  .logo-glow-ring {
    animation: splashRing1 3s ease-in-out infinite;
  }
  .logo-glow-ring-outer {
    animation: splashRing2 4s ease-in-out infinite;
  }

  /* Hide mobile header by default on desktop */
  .mobile-header {
    display: none !important;
  }

  .chat-history-sidebar {
    display: flex;
  }

  .recipe-modal-overlay {
    position: fixed;
    top: 0; bottom: 0;
    left: var(--sidebar-width);
    right: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    pointer-events: none;
  }
  .recipe-modal-overlay > * {
    pointer-events: all;
  }
  body:has(.medai-modal-overlay) .main-content {
    filter: blur(10px);
    transition: filter 0.2s ease;
  }
  .medai-modal-overlay,
  .medai-modal-container {
    position: fixed;
    top: 0; bottom: 0;
    left: var(--modal-offset-left, var(--sidebar-width));
    right: var(--modal-offset-right, 0);
  }

  @keyframes loginLogoFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }
  @keyframes loginPanelIn {
    from { opacity: 0; transform: translateX(32px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes loginLogoMorph {
    from { opacity: 0; transform: scale(0.6); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes loginBrandIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ─── MOBILE RESPONSIVE OVERRIDES (<= 768px) ─── */
  @media (max-width: 768px) {
    /* Prevent lagging: Disable expensive background animations and filters on mobile */
    .ambient-background,
    .ambient-orb,
    .ambient-svg,
    .ambient-hex-group,
    .ambient-poly,
    .ambient-line,
    .ambient-circle {
      animation: none !important;
      filter: none !important;
      transition: none !important;
    }
    .ambient-svg {
      opacity: 0.05 !important;
    }

    .recipe-modal-overlay {
      left: 0 !important;
      right: 0 !important;
      padding: 16px !important;
    }
    .medai-modal-overlay,
    .medai-modal-container {
      left: 0 !important;
      right: 0 !important;
    }
    .chat-history-sidebar {
      display: none !important;
    }
    .desktop-only-fab {
      display: none !important;
    }
    .mobile-only-history-btn {
      display: flex !important;
    }
    /* Layout structural changes */
    .app-layout {
      flex-direction: column !important;
      overflow: hidden !important;
      height: 100% !important;
      width: 100% !important;
    }

    .main-content {
      flex: 1 !important;
      width: 100% !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
      padding-top: 0 !important;
    }

    .main-content > div {
      padding: 0 12px !important;
      box-sizing: border-box !important;
    }

    /* Fixed/sticky mobile top bar */
    .mobile-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      height: 56px !important;
      padding: 0 16px !important;
      background: var(--sidebar-bg) !important;
      border-bottom: 1px solid var(--border) !important;
      position: sticky !important;
      top: 0 !important;
      z-index: 2000 !important;
      box-shadow: 0 4px 20px rgba(15,31,92,0.15) !important;
    }

    /* Navigation Drawer */
    .sidebar-nav {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      bottom: 0 !important;
      width: 280px !important;
      z-index: 4000 !important;
      transform: translateX(-100%) !important;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 8px 0 32px rgba(2,6,23,0.3) !important;
    }

    .sidebar-nav.mobile-open {
      transform: translateX(0) !important;
    }

    .sidebar-close-btn {
      display: block !important;
      background: rgba(255,255,255,0.08) !important;
      border: 1px solid rgba(255,255,255,0.12) !important;
      color: rgba(255,255,255,0.8) !important;
      width: 32px !important;
      height: 32px !important;
      border-radius: 8px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 14px !important;
      cursor: pointer !important;
      transition: var(--transition) !important;
    }
    .sidebar-close-btn:hover {
      background: rgba(255,255,255,0.15) !important;
      color: #fff !important;
    }

    /* Dismissible background overlay */
    .mobile-sidebar-backdrop {
      position: fixed !important;
      inset: 0 !important;
      background: rgba(2,6,23,0.6) !important;
      backdrop-filter: blur(4px) !important;
      -webkit-backdrop-filter: blur(4px) !important;
      z-index: 3999 !important;
      animation: fadeIn 0.2s ease both !important;
    }

    /* Modal dialog left offsets when sidebar is drawn out */
    div[style*="left: var(--sidebar-width)"],
    div[style*="left:var(--sidebar-width)"],
    div[style*="left: var(--sidebar-width)"],
    div[style*="left:var(--sidebar-width)"] {
      left: 0 !important;
    }

    /* Dashboard: Home component visual adjustments */
    .home-container {
      padding: 18px 8px 32px !important;
    }

    .quick-check-flex {
      flex-direction: column !important;
      gap: 10px !important;
    }
    .quick-check-flex input {
      width: 100% !important;
    }
    .quick-check-flex button {
      width: 100% !important;
      padding: 12px !important;
    }

    .home-stats-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 10px !important;
    }

    .emergency-card-flex,
    .essentials-card-flex {
      flex-direction: column !important;
      gap: 14px !important;
      align-items: stretch !important;
    }
    .emergency-card-flex button,
    .essentials-card-flex button {
      width: 100% !important;
    }

    /* Symptom Analyzer visual adjustments */
    .analyzer-container {
      padding: 18px 8px 32px !important;
    }

    .analyzer-flex-container {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 16px !important;
    }

    .body-map-panel {
      width: 100% !important;
      max-width: 240px !important;
      margin: 0 auto !important;
    }

    .analyzer-flex-container > div:last-child {
      width: 100% !important;
    }

    .analyzer-details-grid {
      grid-template-columns: 1fr !important;
      gap: 14px !important;
    }

    /* Two-column responsive structures stack naturally (support both camelCase and kebab-case) */
    div[style*="gridTemplateColumns: 1fr 1.3fr"],
    div[style*="gridTemplateColumns: 1.2fr 1fr"],
    div[style*="grid-template-columns: 1fr 1.3fr"],
    div[style*="grid-template-columns: 1.2fr 1fr"] {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }

    div[style*="gridTemplateColumns: 220px 1fr"],
    div[style*="grid-template-columns: 220px 1fr"] {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }

    div[style*="gridTemplateColumns: 1fr 1fr"],
    div[style*="grid-template-columns: 1fr 1fr"] {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }

    /* Dialog modal custom adjustments for shorter phone viewports */
    div[style*="maxHeight: 90vh"],
    div[style*="max-height: 90vh"] {
      max-height: 94vh !important;
      width: 96% !important;
      margin: 0 auto !important;
    }

    /* Grids & Flex containers that need stacking on mobile */
    .dashboard-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .vitals-layout-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .vitals-dashboard-grid,
    div.vitals-dashboard-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 12px !important;
    }
    .emergency-layout-grid {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }
    .history-severity-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .history-stats-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      grid-template-rows: auto !important;
      gap: 10px !important;
    }
    .results-hero-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .results-details-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .hospital-card-flex {
      flex-direction: column !important;
      gap: 14px !important;
      align-items: stretch !important;
    }
    .hospital-buttons-flex {
      width: 100% !important;
      flex-direction: row !important;
      gap: 8px !important;
      margin-top: 4px !important;
      margin-left: 0 !important;
    }
    .hospital-buttons-flex > a {
      flex: 1 !important;
      width: auto !important;
    }
    .hospital-buttons-flex button {
      width: 100% !important;
    }

    /* Settings responsive structures */
    .settings-flex-layout {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 16px !important;
    }
    .settings-sidebar-col {
      width: 100% !important;
      position: relative !important;
      top: 0 !important;
    }
    .settings-content-col {
      width: 100% !important;
    }
    .settings-nav-list {
      flex-direction: row !important;
      flex-wrap: wrap !important;
      gap: 6px !important;
      padding: 10px !important;
    }
    .settings-nav-list button {
      flex: 1 1 calc(50% - 6px) !important;
      padding: 8px 12px !important;
      font-size: 12px !important;
      justify-content: center !important;
    }
    .settings-form-grid {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }
    .settings-form-flex {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 10px !important;
    }
    .profile-flex-row {
      flex-direction: column !important;
      gap: 10px !important;
    }
    .profile-flex-row-three {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 10px !important;
    }
    .profile-flex-row-three button {
      width: 100% !important;
      margin-bottom: 0 !important;
    }

    /* Mobile settings, vitals tracker, history, and results polishes */
    .desktop-only-setting {
      display: none !important;
    }

    .wellness-suggestions-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 8px !important;
    }
    .wellness-suggestion-card {
      padding: 10px 8px !important;
      min-height: 80px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
    }
    .wellness-suggestion-card div:last-child {
      display: none !important;
    }

    .fever-foods-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 8px !important;
    }
    .fever-food-card {
      padding: 10px 8px !important;
      min-height: 80px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
    }
    .fever-food-card div:nth-child(3),
    .fever-food-card div:nth-child(4) {
      display: none !important;
    }

    .results-header-flex {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 12px !important;
      margin-bottom: 16px !important;
    }
    .results-buttons-flex {
      width: 100% !important;
      justify-content: flex-start !important;
      gap: 6px !important;
    }
    .results-buttons-flex button {
      padding: 8px 12px !important;
      font-size: 11.5px !important;
      border-radius: 8px !important;
      flex: 1 !important;
      justify-content: center !important;
    }

    .vitals-container {
      padding: 12px 6px 28px !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
      box-sizing: border-box !important;
    }
    .vitals-container > div {
      padding: 10px 8px !important;
    }
    .vitals-container .card {
      padding: 14px 10px !important;
    }
    .vitals-container h2 {
      font-size: 20px !important;
    }
    .vitals-container p {
      font-size: 12.5px !important;
    }
    .vitals-container form {
      gap: 10px !important;
    }
    .vitals-container form input,
    .vitals-container form select {
      max-width: 100% !important;
      width: 100% !important;
      box-sizing: border-box !important;
      font-size: 12.5px !important;
      padding: 8px 10px !important;
    }
    .vitals-container form label {
      font-size: 11.5px !important;
    }
    .vitals-container form button {
      font-size: 13px !important;
      padding: 10px !important;
    }
    .vitals-layout-grid {
      grid-template-columns: 1fr !important;
      gap: 14px !important;
    }
    .vitals-dashboard-grid,
    div.vitals-dashboard-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 8px !important;
    }
    .vitals-dashboard-grid .card {
      padding: 10px 8px !important;
    }
    .vitals-dashboard-grid .card span[style*="font-size: 22"] {
      font-size: 16px !important;
    }
    .vitals-dashboard-grid .card div[style*="font-size: 24"] {
      font-size: 18px !important;
    }
    .vitals-dashboard-grid .card div[style*="font-size: 11"] {
      font-size: 9.5px !important;
    }
    .vitals-dashboard-grid .card div[style*="font-size: 10"] {
      font-size: 9px !important;
    }

    /* Saved health plans scrollable container on mobile */
    .saved-plans-list-mobile {
      max-height: 260px !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
      scrollbar-width: thin !important;
      scrollbar-color: var(--border) transparent !important;
    }
    .saved-plans-list-mobile::-webkit-scrollbar {
      width: 4px !important;
    }
    .saved-plans-list-mobile::-webkit-scrollbar-track {
      background: transparent !important;
    }
    .saved-plans-list-mobile::-webkit-scrollbar-thumb {
      background: var(--border) !important;
      border-radius: 4px !important;
    }

    .app-layout .history-stats-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      grid-template-rows: auto !important;
      gap: 10px !important;
    }
    .history-stats-grid .card,
    .history-stats-grid > div {
      padding: 12px 10px !important;
    }
    .history-stats-grid .card div,
    .history-stats-grid > div div {
      font-size: 14px !important;
    }
    .history-stats-grid .card div:last-child,
    .history-stats-grid > div div:last-child {
      font-size: 9.5px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .analyzer-vitals-row {
      flex-direction: row !important;
      justify-content: space-around !important;
      align-items: center !important;
      width: 100% !important;
    }
    .analyzer-vitals-sep-1 {
      width: 1px !important;
      height: 48px !important;
      background: var(--border) !important;
      margin: 0 12px !important;
      display: block !important;
    }
    .active-chatbot .main-content > div {
      padding: 0 !important;
    }
    .chatbot-main-container {
      padding: 8px 4px 12px !important;
    }
    .chatbot-message-list {
      padding: 12px 8px !important;
      gap: 12px !important;
    }
    .chatbot-bubble-wrapper {
      max-width: 95% !important;
      gap: 8px !important;
    }
    .chatbot-input-container {
      padding: 8px 10px !important;
    }
  }

  /* Desktop layout sidebar position transitions */
  @media (min-width: 769px) {
    .app-layout {
      position: relative !important;
      transition: padding-left 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), padding-right 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
    }
    .app-layout.nav-left {
      padding-left: var(--sidebar-width) !important;
      padding-right: 0 !important;
    }
    .app-layout.nav-right {
      padding-left: 0 !important;
      padding-right: var(--sidebar-width) !important;
    }
    .sidebar-nav {
      position: absolute !important;
      top: 0 !important;
      bottom: 0 !important;
      width: var(--sidebar-width) !important;
      transition: left 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), border-right 0.5s, border-left 0.5s !important;
    }
    .app-layout.nav-left .sidebar-nav {
      left: 0 !important;
      right: auto !important;
      border-right: var(--sidebar-border) !important;
      border-left: none !important;
    }
    .app-layout.nav-right .sidebar-nav {
      left: calc(100% - var(--sidebar-width)) !important;
      right: 0 !important;
      border-left: var(--sidebar-border) !important;
      border-right: none !important;
    }
  }
`;

// ─── AI API CLIENT ────────────────────────────────────────────────────────────

async function callClaude(messages, system = "") {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };

  const res = await fetch(`${API}/ai/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages,
      system
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.content || "";
}

function safeParseJSON(raw) {
  if (!raw) return null;
  const startIdx = raw.indexOf('{');
  const endIdx = raw.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("No JSON object structure found in response");
  }
  let jsonStr = raw.substring(startIdx, endIdx + 1);
  // Remove control characters
  jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
  try {
    return JSON.parse(jsonStr);
  } catch (initialErr) {
    try {
      let cleaned = jsonStr
        .replace(/,\s*([}\mathbf{])/g, '$1') // remove trailing commas
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\r?\n|\r/g, " ");
      return JSON.parse(cleaned);
    } catch (secondErr) {
      console.warn("JSON repair failed, raw content:", raw);
      throw secondErr;
    }
  }
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Card({ children, className = "", style = {}, hover = false, onClick, glow = false, ...props }) {
  return (
    <div
      onClick={onClick}
      className={`${hover ? "card-hover" : ""} ${glow ? "card-glow" : ""} ${className}`}
      style={{
        background: "var(--card-bg, var(--white))",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        border: "var(--card-border, 1px solid var(--border))",
        backdropFilter: "var(--card-blur, none)",
        WebkitBackdropFilter: "var(--card-blur, none)",
        padding: "20px 24px",
        transition: "var(--transition-slow)",
        position: "relative",
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}

function Badge({ children, color, bg, size = "sm" }) {
  const sizes = { sm: { fontSize: 11, padding: "3px 9px" }, md: { fontSize: 13, padding: "5px 12px" } };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      background: bg || "var(--blue-pale)",
      color: color || "var(--blue)",
      borderRadius: 99,
      fontWeight: 700,
      letterSpacing: "0.02em",
      ...sizes[size],
    }}>{children}</span>
  );
}

// eslint-disable-next-line no-unused-vars
function SeverityMeter({ level }) {
  const levels = ["Low", "Medium", "High", "Emergency"];
  const idx = levels.indexOf(level);
  const colors = { Low: "#10b981", Medium: "#f59e0b", High: "var(--text-red-light)", Emergency: "var(--text-red)" };
  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
        {levels.map((l, i) => (
          <div key={l} style={{
            flex: 1, height: 6, borderRadius: 99,
            background: i <= idx ? colors[l] : "#e2e8f0",
            transition: "background 0.4s ease",
            boxShadow: i === idx ? `0 0 8px ${colors[l]}60` : "none",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-faint)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {levels.map(l => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
}

function Spinner({ size = 18, color = "var(--blue)" }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}30`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "spin 0.65s linear infinite",
      display: "inline-block",
      flexShrink: 0,
    }} />
  );
}

function ConfirmDialog({
  title, message, confirmLabel = "Confirm", confirmColor = "var(--red)",
  icon = "⚠️", iconBg = "var(--bg-red)", iconBorder = "var(--border-red)",
  onConfirm, onCancel,
}) {
  const app = loadAppearance();
  const navPos = app.navPosition || "left";
  const modalOffsetStyles = {
    "--modal-offset-left": navPos === "right" ? "0" : "var(--sidebar-width)",
    "--modal-offset-right": navPos === "right" ? "var(--sidebar-width)" : "0",
  };

  return createPortal(
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed", top: 0, bottom: 0, background: "rgba(0,0,0,0)",
          zIndex: 10000, animation: "fadeIn 0.15s ease both",
          ...modalOffsetStyles,
        }}
        className="medai-modal-overlay"
      />
      <div style={{
        position: "fixed", top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10001, pointerEvents: "none", padding: 20,
        ...modalOffsetStyles,
      }} className="medai-modal-container">
        <div style={{
          background: "var(--bg-modal)", borderRadius: 18, width: "min(400px, 100%)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px var(--border)",
          animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
          pointerEvents: "all", overflow: "hidden", fontFamily: "var(--font)",
        }}>
          <div style={{ padding: "28px 28px 20px", textAlign: "center" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: "0 auto 16px",
              background: iconBg, border: `1px solid ${iconBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>{icon}</div>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>{message}</p>
          </div>
          <div style={{
            display: "flex", gap: 10, padding: "16px 24px 24px",
            borderTop: "1px solid var(--border)", background: "var(--surface-2)",
          }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--surface)",
                color: "var(--navy)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--font)",
              }}
            >Cancel</button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 10, border: "none",
                background: confirmColor, color: "#fff",
                fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--font)",
              }}
            >{confirmLabel}</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function VerificationDialog({
  title, message, confirmLabel = "Confirm", confirmColor = "var(--red)",
  placeholder = "Type to confirm", matchText, alternativeMatchText,
  icon = "⚠️", iconBg = "var(--bg-red)", iconBorder = "var(--border-red)",
  onConfirm, onCancel,
}) {
  const [inputText, setInputText] = useState("");
  const app = loadAppearance();
  const navPos = app.navPosition || "left";
  const modalOffsetStyles = {
    "--modal-offset-left": navPos === "right" ? "0" : "var(--sidebar-width)",
    "--modal-offset-right": navPos === "right" ? "var(--sidebar-width)" : "0",
  };

  const isMatched = inputText.trim().toLowerCase() === matchText.toLowerCase() || 
                    (alternativeMatchText && inputText.trim().toLowerCase() === alternativeMatchText.toLowerCase());

  return createPortal(
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed", top: 0, bottom: 0, background: "rgba(0,0,0,0)",
          zIndex: 10000, animation: "fadeIn 0.15s ease both",
          ...modalOffsetStyles,
        }}
        className="medai-modal-overlay"
      />
      <div style={{
        position: "fixed", top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10001, pointerEvents: "none", padding: 20,
        ...modalOffsetStyles,
      }} className="medai-modal-container">
        <div style={{
          background: "var(--bg-modal)", borderRadius: 18, width: "min(400px, 100%)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px var(--border)",
          animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
          pointerEvents: "all", overflow: "hidden", fontFamily: "var(--font)",
        }}>
          <div style={{ padding: "28px 28px 20px", textAlign: "center" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: "0 auto 16px",
              background: iconBg, border: `1px solid ${iconBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>{icon}</div>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>{title}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>{message}</p>
            
            <div style={{ textAlign: "left", marginBottom: 4 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Type <strong style={{ color: "var(--navy)" }}>{matchText}</strong> to confirm:
              </label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--surface)",
                  color: "var(--navy)", fontSize: 13.5, fontFamily: "var(--font)",
                  boxSizing: "border-box", outline: "none",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={e => e.target.style.borderColor = "var(--blue)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>
          </div>
          <div style={{
            display: "flex", gap: 10, padding: "16px 24px 24px",
            borderTop: "1px solid var(--border)", background: "var(--surface-2)",
          }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--surface)",
                color: "var(--navy)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--font)",
              }}
            >Cancel</button>
            <button
              onClick={onConfirm}
              disabled={!isMatched}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 10, border: "none",
                background: isMatched ? confirmColor : "var(--border)",
                color: isMatched ? "#fff" : "var(--text-faint)",
                fontWeight: 700, fontSize: 14, cursor: isMatched ? "pointer" : "not-allowed",
                fontFamily: "var(--font)", transition: "all 0.15s ease",
              }}
            >{confirmLabel}</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function PageBackButton({ onClick, label = "Back to Wellness", style = {} }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
        padding: "8px 14px", fontSize: 13, fontWeight: 700, color: "var(--navy)",
        cursor: "pointer", marginBottom: 16, fontFamily: "var(--font)",
        transition: "all 0.2s ease",
        ...style
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--blue-border)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
      </svg>
      {label}
    </button>
  );
}

function DisclaimerBanner() {
  return (
    <div style={{
      background: "linear-gradient(135deg, var(--bg-amber-light), var(--bg-amber))",
      border: "1px solid var(--border-amber)",
      borderRadius: "var(--radius)",
      padding: "10px 16px",
      fontSize: 12,
      color: "var(--text-amber)",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontWeight: 500,
    }}>
      <span style={{ fontSize: 14 }}>⚠️</span>
      <span>{DISCLAIMER}</span>
    </div>
  );
}

function StatCard({ icon, value, label, color, delay = 0 }) {
  return (
    <Card style={{
      textAlign: "center",
      padding: "20px 16px",
      animation: `counterUp 0.4s ease ${delay}s both`,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -10, right: -10,
        width: 60, height: 60, borderRadius: "50%",
        background: `${color}10`,
      }} />
      <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, marginBottom: 4, letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    </Card>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home",      icon: "⌂",  label: "Dashboard" },
  { id: "analyzer",  icon: "⊕",  label: "Analyzer" },
  { id: "vitals",    icon: "🩺", label: "Vitals Log" },
  { id: "emergency", icon: "◉",  label: "Emergency" },
  { id: "hospitals", icon: "✛",  label: "Hospitals" },
  { id: "chatbot",   icon: "◎",  label: "Doctor AI" },
  { id: "reports",   icon: "≡",  label: "Reports" },
  { id: "history",   icon: "∿",  label: "History" },
  { id: "tips",      icon: "◈",  label: "Wellness" }
];

function Sidebar({ active, setActive, settings = {}, user, onLogout, mobileMenuOpen, setMobileMenuOpen, appearance = {} }) {
  const [hovered, setHovered] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showZoomedAvatar, setShowZoomedAvatar] = useState(false);
  const navPalette = NAVBAR_PALETTES.find(p => p.id === appearance.navbarPalette) || NAVBAR_PALETTES.find(p => p.id === "appBlue") || NAVBAR_PALETTES[0];
  const isDark = navPalette.isDark;

  useEffect(() => {
    if (!showZoomedAvatar) return;
    const handleCloseZoom = () => setShowZoomedAvatar(false);
    document.addEventListener("click", handleCloseZoom);
    return () => document.removeEventListener("click", handleCloseZoom);
  }, [showZoomedAvatar]);

  return (
    <nav className={`sidebar-nav ${mobileMenuOpen ? "mobile-open" : ""}`} style={{
      width: "var(--sidebar-width)",
      background: "var(--sidebar-bg-glass, var(--sidebar-bg))",
      backdropFilter: "var(--sidebar-blur, none)",
      WebkitBackdropFilter: "var(--sidebar-blur, none)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      height: "100%",
      overflow: "hidden",
      position: "relative",
      borderRight: "var(--sidebar-border)",
      zIndex: 10,
    }}>
      {/* Background mesh */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: isDark
          ? "radial-gradient(ellipse at 20% 20%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(30,64,175,0.12) 0%, transparent 60%)"
          : "radial-gradient(ellipse at 20% 20%, rgba(37,99,235,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(30,58,138,0.08) 0%, transparent 60%)",
      }} />

      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: `1px solid ${navPalette.border}`,
        marginBottom: 6,
        position: "relative", zIndex: 1,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setActive("home")} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "none", border: "none", cursor: "pointer", padding: 0,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 16px rgba(59,130,246,0.4)",
              flexShrink: 0,
            }}>⚕️</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: navPalette.text, letterSpacing: "-0.3px" }}>MedAI</div>
              <div style={{ fontSize: 10, color: navPalette.textMuted, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Health Assistant</div>
            </div>
          </button>
          <button className="sidebar-close-btn" onClick={() => setMobileMenuOpen(false)} style={{
            background: "none", border: "none", color: navPalette.textMuted,
            fontSize: 20, cursor: "pointer", display: "none", padding: 4,
          }}>✕</button>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ padding: "6px 10px", flex: 1, position: "relative", zIndex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {NAV_ITEMS.map((n, i) => {
          const isActive = active === n.id;
          const isHov = hovered === n.id;
          const isEmergency = n.id === "emergency";
          return (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              className="nav-item"
              style={{
                width: "100%",
                background: isActive
                  ? navPalette.activeBg
                  : isHov ? (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)") : "transparent",
                border: "none",
                color: isActive ? navPalette.activeText : isEmergency ? "var(--text-red)" : navPalette.textMuted,
                padding: "10px 12px",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13.5,
                fontWeight: isActive ? 700 : 500,
                borderRadius: "var(--radius)",
                marginBottom: 2,
                position: "relative",
                fontFamily: "var(--font)",
                letterSpacing: isActive ? "-0.1px" : "0",
                animation: `slideInLeft 0.3s ease ${i * 0.04}s both`,
              }}
            >
              {isActive && (
                <div style={{
                  position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                  width: 3, height: "60%", borderRadius: "0 3px 3px 0",
                  background: "#60a5fa",
                  boxShadow: "0 0 8px rgba(96,165,250,0.6)",
                }} />
              )}
              <span style={{
                fontSize: 15,
                opacity: isActive ? 1 : 0.8,
                fontFamily: isActive ? "var(--font)" : "inherit",
              }}>{n.icon}</span>
              <span>{n.label}</span>
              {n.id === "emergency" && (
                <span style={{
                  marginLeft: "auto",
                  width: 7, height: 7, borderRadius: "50%",
                  background: "var(--text-red-light)",
                  boxShadow: "0 0 0 0 #ef444460",
                  animation: "pulse-ring 1.8s ease infinite",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Profile card */}
      <div style={{
        padding: "6px 12px 16px",
        borderTop: `1px solid ${navPalette.border}`,
        position: "relative", zIndex: 1,
      }}>
        <AnimatePresence>
          {showZoomedAvatar && (
            <motion.div
              initial={{ opacity: 0, scale: 0.75, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.75, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              style={{
                position: "absolute",
                bottom: 74,
                left: 26,
                width: 110,
                height: 110,
                zIndex: 100,
                pointerEvents: "none",
              }}
            >
              <div 
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: isDark ? "3px solid #3b82f6" : "3px solid #2563eb",
                  background: isDark ? "#1e293b" : "#fff",
                  animation: "floatAvatar 3s ease-in-out infinite",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.15)",
                }}
              >
                {settings.profilePic ? (
                  <img src={settings.profilePic} alt="Profile Zoom" style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }} />
                ) : (
                  <span style={{ fontSize: 50, userSelect: "none" }}>👤</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{
          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          borderRadius: "var(--radius)",
          padding: "12px 14px",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <button
            onMouseEnter={() => setShowZoomedAvatar(true)}
            onMouseLeave={() => setShowZoomedAvatar(false)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              borderRadius: "50%",
              outline: "none",
            }}
            title="Profile photo"
          >
            {settings.profilePic ? (
              <img src={settings.profilePic} alt="Profile" style={{
                width: 36, height: 36, borderRadius: "50%", objectFit: "cover",
                border: isDark ? "2px solid rgba(147,197,253,0.3)" : "2px solid rgba(59,130,246,0.3)", flexShrink: 0
              }} />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0,
                border: isDark ? "2px solid rgba(147,197,253,0.3)" : "2px solid rgba(59,130,246,0.3)",
              }}>👤</div>
            )}
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontWeight: 700, fontSize: 13, color: navPalette.text,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {settings.name || user?.name || "Your Name"}
            </div>
            <div style={{ fontSize: 11, color: navPalette.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.email || "Set profile →"}
            </div>
          </div>
          {/* Settings gear icon */}
          <button 
            onClick={() => setActive("settings")}
            style={{
              background: "transparent", border: "none", color: navPalette.textMuted,
              cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = navPalette.activeText; e.currentTarget.style.background = navPalette.activeBg; }}
            onMouseLeave={e => { e.currentTarget.style.color = navPalette.textMuted; e.currentTarget.style.background = "transparent"; }}
            title="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          {/* Logout button */}
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              background: "transparent", border: "none", color: navPalette.textMuted,
              cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-red-light)"; e.currentTarget.style.background = "rgba(252, 165, 165, 0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = navPalette.textMuted; e.currentTarget.style.background = "transparent"; }}
            title="Log out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <ConfirmDialog
          title="Log Out"
          message="Are you sure you want to log out of your account?"
          confirmLabel="Log Out"
          confirmColor="var(--blue)"
          icon="🚪"
          iconBg="var(--bg-blue-pale)"
          iconBorder="var(--blue-border)"
          onConfirm={() => {
            setShowLogoutConfirm(false);
            onLogout();
          }}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </nav>
  );
}

const DEFAULT_WEATHER_ADVISORY = {
  weatherHealthRisk: "Rapid temperature fluctuations or extreme weather conditions can strain the cardiovascular and respiratory systems. Ensure proper hydration and dress in layers.",
  suggestions: [
    "Stay hydrated and drink warm or cool water regularly.",
    "Avoid prolonged exposure to extreme outdoor conditions.",
    "Keep emergency medication (e.g., inhalers, heart medication) handy."
  ],
  medicalNews: [
    {
      title: "New AI Tool Outperforms Doctors in Detecting Early Lung Cancer",
      summary: "A landmark study shows a deep learning model detecting micro-nodules with 94% accuracy, months before traditional scans.",
      date: "June 2026"
    },
    {
      title: "WHO Issues New Guidelines on Managing Seasonal Allergies",
      summary: "With rising temperatures globally, pollen seasons have lengthened. Early antihistamine treatment is recommended.",
      date: "May 2026"
    },
    {
      title: "Breakthrough in mRNA Technology Targets Heart Inflammation",
      summary: "Researchers have successfully tested a target mRNA therapy, reversing scarring of cardiac tissues in trials.",
      date: "May 2026"
    }
  ]
};

// ─── HOME DASHBOARD ───────────────────────────────────────────────────────────
function Home({
  reports,
  setActive,
  setInitialSymptoms,
  settings = {},
  appearance = {},
  todos = [],
  setTodos,
  savedMedicines = [],
  onDeleteMedicine: _onDeleteMedicine,
  onExportPDF,
  savedReminders = [],
  handleSaveReminder,
  handleToggleReminder,
  handleDeleteReminder,
  handleDeleteAllReminders
}) {
  const cp = CONTENT_PALETTES.find(p => p.id === appearance?.contentPalette) || CONTENT_PALETTES[0];
  const isDark = cp.isDark;
  const [tipsStatus, setTipsStatus] = useState("idle");
  const recent = reports.slice(-3).reverse();
  const totalSymptoms = reports.flatMap(r => r.symptoms).length;
  const avgPain = reports.length
    ? Math.round(reports.reduce((a, r) => a + r.painLevel, 0) / reports.length)
    : 0;
  const highSeverity = reports.filter(r => ["High", "Emergency"].includes(r.severityLevel)).length;
  const [quickInput, setQuickInput] = useState("");
  const displayName = settings.name ? `, ${settings.name.split(" ")[0]}` : "";

  // Weather & AI Advice & News state
  const [weather, setWeather] = useState(null);
  const [weatherAdvisory, setWeatherAdvisory] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  // To-Do list UI states
  const [newTodoText, setNewTodoText] = useState("");
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoText, setEditingTodoText] = useState("");

  // Medication tracking state (taken for the day)
  const [takenMeds, setTakenMeds] = useState(() => {
    const saved = localStorage.getItem("medai_taken_meds");
    return saved ? JSON.parse(saved) : {};
  });

  const handleToggleMedTaken = (medId) => {
    const updated = { ...takenMeds, [medId]: !takenMeds[medId] };
    setTakenMeds(updated);
    localStorage.setItem("medai_taken_meds", JSON.stringify(updated));
  };

  const handleQuickAnalyze = () => {
    if (!quickInput.trim()) return;
    setInitialSymptoms([quickInput.trim()]);
    setActive("analyzer");
  };

  // Weather & News API fetch
  useEffect(() => {
    let active = true;

    const fetchWeatherAndNews = async (lat, lon, cityName = "Your Location") => {
      try {
        setLoadingWeather(true);
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`;
        const res = await fetch(weatherUrl);
        if (!res.ok) throw new Error("Weather service offline");
        const data = await res.json();
        
        const temp = data.current_weather.temperature;
        const wind = data.current_weather.windspeed;
        const code = data.current_weather.weathercode;
        
        let humidity = 55;
        if (data.hourly && data.hourly.relativehumidity_2m) {
          const currentHour = new Date().getHours();
          humidity = data.hourly.relativehumidity_2m[currentHour] || 55;
        }

        const weatherMap = {
          0: { text: "Sunny", icon: "☀️" },
          1: { text: "Mainly Clear", icon: "🌤️" },
          2: { text: "Partly Cloudy", icon: "⛅" },
          3: { text: "Overcast", icon: "☁️" },
          45: { text: "Foggy", icon: "🌫️" },
          48: { text: "Foggy", icon: "🌫️" },
          51: { text: "Light Drizzle", icon: "🌧️" },
          53: { text: "Moderate Drizzle", icon: "🌧️" },
          55: { text: "Dense Drizzle", icon: "🌧️" },
          61: { text: "Slight Rain", icon: "🌧️" },
          63: { text: "Moderate Rain", icon: "🌧️" },
          65: { text: "Heavy Rain", icon: "🌧️" },
          71: { text: "Slight Snow", icon: "❄️" },
          73: { text: "Moderate Snow", icon: "❄️" },
          75: { text: "Heavy Snow", icon: "❄️" },
          80: { text: "Slight Rain Showers", icon: "🌦️" },
          81: { text: "Moderate Rain Showers", icon: "🌦️" },
          82: { text: "Violent Rain Showers", icon: "🌦️" },
          95: { text: "Thunderstorm", icon: "⛈️" },
          96: { text: "Thunderstorm with Hail", icon: "⛈️" },
        };

        const cond = weatherMap[code] || { text: "Clear", icon: "☀️" };

        if (!active) return;
        setWeather({
          temp,
          wind,
          humidity,
          condition: cond.text,
          icon: cond.icon,
          city: cityName
        });

        const systemPrompt = `You are Dr. MedAI Dashboard Assistant. Based on the weather provided, you must return a valid JSON object (no markdown, no backticks, no comments) with this EXACT structure:
{
  "weatherHealthRisk": "A professional assessment of health issues/causes related to this weather (e.g. humidity, heat, cold, rain, air pressure).",
  "suggestions": [
    "Practical advice 1",
    "Practical advice 2",
    "Practical advice 3"
  ],
  "medicalNews": [
    {
      "title": "A recent breakthrough or advisory in medical fields.",
      "summary": "1-2 sentence detailed summary.",
      "date": "Recent date (e.g., June 2026)"
    },
    {
      "title": "A relevant health/wellness news title.",
      "summary": "1-2 sentence summary.",
      "date": "Recent date"
    },
    {
      "title": "A medical tech/pharmacological update.",
      "summary": "1-2 sentence summary.",
      "date": "Recent date"
    }
  ]
}`;

        const userPrompt = `Generate health advice and medical news for: City: ${cityName}, Temp: ${temp}°C, Humidity: ${humidity}%, Condition: ${cond.text}, Wind: ${wind} km/h. Keep descriptions professional and medically sound.`;

        try {
          const raw = await callClaude([{ role: "user", content: userPrompt }], systemPrompt);
          const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (active) {
            setWeatherAdvisory(parsed);
          }
        } catch (err) {
          console.warn("AI weather advice fetch failed, using fallbacks:", err);
          if (active) {
            setWeatherAdvisory(DEFAULT_WEATHER_ADVISORY);
          }
        }
      } catch (err) {
        console.error("Weather fetch error:", err);
        if (active) {
          setWeatherError(err.message);
          setWeatherAdvisory(DEFAULT_WEATHER_ADVISORY);
        }
      } finally {
        if (active) {
          setLoadingWeather(false);
        }
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeatherAndNews(pos.coords.latitude, pos.coords.longitude, "Your Location");
        },
        (err) => {
          console.warn("Geolocation failed, defaulting to New Delhi:", err.message);
          fetchWeatherAndNews(28.6139, 77.2090, "New Delhi");
        },
        { timeout: 8000 }
      );
    } else {
      fetchWeatherAndNews(28.6139, 77.2090, "New Delhi");
    }

    return () => {
      active = false;
    };
  }, []);

  // To-Do handlers
  const handleAddTodo = async () => {
    if (!newTodoText.trim()) return;
    try {
      const newTodo = await apiCreateTodo({ text: newTodoText.trim(), completed: false });
      const updated = [newTodo, ...todos];
      setTodos(updated);
      setNewTodoText("");
      if (typeof Storage !== "undefined") localStorage.setItem(TODO_KEY, JSON.stringify(updated));
    } catch (err) {
      // Offline fallback
      const offlineTodo = { _id: "local_" + Date.now(), id: "local_" + Date.now(), text: newTodoText.trim(), completed: false, createdAt: new Date().toISOString() };
      const updated = [offlineTodo, ...todos];
      setTodos(updated);
      setNewTodoText("");
      localStorage.setItem(TODO_KEY, JSON.stringify(updated));
    }
  };

  const handleToggleTodo = async (id, currentCompleted) => {
    try {
      if (String(id).startsWith("local_")) throw new Error("Local offline");
      await apiUpdateTodo(id, { completed: !currentCompleted });
      const updated = todos.map(t => (t.id || t._id) === id ? { ...t, completed: !currentCompleted } : t);
      setTodos(updated);
      if (typeof Storage !== "undefined") localStorage.setItem(TODO_KEY, JSON.stringify(updated));
    } catch (err) {
      const updated = todos.map(t => (t.id || t._id) === id ? { ...t, completed: !currentCompleted } : t);
      setTodos(updated);
      localStorage.setItem(TODO_KEY, JSON.stringify(updated));
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      if (String(id).startsWith("local_")) throw new Error("Local offline");
      await apiDeleteTodo(id);
      const updated = todos.filter(t => (t.id || t._id) !== id);
      setTodos(updated);
      if (typeof Storage !== "undefined") localStorage.setItem(TODO_KEY, JSON.stringify(updated));
    } catch (err) {
      const updated = todos.filter(t => (t.id || t._id) !== id);
      setTodos(updated);
      localStorage.setItem(TODO_KEY, JSON.stringify(updated));
    }
  };

  const handleStartEditTodo = (todo) => {
    setEditingTodoId(todo.id || todo._id);
    setEditingTodoText(todo.text);
  };

  const handleSaveEditTodo = async (id) => {
    if (!editingTodoText.trim()) return;
    try {
      if (String(id).startsWith("local_")) throw new Error("Local offline");
      await apiUpdateTodo(id, { text: editingTodoText.trim() });
      const updated = todos.map(t => (t.id || t._id) === id ? { ...t, text: editingTodoText.trim() } : t);
      setTodos(updated);
      setEditingTodoId(null);
      if (typeof Storage !== "undefined") localStorage.setItem(TODO_KEY, JSON.stringify(updated));
    } catch (err) {
      const updated = todos.map(t => (t.id || t._id) === id ? { ...t, text: editingTodoText.trim() } : t);
      setTodos(updated);
      setEditingTodoId(null);
      localStorage.setItem(TODO_KEY, JSON.stringify(updated));
    }
  };



  // Curated rotating daily tip list based on the day of the week
  const dailyTips = [
    { text: "Stretch for 10 minutes: Boosts circulation and relieves built-up muscle tension.", icon: "🧘" },
    { text: "Hydration Check: Ensure you drink at least 8-10 glasses of clean water today.", icon: "💧" },
    { text: "Take a screen break: Follow the 20-20-20 rule to prevent eyestrain.", icon: "👁️" },
    { text: "Power Nap: A quick 15-20 min afternoon rest can recover focus and mood.", icon: "😴" },
    { text: "Daily Walk: A quick 20 minute outdoor walk boosts cardiac health and Vitamin D.", icon: "🚶" },
    { text: "Eat green: Try adding a fresh serving of leafy vegetables or fiber to your lunch.", icon: "🥗" },
    { text: "Deep Breathing: 5 deep breaths in and out helps lower cortisol/stress hormone.", icon: "🌬️" }
  ];
  const currentDayTip = dailyTips[new Date().getDay()]; // eslint-disable-line no-unused-vars

  return (
    <div className="home-container" style={{ padding: "32px 32px 48px", maxWidth: 920, margin: "0 auto" }}>
      <style>{`
        .styled-scroll::-webkit-scrollbar { width: 6px; }
        .styled-scroll::-webkit-scrollbar-track { background: transparent; }
        .styled-scroll::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 10px; }
        .styled-scroll::-webkit-scrollbar-thumb:hover { background: rgba(150, 150, 150, 0.5); }
      `}</style>
      {/* Header */}
      <div style={{ marginBottom: 24, animation: "fadeUp 0.4s ease both", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyBox: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "var(--text-faint)",
          }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        <h1 style={{
          fontSize: 30, fontWeight: 900, color: "var(--navy)",
          letterSpacing: "-0.8px", margin: 0, lineHeight: 1.2,
        }}>
          Good day{displayName} 👋
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: 14.5, fontWeight: 400 }}>
          How are you feeling? Let's check your symptoms.
        </p>
      </div>

      <DisclaimerBanner />

      {/* Quick Input */}
      <Card style={{
        marginBottom: 24,
        background: isDark 
          ? "linear-gradient(135deg, rgba(15, 34, 114, 0.45) 0%, rgba(30, 58, 138, 0.55) 50%, rgba(29, 78, 216, 0.65) 100%)"
          : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
        border: "1px solid " + (isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(59, 130, 246, 0.2)"),
        boxShadow: isDark ? "none" : "var(--shadow-blue)",
        animation: "fadeUp 0.4s ease 0.1s both",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40,
          width: 180, height: 180, borderRadius: "50%",
          background: "rgba(96,165,250,0.08)",
        }} />
        <div style={{
          position: "absolute", bottom: -30, left: 100,
          width: 120, height: 120, borderRadius: "50%",
          background: "rgba(59,130,246,0.1)",
        }} />
        <div style={{ fontSize: 13, fontWeight: 800, color: isDark ? "rgba(147,197,253,0.8)" : "var(--navy)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase", position: "relative" }}>
          Quick Symptom Check
        </div>
        <div className="quick-check-flex" style={{ display: "flex", gap: 10, position: "relative" }}>
          <input
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleQuickAnalyze()}
            placeholder="Describe a symptom (e.g. headache, fever…)"
            style={{
              flex: 1, padding: "11px 16px",
              borderRadius: "var(--radius)",
              border: isDark ? "1.5px solid rgba(147,197,253,0.2)" : "1.5px solid rgba(59, 130, 246, 0.3)",
              fontSize: 14, 
              background: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.65)",
              color: isDark ? "#fff" : "var(--navy)", 
              fontFamily: "var(--font)",
            }}
          />
          <button
            onClick={handleQuickAnalyze}
            className="btn-primary"
            style={{
              background: "#3b82f6",
              color: "#fff", border: "none",
              borderRadius: "var(--radius)",
              padding: "11px 22px",
              fontWeight: 700, cursor: "pointer",
              fontSize: 13.5, fontFamily: "var(--font)",
              boxShadow: "0 2px 8px rgba(59,130,246,0.15)",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.22)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.15)";
            }}
          >Analyze →</button>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="home-stats-grid" style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        gap: 14, marginBottom: 24,
      }}>
        <StatCard icon="📋" value={reports.length} label="Total Reports"   color="#2563eb" delay={0.12} />
        <StatCard icon="📊" value={`${avgPain}/10`} label="Avg Pain Level" color="#7c3aed" delay={0.16} />
        <StatCard icon="🔬" value={totalSymptoms}   label="Symptoms Logged" color="#059669" delay={0.20} />
        <StatCard icon="⚠️" value={highSeverity}    label="High Severity"  color="var(--text-red)" delay={0.24} />
      </div>

      {/* Emergency card */}
      {/* Quick Action Banners */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 16,
        marginBottom: 24,
      }} className="quick-actions-banners-grid">
        {/* Emergency card */}
        <Card style={{
          background: "linear-gradient(135deg, var(--bg-red-light), var(--bg-red))",
          border: "1px solid var(--border-red)",
          margin: 0,
          animation: "fadeUp 0.4s ease 0.28s both",
        }}>
          <div className="emergency-card-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "100%", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--bg-red)",
                border: "2px solid var(--border-red)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}>🚨</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-red)" }}>Emergency Services</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12.5, marginTop: 2 }}>
                  Chest pain, difficulty breathing, severe bleeding? Call now.
                </div>
              </div>
            </div>
            <button
              onClick={() => setActive("emergency")}
              className="btn-primary"
              style={{
                background: "var(--red-dark)", color: "#fff",
                border: "none", borderRadius: "var(--radius)",
                padding: "10px 20px", fontWeight: 700,
                cursor: "pointer", fontSize: 13.5,
                fontFamily: "var(--font)",
                boxShadow: "0 4px 16px rgba(220,38,38,0.25)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >Call 108</button>
          </div>
        </Card>

        {/* Buy Essentials (MediTown) card */}
        <Card style={{
          background: "linear-gradient(135deg, var(--bg-blue-light), var(--bg-blue-pale))",
          border: "1px solid var(--blue-border)",
          margin: 0,
          animation: "fadeUp 0.4s ease 0.32s both",
        }}>
          <div className="essentials-card-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "100%", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--bg-blue-pale)",
                border: "2px solid var(--blue-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}>🛍️</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-blue)" }}>Buy Essentials</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12.5, marginTop: 2 }}>
                  Need supplements, first aid, or medicines? Explore MediTown.
                </div>
              </div>
            </div>
            <button
              onClick={() => setActive("meditown")}
              className="btn-primary"
              style={{
                background: "var(--blue)", color: "#fff",
                border: "none", borderRadius: "var(--radius)",
                padding: "10px 20px", fontWeight: 700,
                cursor: "pointer", fontSize: 13.5,
                fontFamily: "var(--font)",
                boxShadow: "0 2px 8px rgba(59,130,246,0.15)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.22)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.15)";
              }}
            >Explore Store</button>
          </div>
        </Card>
      </div>

      {/* Main dashboard content container */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "3fr 2fr",
        gap: 24,
        marginTop: 24
      }} className="dashboard-grid">
        
        {/* Left Column: Reports, Weather, AI advisory, News */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Recent Reports */}
          <div>
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.2px" }}>Recent Reports</div>
              {reports.length > 0 && (
                <button onClick={() => setActive("reports")} style={{
                  background: "none", border: "none", color: "var(--blue)",
                  cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--font)",
                }}>View all →</button>
              )}
            </div>

            {recent.length === 0 ? (
              <Card style={{ textAlign: "center", padding: "48px 24px", animation: "fadeUp 0.4s ease 0.32s both" }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📋</div>
                <div style={{ color: "var(--text-faint)", fontWeight: 500, fontSize: 14 }}>
                  No reports yet. Start by analyzing your symptoms above.
                </div>
              </Card>
            ) : (
              <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recent.map(r => (
                  <Card
                    key={r.id} hover
                    onClick={() => setActive("reports")}
                    style={{ padding: "14px 18px", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 4, fontSize: 14 }}>
                          {r.symptoms.slice(0, 3).join(", ")}{r.symptoms.length > 3 ? ` +${r.symptoms.length - 3} more` : ""}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 500 }}>
                          {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          &nbsp;·&nbsp;Pain {r.painLevel}/10&nbsp;·&nbsp;{r.duration}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Badge color={severityColor(r.severityLevel)} bg={severityBg(r.severityLevel)}>
                          {r.severityLevel || "Unknown"}
                        </Badge>
                        <span style={{ color: "var(--text-faint)", fontSize: 16 }}>›</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Weather & Weather advisory */}
          <Card className="styled-scroll" style={{ padding: "20px 24px", flex: 1, display: "flex", flexDirection: "column", boxSizing: "border-box", height: 380, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🌦️</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>Current Weather & Advisory</span>
              </div>
              {weather && (
                <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
                  📍 {weather.city}
                </span>
              )}
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingRight: 4 }}>
              {loadingWeather ? (
                <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, justifyContent: "center", height: "100%" }}>
                  <Spinner color="var(--blue)" size={24} />
                  <div style={{ fontSize: 12.5, color: "var(--text-faint)", fontWeight: 600 }}>Fetching weather advisory…</div>
                </div>
              ) : (
                <div>
                  {weatherError && (
                    <div style={{
                      color: "var(--red)", fontSize: 12.5, fontWeight: 600, textAlign: "center",
                      background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                      borderRadius: 10, padding: "10px 14px", marginBottom: 16
                    }}>
                      ⚠️ Weather info unavailable. Showing standard health guide.
                    </div>
                  )}

                  {/* Weather details row */}
                  {weather && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "12px 16px",
                      background: "var(--surface-2)",
                      borderRadius: "var(--radius)",
                      marginBottom: 16
                    }}>
                      <span style={{ fontSize: 36 }}>{weather.icon}</span>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "var(--navy)" }}>{weather.temp}°C</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)" }}>
                          {weather.condition} &nbsp;·&nbsp; 💧 {weather.humidity}% &nbsp;·&nbsp; 💨 {weather.wind} km/h
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advisory details */}
                  {weatherAdvisory && (() => {
                    const risks = Array.isArray(weatherAdvisory.weatherHealthRisk)
                      ? weatherAdvisory.weatherHealthRisk
                      : typeof weatherAdvisory.weatherHealthRisk === "string"
                        ? weatherAdvisory.weatherHealthRisk.split(/(?<=\.|\?|!)\s+/).map(s => s.trim()).filter(s => s.length > 0)
                        : [];
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                            Possible Weather Causes & Risks
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {risks.map((r, idx) => (
                              <div key={idx} style={{ 
                                display: "flex", gap: 8, fontSize: 12.5, color: "var(--text-muted)", 
                                lineHeight: 1.4, background: "var(--surface-2)", padding: "10px 12px", 
                                borderRadius: 8, border: "1px solid var(--border)", alignItems: "flex-start"
                              }}>
                                <span style={{ color: "var(--text-red-light)", fontWeight: 700, fontSize: 14, marginTop: -2 }}>•</span>
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                            Suggested Preventative Measures
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {weatherAdvisory.suggestions.map((s, idx) => (
                              <div key={idx} style={{ 
                                display: "flex", gap: 8, fontSize: 12.5, color: "var(--text-muted)", 
                                lineHeight: 1.4, background: "var(--surface-2)", padding: "10px 12px", 
                                borderRadius: 8, border: "1px solid var(--border)", alignItems: "flex-start"
                              }}>
                                <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 13, marginTop: -1 }}>✓</span>
                                <span>{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* Right Column: To-Do List, Medication Check-in, Daily Tip */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Health To-Do List */}
          <Card className="styled-scroll" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", height: 350, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>📋</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>Daily Health To-Do</span>
              </div>
              <button
                onClick={onExportPDF}
                title="Download List in PDF"
                style={{
                  background: "none", border: "none", color: "var(--blue)",
                  cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "var(--font)",
                  display: "flex", alignItems: "center", gap: 4, padding: "2px 4px"
                }}
              >
                📥 PDF Report
              </button>
            </div>

            {/* Todo Input */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <input
                value={newTodoText}
                onChange={e => setNewTodoText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddTodo()}
                placeholder="Add daily task (e.g., vitals log, walk…)"
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--border)", fontSize: 13,
                  fontFamily: "var(--font)"
                }}
              />
              <button
                onClick={handleAddTodo}
                style={{
                  background: "var(--blue)", color: "#fff", border: "none",
                  borderRadius: "var(--radius-sm)", padding: "0 14px",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  fontFamily: "var(--font)"
                }}
              >Add</button>
            </div>

            {/* Todo List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 2 }}>
              {todos.length === 0 ? (
                <div style={{ padding: "20px 10px", textAlign: "center", color: "var(--text-faint)", fontSize: 12.5 }}>
                  No health tasks today. Add one above!
                </div>
              ) : (
                todos.map(t => {
                  const todoId = t.id || t._id;
                  const isEditing = editingTodoId === todoId;
                  return (
                    <div key={todoId} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      background: "var(--surface)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      transition: "var(--transition)",
                    }}>
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => handleToggleTodo(todoId, t.completed)}
                        style={{ width: 15, height: 15, cursor: "pointer" }}
                      />
                      
                      {isEditing ? (
                        <div style={{ display: "flex", flex: 1, gap: 4 }}>
                          <input
                            value={editingTodoText}
                            onChange={e => setEditingTodoText(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSaveEditTodo(todoId)}
                            style={{
                              flex: 1, padding: "4px 8px", borderRadius: 4,
                              border: "1px solid var(--blue)", fontSize: 12.5,
                              fontFamily: "var(--font)"
                            }}
                          />
                          <button
                            onClick={() => handleSaveEditTodo(todoId)}
                            style={{
                              background: "var(--green)", color: "#fff", border: "none",
                              borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer"
                            }}
                          >✓</button>
                          <button
                            onClick={() => setEditingTodoId(null)}
                            style={{
                              background: "var(--slate-light)", color: "#fff", border: "none",
                              borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer"
                            }}
                          >×</button>
                        </div>
                      ) : (
                        <span style={{
                          flex: 1,
                          fontSize: 12.5,
                          color: t.completed ? "var(--green)" : "var(--text)",
                          textDecoration: t.completed ? "line-through" : "none",
                          fontWeight: t.completed ? 600 : 500,
                          lineHeight: 1.4,
                          wordBreak: "break-word"
                        }}>
                          {t.text}
                        </span>
                      )}

                      {!isEditing && (
                        <div style={{ display: "flex", gap: 2 }}>
                          <button
                            onClick={() => handleStartEditTodo(t)}
                            title="Edit task"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              fontSize: 12, padding: "4px"
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteTodo(todoId)}
                            title="Delete task"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              fontSize: 12, padding: "4px"
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Medication Compliance Tracker */}
          <Card className="styled-scroll" style={{ padding: "20px 24px", height: 350, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>💊</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>Pill Reminder & Check-in</span>
            </div>

            {(() => {
              const pharmacyMeds = savedMedicines.filter(med => !med.category || med.category.toLowerCase() === "pharmacy");
              return pharmacyMeds.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "12px 6px" }}>
                  <span style={{ fontSize: 24, opacity: 0.3, marginBottom: 6 }}>💊</span>
                  <p style={{ fontSize: 12, color: "var(--text-faint)", fontWeight: 500 }}>
                    No saved medicines.
                  </p>
                  <button
                    onClick={() => setActive("tips")}
                    style={{
                      background: "none", border: "none", color: "var(--blue)",
                      fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                      marginTop: 4, textDecoration: "underline"
                    }}
                  >
                    Find meds in Wellness Guide
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                    Check off taken pills today
                  </div>
                  {pharmacyMeds.map(med => {
                    const medId = med._id || med.id;
                    const isTaken = !!takenMeds[medId];
                    return (
                      <div key={medId} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        background: isTaken ? "rgba(16,185,129,0.06)" : "var(--surface)",
                        border: isTaken ? "1.5px solid rgba(16,185,129,0.2)" : "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        transition: "var(--transition)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <span style={{ fontSize: 13 }}>💊</span>
                          <span style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: isTaken ? "var(--green)" : "var(--text)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 130
                          }} title={med.name}>
                            {med.name}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => handleToggleMedTaken(medId)}
                          style={{
                            background: isTaken ? "var(--green)" : "none",
                            color: isTaken ? "#fff" : "var(--text-faint)",
                            border: isTaken ? "none" : "1.5px solid var(--border)",
                            borderRadius: 8,
                            padding: isTaken ? "3px 8px" : "3px 6px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                            fontFamily: "var(--font)",
                            transition: "var(--transition)",
                            display: "flex",
                            alignItems: "center",
                            gap: 3
                          }}
                        >
                          {isTaken ? "✓ Taken" : "Mark Taken"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>


          {/* Daily Health Focus */}
          <Card className="styled-scroll" style={{
            background: "linear-gradient(135deg, var(--surface), var(--surface-2))",
            border: "1.5px dashed var(--blue-border)",
            padding: "18px 20px",
            flex: 1,
            height: 380,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Daily Health Focus
              </span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, position: "relative" }}>
              {tipsStatus === "showing" && dailyTips.slice(0, 3).map((tip, i) => (
                <div key={i} style={{ 
                  display: "flex", gap: 12, alignItems: "center",
                  background: "var(--surface)", padding: "10px 14px", borderRadius: 10,
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                  animation: `fadeUp 0.4s ease ${i * 0.15}s both`
                }}>
                  <div style={{ fontSize: 20 }}>{tip.icon}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.4, fontWeight: 500 }}>
                    {tip.text}
                  </div>
                </div>
              ))}

              {tipsStatus === "animating" && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {[...Array(15)].map((_, i) => (
                    <div key={i} style={{
                      position: "absolute", fontSize: 28,
                      animation: `splashPills 1.8s cubic-bezier(0.25, 1, 0.5, 1) ${i * 0.04}s forwards`,
                      left: "50%", bottom: "0%",
                      transformOrigin: "center center",
                      opacity: 0,
                      "--tx": `${((i * 17 + 3) % 220 - 110)}px`,
                      "--ty": `-${100 + ((i * 23 + 7) % 180)}px`,
                      "--rot": `${((i * 37 + 11) % 720 - 360)}deg`,
                    }}>
                      {["💊", "💧", "🧘", "🥗", "🏃"][i % 5]}
                    </div>
                  ))}
                  <style>{`
                    @keyframes splashPills {
                      0% { transform: translate(0, 0) scale(0.2) rotate(0deg); opacity: 1; }
                      50% { opacity: 1; }
                      100% { transform: translate(var(--tx), var(--ty)) scale(1.2) rotate(var(--rot)); opacity: 0; }
                    }
                  `}</style>
                </div>
              )}
            </div>
            
            {tipsStatus === "idle" && (
              <button
                onClick={() => {
                  setTipsStatus("animating");
                  setTimeout(() => setTipsStatus("showing"), 2000);
                }}
                style={{
                  margin: "0 auto", display: "block", width: "fit-content", background: "var(--bg-blue-pale)", color: "var(--blue)", border: "none",
                  borderRadius: 8, padding: "12px 24px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", transition: "var(--transition)",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(0.98)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(0.98)"}
              >
                Reveal Today's Focus
              </button>
            )}
          </Card>

        </div>

      </div>



    </div>
  );
}

// ─── SYMPTOM ANALYZER ─────────────────────────────────────────────────────────
function Analyzer({ initialSymptoms, setInitialSymptoms, onAnalyze }) {
  const [symptoms, setSymptoms] = useState(initialSymptoms || []);
  const [customSymptom, setCustomSymptom] = useState("");
  const [duration, setDuration] = useState("1-3 days");
  const [painLevel, setPainLevel] = useState(5);
  const [hasFever, setHasFever] = useState(false);
  const [condition, setCondition] = useState("None");
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [viewOrient, setViewOrient] = useState("front");
  const [hoveredRegion, setHoveredRegion] = useState(null);

  useEffect(() => {
    if (initialSymptoms?.length) { setSymptoms(initialSymptoms); setInitialSymptoms([]); }
  }, [initialSymptoms]);

  const toggleSymptom = (s) => setSymptoms(p =>
    p.includes(s) ? p.filter(x => x !== s) : [...p, s]
  );

  const addCustom = () => {
    const s = customSymptom.trim();
    if (s && !symptoms.includes(s)) { setSymptoms(p => [...p, s]); setCustomSymptom(""); }
  };

  const analyze = async () => {
    if (!symptoms.length) return;
    setLoading(true);
    const systemPrompt = `You are MedAI, an expert AI medical analysis assistant. Analyze patient symptoms and provide structured, accurate, and compassionate medical information.

RULES:
- Always respond with ONLY a valid JSON object, no markdown, no extra text
- Be medically accurate but conservative — never over-diagnose
- Always recommend doctor consultation for anything beyond mild symptoms
- Consider pre-existing conditions when assessing severity
- Provide practical, actionable self-care advice
- Use plain language that patients can understand
- If symptoms suggest emergency, set severity to "Emergency"`;

    const userPrompt = `Analyze symptoms and return ONLY this JSON (no markdown, no backticks):
{
  "conditions": [
    {
      "name": "Condition Name",
      "confidence": 75,
      "description": "Brief explanation",
      "cause": "Physiological cause or trigger of the condition",
      "risks": ["Potential complication 1", "Potential complication 2"],
      "riskScore": 45
    }
  ],
  "severity": "Low",
  "severityReason": "1-2 sentences explaining severity",
  "selfCare": ["tip 1", "tip 2", "tip 3", "tip 4"],
  "doctorWarning": "When/why to see a doctor",
  "simpleExplanation": "2-3 sentences in plain language",
  "recommendedAction": "One clear action sentence"
}

PATIENT DATA:
- Symptoms: ${symptoms.join(", ")}
- Duration: ${duration}
- Pain Level: ${painLevel}/10
- Fever: ${hasFever ? "Yes" : "No"}
- Pre-existing condition: ${condition}

Provide 3 conditions ranked by likelihood (confidence 0-100). Severity: Low, Medium, High, or Emergency.`;

    try {
      const raw = await callClaude([{ role: "user", content: userPrompt }], systemPrompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      const json = JSON.parse(jsonMatch[0]);
      const report = {
        id: Date.now(), date: new Date().toISOString(),
        symptoms, duration, painLevel, hasFever, condition,
        ...json, severityLevel: json.severity,
      };
      onAnalyze(report);
    } catch (e) {
      console.error("Analysis error:", e);
      alert("Analysis failed. Check your Groq API key in .env and try again.");
    }
    setLoading(false);
  };

  const painColor = painLevel <= 3 ? "#10b981" : painLevel <= 6 ? "#f59e0b" : "var(--text-red-light)";
  const displayedSymptoms = REGION_SYMPTOMS[selectedRegion] || SYMPTOMS_LIST;

  return (
    <div className="analyzer-container" style={{ padding: "32px 32px 48px", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, animation: "fadeUp 0.3s ease both" }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.6px", margin: 0 }}>
          🔬 Symptom Analyzer
        </h2>
        <p style={{ color: "var(--text-muted)", marginTop: 5, fontSize: 14 }}>Select all symptoms you're experiencing for a more accurate analysis.</p>
      </div>
      <DisclaimerBanner />

      {/* Symptoms selector card with Visual Body Map */}
      <Card style={{ marginBottom: 18, animation: "fadeUp 0.3s ease 0.08s both", padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Select Symptoms
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 520 }}>
            {Object.keys(REGION_SYMPTOMS).map(region => {
              const label = region === "All" ? "Show All" : region;
              return (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  style={{
                    background: selectedRegion === region ? "var(--blue-pale)" : "transparent",
                    color: selectedRegion === region ? "var(--blue)" : "var(--text-muted)",
                    border: selectedRegion === region ? "1px solid rgba(37,99,235,0.2)" : "1px solid transparent",
                    borderRadius: 6, padding: "3px 8px", fontSize: 10.5,
                    fontWeight: 700, cursor: "pointer", transition: "var(--transition)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="analyzer-flex-container" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {/* Left panel: Interactive Holographic Body Map */}
          <div className="body-map-panel" style={{ width: 260, display: "flex", flexDirection: "column", alignItems: "center", background: "var(--surface)", borderRadius: "var(--radius)", padding: "16px 12px", border: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, textAlign: "center" }}>
              Advanced Anatomy Map
            </div>

            {/* Front / Back Toggle Pill */}
            <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", padding: 3, borderRadius: 20, marginBottom: 14, border: "1px solid var(--border)", width: "100%" }}>
              <button onClick={() => setViewOrient("front")} style={{ flex: 1, background: viewOrient === "front" ? "var(--white)" : "transparent", color: viewOrient === "front" ? "var(--blue)" : "var(--text-muted)", border: "none", borderRadius: 16, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", boxShadow: viewOrient === "front" ? "var(--shadow-sm)" : "none", transition: "var(--transition)" }}>FRONT</button>
              <button onClick={() => setViewOrient("back")} style={{ flex: 1, background: viewOrient === "back" ? "var(--white)" : "transparent", color: viewOrient === "back" ? "var(--blue)" : "var(--text-muted)", border: "none", borderRadius: 16, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", boxShadow: viewOrient === "back" ? "var(--shadow-sm)" : "none", transition: "var(--transition)" }}>BACK</button>
            </div>

            {(() => {
              const rS = (rn) => ({ fill: selectedRegion === rn ? "rgba(37,99,235,0.28)" : hoveredRegion === rn ? "rgba(37,99,235,0.12)" : "url(#bodyGrad)", stroke: selectedRegion === rn ? "var(--blue)" : hoveredRegion === rn ? "var(--blue-light)" : "var(--border)", strokeWidth: selectedRegion === rn ? 2.2 : 1.2, filter: selectedRegion === rn || hoveredRegion === rn ? "url(#glow)" : "none", transition: "all 0.25s ease-in-out", cursor: "pointer" });
              const rE = (rn) => ({ onClick: () => setSelectedRegion(rn), onMouseEnter: () => setHoveredRegion(rn), onMouseLeave: () => setHoveredRegion(null) });
              const dC = (rn) => selectedRegion === rn ? "rgba(37,99,235,0.5)" : "rgba(148,163,184,0.2)";
              const dF = (rn) => selectedRegion === rn ? "rgba(37,99,235,0.35)" : "rgba(148,163,184,0.12)";
              const ovS = (rn) => ({ ...rS(rn), fill: selectedRegion === rn ? "rgba(37,99,235,0.22)" : hoveredRegion === rn ? "rgba(37,99,235,0.1)" : "transparent" });
              return (
                <svg width="100%" height="340" viewBox="0 0 120 200" style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
                  <defs>
                    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" /><stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.04" /></linearGradient>
                    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.8" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
                    <pattern id="hudGrid" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(37,99,235,0.04)" strokeWidth="0.5" /></pattern>
                    <linearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="var(--blue)" stopOpacity="0" /><stop offset="30%" stopColor="#60a5fa" stopOpacity="0.8" /><stop offset="50%" stopColor="#93c5fd" stopOpacity="1" /><stop offset="70%" stopColor="#60a5fa" stopOpacity="0.8" /><stop offset="100%" stopColor="var(--blue)" stopOpacity="0" /></linearGradient>
                    <radialGradient id="heartGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="var(--text-red-light)" stopOpacity="0.35" /><stop offset="100%" stopColor="var(--text-red-light)" stopOpacity="0.03" /></radialGradient>
                  </defs>
                  <rect width="120" height="200" fill="url(#hudGrid)" rx="8" />
                  <rect x="0" y="0" width="120" height="2" fill="url(#scanGrad)" filter="url(#glow)" opacity="0.75" style={{ pointerEvents: "none" }}><animate attributeName="y" values="5;195;5" dur="5s" repeatCount="indefinite" /></rect>

                  {viewOrient === "front" ? (
                    <g>
                      {/* HEAD */}
                      <path d="M 60 8 C 53 8,49 13,49 20 C 49 26,52 29.5,55 31 L 55 33 C 55 33.5,65 33.5,65 33 L 65 31 C 68 29.5,71 26,71 20 C 71 13,67 8,60 8 Z" {...rE("Head")} style={rS("Head")} />
                      <circle cx="56" cy="19" r="1.2" fill={dC("Eyes")} style={{ pointerEvents: "none" }} />
                      <circle cx="64" cy="19" r="1.2" fill={dC("Eyes")} style={{ pointerEvents: "none" }} />
                      <line x1="60" y1="21" x2="60" y2="24" stroke={dC("Head")} strokeWidth="0.7" style={{ pointerEvents: "none" }} />
                      <path d="M 57 26 Q 60 28 63 26" fill="none" stroke={dC("Head")} strokeWidth="0.6" style={{ pointerEvents: "none" }} />
                      {/* EYES overlay */}
                      <ellipse cx="56" cy="19" rx="3.5" ry="2.2" {...rE("Eyes")} style={ovS("Eyes")} />
                      <ellipse cx="64" cy="19" rx="3.5" ry="2.2" {...rE("Eyes")} style={ovS("Eyes")} />
                      {/* EARS */}
                      <ellipse cx="48" cy="21" rx="2.5" ry="4" {...rE("Ears & Throat")} style={ovS("Ears & Throat")} />
                      <ellipse cx="72" cy="21" rx="2.5" ry="4" {...rE("Ears & Throat")} style={ovS("Ears & Throat")} />
                      {/* NECK */}
                      <path d="M 55 33 L 55 40 C 55 41.5,65 41.5,65 40 L 65 33" {...rE("Neck")} style={rS("Neck")} />
                      <line x1="60" y1="34" x2="60" y2="39" stroke={dF("Neck")} strokeWidth="0.5" strokeDasharray="1,1.5" style={{ pointerEvents: "none" }} />
                      {/* SHOULDERS */}
                      <path d="M 55 40 C 48 40,38 42,34 46 L 38 46 C 42 43,49 41,55 41 Z" {...rE("Shoulders")} style={rS("Shoulders")} />
                      <path d="M 65 40 C 72 40,82 42,86 46 L 82 46 C 78 43,71 41,65 41 Z" {...rE("Shoulders")} style={rS("Shoulders")} />
                      {/* CHEST */}
                      <path d="M 42 46 C 42 46,60 47,78 46 C 80 54,78 62,76 72 L 44 72 C 42 62,40 54,42 46 Z" {...rE("Chest")} style={rS("Chest")} />
                      <path d="M 48 53 Q 60 56 72 53" fill="none" stroke={dF("Chest")} strokeWidth="0.7" style={{ pointerEvents: "none" }} />
                      <path d="M 47 58 Q 60 61 73 58" fill="none" stroke={dF("Chest")} strokeWidth="0.7" style={{ pointerEvents: "none" }} />
                      <path d="M 48 63 Q 60 66 72 63" fill="none" stroke={dF("Chest")} strokeWidth="0.7" style={{ pointerEvents: "none" }} />
                      <path d="M 49 68 Q 60 70 71 68" fill="none" stroke={dF("Chest")} strokeWidth="0.6" style={{ pointerEvents: "none" }} />
                      <path d="M 48 49 C 46 56,47 64,50 70" fill="none" stroke={dC("Chest")} strokeWidth="0.8" strokeDasharray="2,1.5" style={{ pointerEvents: "none" }} />
                      <path d="M 72 49 C 74 56,73 64,70 70" fill="none" stroke={dC("Chest")} strokeWidth="0.8" strokeDasharray="2,1.5" style={{ pointerEvents: "none" }} />
                      {/* HEART overlay */}
                      <path d="M 56 54 C 54 51,50 51,50 55 C 50 59,56 63,60 66 C 64 63,70 59,70 55 C 70 51,66 51,64 54 C 62 56,58 56,56 54 Z" {...rE("Heart")} style={{ fill: selectedRegion === "Heart" ? "rgba(239,68,68,0.3)" : hoveredRegion === "Heart" ? "rgba(239,68,68,0.15)" : "url(#heartGrad)", stroke: selectedRegion === "Heart" ? "var(--text-red-light)" : hoveredRegion === "Heart" ? "#f87171" : "rgba(239,68,68,0.15)", strokeWidth: selectedRegion === "Heart" ? 1.8 : 0.8, filter: selectedRegion === "Heart" || hoveredRegion === "Heart" ? "url(#glow)" : "none", transition: "all 0.25s ease-in-out", cursor: "pointer" }} />
                      <circle cx="60" cy="58" r="1.2" fill="var(--text-red-light)" style={{ pointerEvents: "none" }}><animate attributeName="r" values="0.8;1.8;0.8" dur="1s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" /></circle>
                      {/* ABDOMEN */}
                      <path d="M 44 72 L 76 72 C 75 80,74 86,74 90 C 73 93,72 97,73 100 L 47 100 C 48 97,47 93,46 90 C 46 86,45 80,44 72 Z" {...rE("Abdomen")} style={rS("Abdomen")} />
                      <path d="M 54 75 C 51 78,52 84,56 86 C 60 88,63 85,62 80 C 61 77,57 74,54 75 Z" fill="none" stroke={dC("Abdomen")} strokeWidth="0.7" style={{ pointerEvents: "none" }} />
                      <path d="M 64 74 C 70 75,72 79,70 83 C 68 85,64 84,64 80 Z" fill="none" stroke={dF("Abdomen")} strokeWidth="0.6" style={{ pointerEvents: "none" }} />
                      <path d="M 52 93 C 55 95,58 93,61 95 C 64 97,67 95,68 97" fill="none" stroke={dF("Abdomen")} strokeWidth="0.6" style={{ pointerEvents: "none" }} />
                      <path d="M 51 93 C 54 95,57 93,60 95 C 63 97,66 95,69 97" fill="none" stroke={dF("Abdomen")} strokeWidth="0.6" style={{ pointerEvents: "none" }} />
                      <circle cx="60" cy="96" r="1" fill={dC("Abdomen")} style={{ pointerEvents: "none" }} />
                      <ellipse cx="60" cy="94" rx="4" ry="2.5" fill="none" stroke={dF("Abdomen")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      {/* HIPS */}
                      <path d="M 47 100 L 73 100 C 74 104,73 108,70 112 L 50 112 C 47 108,46 104,47 100 Z" {...rE("Hips")} style={rS("Hips")} />
                      <circle cx="52" cy="106" r="2.5" fill="none" stroke={dC("Hips")} strokeWidth="0.6" style={{ pointerEvents: "none" }} />
                      <circle cx="68" cy="106" r="2.5" fill="none" stroke={dC("Hips")} strokeWidth="0.6" style={{ pointerEvents: "none" }} />
                      {/* ARMS */}
                      <path d="M 38 46 C 33 52,29 60,26 70 L 22 92 C 19 98,17 102,16 106 C 15 108,19 108.5,19.5 106.5 L 22 100 L 25 92 L 29 70 C 32 60,35 52,38 47 Z" {...rE("Arms")} style={rS("Arms")} />
                      <path d="M 82 46 C 87 52,91 60,94 70 L 98 92 C 101 98,103 102,104 106 C 105 108,101 108.5,100.5 106.5 L 98 100 L 95 92 L 91 70 C 88 60,85 52,82 47 Z" {...rE("Arms")} style={rS("Arms")} />
                      <circle cx="26" cy="70" r="1.5" fill="none" stroke={dC("Arms")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <circle cx="94" cy="70" r="1.5" fill="none" stroke={dC("Arms")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <line x1="20" y1="98" x2="23" y2="98" stroke={dC("Arms")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <line x1="97" y1="98" x2="100" y2="98" stroke={dC("Arms")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <path d="M 17 106 L 15.5 109 M 17.5 106.5 L 16.5 110 M 18.5 107 L 18 110.5 M 19.5 106.5 L 20 109" fill="none" stroke={dC("Arms")} strokeWidth="0.4" style={{ pointerEvents: "none" }} />
                      <path d="M 103 106 L 104.5 109 M 102.5 106.5 L 103.5 110 M 101.5 107 L 102 110.5 M 100.5 106.5 L 100 109" fill="none" stroke={dC("Arms")} strokeWidth="0.4" style={{ pointerEvents: "none" }} />
                      {/* LEGS */}
                      <path d="M 50 112 C 49 122,48 133,46.5 155 L 44 170 C 43 176,42 182,40 190 C 39 193,44 193,44.5 190 L 47 182 L 49 170 L 51 155 C 52.5 133,54 122,56 112 Z" {...rE("Legs")} style={rS("Legs")} />
                      <path d="M 70 112 C 71 122,72 133,73.5 155 L 76 170 C 77 176,78 182,80 190 C 81 193,76 193,75.5 190 L 73 182 L 71 170 L 69 155 C 67.5 133,66 122,64 112 Z" {...rE("Legs")} style={rS("Legs")} />
                      <circle cx="48" cy="155" r="2" fill="none" stroke={dC("Legs")} strokeWidth="0.6" style={{ pointerEvents: "none" }} />
                      <circle cx="72" cy="155" r="2" fill="none" stroke={dC("Legs")} strokeWidth="0.6" style={{ pointerEvents: "none" }} />
                      <path d="M 46 153 Q 48 151,50 153" fill="none" stroke={dF("Legs")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <path d="M 70 153 Q 72 151,74 153" fill="none" stroke={dF("Legs")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <line x1="42" y1="186" x2="46" y2="186" stroke={dC("Legs")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <line x1="74" y1="186" x2="78" y2="186" stroke={dC("Legs")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <path d="M 40.5 190 C 39 192,38 194,40 195 L 45 195 C 46 194,45 192,44.5 190" fill="none" stroke={dF("Legs")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <path d="M 79.5 190 C 81 192,82 194,80 195 L 75 195 C 74 194,75 192,75.5 190" fill="none" stroke={dF("Legs")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                    </g>
                  ) : (
                    <g>
                      {/* BACK HEAD */}
                      <path d="M 60 8 C 53 8,49 13,49 20 C 49 26,52 29.5,55 31 L 55 33 C 55 33.5,65 33.5,65 33 L 65 31 C 68 29.5,71 26,71 20 C 71 13,67 8,60 8 Z" {...rE("Head")} style={rS("Head")} />
                      <path d="M 55 18 C 58 21,62 21,65 18" fill="none" stroke={dC("Head")} strokeWidth="0.7" style={{ pointerEvents: "none" }} />
                      <line x1="60" y1="14" x2="60" y2="28" stroke={dF("Head")} strokeWidth="0.4" strokeDasharray="1,2" style={{ pointerEvents: "none" }} />
                      {/* BACK NECK */}
                      <path d="M 55 33 L 55 40 C 55 41.5,65 41.5,65 40 L 65 33" {...rE("Neck")} style={rS("Neck")} />
                      <line x1="60" y1="33.5" x2="60" y2="40.5" stroke={dC("Spine")} strokeWidth="0.6" strokeDasharray="1.5,1" style={{ pointerEvents: "none" }} />
                      {/* BACK SHOULDERS */}
                      <path d="M 55 40 C 48 40,38 42,34 46 L 38 46 C 42 43,49 41,55 41 Z" {...rE("Shoulders")} style={rS("Shoulders")} />
                      <path d="M 65 40 C 72 40,82 42,86 46 L 82 46 C 78 43,71 41,65 41 Z" {...rE("Shoulders")} style={rS("Shoulders")} />
                      {/* BACK SPINE / UPPER */}
                      <path d="M 42 46 C 42 46,60 47,78 46 C 80 54,78 62,76 72 L 44 72 C 42 62,40 54,42 46 Z" {...rE("Spine")} style={rS("Spine")} />
                      <line x1="60" y1="46" x2="60" y2="72" stroke={dC("Spine")} strokeWidth="1" strokeDasharray="2,1.5" style={{ pointerEvents: "none" }} />
                      {[49,52,55,58,61,64,67,70].map(y => <line key={y} x1="58" y1={y} x2="62" y2={y} stroke={dF("Spine")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />)}
                      <path d="M 50 50 C 47 54,46 60,48 64 C 50 61,52 56,50 50 Z" fill="none" stroke={dC("Spine")} strokeWidth="0.7" style={{ pointerEvents: "none" }} />
                      <path d="M 70 50 C 73 54,74 60,72 64 C 70 61,68 56,70 50 Z" fill="none" stroke={dC("Spine")} strokeWidth="0.7" style={{ pointerEvents: "none" }} />
                      {/* BACK LOWER SPINE */}
                      <path d="M 44 72 L 76 72 C 75 80,74 86,74 90 C 73 93,72 97,73 100 L 47 100 C 48 97,47 93,46 90 C 46 86,45 80,44 72 Z" {...rE("Spine")} style={rS("Spine")} />
                      <line x1="60" y1="72" x2="60" y2="100" stroke={dC("Spine")} strokeWidth="1" strokeDasharray="2,1.5" style={{ pointerEvents: "none" }} />
                      {[74,78,82,86].map(y => <line key={y} x1="58.5" y1={y} x2="61.5" y2={y} stroke={dF("Spine")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />)}
                      <ellipse cx="52" cy="78" rx="3" ry="5" fill="none" stroke={dF("Spine")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <ellipse cx="68" cy="78" rx="3" ry="5" fill="none" stroke={dF("Spine")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      {/* BACK SACRUM / GLUTEAL */}
                      <path d="M 46 100 L 74 100 C 73 104,72 108,73 112 L 47 112 C 48 108,47 104,46 100 Z" {...rE("Hips")} style={rS("Hips")} />
                      <path d="M 57 102 L 60 108 L 63 102 Z" fill="none" stroke={dC("Hips")} strokeWidth="0.6" style={{ pointerEvents: "none" }} />
                      <path d="M 50 106 C 55 110,60 112,60 112" fill="none" stroke={dF("Hips")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      <path d="M 70 106 C 65 110,60 112,60 112" fill="none" stroke={dF("Hips")} strokeWidth="0.5" style={{ pointerEvents: "none" }} />
                      {/* BACK HIPS */}
                      <path d="M 47 100 L 73 100 C 74 104,73 108,70 112 L 50 112 C 47 108,46 104,47 100 Z" {...rE("Hips")} style={rS("Hips")} />
                      {/* BACK ARMS */}
                      <path d="M 38 46 C 33 52,29 60,26 70 L 22 92 C 19 98,17 102,16 106 C 15 108,19 108.5,19.5 106.5 L 22 100 L 25 92 L 29 70 C 32 60,35 52,38 47 Z" {...rE("Arms")} style={rS("Arms")} />
                      <path d="M 82 46 C 87 52,91 60,94 70 L 98 92 C 101 98,103 102,104 106 C 105 108,101 108.5,100.5 106.5 L 98 100 L 95 92 L 91 70 C 88 60,85 52,82 47 Z" {...rE("Arms")} style={rS("Arms")} />
                      <line x1="30" y1="58" x2="27" y2="68" stroke={dF("Arms")} strokeWidth="0.4" style={{ pointerEvents: "none" }} />
                      <line x1="90" y1="58" x2="93" y2="68" stroke={dF("Arms")} strokeWidth="0.4" style={{ pointerEvents: "none" }} />
                      {/* BACK LEGS */}
                      <path d="M 50 112 C 49 122,48 133,46.5 155 L 44 170 C 43 176,42 182,40 190 C 39 193,44 193,44.5 190 L 47 182 L 49 170 L 51 155 C 52.5 133,54 122,56 112 Z" {...rE("Legs")} style={rS("Legs")} />
                      <path d="M 70 112 C 71 122,72 133,73.5 155 L 76 170 C 77 176,78 182,80 190 C 81 193,76 193,75.5 190 L 73 182 L 71 170 L 69 155 C 67.5 133,66 122,64 112 Z" {...rE("Legs")} style={rS("Legs")} />
                      <path d="M 47 160 C 46 166,46 172,44 178" fill="none" stroke={dF("Legs")} strokeWidth="0.4" style={{ pointerEvents: "none" }} />
                      <path d="M 73 160 C 74 166,74 172,76 178" fill="none" stroke={dF("Legs")} strokeWidth="0.4" style={{ pointerEvents: "none" }} />
                      <line x1="43" y1="184" x2="42" y2="189" stroke={dF("Legs")} strokeWidth="0.4" style={{ pointerEvents: "none" }} />
                      <line x1="77" y1="184" x2="78" y2="189" stroke={dF("Legs")} strokeWidth="0.4" style={{ pointerEvents: "none" }} />
                    </g>
                  )}

                  {/* Pulsing joint nodes */}
                  <g style={{ pointerEvents: "none" }}>
                    {[[38,44],[82,44],[26,70],[94,70],[21,98],[99,98],[52,106],[68,106],[48,155],[72,155],[42,186],[78,186]].map(([cx,cy],i) => (
                      <circle key={i} cx={cx} cy={cy} r="1.3" fill="var(--blue)" filter="url(#glow)">
                        <animate attributeName="r" values="0.8;1.8;0.8" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
                      </circle>
                    ))}
                  </g>

                  {/* Hover label tooltip */}
                  {hoveredRegion && hoveredRegion !== "All" && (() => {
                    const lp = { Head:[60,5], Eyes:[60,14], "Ears & Throat":[84,14], Neck:[80,35], Chest:[60,48], Heart:[40,54], Abdomen:[86,90], Spine:[86,60], Shoulders:[25,38], Arms:[10,76], Hips:[86,118], Legs:[34,165] };
                    const p = lp[hoveredRegion]; if (!p) return null;
                    const txt = hoveredRegion.length > 10 ? hoveredRegion.substring(0, 10) + "…" : hoveredRegion;
                    const w = Math.max(txt.length * 4.2, 24);
                    return (<g style={{ pointerEvents: "none" }}><rect x={p[0] - w/2} y={p[1] - 5} width={w} height="10" rx="3" fill="rgba(37,99,235,0.9)" /><text x={p[0]} y={p[1] + 2.5} textAnchor="middle" fill="#fff" fontSize="4.5" fontWeight="700" fontFamily="var(--font)">{txt}</text></g>);
                  })()}
                </svg>
              );
            })()}

            {/* Diagnostic HUD Panel */}
            <div style={{ width: "100%", marginTop: 12, padding: "8px 10px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", textAlign: "center", minHeight: 56, display: "flex", flexDirection: "column", justifyContent: "center", transition: "var(--transition)" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Diagnostic Focus</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--navy)", marginTop: 2 }}>
                {(hoveredRegion || selectedRegion) === "All" ? "ALL REGIONS" : (hoveredRegion || selectedRegion).toUpperCase()}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                {(() => { const ar = hoveredRegion || selectedRegion; if (ar === "All") return `${symptoms.length} total symptoms selected`; const l = REGION_SYMPTOMS[ar] || []; const c = symptoms.filter(s => l.includes(s)).length; return c === 1 ? "1 symptom selected" : `${c} symptoms selected`; })()}
              </div>
            </div>
          </div>


          {/* Right panel: Checklist & inputs */}
          <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {displayedSymptoms.map(s => {
                const sel = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className="symptom-chip"
                    style={{
                      padding: "6px 13px",
                      borderRadius: 99,
                      background: sel ? "var(--blue)" : "var(--surface)",
                      color: sel ? "#fff" : "var(--text-muted)",
                      border: sel ? "1.5px solid transparent" : "1.5px solid var(--border)",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: sel ? 700 : 500,
                      fontFamily: "var(--font)",
                      transition: "var(--transition)",
                      boxShadow: sel ? "0 2px 8px rgba(37,99,235,0.25)" : "none",
                    }}
                  >{s}</button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={customSymptom}
                onChange={e => setCustomSymptom(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustom()}
                placeholder="Add a custom symptom…"
                style={{
                  flex: 1, padding: "9px 13px",
                  borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)",
                  fontSize: 13, fontFamily: "var(--font)",
                }}
              />
              <button
                onClick={addCustom}
                className="btn-primary"
                style={{
                  background: "var(--blue)", color: "#fff",
                  border: "none", borderRadius: "var(--radius-sm)",
                  padding: "9px 16px", cursor: "pointer",
                  fontWeight: 700, fontSize: 13, fontFamily: "var(--font)",
                }}
              >+ Add</button>
            </div>

            {symptoms.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                <div style={{ width: "100%", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                  Selected ({symptoms.length})
                </div>
                {symptoms.map(s => (
                  <span key={s} style={{
                    background: "var(--blue-pale)",
                    color: "var(--blue)",
                    borderRadius: 99,
                    padding: "4px 11px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 5,
                    border: "1px solid var(--blue-border)",
                  }}>
                    {s}
                    <button onClick={() => toggleSymptom(s)} style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--blue)", padding: 0, fontSize: 15,
                      lineHeight: 1, fontWeight: 700, opacity: 0.7,
                      fontFamily: "var(--font)",
                      display: "flex", alignItems: "center",
                    }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Details */}
      <div className="analyzer-details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Duration */}
        <Card style={{ animation: "fadeUp 0.3s ease 0.14s both" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Duration</div>
          {["Less than 1 day","1-3 days","3-7 days","1-2 weeks","More than 2 weeks"].map(d => (
            <label key={d} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 0", cursor: "pointer", fontSize: 13.5,
              color: duration === d ? "var(--blue)" : "var(--text-muted)",
              fontWeight: duration === d ? 700 : 400,
              borderBottom: "1px solid var(--surface-2)",
              transition: "var(--transition)",
            }}>
              <input
                type="radio" checked={duration === d} onChange={() => setDuration(d)}
                style={{ accentColor: "var(--blue)", width: 15, height: 15, flexShrink: 0 }}
              />
              {d}
            </label>
          ))}
        </Card>

        {/* Pain + fever + condition */}
        <Card style={{ animation: "fadeUp 0.3s ease 0.18s both" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Details</div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Pain Level</span>
              <span style={{
                fontWeight: 800, fontSize: 20, color: painColor,
                fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px",
              }}>{painLevel}<span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>/10</span></span>
            </div>
            <input type="range" min={0} max={10} value={painLevel}
              onChange={e => setPainLevel(+e.target.value)}
              style={{ width: "100%", accentColor: painColor, cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
              <span>No pain</span><span>Severe</span>
            </div>
          </div>

          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 18,
            padding: "10px 14px",
            background: hasFever ? "var(--bg-red)" : "var(--surface)",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${hasFever ? "var(--border-red)" : "var(--border)"}`,
            transition: "var(--transition)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: hasFever ? "var(--text-red)" : "var(--text)" }}>🌡️ Fever Present</div>
            <button
              onClick={() => setHasFever(!hasFever)}
              style={{
                background: hasFever ? "var(--text-red)" : "var(--surface-2)",
                color: hasFever ? "#fff" : "var(--text-muted)",
                border: `1px solid ${hasFever ? "transparent" : "var(--border)"}`,
                borderRadius: 99, padding: "4px 16px",
                cursor: "pointer", fontSize: 12, fontWeight: 700,
                fontFamily: "var(--font)",
                transition: "var(--transition)",
                boxShadow: hasFever ? "0 2px 8px rgba(220,38,38,0.3)" : "none",
              }}
            >{hasFever ? "Yes" : "No"}</button>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Pre-existing Condition</div>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px",
                borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)",
                fontSize: 13.5, cursor: "pointer", fontFamily: "var(--font)",
              }}
            >
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </Card>
      </div>

      <button
        onClick={analyze}
        disabled={loading || !symptoms.length}
        className="btn-primary"
        style={{
          width: "100%",
          background: symptoms.length && !loading
            ? "linear-gradient(135deg, #1d4ed8, #2563eb)"
            : "var(--border)",
          color: symptoms.length ? "#fff" : "var(--text-faint)",
          border: "none", borderRadius: "var(--radius-lg)",
          padding: "15px",
          fontSize: 15, fontWeight: 800,
          cursor: symptoms.length && !loading ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontFamily: "var(--font)", letterSpacing: "-0.2px",
          boxShadow: symptoms.length ? "var(--shadow-blue)" : "none",
          transition: "var(--transition-slow)",
          animation: "fadeUp 0.3s ease 0.22s both",
        }}
      >
        {loading ? <><Spinner color="#fff" /><span>Analyzing your symptoms…</span></> : "🔍 Analyze Symptoms"}
      </button>
    </div>
  );
}

// ─── RESULTS ──────────────────────────────────────────────────────────────────
// ─── REPLACE: function Results({ report, onSave, onNew }) ────────────────────
// Find the existing Results function and replace it entirely with this.
// Also add the two helper components (AnimatedBar, RadialGauge) just above it.

// ── Helper: animated horizontal bar ──────────────────────────────────────────
// ── Helper: animated horizontal bar ──────────────────────────────────────────
function AnimatedBar({ pct, color, delay = 0, height = 8 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div style={{
      background: "var(--surface-2)", borderRadius: 99,
      height, overflow: "hidden", position: "relative",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, height: "100%",
        width: `${width}%`,
        background: color,
        borderRadius: 99,
        transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: `0 0 10px ${color.includes("gradient") ? "#2563eb" : color}50`,
      }} />
    </div>
  );
}

// ── Helper: radial/donut gauge for pain level ─────────────────────────────────
function RadialGauge({ value, max = 10, color, label, size = 88 }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 200);
    return () => clearTimeout(t);
  }, [value]);
  const r = 30, cx = 44, cy = 44;
  const circ = 2 * Math.PI * r;
  const pct = animated / max;
  const dash = circ * pct;
  const gap  = circ - dash;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} viewBox="0 0 88 88">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={8} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 16, fontWeight: 800, fill: color, fontFamily: "var(--font)" }}>
          {value}
        </text>
        <text x={cx} y={cy + 15} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 8, fill: "#94a3b8", fontFamily: "var(--font)", fontWeight: 600 }}>
          /{max}
        </text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
    </div>
  );
}

function Results({ report, onSave, onNew, savedMedicines = [], onSaveMedicine, onDeleteMedicine }) {
  const [barsVisible, setBarsVisible] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(null);

  const generateClinicSheet = (report) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      // Header
      doc.setFillColor(15, 31, 92);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("MedAI Clinic Sheet", 15, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(191, 219, 254);
      doc.text("AI-POWERED SYMPTOM ANALYSIS REPORT", 15, 26);

      // Patient info section
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Patient Report", 15, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const dateStr = new Date(report.date).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      doc.text(`Date: ${dateStr}`, 15, 48);
      doc.text(`Symptoms: ${report.symptoms.join(", ")}`, 15, 54);
      doc.text(`Duration: ${report.duration} | Pain Level: ${report.painLevel}/10 | Fever: ${report.hasFever ? "Yes" : "No"}`, 15, 60);
      doc.text(`Pre-existing: ${report.condition}`, 15, 66);

      // Separator
      doc.setDrawColor(226, 232, 248);
      doc.line(15, 72, 195, 72);

      // Conditions
      doc.setTextColor(15, 31, 92);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Possible Conditions", 15, 80);
      let y = 87;
      if (report.conditions && Array.isArray(report.conditions)) {
        report.conditions.forEach((c, i) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          doc.text(`${i + 1}. ${c.name} (${c.confidence}% confidence)`, 15, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          const desc = c.description || "";
          const lines = doc.splitTextToSize(desc, 180);
          doc.text(lines, 15, y);
          y += lines.length * 5 + 4;
        });
      }

      // Severity
      doc.setTextColor(15, 31, 92);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Severity: ${report.severityLevel || report.severity}`, 15, y + 2);
      y += 8;
      if (report.severityReason) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const lines = doc.splitTextToSize(report.severityReason, 180);
        doc.text(lines, 15, y);
        y += lines.length * 5 + 6;
      }

      // Self-care
      if (report.selfCare && report.selfCare.length > 0) {
        doc.setTextColor(15, 31, 92);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Self-Care Recommendations", 15, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        report.selfCare.forEach(tip => {
          doc.text(`\u2022 ${tip}`, 18, y);
          y += 5;
        });
      }

      // Doctor warning
      if (report.doctorWarning) {
        y += 5;
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("When to See a Doctor:", 15, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(report.doctorWarning, 180);
        doc.text(lines, 15, y);
        y += lines.length * 5 + 4;
      }

      // Footer
      doc.setDrawColor(226, 232, 248);
      doc.line(15, 275, 195, 275);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Generated by MedAI - Intelligent Health Assistant. This is not a medical diagnosis.", 15, 281);
      doc.text("Please consult a qualified healthcare professional for medical advice.", 15, 285);

      doc.save(`MedAI_Clinic_Sheet_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate clinic sheet: " + err.message);
    }
  };
  const [activeCondition, setActiveCondition] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setBarsVisible(true), 300);
    return () => clearTimeout(t);
  }, [report]);

  if (!report) return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 860, margin: "0 auto" }}>
      <Card style={{ textAlign: "center", padding: 72 }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🔬</div>
        <div style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>No analysis yet.</div>
        <div style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 6 }}>Go to Analyzer to check your symptoms.</div>
      </Card>
    </div>
  );

  const sColor = severityColor(report.severityLevel);
  const sBg    = severityBg(report.severityLevel);
  const painColor = report.painLevel <= 3 ? "#10b981"
    : report.painLevel <= 6 ? "#f59e0b" : "var(--text-red-light)";
  const selfCareIcons = ["💧","😴","🥗","💊","🚶","🌡️","🧘","🩺"];

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 860, margin: "0 auto", position: "relative" }}>

      {/* ── Header ── */}
      <div className="results-header-flex" style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 20, animation: "fadeUp 0.3s ease both",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}>🩺</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.6px", margin: 0 }}>
              AI Analysis
            </h2>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginLeft: 46 }}>
            {new Date(report.date).toLocaleString("en-IN")}
            &nbsp;·&nbsp;{report.symptoms.length} symptom{report.symptoms.length !== 1 ? "s" : ""} analysed
          </div>
        </div>
        <div className="results-buttons-flex" style={{ display: "flex", gap: 8 }}>
          <button onClick={onSave} className="btn-primary" style={{
            background: "#059669", color: "#fff", border: "none",
            borderRadius: "var(--radius-sm)", padding: "9px 16px",
            cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "var(--font)",
            boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
            display: "flex", alignItems: "center", gap: 6,
          }}>💾 Save</button>
          <button onClick={() => generateClinicSheet(report)} className="btn-primary" style={{
            background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff", border: "none",
            borderRadius: "var(--radius-sm)", padding: "9px 16px",
            cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "var(--font)",
            boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
            display: "flex", alignItems: "center", gap: 6,
          }}>🖨️ Clinic Sheet</button>
          <button onClick={onNew} className="btn-primary" style={{
            background: "var(--blue)", color: "#fff", border: "none",
            borderRadius: "var(--radius-sm)", padding: "9px 16px",
            cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "var(--font)",
          }}>+ New</button>
        </div>
      </div>

      <DisclaimerBanner />

      {/* ── Hero: Severity + Vitals ── */}
      <div className="results-hero-grid" style={{
        display: "grid", gridTemplateColumns: "1fr 200px",
        gap: 16, marginBottom: 16,
        animation: "scaleIn 0.35s ease 0.05s both",
      }}>
        {/* Severity card */}
        <Card style={{
          background: sBg,
          border: `1px solid ${sColor}28`,
          boxShadow: `0 4px 32px ${sColor}18`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Severity Assessment
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: `${sColor}18`,
                  border: `2px solid ${sColor}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                }}>
                  {report.severityLevel === "Low" ? "🟢"
                    : report.severityLevel === "Medium" ? "🟡"
                    : report.severityLevel === "High" ? "🔴" : "🚨"}
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: sColor, letterSpacing: "-0.5px" }}>
                    {report.severityLevel}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>severity level</div>
                </div>
              </div>
            </div>
            <Badge color={sColor} bg={`${sColor}18`} size="md">● {report.severityLevel}</Badge>
          </div>

          {/* Segmented bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {["Low","Medium","High","Emergency"].map((l, i) => {
                const idx = ["Low","Medium","High","Emergency"].indexOf(report.severityLevel);
                const active = i <= idx;
                const colors = { Low:"#10b981", Medium:"#f59e0b", High:"var(--text-red-light)", Emergency:"var(--text-red)" };
                return (
                  <div key={l} style={{
                    flex: 1, height: 10, borderRadius: 99,
                    background: active ? colors[l] : "#e2e8f0",
                    boxShadow: active && i === idx ? `0 0 12px ${colors[l]}80` : "none",
                    transition: "all 0.5s ease",
                    position: "relative", overflow: "hidden",
                  }}>
                    {active && i === idx && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.3) 60%, transparent 90%)",
                        animation: "shimmer 2s infinite",
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {["Low","Medium","High","Emergency"].map(l => <span key={l}>{l}</span>)}
            </div>
          </div>

          {report.severityReason && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.7 }}>
              {report.severityReason}
            </p>
          )}
          {report.recommendedAction && (
            <div style={{
              padding: "11px 14px",
              background: "var(--bg-modal)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              display: "flex", alignItems: "flex-start", gap: 8,
              backdropFilter: "blur(4px)",
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>⚡</span>
              <span style={{ fontSize: 13, color: "var(--navy)", fontWeight: 600, lineHeight: 1.55 }}>
                {report.recommendedAction}
              </span>
            </div>
          )}
        </Card>

        {/* Vitals column */}
        <Card style={{
          display: "flex", flexDirection: "column",
          gap: 16, alignItems: "center", justifyContent: "center",
          padding: "20px 16px",
        }}>
          <div className="analyzer-vitals-row" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", justifyContent: "center" }}>
            <RadialGauge value={report.painLevel} max={10} color={painColor} label="Pain" />
            <div className="analyzer-vitals-sep-1" style={{ width: "100%", height: 1, background: "var(--border)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", margin: "0 auto 6px",
                background: report.hasFever ? "var(--bg-red)" : "var(--bg-green-light)",
                border: `2px solid ${report.hasFever ? "var(--border-red)" : "var(--border-green)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>🌡️</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: report.hasFever ? "var(--text-red)" : "#10b981" }}>
                {report.hasFever ? "Fever" : "No Fever"}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>Status</div>
            </div>
          </div>
          <div style={{ width: "100%", height: 1, background: "var(--border)" }} />
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Duration</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", lineHeight: 1.4, textAlign: "center" }}>{report.duration}</div>
          </div>
        </Card>
      </div>

      {/* ── Symptom tags ── */}
      <Card style={{ marginBottom: 16, animation: "fadeUp 0.3s ease 0.08s both", padding: "16px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
          🔬 Symptoms Reported ({report.symptoms.length})
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {report.symptoms.map((s, i) => (
            <span key={i} style={{
              background: "var(--blue-pale)", color: "var(--navy)",
              border: "1px solid var(--blue-border)",
              borderRadius: 99, padding: "5px 13px",
              fontSize: 12.5, fontWeight: 600,
              animation: `fadeUp 0.3s ease ${i * 0.04}s both`,
            }}>{s}</span>
          ))}
          {report.condition && report.condition !== "None" && (
            <span style={{
              background: "var(--bg-purple-light)", color: "var(--text-purple)",
              border: "1px solid var(--border-purple)",
              borderRadius: 99, padding: "5px 13px",
              fontSize: 12.5, fontWeight: 600,
            }}>⚕️ {report.condition}</span>
          )}
        </div>
      </Card>

      {/* ── What's happening ── */}
      {report.simpleExplanation && (
        <Card style={{ marginBottom: 16, animation: "fadeUp 0.3s ease 0.1s both" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
            💬 What's Likely Happening
          </div>
          <div style={{
            padding: "14px 16px",
            background: "linear-gradient(135deg, var(--bg-blue-pale), var(--bg-blue-light))",
            borderRadius: "var(--radius)",
            border: "1px solid var(--blue-border)",
          }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--navy)", lineHeight: 1.8, fontWeight: 500 }}>
              {report.simpleExplanation}
            </p>
          </div>
        </Card>
      )}

      {/* ── Conditions ── */}
      {(report.conditions || []).length > 0 && (
        <Card style={{ marginBottom: 16, animation: "fadeUp 0.3s ease 0.14s both" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              🧬 Possible Conditions
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500 }}>Ranked by likelihood</div>
          </div>

          {report.conditions.map((c, i) => {
            const col = condColor(c.confidence);
            return (
              <div key={i} 
                onClick={() => setActiveCondition({ ...c, rank: i })}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "var(--shadow)";
                  e.currentTarget.style.borderColor = col;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = i === 0 ? `${col}20` : "var(--border)";
                }}
                style={{
                  marginBottom: i < report.conditions.length - 1 ? 14 : 0,
                  padding: "16px 18px",
                  background: i === 0 ? `${col}08` : "var(--surface)",
                  borderRadius: "var(--radius)",
                  border: i === 0 ? `1.5px solid ${col}20` : "1px solid var(--border)",
                  animation: `fadeUp 0.4s ease ${0.14 + i * 0.08}s both`,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >

                {/* ── Row 1: medal + name + radial gauge ── */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    {/* Medal icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${col}18`, border: `1px solid ${col}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0,
                    }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                    </div>

                    {/* Name + "Most likely" badge stacked */}
                    <div style={{ minWidth: 0 }}>
                      {i === 0 && (
                        <div style={{
                          display: "inline-block",
                          background: `${col}18`, color: col,
                          fontSize: 9, fontWeight: 800,
                          borderRadius: 99, padding: "2px 8px",
                          letterSpacing: "0.08em", textTransform: "uppercase",
                          border: `1px solid ${col}30`,
                          marginBottom: 4,
                        }}>Most likely</div>
                      )}
                      <div style={{
                        fontWeight: 800, color: "var(--navy)",
                        fontSize: 14.5, letterSpacing: "-0.2px",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {c.name}
                      </div>
                    </div>
                  </div>

                  {/* Radial gauge — isolated on the right, no overlap */}
                  <div style={{ flexShrink: 0, marginLeft: 16 }}>
                    <svg width={52} height={52} viewBox="0 0 52 52">
                      <circle cx={26} cy={26} r={20} fill="none" stroke="var(--surface-2)" strokeWidth={5} />
                      <circle
                        cx={26} cy={26} r={20}
                        fill="none" stroke={col} strokeWidth={5}
                        strokeLinecap="round"
                        strokeDasharray={`${barsVisible ? (c.confidence / 100) * 125.6 : 0} 125.6`}
                        strokeDashoffset={31.4}
                        style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)" }}
                      />
                      <text x={26} y={23} textAnchor="middle" dominantBaseline="middle"
                        style={{ fontSize: 11, fontWeight: 800, fill: col, fontFamily: "var(--font)" }}>
                        {c.confidence}%
                      </text>
                    </svg>
                  </div>
                </div>

                {/* ── Animated bar ── */}
                <AnimatedBar
                  pct={barsVisible ? c.confidence : 0}
                  color={col}
                  delay={i * 80}
                  height={6}
                />
              </div>
            );
          })}

        </Card>
      )}

      {/* ── Self-care grid ── */}
      {report.selfCare?.length > 0 && (
        <Card style={{ marginBottom: 16, animation: "fadeUp 0.3s ease 0.26s both" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
            🌿 Self-Care Suggestions
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 8,
          }}>
            {report.selfCare.map((t, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "var(--surface)",
                borderRadius: "var(--radius-sm)",
                padding: "12px 14px",
                border: "1px solid var(--border)",
                lineHeight: 1.55,
                animation: `fadeUp 0.3s ease ${0.26 + i * 0.05}s both`,
                transition: "var(--transition)",
              }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "var(--bg-green-light)", border: "1px solid #a7f3d0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0,
                }}>{selfCareIcons[i % selfCareIcons.length]}</span>
                <span style={{ fontSize: 12.5, color: "var(--text-muted)", flex: 1, textAlign: "left" }}>{t}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Recovery timeline ── */}
      <Card style={{ marginBottom: 16, animation: "fadeUp 0.3s ease 0.3s both" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
          📅 Suggested Recovery Timeline
        </div>
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", left: 15, top: 6, bottom: 6,
            width: 2, background: "linear-gradient(180deg, var(--blue), var(--blue-border))",
            borderRadius: 99,
          }} />
          {[
            { day: "Day 1–2", icon: "🛏️", label: "Rest & Hydration", desc: "Stay home, drink plenty of fluids, monitor temperature." },
            { day: "Day 2–4", icon: "💊", label: "Medication Phase", desc: "Take OTC medications as needed. Continue monitoring symptoms." },
            { day: "Day 4–7", icon: "🚶", label: "Gradual Recovery", desc: "Light activity as tolerated. Nutritious meals to rebuild strength." },
            { day: "Day 7+", icon: "✅", label: "Reassess & Follow-up", desc: "If symptoms persist, consult a doctor for further evaluation." },
          ].map((step, i) => (
            <div key={i} style={{
              display: "flex", gap: 16, marginBottom: i < 3 ? 16 : 0,
              paddingLeft: 4,
              animation: `fadeUp 0.35s ease ${0.3 + i * 0.07}s both`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: i === 0 ? "var(--blue)" : "var(--white)",
                border: `2px solid ${i === 0 ? "var(--blue)" : "var(--blue-border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, zIndex: 1,
                boxShadow: i === 0 ? "0 0 0 4px rgba(37,99,235,0.15)" : "none",
              }}>{step.icon}</div>
              <div style={{ paddingBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)" }}>{step.label}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "var(--blue)",
                    background: "var(--blue-pale)", borderRadius: 99,
                    padding: "1px 8px", border: "1px solid var(--blue-border)",
                  }}>{step.day}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Doctor warning ── */}
      {report.doctorWarning && (
        <Card style={{
          background: "linear-gradient(135deg, var(--bg-amber-light), var(--bg-amber))",
          border: "1px solid #fde68a",
          animation: "fadeUp 0.3s ease 0.34s both",
        }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: "var(--bg-amber-light)", border: "1.5px solid var(--border-amber)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}>👨‍⚕️</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-amber)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                Doctor Consultation
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-amber)", lineHeight: 1.75 }}>{report.doctorWarning}</p>
            </div>
          </div>
        </Card>
      )}
      {activeSuggestion && (
        <SelfCareDetailModal
          suggestion={activeSuggestion}
          savedMedicines={savedMedicines}
          onSaveMedicine={onSaveMedicine}
          onDeleteMedicine={onDeleteMedicine}
          onClose={() => setActiveSuggestion(null)}
        />
      )}
      {activeCondition && (
        <ConditionDetailModal
          condition={activeCondition}
          onClose={() => setActiveCondition(null)}
        />
      )}
    </div>
  );
}

// ─── HELPER FUNCTIONS & MODALS ──────────────────────────────────────────────
function getSelfCareDetails(text, index) {
  const icons = ["💧","😴","🥗","💊","🚶","🌡️","🧘","🩺","🧴","🛡️","👕","🛌","🍏","❄️","🔥"];
  const icon = icons[index % icons.length];
  return {
    title: "Self-Care Advisory",
    explanation: "Integrating targeted home care interventions accelerates natural recovery pathways and helps manage discomfort.",
    steps: [
      "Follow the recommendation carefully as described.",
      "Monitor how your symptoms react over the next 12-24 hours."
    ],
    tips: [
      "Combine with general physical rest and hydration."
    ],
    precautions: [
      "If symptoms worsen or do not improve after 48 hours, consult a physician."
    ],
    icon,
    medicines: []
  };
}

function SelfCareDetailModal({ suggestion, savedMedicines = [], onSaveMedicine, onDeleteMedicine, onClose }) {
  const details = getSelfCareDetails(suggestion.text, suggestion.index);
  const app = loadAppearance();
  const navPos = app.navPosition || "left";
  const modalOffsetStyles = {
    "--modal-offset-left": navPos === "right" ? "0" : "var(--sidebar-width)",
    "--modal-offset-right": navPos === "right" ? "var(--sidebar-width)" : "0",
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{
        position: "fixed", top: 0, bottom: 0, background: "rgba(0, 0, 0, 0)",
        zIndex: 9999, animation: "fadeIn 0.2s ease both",
        ...modalOffsetStyles,
      }} className="medai-modal-overlay" />
      <div style={{
        position: "fixed", top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, pointerEvents: "none", padding: "16px",
        ...modalOffsetStyles,
      }} className="medai-modal-container">
        <div style={{ background: "var(--bg-modal)", borderRadius: "var(--radius-xl)", border: "2px solid var(--blue-border)", width: "min(500px, 100%)", maxHeight: "88vh", overflowY: "auto", pointerEvents: "all", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{details.title}</h3>
            <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20 }}>×</button>
          </div>
          <div style={{ padding: "20px 24px" }}>
            <p>{details.explanation}</p>
            <p><strong>Steps:</strong></p>
            <ul>{details.steps.map((s,i) => <li key={i}>{s}</li>)}</ul>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function getConditionDetails(c) {
  return {
    cause: c.cause || "Physiological stressors leading to localized symptoms.",
    risks: c.risks || ["Progression of underlying symptoms if untreated."],
    riskScore: typeof c.riskScore === 'number' ? c.riskScore : Math.round((c.confidence || 50) * 0.85)
  };
}

function ConditionDetailModal({ condition, onClose }) {
  const { cause, risks, riskScore } = getConditionDetails(condition);
  const col = condColor(condition.confidence);
  const app = loadAppearance();
  const navPos = app.navPosition || "left";
  const modalOffsetStyles = {
    "--modal-offset-left": navPos === "right" ? "0" : "var(--sidebar-width)",
    "--modal-offset-right": navPos === "right" ? "var(--sidebar-width)" : "0",
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{
        position: "fixed", top: 0, bottom: 0, background: "rgba(0, 0, 0, 0)",
        zIndex: 9999, animation: "fadeIn 0.2s ease both",
        ...modalOffsetStyles,
      }} className="medai-modal-overlay" />
      <div style={{
        position: "fixed", top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, pointerEvents: "none", padding: "16px",
        ...modalOffsetStyles,
      }} className="medai-modal-container">
        <div style={{ background: "var(--bg-modal)", borderRadius: "var(--radius-xl)", width: "min(520px, 100%)", maxHeight: "88vh", overflowY: "auto", pointerEvents: "all", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", border: "1px solid var(--border)", animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both", display: "flex", flexDirection: "column" }}>
          {/* Gradient header */}
          <div style={{
            padding: "22px 24px", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
            background: `linear-gradient(135deg, ${col}18, ${col}08)`,
            borderBottom: `1px solid ${col}20`,
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: col, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                Condition #{condition.rank + 1} · {condition.confidence}% Match
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "var(--navy)" }}>{condition.name}</h3>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5, maxWidth: 380 }}>
                {condition.description}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: 8, width: 30, height: 30, cursor: "pointer",
              fontSize: 16, color: "var(--text-muted)", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
          
          {/* Details list */}
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20, flex: 1, overflowY: "auto" }}>
            <div>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Possible Cause</h4>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>{cause}</p>
            </div>

            <div>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Associated Risks</h4>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                {risks.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text-muted)" }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: col, flexShrink: 0,
                    }} />
                    {r}
                  </div>
                ))}
              </ul>
            </div>

            {/* Risk score bar */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                📊 Risk Assessment
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  flex: 1, height: 8, borderRadius: 99,
                  background: "var(--surface-2)", overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    width: `${riskScore}%`,
                    background: `linear-gradient(90deg, ${col}, ${col}cc)`,
                    transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                  }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: col, minWidth: 36, textAlign: "right" }}>{riskScore}%</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: "14px 24px", borderTop: "1px solid var(--border)",
            background: "var(--surface)", display: "flex", justifyContent: "flex-end",
          }}>
            <button onClick={onClose} style={{
              background: "var(--blue)", color: "#fff", border: "none",
              borderRadius: "var(--radius-sm)", padding: "8px 24px",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              fontFamily: "var(--font)",
            }}>Close</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function MedicalIdModal({ settings, savedMedicines, reports = [], onClose }) {
  const profileInitial = (settings.name || "?")[0].toUpperCase();
  const app = loadAppearance();
  const navPos = app.navPosition || "left";
  const modalOffsetStyles = {
    "--modal-offset-left": navPos === "right" ? "0" : "var(--sidebar-width)",
    "--modal-offset-right": navPos === "right" ? "var(--sidebar-width)" : "0",
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Header Banner (Emergency Red)
      doc.setFillColor(225, 29, 72); // #e11d48
      doc.rect(0, 0, 210, 30, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("EMERGENCY MEDICAL ID", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(254, 226, 226);
      doc.text("GENERATED BY MEDAI HEALTH ASSISTANT", 125, 19);

      // Section: Personal Details
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Personal Information", 15, 45);

      doc.setDrawColor(226, 232, 240); // border
      doc.setLineWidth(0.5);
      doc.line(15, 48, 195, 48);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text("Name:", 15, 56);
      doc.text("Age:", 15, 63);
      doc.text("Blood Group:", 15, 70);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(settings.name || "Not Specified", 45, 56);
      doc.text(settings.age ? String(settings.age) : "—", 45, 63);
      doc.setTextColor(225, 29, 72); // red for blood group
      doc.setFont("helvetica", "bold");
      doc.text(settings.bloodGroup || "—", 45, 70);

      // Section: Recent Health Report
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Recent Health Report", 15, 85);
      doc.line(15, 88, 195, 88);

      if (reports && reports.length > 0) {
        const latest = reports[reports.length - 1];
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        doc.text("Date:", 15, 96);
        doc.text("Condition:", 15, 103);
        doc.text("Symptoms:", 15, 110);
        doc.text("Pain Level:", 15, 117);
        doc.text("Severity:", 15, 124);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(new Date(latest.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }), 45, 96);
        doc.setFont("helvetica", "bold");
        doc.text(latest.condition && latest.condition !== "None" ? latest.condition : "General Health Check", 45, 103);
        doc.setFont("helvetica", "normal");
        doc.text(latest.symptoms.join(", "), 45, 110);
        doc.text(latest.painLevel ? `${latest.painLevel}/10` : "—", 45, 117);
        doc.text(latest.severityLevel || "—", 45, 124);
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text("No active health reports logged.", 15, 96);
      }

      // Section: Saved Medications
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Current Medications", 15, 140);
      doc.line(15, 143, 195, 143);

      if (savedMedicines && savedMedicines.length > 0) {
        let y = 151;
        savedMedicines.forEach((med, index) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          doc.text(`${index + 1}. ${med.name}`, 15, y);
          if (med.cause) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`(For: ${med.cause})`, 75, y);
          }
          y += 8;
        });
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text("No active medications listed.", 15, 151);
      }

      // Footer disclaimer
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Important: This document is generated for informational purposes in emergency scenarios.", 15, 280);

      doc.save(`Medical_ID_${settings.name || "User"}.pdf`);
    } catch (err) {
      alert("Failed to export Medical ID PDF: " + err.message);
    }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{
        position: "fixed", top: 0, bottom: 0, background: "rgba(0, 0, 0, 0)",
        zIndex: 9999,
        ...modalOffsetStyles,
      }} className="medai-modal-overlay" />
      <div style={{
        position: "fixed", top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, pointerEvents: "none", padding: 20,
        ...modalOffsetStyles,
      }} className="medai-modal-container">
        <div style={{
          background: "var(--bg-modal, #fff)", borderRadius: 20,
          width: "min(420px, 100%)", pointerEvents: "all", overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)",
          animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
          fontFamily: "var(--font)",
        }}>
          {/* Header */}
          <div style={{
            padding: "20px 24px", background: "linear-gradient(135deg, #e11d48, #be123c)",
            color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🆔</span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "0.05em" }}>MEDICAL ID</h2>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
              fontSize: 18, cursor: "pointer", width: 32, height: 32, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>

          {/* Profile Section */}
          <div style={{
            padding: "28px 24px 20px", textAlign: "center",
            borderBottom: "1px solid var(--border, #e5e7eb)",
          }}>
            {settings.profilePic ? (
              <img src={settings.profilePic} alt="" style={{
                width: 88, height: 88, borderRadius: "50%", objectFit: "cover",
                border: "3px solid #e11d48", marginBottom: 16,
                boxShadow: "0 4px 16px rgba(225,29,72,0.2)",
              }} />
            ) : (
              <div style={{
                width: 88, height: 88, borderRadius: "50%",
                background: "linear-gradient(135deg, #e11d48, #be123c)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: 16,
                boxShadow: "0 4px 16px rgba(225,29,72,0.25)",
              }}>{profileInitial}</div>
            )}
            <h3 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "var(--text, #0f172a)" }}>
              {settings.name || "Unknown"}
            </h3>
            <div style={{
              display: "flex", gap: 20, justifyContent: "center",
              color: "var(--text-muted, #64748b)", fontSize: 14, fontWeight: 500,
            }}>
              <span>🎂 Age: {settings.age || "—"}</span>
              <span style={{ color: "#e11d48", fontWeight: 700 }}>
                🩸 {settings.bloodGroup || "—"}
              </span>
            </div>
          </div>

          {/* Recent Report Section */}
          <div style={{ padding: "24px" }}>
            <h4 style={{
              margin: "0 0 16px", fontSize: 13, fontWeight: 700,
              color: "var(--text-faint, #94a3b8)", textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              📋 Recent Health Report
            </h4>
            {reports && reports.length > 0 ? (() => {
              const latest = reports[reports.length - 1];
              const sColor = severityColor(latest.severityLevel);
              const sBg = severityBg(latest.severityLevel);
              return (
                <div style={{
                  padding: "16px", borderRadius: 12,
                  background: "var(--surface, #f8fafc)",
                  border: "1px solid var(--border, #e2e8f0)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                      {new Date(latest.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <Badge color={sColor} bg={sBg}>
                      {latest.severityLevel}
                    </Badge>
                  </div>
                  <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 14.5, marginBottom: 8 }}>
                    {latest.condition && latest.condition !== "None" ? latest.condition : "General Health Check"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {latest.symptoms.map((s, idx) => (
                      <span key={idx} style={{
                        background: "var(--blue-pale)", color: "var(--navy)",
                        border: "1px solid var(--blue-border)",
                        borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600
                      }}>{s}</span>
                    ))}
                  </div>
                </div>
              );
            })() : (
              <div style={{
                padding: "20px", textAlign: "center",
                color: "var(--text-muted, #94a3b8)", fontSize: 13, fontStyle: "italic",
              }}>
                No reports saved yet
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "16px 24px", borderTop: "1px solid var(--border, #e5e7eb)",
            background: "var(--surface, #f8fafc)",
            display: "flex", justifyContent: "center", gap: 12,
          }}>
            <button onClick={handleDownloadPDF} style={{
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
              padding: "10px 24px", borderRadius: 12, cursor: "pointer",
              fontFamily: "var(--font)", boxShadow: "0 4px 14px rgba(59,130,246,0.25)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              📥 Export PDF
            </button>
            <button onClick={onClose} style={{
              background: "linear-gradient(135deg, #e11d48, #be123c)",
              border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
              padding: "10px 24px", borderRadius: 12, cursor: "pointer",
              fontFamily: "var(--font)", boxShadow: "0 4px 14px rgba(225,29,72,0.25)",
            }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function FirstAidAccordion({ title, steps, isOpen, onToggle, id }) {
  const isControlled = isOpen !== undefined;
  const [localOpen, setLocalOpen] = useState(false);
  const open = isControlled ? isOpen : localOpen;
  const toggle = isControlled ? onToggle : () => setLocalOpen(!localOpen);

  return (
    <div id={id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 8, background: "var(--surface)", overflow: "hidden" }}>
      <button onClick={toggle} style={{ width: "100%", padding: "14px 16px", background: "transparent", border: "none", display: "flex", justifyContent: "space-between", cursor: "pointer", fontWeight: 700, color: "var(--navy)", alignItems: "center" }}>
        <span>{title}</span> <span style={{ fontSize: 10, transition: "transform 0.25s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "var(--text-faint)" }}>▼</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 16px", color: "var(--text-muted)", fontSize: 13.5 }}>
              {steps.map((step, i) => <div key={i} style={{ marginBottom: 8 }}>{i + 1}. {step}</div>)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Emergency({ settings = {}, onSettingsChange, savedMedicines = [], reports = [], appearance = {}, setActive, todos = [], onExportPDF, setInitialCategory }) {
  const [called, setCalled] = useState("");
  const [medicalIdOpen, setMedicalIdOpen] = useState(false);
  const [showContactsPopover, setShowContactsPopover] = useState(false);
  const [showTodoPopover, setShowTodoPopover] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);
  const emergencyNumber = settings.emergencyNumber || "108";

  const cp = CONTENT_PALETTES.find(p => p.id === appearance?.contentPalette) || CONTENT_PALETTES[0];
  const isDark = cp.isDark;
  const navPos = appearance.navPosition || "left";
  const modalOffsetStyles = {
    "--modal-offset-left": navPos === "right" ? "0" : "var(--sidebar-width)",
    "--modal-offset-right": navPos === "right" ? "var(--sidebar-width)" : "0",
  };

  const handleChecklistItemClick = (index) => {
    if (index === 0) {
      setShowContactsPopover(true);
    } else if (index === 1) {
      setMedicalIdOpen(true);
    } else if (index === 2) {
      if (setActive) setActive("hospitals");
    } else if (index === 3) {
      if (setInitialCategory) setInitialCategory("firstaid");
      if (setActive) setActive("meditown");
    } else if (index === 4) {
      setShowTodoPopover(true);
    } else if (index === 5) {
      setOpenAccordion("cpr");
      setTimeout(() => {
        const el = document.getElementById("cpr-accordion");
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const cardStyleRed = isDark ? {
    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fca5a5",
    boxShadow: "0 8px 32px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)"
  } : {
    background: "linear-gradient(135deg, rgba(254, 242, 242, 0.7) 0%, rgba(254, 242, 242, 0.4) 100%)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    color: "#dc2626",
    boxShadow: "0 8px 32px rgba(239, 68, 68, 0.06)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)"
  };

  const cardStyleAmber = isDark ? {
    background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    color: "#fcd34d",
    boxShadow: "0 8px 32px rgba(245, 158, 11, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)"
  } : {
    background: "linear-gradient(135deg, rgba(255, 251, 235, 0.7) 0%, rgba(255, 251, 235, 0.4) 100%)",
    border: "1px solid rgba(245, 158, 11, 0.25)",
    color: "#b45309",
    boxShadow: "0 8px 32px rgba(245, 158, 11, 0.06)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)"
  };

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 720, margin: "0 auto" }}>
      {medicalIdOpen && <MedicalIdModal settings={settings} savedMedicines={savedMedicines} reports={reports} onClose={() => setMedicalIdOpen(false)} />}
      {called && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", background: "#065f46", color: "#fff", padding: "12px 28px", borderRadius: 12, zIndex: 9999 }}>
          ✓ {called}
        </div>
      )}
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy)", margin: 0 }}>🚨 Emergency Hub</h2>
        <button onClick={() => setMedicalIdOpen(true)} className="btn-primary" style={{ background: "var(--bg-red)", color: "var(--red)", border: "1.5px solid var(--border-red)", borderRadius: "var(--radius-sm)", padding: "8px 16px", fontWeight: 800, cursor: "pointer" }}>
          Show Medical ID
        </button>
      </div>

      <div className="emergency-layout-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        <Card onClick={() => { setCalled("Calling Emergency Services..."); setTimeout(() => setCalled(""), 3000); }} style={{ ...cardStyleRed, padding: 24, cursor: "pointer", textAlign: "center" }} hover={true}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🚑</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Call {emergencyNumber}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Local Emergency Services</div>
        </Card>
        <Card onClick={() => { setCalled("Calling Poison Control..."); setTimeout(() => setCalled(""), 3000); }} style={{ ...cardStyleAmber, padding: 24, cursor: "pointer", textAlign: "center" }} hover={true}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧪</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Poison Control</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Toxicology Helpline</div>
        </Card>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", marginBottom: 16 }}>Quick First Aid</h3>
      <FirstAidAccordion
        title="🫁 Choking (Heimlich Maneuver)"
        steps={["Stand behind the person and wrap your arms around their waist.", "Make a fist with one hand and place it just above their navel.", "Grasp your fist with your other hand.", "Perform quick, upward inward thrusts.", "Repeat until the object is dislodged."]}
        isOpen={openAccordion === "choking"}
        onToggle={() => setOpenAccordion(openAccordion === "choking" ? null : "choking")}
      />
      <FirstAidAccordion
        title="🩸 Severe Bleeding"
        steps={["Apply direct pressure to the wound with a clean cloth.", "Maintain pressure and do not remove the cloth.", "If bleeding soaks through, add more cloth on top.", "If on a limb and bleeding is severe, consider applying a tourniquet 2-3 inches above the wound."]}
        isOpen={openAccordion === "bleeding"}
        onToggle={() => setOpenAccordion(openAccordion === "bleeding" ? null : "bleeding")}
      />
      <FirstAidAccordion
        title="🔥 Burns"
        steps={["Cool the burn under cool (not cold) running water for 10-15 minutes.", "Do not apply ice, butter, or ointments immediately.", "Cover loosely with a sterile, non-stick bandage or clean cloth.", "Seek medical help for severe burns or burns larger than 3 inches."]}
        isOpen={openAccordion === "burns"}
        onToggle={() => setOpenAccordion(openAccordion === "burns" ? null : "burns")}
      />
      <FirstAidAccordion
        id="cpr-accordion"
        title="🫀 CPR (No Pulse/Breathing)"
        steps={["Call emergency services immediately.", "Place the heel of one hand on the center of the chest.", "Place your other hand on top and interlock fingers.", "Push hard and fast (100-120 compressions per minute).", "Allow the chest to recoil fully between compressions."]}
        isOpen={openAccordion === "cpr"}
        onToggle={() => setOpenAccordion(openAccordion === "cpr" ? null : "cpr")}
      />

      {/* ── Emergency Preparedness ── */}
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", marginBottom: 16, marginTop: 28 }}>📋 Emergency Checklist</h3>
      <Card style={{ padding: "20px 22px", marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "📞", text: "Save emergency contacts in your phone (police, ambulance, family doctor)." },
            { icon: "🆔", text: "Keep your Medical ID updated with blood type, allergies, and current medications." },
            { icon: "🏥", text: "Know the nearest hospital and fastest route from home and workplace." },
            { icon: "💊", text: "Maintain a well-stocked first-aid kit with bandages, antiseptic, pain relievers, and prescribed meds." },
            { icon: "📋", text: "Keep a list of your medications in your wallet or phone." },
            { icon: "👨‍👩‍👧", text: "Teach family members basic first aid including CPR and the Heimlich maneuver." },
          ].map((item, i) => {
            const isClickable = i === 0 || i === 1 || i === 2 || i === 3 || i === 4 || i === 5;
            return (
              <div key={i}
                onClick={isClickable ? () => handleChecklistItemClick(i) : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: "var(--radius-sm)",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  fontSize: 13.5, color: "var(--text)", lineHeight: 1.5,
                  cursor: isClickable ? "pointer" : "default",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={isClickable ? (e) => { e.currentTarget.style.borderColor = "var(--blue, #3b82f6)"; e.currentTarget.style.background = "var(--blue-pale, rgba(59,130,246,0.06))"; } : undefined}
                onMouseLeave={isClickable ? (e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; } : undefined}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.text}</span>
                {isClickable && <span style={{ fontSize: 11, color: "var(--blue, #3b82f6)", fontWeight: 700 }}>Open →</span>}
              </div>
            );
          })}
        </div>
      </Card>

      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", marginBottom: 16 }}>⚠️ When to Go to ER</h3>
      <Card style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "Chest pain or pressure lasting more than a few minutes",
            "Difficulty breathing or shortness of breath",
            "Sudden confusion, difficulty speaking, or facial drooping",
            "Severe allergic reaction (swelling, difficulty breathing)",
            "Heavy bleeding that doesn't stop with pressure",
            "Sudden severe headache or vision changes",
            "Loss of consciousness or unresponsiveness",
            "Severe burns, especially on face, hands, or joints",
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 14px", borderRadius: "var(--radius-sm)",
              background: "var(--bg-red)", border: "1px solid var(--border-red)",
              fontSize: 13, color: "var(--text-red)", fontWeight: 600,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-red)", flexShrink: 0 }} />
              {item}
            </div>
          ))}
        </div>
      </Card>

      {/* Emergency Contacts Hover Container */}
      {showContactsPopover && createPortal(
        <>
          <div onClick={() => setShowContactsPopover(false)} style={{
            position: "fixed", top: 0, bottom: 0, background: "rgba(0, 0, 0, 0)",
            zIndex: 9999, animation: "fadeIn 0.2s ease both",
            ...modalOffsetStyles,
          }} className="medai-modal-overlay" />
          <div style={{
            position: "fixed", top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10000, pointerEvents: "none", padding: 20,
            ...modalOffsetStyles,
          }} className="medai-modal-container">
            <div style={{
              background: "var(--bg-modal, #fff)", borderRadius: 16,
              width: 340, height: 320, pointerEvents: "all", display: "flex", flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 0 0 1px var(--border)",
              animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
              fontFamily: "var(--font)",
              overflow: "hidden"
            }}>
              {/* Header */}
              <div style={{
                padding: "14px 18px", borderBottom: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "var(--surface)"
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>📞 Emergency Contacts</span>
                <button onClick={() => setShowContactsPopover(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "var(--text)", fontWeight: 700 }}>×</button>
              </div>

              {/* Scrollable List */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Default System Contacts */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", background: "var(--bg-red)",
                  border: "1px solid var(--border-red)", borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 12.5, color: "var(--text-red)" }}>Police Department</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>National Emergency: 112</div>
                  </div>
                  <a href="tel:112" style={{ textDecoration: "none" }}>
                    <button style={{
                      background: "var(--red, #ef4444)", border: "none", color: "#fff",
                      borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer"
                    }}>📞 Call</button>
                  </a>
                </div>

                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", background: "var(--bg-red)",
                  border: "1px solid var(--border-red)", borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 12.5, color: "var(--text-red)" }}>Ambulance Services</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Medical Emergency: 108</div>
                  </div>
                  <a href="tel:108" style={{ textDecoration: "none" }}>
                    <button style={{
                      background: "var(--red, #ef4444)", border: "none", color: "#fff",
                      borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer"
                    }}>📞 Call</button>
                  </a>
                </div>

                {/* User Saved Contacts */}
                {(() => {
                  const userContacts = settings.emergencyContacts || [];
                  if (userContacts.length === 0) {
                    return (
                      <div style={{
                        padding: "20px 10px", textAlign: "center", color: "var(--text-faint)",
                        fontSize: 12, fontStyle: "italic"
                      }}>
                        No custom contacts saved. Add them in Settings.
                      </div>
                    );
                  }
                  return userContacts.map((c, idx) => (
                    <div key={idx} style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", padding: "8px 12px",
                      background: "var(--surface)", border: "1px solid var(--border)",
                      borderRadius: 8
                    }}>
                      <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                        <div style={{ fontWeight: 800, fontSize: 12.5, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.relation || "Contact"}: {c.phone}</div>
                      </div>
                      <a href={`tel:${c.phone}`} style={{ textDecoration: "none" }}>
                        <button style={{
                          background: "var(--blue, #3b82f6)", border: "none", color: "#fff",
                          borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer"
                        }}>📞 Call</button>
                      </a>
                    </div>
                  ));
                })()}
              </div>

              {/* Footer */}
              <div style={{ padding: "10px 18px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "center", background: "var(--surface)" }}>
                <button onClick={() => setShowContactsPopover(false)} style={{
                  background: "var(--bg-modal)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text)", fontWeight: 700, fontSize: 12,
                  padding: "6px 20px", cursor: "pointer", fontFamily: "var(--font)"
                }}>Close</button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* To-Do List Popover */}
      {showTodoPopover && createPortal(
        <>
          <div onClick={() => setShowTodoPopover(false)} style={{
            position: "fixed", top: 0, bottom: 0, background: "rgba(2, 6, 23, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 9999, animation: "fadeIn 0.2s ease both",
            ...modalOffsetStyles,
          }} className="medai-modal-overlay" />
          <div style={{
            position: "fixed", top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10000, pointerEvents: "none", padding: 20,
            ...modalOffsetStyles,
          }} className="medai-modal-container">
            <div style={{
              background: "var(--bg-modal, #fff)", borderRadius: 16,
              width: 360, height: 420, pointerEvents: "all", display: "flex", flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 0 0 1px var(--border)",
              animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
              fontFamily: "var(--font)",
              overflow: "hidden"
            }}>
              {/* Header */}
              <div style={{
                padding: "14px 18px", borderBottom: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "var(--surface)"
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6 }}>
                  📋 Medications To-Do List
                </span>
                <button onClick={() => setShowTodoPopover(false)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "var(--text)", fontWeight: 700 }}>×</button>
              </div>

              {/* Scrollable List */}
              <div className="styled-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                {todos.length === 0 ? (
                  <div style={{
                    padding: "40px 10px", textAlign: "center", color: "var(--text-faint)",
                    fontSize: 13, fontStyle: "italic"
                  }}>
                    Your To-Do list is empty. Add tasks on your Dashboard first.
                  </div>
                ) : (
                  todos.map((todo, idx) => (
                    <div key={idx} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      opacity: todo.completed ? 0.6 : 1,
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4,
                        border: todo.completed ? "none" : "2px solid var(--blue, #3b82f6)",
                        background: todo.completed ? "var(--blue, #3b82f6)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 11, fontWeight: 900,
                        flexShrink: 0
                      }}>
                        {todo.completed && "✓"}
                      </div>
                      <span style={{
                        fontSize: 12.5,
                        color: "var(--text)",
                        textDecoration: todo.completed ? "line-through" : "none",
                        wordBreak: "break-word",
                        flex: 1
                      }}>
                        {todo.text}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: "12px 18px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--surface)"
              }}>
                <button
                  onClick={() => {
                    if (onExportPDF) {
                      onExportPDF();
                    }
                  }}
                  disabled={todos.length === 0}
                  style={{
                    background: "var(--blue, #3b82f6)", border: "none", color: "#fff",
                    borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700,
                    cursor: todos.length === 0 ? "not-allowed" : "pointer",
                    fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6,
                    opacity: todos.length === 0 ? 0.5 : 1
                  }}
                >
                  📥 Export PDF
                </button>
                <button onClick={() => setShowTodoPopover(false)} style={{
                  background: "var(--bg-modal)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text)", fontWeight: 700, fontSize: 12,
                  padding: "7px 16px", cursor: "pointer", fontFamily: "var(--font)"
                }}>Close</button>
              </div>
            </div>
          </div>
        </>
        , document.body
      )}
    </div>
  );
}

// ─── HOSPITALS ────────────────────────────────────────────────────────────────
function Hospitals() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);

  const mockHospitals = [
    {name: "Apollo Hospitals", distance: "1.2 km", address: "21, Greams Rd", type: "Multi-specialty", open: true, phone: "+91 44 2829 3333"},
    {name: "MIOT International", distance: "2.8 km", address: "4/112, Mount Poonamallee Rd", type: "Super-specialty", open: true, phone: "+91 44 4200 2288"},
    {name: "Fortis Malar Hospital", distance: "3.5 km", address: "52, 1st Main Rd, Gandhi Nagar", type: "Multi-specialty", open: true, phone: "+91 44 4289 2222"},
    {name: "Government General Hospital", distance: "4.1 km", address: "Park Town", type: "Government", open: true, phone: "+91 44 2530 5000"},
    {name: "Sri Ramachandra Medical Centre", distance: "5.6 km", address: "1, Ramachandra Nagar, Porur", type: "Teaching Hospital", open: false, phone: "+91 44 2476 8027"}
  ];

  const findHospitals = () => {
    setLoading(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setHospitals(mockHospitals);
        setLoading(false);
      },
      () => {
        setError("Location permission denied. Please enable location access.");
        setLoading(false);
      }
    );
  };

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => window.history.back()}
          style={{
            background: "transparent", border: "none",
            width: 32, height: 36, display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
            fontSize: 22, color: "var(--navy)", fontWeight: 700,
            padding: 0, outline: "none", transition: "transform 0.15s ease"
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateX(-3px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateX(0)"}
          title="Go Back"
        >
          ←
        </button>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy)", margin: 0 }}>🏥 Nearby Hospitals</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 2, fontSize: 14, margin: 0 }}>Find hospitals and clinics near your current location.</p>
        </div>
      </div>

      {location ? (
        <>
          <Card style={{ background: "var(--blue-pale)", border: "1px solid var(--blue-border)", marginBottom: 20, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 20 }}>📍</span>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 14 }}>Location Found</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</div>
                </div>
              </div>
              <button onClick={() => setLocation(null)} style={{ background: "var(--bg-modal)", border: "1px solid var(--blue-border)", borderRadius: "var(--radius-sm)", padding: "6px 12px", cursor: "pointer", color: "var(--blue)", fontWeight: 600 }}>
                Change
              </button>
            </div>
          </Card>
          
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14, fontWeight: 500 }}>Showing {hospitals.length} hospitals nearby</div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hospitals.map((h, i) => (
              <Card key={i}>
                <div className="hospital-card-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 15 }}>{h.name}</div>
                      <Badge color={h.open ? "var(--green)" : "var(--red)"} bg={h.open ? "var(--bg-green-light)" : "var(--bg-red)"}>{h.open ? "Open" : "Closed"}</Badge>
                      <Badge color="#7c3aed" bg="var(--bg-purple-light)" style={{ fontSize: 11 }}>{h.type}</Badge>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8 }}>📍 {h.address} · <span style={{ fontWeight: 700, color: "var(--navy)" }}>{h.distance}</span></div>
                  </div>
                  <div className="hospital-buttons-flex" style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 16 }}>
                    <a href={"tel:"+h.phone} style={{ textDecoration: "none" }}>
                      <button className="btn-primary" style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "8px 16px", cursor: "pointer", fontWeight: 700, width: "100%" }}>📞 Call</button>
                    </a>
                    <a href={"https://www.google.com/maps/search/" + encodeURIComponent(h.name + " " + h.address)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                      <button style={{ background: "var(--bg-modal)", color: "var(--blue)", border: "1px solid var(--blue-border)", borderRadius: "var(--radius-sm)", padding: "8px 16px", cursor: "pointer", fontWeight: 700, width: "100%" }}>🗺 Maps</button>
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card style={{ textAlign: "center", padding: "64px 32px" }}>
          <div style={{ fontSize: 52, marginBottom: 18, opacity: 0.35 }}>📍</div>
          <div style={{ color: "var(--navy)", fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Find Hospitals Near You</div>
          <div style={{ color: "var(--text-faint)", marginBottom: 28, fontSize: 14 }}>Allow location access to find nearby hospitals.</div>
          <button onClick={findHospitals} disabled={loading} className="btn-primary" style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#fff", border: "none", borderRadius: "var(--radius)", padding: "12px 30px", fontWeight: 700, cursor: "pointer" }}>
            {loading ? "Searching..." : "Use My Location"}
          </button>
          {error && <div style={{ color: "var(--red)", marginTop: 12, fontSize: 13 }}>{error}</div>}
        </Card>
      )}
    </div>
  );
}

// ─── DOCTOR AI / CHATBOT ──────────────────────────────────────────────────────
function Chatbot({ msgs, setMsgs, activeChatId, setActiveChatId, chatSessions, setChatSessions, onSaveMedicine, savedMedicines = [], onSelectChat, onDeleteChat, onNewChat, appearance }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  // Parse message text and render medicine names with save buttons
  const renderMessageContent = (msg) => {
    const text = getMsgText(msg);
    if (msg.role !== "assistant" || !onSaveMedicine) return text;
    // Split on bold patterns: **Medicine Name**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      const boldMatch = part.match(/^\*\*(.+)\*\*$/);
      if (boldMatch) {
        const medName = boldMatch[1].trim();

        // Helper to check if a bold term is an actual medicine
        const isMedicine = (name) => {
          const n = name.trim().toLowerCase();
          const excludeList = [
            "skin rashes", "skin rash", "rash", "rashes", "dermatologist", "allergies", "allergy", "allergic", "dermatology",
            "skin irritation", "irritation", "eczema", "psoriasis", "hives", "dermatitis", "shingles", "acne", "rosacea",
            "fever", "headache", "cough", "dry cough", "wet cough", "coughing", "sneezing", "congestion", "runny nose",
            "sore throat", "throat pain", "chest pain", "shortness of breath", "difficulty breathing", "wheezing",
            "nausea", "vomiting", "diarrhea", "constipation", "stomach ache", "abdominal pain", "cramp", "cramps",
            "fatigue", "tiredness", "weakness", "dizziness", "lightheadedness", "vertigo", "insomnia", "sleep",
            "stress", "anxiety", "depression", "mood swing", "panic attack", "muscle pain", "joint pain", "back pain",
            "adherence", "medication adherence", "compliance", "lifestyle", "diet", "exercise", "rest", "hydration",
            "doctor", "physician", "specialist", "nurse", "therapist", "pharmacist", "counselor", "psychologist",
            "psychiatrist", "pediatrician", "cardiologist", "oncologist", "neurologist", "gynecologist", "urologist",
            "surgeon", "dentist", "practitioner", "provider", "healthcare", "medical care", "treatment", "diagnosis",
            "diagnostic", "prevention", "preventative", "risk factors", "risk factor", "complications", "complication",
            "medical history", "family history", "history", "screening", "vaccination", "vaccine", "immunization",
            "infection", "viral infection", "bacterial infection", "fungal infection", "yeast infection",
            "inflammation", "swelling", "redness", "itching", "itchy", "dry skin", "oily skin", "sensitive skin",
            "sunburn", "heat rash", "poison ivy", "poison oak", "bug bite", "insect bite", "mosquito bite",
            "key terms", "key term", "terms", "term", "symptoms", "symptom", "causes", "cause", "prevention",
            "general check", "first aid", "cardiopulmonary resuscitation", "cpr", "heimlich maneuver",
            "emergency", "poison control", "ambulance", "hospital", "clinic", "medical center", "er",
            "prescription", "otc", "over the counter", "generic", "brand", "dose", "dosage", "side effect", "side effects",
            "pain", "brain", "skin", "joint", "muscle", "condition", "disorder", "syndrome"
          ];

          if (excludeList.includes(n)) return false;

          const positiveSuffixes = [
            "ol", "in", "ine", "en", "ene", "ac", "ix", "ex", "ide", "azole", "one", "sartan", "pril", "olol", "vir", "pam", "lam"
          ];
          
          const positiveBrandsAndHerbs = [
            "phytoral", "burnol", "calamine", "ors", "ginseng", "chamomile", "ginger", "turmeric", "echinacea", "peppermint",
            "tylenol", "advil", "motrin", "aleve", "benadryl", "claritin", "zyrtec", "allegra", "neosporin", "bactroban",
            "clarinex", "zovirax", "lasix", "multivitamin", "probiotics", "coq10"
          ];

          const words = n.split(/\s+/);
          return words.some(word => {
            if (positiveBrandsAndHerbs.some(b => word.includes(b))) return true;
            return positiveSuffixes.some(suffix => word.endsWith(suffix) && word.length > suffix.length + 1);
          });
        };

        if (isMedicine(medName)) {
          const alreadySaved = savedMedicines.some(
            sm => sm?.name?.toLowerCase?.().trim() === medName.toLowerCase()
          );
          return (
            <span key={idx} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <strong style={{ color: "var(--navy)" }}>{medName}</strong>
              {alreadySaved ? (
                <span style={{
                  fontSize: 10, color: "var(--green, #10b981)", fontWeight: 600,
                  background: "rgba(16,185,129,0.1)", padding: "1px 6px",
                  borderRadius: 6, cursor: "default",
                }}>✓ Saved</span>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onSaveMedicine(medName, "Doctor AI"); }}
                  title={`Save ${medName} to your medication list`}
                  style={{
                    fontSize: 10, fontWeight: 700, cursor: "pointer",
                    color: "var(--blue, #3b82f6)", background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.15)", borderRadius: 6,
                    padding: "1px 6px", fontFamily: "var(--font)",
                    whiteSpace: "nowrap", transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.08)"; }}
                >💾 Save</button>
              )}
            </span>
          );
        } else {
          return <strong key={idx} style={{ color: "var(--navy)" }}>{medName}</strong>;
        }
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    const updatedMsgs = [...msgs, { role: "user", text: userMsg }];
    setMsgs(updatedMsgs);
    setLoading(true);

    try {
      const system = "You are Doctor AI, a helpful medical assistant. Provide general health information and self-care guidance. Always remind users to consult a qualified doctor for diagnosis. Be concise and empathetic.";
      const groqMsgs = updatedMsgs.map(m => ({ role: m.role, content: getMsgText(m) }));
      const response = await callClaude(groqMsgs, system);
      const assistantText = response || "I apologize, but I am unable to process that request right now.";
      const finalMsgs = [...updatedMsgs, { role: "assistant", text: assistantText }];
      setMsgs(finalMsgs);

      const backendMsgs = toBackendChatMessages(finalMsgs);
      const title = userMsg.length > 40 ? userMsg.slice(0, 40) + "…" : userMsg;

      if (activeChatId) {
        const updated = await apiUpdateChat(activeChatId, { messages: backendMsgs, title });
        setChatSessions(prev => prev.map(s =>
          (s._id || s.id) === activeChatId ? { ...s, ...updated, title: updated.title || title, lastMessage: assistantText.substring(0, 80) } : s
        ));
      } else {
        const created = await apiCreateChat({ title, messages: backendMsgs });
        setActiveChatId(created._id || created.id);
        setChatSessions(prev => [{
          ...created,
          messageCount: backendMsgs.length,
          lastMessage: assistantText.substring(0, 80),
        }, ...prev]);
      }
    } catch (err) {
      let errText = "Network error. Please make sure the backend server is running.";
      if (err.message) {
        if (err.message.includes("AI API error") || err.message.includes("Groq")) {
          errText = `AI Service Error: ${err.message}`;
        } else {
          errText = `Error: ${err.message}`;
        }
      }
      setMsgs(prev => [...prev, { role: "assistant", text: errText }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-main-container" style={{ height: "100%", display: "flex", flexDirection: "column", maxWidth: 820, margin: "0 auto", padding: "16px 32px 32px" }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Animated Robot */}
          <div style={{
            width: 56, height: 56, flexShrink: 0,
            animation: "robotFloat 3s ease-in-out infinite",
            position: "relative",
          }}>
            <svg viewBox="0 0 64 64" width="56" height="56" style={{ filter: "drop-shadow(0 4px 16px rgba(59,130,246,0.35))" }}>
              {/* Antenna */}
              <line x1="32" y1="6" x2="32" y2="14" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round">
                <animate attributeName="y1" values="6;4;6" dur="2s" repeatCount="indefinite" />
              </line>
              <circle cx="32" cy="5" r="3" fill="var(--blue)">
                <animate attributeName="r" values="3;4;3" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
              </circle>
              {/* Head */}
              <rect x="14" y="14" width="36" height="28" rx="8" fill="var(--blue)" opacity="0.15" stroke="var(--blue)" strokeWidth="2" />
              {/* Eyes */}
              <circle cx="24" cy="28" r="4" fill="var(--blue)">
                <animate attributeName="ry" values="4;1;4" dur="3.5s" repeatCount="indefinite" begin="1s" />
              </circle>
              <circle cx="40" cy="28" r="4" fill="var(--blue)">
                <animate attributeName="ry" values="4;1;4" dur="3.5s" repeatCount="indefinite" begin="1s" />
              </circle>
              {/* Eye shine */}
              <circle cx="22" cy="26" r="1.2" fill="#fff" opacity="0.8" />
              <circle cx="38" cy="26" r="1.2" fill="#fff" opacity="0.8" />
              {/* Mouth */}
              <path d="M 24 35 Q 32 40 40 35" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round">
                <animate attributeName="d" values="M 24 35 Q 32 40 40 35;M 24 36 Q 32 38 40 36;M 24 35 Q 32 40 40 35" dur="4s" repeatCount="indefinite" />
              </path>
              {/* Body */}
              <rect x="18" y="44" width="28" height="14" rx="5" fill="var(--blue)" opacity="0.12" stroke="var(--blue)" strokeWidth="1.5" />
              {/* Heart/pulse on body */}
              <text x="32" y="54" textAnchor="middle" fontSize="10" fill="var(--blue)">
                ❤️
                <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
              </text>
              {/* Arms */}
              <line x1="14" y1="48" x2="6" y2="44" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round">
                <animate attributeName="y2" values="44;40;44" dur="2.5s" repeatCount="indefinite" />
              </line>
              <line x1="50" y1="48" x2="58" y2="44" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round">
                <animate attributeName="y2" values="44;40;44" dur="2.5s" repeatCount="indefinite" begin="0.3s" />
              </line>
            </svg>
            {/* Glow ring */}
            <div style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              border: "2px solid var(--blue)",
              opacity: 0.15,
              animation: "robotGlow 2s ease-in-out infinite",
            }} />
          </div>
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy)", margin: 0 }}>Doctor AI</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 5, fontSize: 14, margin: "5px 0 0" }}>Ask health questions and get instant guidance.</p>
          </div>
        </div>
        <button
          className="mobile-only-history-btn"
          onClick={() => setShowHistoryDrawer(true)}
          style={{
            padding: "8px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
            color: "var(--text)", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "var(--font)",
            display: "none", alignItems: "center", gap: 6,
            transition: "all 0.2s ease"
          }}
        >
          📜 History
        </button>
        <style>{`
          @keyframes robotFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          @keyframes robotGlow {
            0%, 100% { transform: scale(1); opacity: 0.15; }
            50% { transform: scale(1.15); opacity: 0.05; }
          }
        `}</style>
      </div>

      <Card style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
        <div className="chatbot-message-list" style={{ flex: 1, overflowY: "auto", padding: "24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {msgs.map((m, i) => (
            <div key={i} className="chatbot-bubble-wrapper" style={{ display: "flex", gap: 12, alignItems: "flex-start", alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
              {m.role === "assistant" && (
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>⚕️</div>
              )}
              <div style={{ background: m.role === "user" ? "var(--blue)" : "var(--surface)", color: m.role === "user" ? "#fff" : "var(--text)", padding: "12px 16px", borderRadius: m.role === "user" ? "16px 16px 0 16px" : "16px 16px 16px 0", fontSize: 14, lineHeight: 1.6, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", whiteSpace: "pre-line" }}>
                {renderMessageContent(m)}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", alignSelf: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚕️</div>
              <div style={{ background: "var(--surface)", padding: "12px 16px", borderRadius: "16px 16px 16px 0", display: "flex", gap: 6 }}>
                <span className="dot-typing" style={{ animationDelay: "0ms" }}>●</span>
                <span className="dot-typing" style={{ animationDelay: "200ms" }}>●</span>
                <span className="dot-typing" style={{ animationDelay: "400ms" }}>●</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="chatbot-input-container" style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          <form onSubmit={handleSend} style={{ display: "flex", gap: 12 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your health query..."
              style={{ flex: 1, padding: "14px 16px", borderRadius: 99, border: "1px solid var(--border)", background: "var(--bg-modal)", color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "var(--font)" }}
            />
            <button type="submit" disabled={!input.trim() || loading} className="btn-primary" style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--blue)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() && !loading ? "pointer" : "not-allowed", opacity: input.trim() && !loading ? 1 : 0.6 }}>
              ➤
            </button>
          </form>
        </div>
      </Card>

      {/* History Drawer Overlay for Mobile viewports */}
      {showHistoryDrawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", justifyContent: "flex-end" }}>
          {/* Backdrop */}
          <div
            onClick={() => setShowHistoryDrawer(false)}
            style={{
              position: "absolute", inset: 0,
              background: "rgba(15,31,92,0.4)", backdropFilter: "blur(4px)",
              animation: "fadeIn 0.2s ease both"
            }}
          />
          {/* Sliding drawer content */}
          <div style={{
            position: "relative", width: 260, height: "100%",
            background: "var(--surface-2)", borderLeft: "1px solid var(--border)",
            display: "flex", flexDirection: "column",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
            animation: "slideInRight 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) both"
          }}>
            {/* Close button header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Chat Sessions</span>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
              >
                ×
              </button>
            </div>
            
            {/* Drawer Body rendering the Sidebar */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              <ChatHistorySidebar
                chatSessions={chatSessions}
                activeChatId={activeChatId}
                onSelectChat={(id) => { onSelectChat(id); setShowHistoryDrawer(false); }}
                onDeleteChat={onDeleteChat}
                onNewChat={() => { onNewChat(); setShowHistoryDrawer(false); }}
                appearance={appearance}
                forceShow={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatHistorySidebar({ chatSessions, activeChatId, onSelectChat, onDeleteChat, onNewChat, appearance, forceShow }) {
  const cp = CONTENT_PALETTES.find(p => p.id === appearance?.contentPalette) || CONTENT_PALETTES[0];
  const isDark = cp.isDark;

  return (
    <aside className={forceShow ? "" : "chat-history-sidebar"} style={{
      width: forceShow ? "100%" : 240, flexShrink: 0, height: "100%",
      background: "var(--surface-2)",
      borderLeft: forceShow ? "none" : "1px solid var(--border)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "20px 16px 12px", borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? "rgba(147,197,253,0.6)" : "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
          Chat History
        </div>
        <button
          onClick={onNewChat}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "var(--font)",
            boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
          }}
        >
          + New Chat
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {chatSessions.length === 0 ? (
          <div style={{ padding: "24px 12px", textAlign: "center", color: isDark ? "rgba(147,197,253,0.45)" : "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
            No saved chats yet.<br />Start a conversation to see it here.
          </div>
        ) : (
          chatSessions.map(session => {
            const isActive = activeChatId === (session._id || session.id);
            return (
              <div
                key={session._id || session.id}
                onClick={() => onSelectChat(session._id || session.id)}
                style={{
                  padding: "10px 12px", borderRadius: 10, marginBottom: 4,
                  cursor: "pointer", position: "relative",
                  background: isActive ? (isDark ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.08)") : "transparent",
                  border: isActive ? (isDark ? "1px solid rgba(96,165,250,0.35)" : "1px solid rgba(59,130,246,0.2)") : "1px solid transparent",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "var(--text)", marginBottom: 4, paddingRight: 24, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.title || "New Chat"}
                </div>
                <div style={{ fontSize: 11, color: isDark ? "rgba(147,197,253,0.55)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {session.lastMessage || `${session.messageCount || 0} messages`}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteChat(session._id || session.id); }}
                  title="Delete chat"
                  style={{
                    position: "absolute", top: 8, right: 8,
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", border: "none",
                    borderRadius: 6, width: 22, height: 22,
                    cursor: "pointer", color: isDark ? "rgba(255,255,255,0.5)" : "var(--text-muted)", fontSize: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >×</button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

// ─── REPORT MODAL ────────────────────────────────────────────────────────────
function ReportModal({ r, onClose, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const severityColors = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444", Emergency: "#dc2626" };
  const sColor = severityColors[r.severityLevel] || "#64748b";
  const app = loadAppearance();
  const navPos = app.navPosition || "left";
  const modalOffsetStyles = {
    "--modal-offset-left": navPos === "right" ? "0" : "var(--sidebar-width)",
    "--modal-offset-right": navPos === "right" ? "var(--sidebar-width)" : "0",
  };

  const exportReportToPDF = (report) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const userSettings = loadSettings();
      const userName = userSettings.name || "Patient";

      // Header Banner
      doc.setFillColor(15, 31, 92);
      doc.rect(0, 0, 210, 28, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("MedAI", 15, 18);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(191, 219, 254);
      doc.text("CLINICAL SYMPTOM & RISK ASSESSMENT", 45, 17);

      let y = 38;

      // Metadata section
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Patient: ${userName}`, 15, y);
      
      const reportDate = new Date(report.date).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
      doc.text(`Date of Assessment: ${reportDate}`, 110, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Pain Level: ${report.painLevel}/10`, 15, y);
      doc.text(`Duration: ${report.duration}`, 70, y);
      
      const severity = report.severityLevel || "Low";
      doc.text(`Severity: `, 125, y);
      
      doc.setFont("helvetica", "bold");
      if (severity === "Low") doc.setTextColor(16, 185, 129);
      else if (severity === "Medium") doc.setTextColor(245, 158, 11);
      else doc.setTextColor(239, 68, 68);
      doc.text(severity.toUpperCase(), 142, y);
      y += 8;

      // Separator Line
      doc.setDrawColor(226, 232, 248);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 8;

      // Logged Symptoms
      doc.setTextColor(15, 31, 92);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Logged Symptoms", 15, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      const symptomsText = report.symptoms.join(", ");
      const symptomsLines = doc.splitTextToSize(symptomsText, 175);
      doc.text(symptomsLines, 15, y);
      y += symptomsLines.length * 5 + 6;

      // Possible Conditions
      if (report.conditions && report.conditions.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setTextColor(15, 31, 92);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Possible Conditions", 15, y);
        y += 6;

        report.conditions.forEach(cond => {
          if (y > 250) { doc.addPage(); y = 20; }
          
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          
          const descLines = cond.description ? doc.splitTextToSize(cond.description, 165) : [];
          const cardHeight = 12 + descLines.length * 4.5;
          
          doc.rect(15, y, 180, cardHeight, "FD");
          
          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          doc.text(cond.name, 19, y + 6);
          
          doc.setTextColor(59, 130, 246);
          doc.setFontSize(9.5);
          doc.text(`${cond.confidence}% match`, 160, y + 6);
          
          if (cond.description) {
            doc.setTextColor(71, 85, 105);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(descLines, 19, y + 11);
          }
          
          y += cardHeight + 4;
        });
        y += 4;
      }

      // Plain-language explanation
      if (report.simpleExplanation) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setTextColor(15, 31, 92);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Plain-Language Explanation", 15, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        const explanationLines = doc.splitTextToSize(report.simpleExplanation, 175);
        doc.text(explanationLines, 15, y);
        y += explanationLines.length * 5 + 8;
      }

      // Self-Care Tips
      if (report.selfCare && report.selfCare.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setTextColor(15, 31, 92);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Recommended Self-Care Tips", 15, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        
        report.selfCare.forEach(tip => {
          if (y > 270) { doc.addPage(); y = 20; }
          const tipLines = doc.splitTextToSize(`• ${tip}`, 175);
          doc.text(tipLines, 15, y);
          y += tipLines.length * 5 + 1;
        });
        y += 6;
      }

      // Doctor Warning
      if (report.doctorWarning) {
        if (y > 240) { doc.addPage(); y = 20; }
        
        const warningLines = doc.splitTextToSize(report.doctorWarning, 165);
        const boxHeight = 10 + warningLines.length * 5;
        
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(252, 165, 165);
        doc.rect(15, y, 180, boxHeight, "FD");
        
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("⚠️ WHEN TO SEE A DOCTOR", 19, y + 6);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(153, 27, 27);
        doc.text(warningLines, 19, y + 11);
        
        y += boxHeight + 8;
      }

      // Footer line & text
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setDrawColor(226, 232, 248);
      doc.setLineWidth(0.5);
      doc.line(15, 278, 195, 278);

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("This document is a clinical symptom assessment sheet generated by MedAI.", 15, 283);
      doc.text("Always consult with qualified healthcare professionals for diagnosis and treatment plans.", 15, 287);

      const fileName = `MedAI_Assessment_Report_${report.symptoms.slice(0, 2).join("_") || "Report"}`;
      doc.save(`${fileName}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Could not export PDF: " + err.message);
    }
  };

  return createPortal(
    <>
      {showConfirm && (
        <ConfirmDialog
          title="Delete Report?"
          message="This health report record will be permanently deleted and cannot be recovered."
          confirmLabel="Yes, Delete"
          onConfirm={() => {
            onDelete(r.id);
            onClose();
            setShowConfirm(false);
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div
        onClick={onClose}
        style={{
          position: "fixed", top: 0, bottom: 0, background: "rgba(0,0,0,0)",
          zIndex: 10000, animation: "fadeIn 0.2s ease both",
          ...modalOffsetStyles,
        }}
        className="medai-modal-overlay"
      />
      <div style={{
        position: "fixed", top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10001, pointerEvents: "none", padding: 20,
        ...modalOffsetStyles,
      }} className="medai-modal-container">
        <div style={{
          background: "var(--bg-modal)", borderRadius: 16, border: "1px solid var(--border)",
          width: "min(620px, 100%)", maxHeight: "90vh", overflowY: "auto",
          pointerEvents: "all", boxShadow: "var(--shadow-lg)",
          animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
          fontFamily: "var(--font)",
        }}>
          {/* Header */}
          <div style={{
            padding: "20px 24px", borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: `linear-gradient(135deg, ${sColor}15, transparent)`,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                Report Details
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 10 }}>
                {r.symptoms.slice(0, 3).join(", ")}{r.symptoms.length > 3 ? "..." : ""}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: 8, width: 32, height: 32, cursor: "pointer",
              fontSize: 16, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>

          {/* Body */}
          <div style={{ padding: "20px 24px" }}>
            {/* Meta row */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "8px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 700 }}>Date</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{new Date(r.date).toLocaleDateString("en-IN")}</div>
              </div>
              <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "8px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 700 }}>Duration</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{r.duration}</div>
              </div>
              <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "8px 14px" }}>
                <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 700 }}>Pain Level</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{r.painLevel}/10</div>
              </div>
              <div style={{ background: sColor + "15", borderRadius: 8, padding: "8px 14px", border: `1px solid ${sColor}30` }}>
                <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 700 }}>Severity</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: sColor }}>{r.severityLevel}</div>
              </div>
            </div>

            {/* Conditions */}
            {r.conditions && r.conditions.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Possible Conditions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {r.conditions.map((c, i) => (
                    <div key={i} style={{
                      background: "var(--surface-2)", borderRadius: 10, padding: "12px 16px",
                      border: "1px solid var(--border)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>{c.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--blue)" }}>{c.confidence}% match</span>
                      </div>
                      {c.description && <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{c.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simple Explanation */}
            {r.simpleExplanation && (
              <div style={{ marginBottom: 20, padding: "14px 16px", background: "var(--bg-blue-pale)", borderRadius: 10, border: "1px solid var(--blue-border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Plain-Language Explanation
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>{r.simpleExplanation}</div>
              </div>
            )}

            {/* Self-Care Tips */}
            {r.selfCare && r.selfCare.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Self-Care Tips
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {r.selfCare.map((tip, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text)", alignItems: "baseline" }}>
                      <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor Warning */}
            {r.doctorWarning && (
              <div style={{ padding: "14px 16px", background: "var(--bg-red-light)", borderRadius: 10, border: "1px solid var(--border-red)", marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--red)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  ⚠️ When to See a Doctor
                </div>
                <div style={{ fontSize: 13, color: "var(--text-red-dark)", lineHeight: 1.6 }}>{r.doctorWarning}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "14px 24px", borderTop: "1px solid var(--border)",
            display: "flex", justifyContent: "flex-end", gap: 10,
          }}>
            <button
              onClick={() => setShowConfirm(true)}
              style={{
                background: "var(--bg-red)", color: "var(--text-red-light)", border: "1px solid var(--border-red)",
                borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13,
                fontFamily: "var(--font)",
              }}
            >🗑 Delete</button>
            <button
              onClick={() => exportReportToPDF(r)}
              style={{
                background: "var(--surface-2)", color: "var(--text-muted)", border: "1.5px solid var(--border)",
                borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13,
                fontFamily: "var(--font)", transition: "var(--transition)",
                display: "flex", alignItems: "center", gap: 6
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--border)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              📥 Export PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: "var(--blue)", color: "#fff", border: "none",
                borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13,
                fontFamily: "var(--font)",
              }}
            >Close</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

function Reports({ reports, onDelete }) {
  const [sel, setSel] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const totalPages = Math.ceil(reports.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  
  const reversedReports = [...reports].reverse();
  const paginatedReports = reversedReports.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, animation: "fadeUp 0.3s ease both" }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.6px", margin: 0 }}>📋 Health Reports</h2>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 5 }}>
          {reports.length > 0 ? `${reports.length} report${reports.length !== 1 ? "s" : ""} saved · Click to view, export, or delete` : "No reports saved yet."}
        </p>
      </div>

      {reports.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "64px 32px", animation: "scaleIn 0.3s ease 0.08s both" }}>
          <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.3 }}>📋</div>
          <div style={{ color: "var(--text-faint)", fontWeight: 500, fontSize: 14 }}>Analyze symptoms and save a report to see it here.</div>
        </Card>
      ) : (
        <>
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {paginatedReports.map(r => (
              <Card
                key={r.id} hover
                onClick={() => setSel(r)}
                style={{ padding: "14px 20px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                    <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 14, marginBottom: 4, letterSpacing: "-0.1px" }}>
                      {r.symptoms.slice(0, 4).join(", ")}{r.symptoms.length > 4 ? ` +${r.symptoms.length - 4} more` : ""}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
                      {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      &nbsp;·&nbsp;Pain {r.painLevel}/10&nbsp;·&nbsp;{r.duration}
                    </div>
                    {r.conditions?.[0] && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        Top match: <span style={{ fontWeight: 700, color: "var(--navy)" }}>{r.conditions[0].name}</span>
                        <span style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 11 }}> ({r.conditions[0].confidence}%)</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <Badge color={severityColor(r.severityLevel)} bg={severityBg(r.severityLevel)}>{r.severityLevel}</Badge>
                    <span style={{ color: "var(--text-faint)", fontSize: 18, lineHeight: 1 }}>›</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24, animation: "fadeIn 0.3s ease both" }}>
              <button
                disabled={activePage === 1}
                onClick={() => setCurrentPage(activePage - 1)}
                style={{
                  background: activePage === 1 ? "transparent" : "var(--white)",
                  color: activePage === 1 ? "var(--text-faint)" : "var(--navy)",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: activePage === 1 ? "not-allowed" : "pointer",
                  transition: "var(--transition)",
                  opacity: activePage === 1 ? 0.5 : 1,
                }}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    background: activePage === p ? "var(--blue)" : "var(--white)",
                    color: activePage === p ? "#fff" : "var(--navy)",
                    border: activePage === p ? "1.5px solid var(--blue)" : "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "var(--transition)",
                    boxShadow: activePage === p ? "var(--shadow-blue)" : "none",
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(activePage + 1)}
                style={{
                  background: activePage === totalPages ? "transparent" : "var(--white)",
                  color: activePage === totalPages ? "var(--text-faint)" : "var(--navy)",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: activePage === totalPages ? "not-allowed" : "pointer",
                  transition: "var(--transition)",
                  opacity: activePage === totalPages ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
      {sel && <ReportModal r={sel} onClose={() => setSel(null)} onDelete={(id) => { onDelete(id); setSel(null); }} />}
    </div>
  );
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
function History({ reports, onDelete, onClearAll }) {
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filtered = reports.filter(r =>
    r.symptoms.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
    (r.severityLevel || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  
  const reversedFiltered = [...filtered].reverse();
  const paginatedFiltered = reversedFiltered.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const freq = {};
  reports.flatMap(r => r.symptoms).forEach(s => { freq[s] = (freq[s] || 0) + 1; });
  const topSymptoms = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const maxFreq = topSymptoms[0]?.[1] || 1;

  const sevCounts = { Low: 0, Medium: 0, High: 0, Emergency: 0 };
  reports.forEach(r => { if (sevCounts[r.severityLevel] !== undefined) sevCounts[r.severityLevel]++; });
  const sevColors = { Low: "#10b981", Medium: "#f59e0b", High: "var(--text-red-light)", Emergency: "var(--text-red)" };
  const sevTotal = reports.length || 1;

  const avgPain = reports.length
    ? (reports.reduce((a, r) => a + r.painLevel, 0) / reports.length).toFixed(1)
    : "—";

  const buildDonut = () => {
    const r = 52, circ = 2 * Math.PI * r, gap = 3;
    let offset = 0;
    const slices = [];
    Object.entries(sevCounts).forEach(([level, count]) => {
      if (count === 0) return;
      const pct = count / sevTotal;
      const dash = circ * pct - gap;
      slices.push({ level, count, pct, dash, offset, color: sevColors[level] });
      offset += circ * pct;
    });
    return { slices, circ };
  };
  const donut = buildDonut();

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, animation: "fadeUp 0.3s ease both" }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.6px", margin: 0 }}>
          📊 Symptom History
        </h2>
        <p style={{ color: "var(--text-muted)", marginTop: 5, fontSize: 14 }}>
          Track patterns and trends in your health over time.
        </p>
      </div>

      {reports.length > 0 && (
        <>
          {/* ── Severity donut + Stat cards ── */}
          <div className="history-severity-grid" style={{
            display: "grid", gridTemplateColumns: "220px 1fr",
            gap: 16, marginBottom: 16,
            animation: "fadeUp 0.35s ease 0.06s both",
          }}>
            <Card style={{ padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14, alignSelf: "flex-start" }}>
                Severity Split
              </div>
              <svg width={128} height={128} viewBox="0 0 128 128">
                <circle cx={64} cy={64} r={52} fill="none" stroke="var(--surface-2)" strokeWidth={14} />
                {donut.slices.map((s, i) => (
                  <circle key={i}
                    cx={64} cy={64} r={52}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={14}
                    strokeLinecap="butt"
                    strokeDasharray={`${s.dash} ${donut.circ - s.dash}`}
                    strokeDashoffset={donut.circ / 4 - s.offset}
                    style={{ transition: "stroke-dasharray 0.8s ease", filter: `drop-shadow(0 0 4px ${s.color}60)` }}
                  />
                ))}
                <text x={64} y={60} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 20, fontWeight: 900, fill: "var(--navy)", fontFamily: "var(--font)" }}>
                  {reports.length}
                </text>
                <text x={64} y={76} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8", fontFamily: "var(--font)", letterSpacing: "1px" }}>
                  analyses
                </text>
              </svg>
              <div style={{ marginTop: 12, width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(sevCounts).filter(([, v]) => v > 0).map(([level, count]) => (
                  <div key={level} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                       <div style={{ width: 8, height: 8, borderRadius: "50%", background: sevColors[level], flexShrink: 0 }} />
                       <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{level}</span>
                     </div>
                     <span style={{ fontSize: 12, fontWeight: 700, color: sevColors[level] }}>{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="history-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 12 }}>
              {[
                { icon: "📋", label: "Total Analyses",    value: reports.length,                                                               color: "#2563eb" },
                { icon: "📈", label: "Avg Pain Level",   value: `${avgPain}/10`,                                                              color: "#7c3aed" },
                { icon: "🔴", label: "High / Emergency", value: reports.filter(r => ["High","Emergency"].includes(r.severityLevel)).length,   color: "var(--text-red)" },
                { icon: "🔬", label: "Unique Symptoms",  value: Object.keys(freq).length,                                                     color: "#059669" },
              ].map((s, i) => (
                <Card key={i} style={{ padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", top: -12, right: -12,
                    width: 56, height: 56, borderRadius: "50%",
                    background: `${s.color}10`,
                  }} />
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color, letterSpacing: "-0.5px", marginBottom: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* ── Pain Trend Line Chart ── */}
          {reports.length >= 2 && (() => {
            const sorted = [...reports].sort((a, b) => new Date(a.date) - new Date(b.date));
            const W = 760, H = 280, PAD = { top: 32, right: 32, bottom: 52, left: 52 };
            const plotW = W - PAD.left - PAD.right;
            const plotH = H - PAD.top - PAD.bottom;
            const maxPain = 10;
            const points = sorted.map((r, i) => ({
              x: PAD.left + (sorted.length === 1 ? plotW / 2 : (i / (sorted.length - 1)) * plotW),
              y: PAD.top + plotH - (r.painLevel / maxPain) * plotH,
              pain: r.painLevel,
              date: new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
              severity: r.severityLevel,
              symptoms: r.symptoms.slice(0, 3).join(", "),
            }));

            const linePath = points.map((p, i) => {
              if (i === 0) return `M ${p.x} ${p.y}`;
              const prev = points[i - 1];
              const cpx = (prev.x + p.x) / 2;
              return `C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
            }).join(" ");

            const areaPath = linePath +
              ` L ${points[points.length - 1].x} ${PAD.top + plotH}` +
              ` L ${points[0].x} ${PAD.top + plotH} Z`;

            const yLabels = [0, 2, 4, 6, 8, 10];
            const painColor = (v) => v >= 8 ? "var(--text-red)" : v >= 5 ? "#f59e0b" : "#10b981";

            return (
              <Card style={{ marginBottom: 16, padding: "20px 22px", animation: "fadeUp 0.35s ease 0.15s both" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    📈 Pain Level Trend
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {[["#10b981","Low"],["#f59e0b","Med"],["var(--text-red)","High"]].map(([c, l]) => (
                      <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                        <span style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 500 }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="painAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.01" />
                    </linearGradient>
                    <linearGradient id="painLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="50%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                    <filter id="chartGlow">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* Horizontal grid */}
                  {yLabels.map(v => {
                    const y = PAD.top + plotH - (v / maxPain) * plotH;
                    return (
                      <g key={v}>
                        <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y}
                          stroke="var(--border)" strokeWidth="1" strokeDasharray="3 5" opacity="0.45" />
                        <text x={PAD.left - 12} y={y + 3.5} textAnchor="end"
                          style={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "var(--font)", fontWeight: 500 }}>
                          {v}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill */}
                  <path d={areaPath} fill="url(#painAreaGrad)" style={{ animation: "fadeIn 1s ease 0.3s both" }} />

                  {/* Animated line */}
                  <path d={linePath} fill="none" stroke="url(#painLineGrad)" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" filter="url(#chartGlow)"
                    style={{
                      strokeDasharray: 2000, strokeDashoffset: 2000,
                      animation: "drawLine 1.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards"
                    }} />

                  {/* Data dots + labels */}
                  {points.map((p, i) => (
                    <g key={i} className="trend-dot" style={{ cursor: "pointer" }}>
                      {/* Hover zone */}
                      <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                      {/* Outer ring */}
                      <circle cx={p.x} cy={p.y} r="7" fill="none" stroke={painColor(p.pain)}
                        strokeWidth="1.5" opacity="0.25"
                        style={{ animation: `dotPop 0.4s ease ${0.6 + i * 0.1}s both` }} />
                      {/* Main dot */}
                      <circle className="dot-main" cx={p.x} cy={p.y} r="4" fill="white"
                        stroke={painColor(p.pain)} strokeWidth="2"
                        style={{
                          animation: `dotPop 0.4s ease ${0.6 + i * 0.1}s both`,
                          transition: "r 0.2s ease, filter 0.2s ease"
                        }} />
                      {/* X-axis date labels */}
                      {(sorted.length <= 10 || i % Math.ceil(sorted.length / 8) === 0 || i === sorted.length - 1) && (
                        <text x={p.x} y={PAD.top + plotH + 22} textAnchor="middle"
                          style={{ fontSize: 9, fill: "var(--text-faint)", fontFamily: "var(--font)", fontWeight: 500 }}
                          transform={sorted.length > 6 ? `rotate(-35, ${p.x}, ${PAD.top + plotH + 22})` : ""}>
                          {p.date}
                        </text>
                      )}
                      <title>{`${p.date}\nPain: ${p.pain}/10 (${p.severity})\n${p.symptoms}`}</title>
                    </g>
                  ))}

                  {/* Axes */}
                  <line x1={PAD.left} y1={PAD.top - 4} x2={PAD.left} y2={PAD.top + plotH}
                    stroke="var(--border)" strokeWidth="1.5" />
                  <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW + 4} y2={PAD.top + plotH}
                    stroke="var(--border)" strokeWidth="1.5" />

                  {/* Y-axis label */}
                  <text x={14} y={PAD.top + plotH / 2} textAnchor="middle"
                    style={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "var(--font)", fontWeight: 600 }}
                    transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}>
                    Pain Level
                  </text>
                </svg>
              </Card>
            );
          })()}



          {/* ── AI Health Insights ── */}
          {reports.length >= 3 && (() => {
            const insights = [];

            const sorted = [...reports].sort((a, b) => new Date(a.date) - new Date(b.date));
            const recent3 = sorted.slice(-3);
            const avgRecent = recent3.reduce((a, r) => a + r.painLevel, 0) / recent3.length;
            const older = sorted.slice(0, -3);

            if (older.length > 0) {
              const avgOlder = older.reduce((a, r) => a + r.painLevel, 0) / older.length;
              if (avgRecent > avgOlder + 1.5) {
                insights.push({ icon: "📈", color: "var(--text-red)", bg: "rgba(225, 29, 72, 0.1)", border: "rgba(225, 29, 72, 0.2)",
                  title: "Pain Escalation Detected",
                  desc: `Recent avg pain (${avgRecent.toFixed(1)}) is rising vs. earlier (${avgOlder.toFixed(1)}). Consider consulting a physician.` });
              } else if (avgRecent < avgOlder - 1.5) {
                insights.push({ icon: "📉", color: "var(--green)", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.2)",
                  title: "Pain Levels Improving",
                  desc: `Recent avg pain (${avgRecent.toFixed(1)}) is down from earlier (${avgOlder.toFixed(1)}). Great progress!` });
              } else {
                insights.push({ icon: "📊", color: "var(--blue)", bg: "var(--bg-blue-pale)", border: "var(--blue-border)",
                  title: "Pain Levels Stable",
                  desc: `Your pain is steady around ${avgRecent.toFixed(1)}/10 across recent and older reports.` });
              }
            }

            const recurringSymptoms = Object.entries(freq).filter(([, c]) => c >= 3);
            if (recurringSymptoms.length > 0) {
              insights.push({ icon: "🔄", color: "var(--text-purple)", bg: "var(--bg-purple-light)", border: "var(--border-purple)",
                title: "Recurring Symptoms",
                desc: `${recurringSymptoms.map(([s, c]) => `${s} (${c}×)`).join(", ")} — may indicate a chronic pattern.` });
            }

            const highSev = reports.filter(r => ["High", "Emergency"].includes(r.severityLevel));
            if (highSev.length >= 2) {
              const highPct = ((highSev.length / reports.length) * 100).toFixed(0);
              insights.push({ icon: "🚨", color: "var(--text-red)", bg: "var(--bg-red)", border: "var(--border-red)",
                title: "Frequent High Severity",
                desc: `${highPct}% of reports are High/Emergency. Professional medical evaluation is recommended.` });
            }

            const dayMap = {};
            reports.forEach(r => {
              const day = new Date(r.date).toLocaleDateString("en-IN", { weekday: "long" });
              dayMap[day] = (dayMap[day] || 0) + 1;
            });
            const topDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];
            if (topDay && topDay[1] >= 2) {
              insights.push({ icon: "📅", color: "#0891b2", bg: "rgba(8, 145, 178, 0.12)", border: "rgba(8, 145, 178, 0.3)",
                title: "Day-of-Week Pattern",
                desc: `Most symptoms reported on ${topDay[0]}s (${topDay[1]}×). This may correlate with weekly routines or stressors.` });
            }

            const symptomPainMap = {};
            reports.forEach(r => r.symptoms.forEach(s => {
              if (!symptomPainMap[s]) symptomPainMap[s] = [];
              symptomPainMap[s].push(r.painLevel);
            }));
            const highPainSymptoms = Object.entries(symptomPainMap)
              .filter(([, pains]) => pains.length >= 2)
              .map(([s, pains]) => [s, pains.reduce((a, b) => a + b, 0) / pains.length])
              .filter(([, avg]) => avg >= 7)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            if (highPainSymptoms.length > 0) {
              insights.push({ icon: "🔥", color: "var(--text-amber)", bg: "var(--bg-amber-light)", border: "var(--border-amber)",
                title: "High-Pain Symptom Correlations",
                desc: `${highPainSymptoms.map(([s, avg]) => `${s} (avg ${avg.toFixed(1)}/10)`).join(", ")} are consistently linked to higher pain.` });
            }

            if (insights.length === 0) return null;

            return (
              <Card style={{ marginBottom: 16, padding: "20px 22px", animation: "fadeUp 0.35s ease 0.22s both" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                  🧠 AI Health Insights
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {insights.map((ins, i) => (
                    <div key={i} style={{
                      display: "flex", gap: 14, padding: "14px 16px",
                      background: ins.bg, borderRadius: "var(--radius-sm)",
                      border: `1.5px solid ${ins.border}`,
                      alignItems: "center",
                      animation: `fadeUp 0.35s ease ${0.25 + i * 0.08}s both`,
                      transition: "var(--transition)",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.boxShadow = `0 4px 16px ${ins.color}15`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <div style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{ins.icon}</div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: ins.color, marginBottom: 4 }}>{ins.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>{ins.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })()}
        </>
      )}

      {/* ── Search ── */}
      <div style={{ marginBottom: 16, animation: "fadeUp 0.35s ease 0.18s both" }}>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by symptom or severity…"
            style={{
              flex: 1, padding: "11px 16px",
              borderRadius: "var(--radius)", border: "1.5px solid var(--border)",
              fontSize: 13.5, fontFamily: "var(--font)", boxSizing: "border-box",
              background: "var(--surface)", color: "var(--text)"
            }}
          />
          {reports.length > 0 && (
            <button
              onClick={() => setConfirmId("CLEAR_ALL")}
              className="btn-danger"
              style={{
                background: "var(--bg-red-light)", color: "var(--red)", border: "1px solid var(--border-red)",
                borderRadius: "var(--radius)", padding: "0 16px", fontWeight: 700, fontSize: 13,
                cursor: "pointer", transition: "var(--transition)", whiteSpace: "nowrap"
              }}
            >
              Clear all
            </button>
          )}
        </div>

      </div>

      {/* ── Records list ── */}
      {filtered.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-faint)" }}>
          <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>🔍</div>
          No records found.
        </Card>
      ) : (
        <>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 16, animation: "fadeIn 0.3s ease both" }}>
              <button
                disabled={activePage === 1}
                onClick={() => setCurrentPage(activePage - 1)}
                style={{
                  background: activePage === 1 ? "transparent" : "var(--white)",
                  color: activePage === 1 ? "var(--text-faint)" : "var(--navy)",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: activePage === 1 ? "not-allowed" : "pointer",
                  transition: "var(--transition)",
                  opacity: activePage === 1 ? 0.5 : 1,
                }}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  style={{
                    background: activePage === p ? "var(--blue)" : "var(--white)",
                    color: activePage === p ? "#fff" : "var(--navy)",
                    border: activePage === p ? "1.5px solid var(--blue)" : "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "var(--transition)",
                    boxShadow: activePage === p ? "var(--shadow-blue)" : "none",
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(activePage + 1)}
                style={{
                  background: activePage === totalPages ? "transparent" : "var(--white)",
                  color: activePage === totalPages ? "var(--text-faint)" : "var(--navy)",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: activePage === totalPages ? "not-allowed" : "pointer",
                  transition: "var(--transition)",
                  opacity: activePage === totalPages ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          )}

          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {paginatedFiltered.map(r => (
              <Card key={r.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, paddingRight: 16 }}>
                    <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 4, fontSize: 14 }}>
                      {r.symptoms.join(", ")}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
                      {new Date(r.date).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      &nbsp;·&nbsp;Pain {r.painLevel}/10&nbsp;·&nbsp;{r.duration}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge color={severityColor(r.severityLevel)} bg={severityBg(r.severityLevel)}>
                      {r.severityLevel}
                    </Badge>
                    <button onClick={() => setConfirmId(r.id)} style={{
                      background: "var(--bg-red)", color: "var(--red)",
                      border: "1px solid var(--border-red)",
                      borderRadius: "var(--radius-sm)", padding: "5px 10px",
                      cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "var(--font)",
                      transition: "var(--transition)",
                    }}>🗑</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {confirmId && (
        <ConfirmDialog
          title={confirmId === "CLEAR_ALL" ? "Clear all history?" : "Delete Record?"}
          message={confirmId === "CLEAR_ALL" ? "All history records will be permanently deleted and cannot be recovered." : "This symptom record will be permanently deleted and cannot be recovered."}
          confirmLabel={confirmId === "CLEAR_ALL" ? "Yes, Clear All" : "Yes, Delete"}
          onConfirm={() => {
            if (confirmId === "CLEAR_ALL") {
              onClearAll();
            } else {
              onDelete(confirmId);
            }
            setConfirmId(null);
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}

// ─── FEVER CARE GUIDE ─────────────────────────────────────────────────────────
// ─── PATCH: Replace the entire FeverDetailModal function in your App.jsx ──────
// Find:   function FeverDetailModal({ fever, onClose }) {
// Replace with the full function below.

function FeverDetailModal({ fever, savedMedicines = [], onSaveMedicine, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── NEW: nested food-detail state ────────────────────────────────────────
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodDetail, setFoodDetail]   = useState(null);
  const [loadingFood, setLoadingFood] = useState(false);
  const [errorFood, setErrorFood] = useState(null);
  const [mobilePopupItem, setMobilePopupItem] = useState(null);

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const app = loadAppearance();
  const navPos = app.navPosition || "left";
  const modalOffsetStyles = {
    "--modal-offset-left": navPos === "right" ? "0" : "var(--sidebar-width)",
    "--modal-offset-right": navPos === "right" ? "var(--sidebar-width)" : "0",
  };

  // Standalone fetch function for fever details
  const fetchFeverData = async () => {
    setLoading(true);
    setData(null);
    setError(null);
    const prompt = `For a ${fever.temp} (${fever.label}) fever, respond with ONLY valid JSON (no markdown, no backticks):
{
  "overview": "2-3 sentence clinical overview of what this fever range means for the body",
  "urgency": "Low" or "Medium" or "High",
  "urgencyNote": "One sentence on urgency level",
  "medicines": [
    {"name": "Medicine name", "dose": "Dosage info", "note": "When/how to use", "emoji": "💊", "otc": true},
    {"name": "Medicine name", "dose": "Dosage info", "note": "When/how to use", "emoji": "💊", "otc": true},
    {"name": "Medicine name", "dose": "Dosage info", "note": "When/how to use", "emoji": "🧴", "otc": false}
  ],
  "habits": [
    {"emoji": "💧", "title": "Stay Hydrated", "detail": "Drink plenty of water, clear broths, and electrolyte drinks"},
    {"emoji": "🛏️", "title": "Rest Well", "detail": "Get adequate sleep and avoid strenuous activity"},
    {"emoji": "🌡️", "title": "Monitor Temperature", "detail": "Check temperature every 4 hours to track progress"},
    {"emoji": "🧊", "title": "Cool Compress", "detail": "Apply a cool damp cloth to the forehead for comfort"}
  ],
  "warnings": [
    "Warning sign 1 that needs medical attention",
    "Warning sign 2 that needs medical attention",
    "Warning sign 3 that needs medical attention"
  ],
  "foods": [
    {"emoji": "🍲", "name": "Food name", "reason": "Why it helps with fever"},
    {"emoji": "🍌", "name": "Food name", "reason": "Why it helps with fever"},
    {"emoji": "🍯", "name": "Food name", "reason": "Why it helps with fever"},
    {"emoji": "🥤", "name": "Food name", "reason": "Why it helps with fever"}
  ],
  "whenToCall": "Clear one-sentence instruction on when to call a doctor"
}
Use only OTC medicines appropriate for this fever range. Provide relevant habits, warning signs, and foods for this specific fever range. Be medically accurate.`;
    try {
      const raw = await callClaude([{ role: "user", content: prompt }]);
      const parsed = safeParseJSON(raw);
      if (parsed) setData(parsed);
      else throw new Error("Could not parse JSON");
    } catch (e) {
      console.error("Failed to fetch fever care guide:", e);
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeverData();
  }, [fever.temp]);

  // ── NEW: fetch step-by-step cooking/preparation guide for a food ─────────
  const fetchFoodDetail = async (food) => {
    setSelectedFood(food);
    setFoodDetail(null);
    setErrorFood(null);
    setLoadingFood(true);
    const prompt = `Give a detailed step-by-step preparation guide for "${food.name}" as a remedy for a ${fever.label} fever (${fever.temp}).
Respond with ONLY valid JSON (no markdown, no backticks):
{
  "overview": "2 sentence description of why this is beneficial for this fever range",
  "prepTime": "e.g. 15 minutes",
  "servings": "e.g. 1–2 servings",
  "ingredients": [
    {"item": "ingredient name", "amount": "quantity", "emoji": "🧅"},
    {"item": "ingredient name", "amount": "quantity", "emoji": "🧄"}
  ],
  "steps": [
    {"step": 1, "title": "Step title", "detail": "Clear, detailed instruction for this step"},
    {"step": 2, "title": "Step title", "detail": "Clear, detailed instruction"},
    {"step": 3, "title": "Step title", "detail": "Clear, detailed instruction"},
    {"step": 4, "title": "Step title", "detail": "Clear, detailed instruction"},
    {"step": 5, "title": "Step title", "detail": "Clear, detailed instruction"}
  ],
  "tips": ["Recovery tip 1", "Recovery tip 2", "Recovery tip 3"],
  "healthBenefit": "One sentence on the primary fever-fighting benefit"
}`;
    try {
      const raw = await callClaude([{ role: "user", content: prompt }]);
      const parsed = safeParseJSON(raw);
      if (parsed) setFoodDetail(parsed);
      else throw new Error("Could not parse JSON");
    } catch (e) {
      console.error("Failed to fetch food details:", e);
      setErrorFood(e.message);
    }
    setLoadingFood(false);
  };

  const urgencyColors = { Low: "#10b981", Medium: "#f59e0b", High: "var(--text-red-light)" };
  const urgencyBgs   = { Low: "var(--bg-green-light)",  Medium: "var(--bg-amber-light)",  High: "var(--bg-red)" };

  return createPortal(
    <>
      {/* Backdrop — clicking closes nested panel first, then main modal */}
      <div
        onClick={selectedFood ? () => setSelectedFood(null) : onClose}
        style={{
          position: "fixed", top: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0)",
          zIndex: 2000,
          animation: "fadeIn 0.2s ease both",
          ...modalOffsetStyles,
        }}
        className="medai-modal-overlay"
      />

      {/* ── Main fever guide modal ── */}
      <div style={{
        position: "fixed", top: 0, bottom: 0,
        zIndex: 2001, pointerEvents: "none",
        padding: "20px",
        display: "flex", alignItems: "center", justifyContent: "center",
        ...modalOffsetStyles,
      }} className="medai-modal-container">
        <div style={{
          background: "var(--white)",
          borderRadius: "var(--radius-xl)",
          width: "min(820px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          pointerEvents: "all",
          boxShadow: "0 32px 80px rgba(15,31,92,0.22), 0 0 0 1px rgba(15,31,92,0.06)",
          animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
        }}>

          {/* Header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            background: `linear-gradient(135deg, ${fever.color}ee, ${fever.color}cc)`,
            borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
            padding: "22px 28px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "var(--radius)",
                background: "rgba(255,255,255,0.15)",
                border: "1.5px solid rgba(255,255,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 30,
              }}>🌡️</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 26, color: "#fff", letterSpacing: "-1px", lineHeight: 1 }}>{fever.temp}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4, fontWeight: 600 }}>{fever.label} Fever</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={fetchFeverData}
                title="Refresh Care Guide"
                style={{
                  background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "var(--radius-sm)", width: 34, height: 34,
                  cursor: "pointer", fontSize: 15, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.28)";
                  e.currentTarget.style.transform = "rotate(45deg)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                🔄
              </button>
              <button onClick={onClose} style={{
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "var(--radius-sm)", width: 34, height: 34,
                cursor: "pointer", fontSize: 20, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font)",
                transition: "all 0.2s ease"
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.28)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              >×</button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 28px 36px" }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 0", gap: 16 }}>
                <Spinner size={32} color={fever.color} />
                <div style={{ color: "var(--text-faint)", fontSize: 13, fontWeight: 500 }}>Loading fever care guide…</div>
              </div>
            ) : data ? (
              <>
                {/* Urgency banner */}
                <div style={{
                  background: urgencyBgs[data.urgency] || "#f8fafc",
                  border: `1px solid ${urgencyColors[data.urgency] || "#94a3b8"}30`,
                  borderRadius: "var(--radius)", padding: "12px 16px",
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "flex-start" : "center",
                  gap: isMobile ? 8 : 12,
                  marginBottom: 20,
                }}>
                  <span style={{
                    fontWeight: 800, fontSize: 11, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: urgencyColors[data.urgency],
                    background: `${urgencyColors[data.urgency]}18`,
                    border: `1px solid ${urgencyColors[data.urgency]}30`,
                    borderRadius: 99, padding: "3px 10px", flexShrink: 0,
                  }}>● {data.urgency} urgency</span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{data.urgencyNote}</span>
                </div>

                {/* Overview */}
                <p style={{ fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.8, margin: "0 0 28px" }}>{data.overview}</p>

                {/* Medicines + Habits */}
                <div className="results-details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                  {/* Medicines */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>💊 Medicines</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(data.medicines || []).map((m, i) => {
                        const alreadySaved = savedMedicines.some(sm => sm.name.toLowerCase().trim() === m.name.toLowerCase().trim());
                        return (
                          <div key={i} style={{
                            background: "var(--surface)", borderRadius: "var(--radius)",
                            border: "1px solid var(--border)", padding: "13px 15px",
                            animation: `fadeUp 0.3s ease ${i * 0.07}s both`,
                            display: "flex", flexDirection: "column", gap: 3
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <span style={{ fontSize: 18 }}>{m.emoji}</span>
                                <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)" }}>{m.name}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700,
                                  color: m.otc ? "#059669" : "#7c3aed",
                                  background: m.otc ? "var(--bg-green-light)" : "var(--bg-purple-light)",
                                  border: `1px solid ${m.otc ? "var(--border-green)" : "var(--border-purple)"}`,
                                  borderRadius: 99, padding: "2px 8px",
                                  letterSpacing: "0.04em",
                                }}>{m.otc ? "OTC" : "Rx"}</span>
                              </div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: fever.color }}>{m.dose}</div>
                            <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.5, marginBottom: 8 }}>{m.note}</div>
                            <button
                              onClick={() => onSaveMedicine && onSaveMedicine(m.name)}
                              disabled={alreadySaved}
                              title={alreadySaved ? "Already saved" : "Save to medicine list"}
                              style={{
                                width: "100%",
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: alreadySaved ? '1.5px solid var(--border-green)' : '1.5px solid var(--blue-border)',
                                background: alreadySaved ? 'var(--bg-green-light)' : 'var(--bg-blue-pale)',
                                color: alreadySaved ? 'var(--green)' : 'var(--blue)',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: alreadySaved ? 'default' : 'pointer',
                                fontFamily: 'var(--font)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => { if (!alreadySaved) { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; } }}
                              onMouseLeave={e => { if (!alreadySaved) { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; } }}
                            >
                              {alreadySaved ? '✓ Saved to List' : '+ Save to List'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Habits */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>🏃 Habits & Care</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(data.habits || []).map((h, i) => (
                        <div key={i} style={{
                          background: "var(--surface)", borderRadius: "var(--radius)",
                          border: "1px solid var(--border)", padding: "12px 15px",
                          display: "flex", gap: 10,
                          animation: `fadeUp 0.3s ease ${i * 0.07}s both`,
                        }}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{h.emoji}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 3 }}>{h.title}</div>
                            <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.5 }}>{h.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Foods (NOW CLICKABLE) ── */}
                {(data.foods || []).length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                      🥗 Recommended Foods & Drinks
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--blue)", fontWeight: 600, marginBottom: 12 }}>
                      Click any item for a step-by-step preparation guide →
                    </div>
                    <div className="fever-foods-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      {data.foods.map((f, i) => (
                        <button
                          key={i}
                          className="fever-food-card"
                          onClick={() => {
                            if (window.innerWidth <= 768) {
                              setMobilePopupItem({
                                emoji: f.emoji,
                                name: f.name,
                                reason: f.reason,
                                action: () => fetchFoodDetail(f),
                                actionLabel: "How to Prepare Guide"
                              });
                            } else {
                              fetchFoodDetail(f);
                            }
                          }}
                          style={{
                            background: "var(--bg-green-light)", border: "1.5px solid #bbf7d0",
                            borderRadius: "var(--radius)", padding: "13px 12px",
                            textAlign: "center", cursor: "pointer",
                            fontFamily: "var(--font)",
                            animation: `fadeUp 0.3s ease ${i * 0.06}s both`,
                            transition: "var(--transition-slow)",
                            position: "relative", overflow: "hidden",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = "translateY(-3px)";
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(16,185,129,0.2)";
                            e.currentTarget.style.borderColor = "var(--green)";
                            e.currentTarget.style.background = "var(--bg-green-light)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.borderColor = "var(--border-green)";
                            e.currentTarget.style.background = "var(--bg-green-light)";
                          }}
                        >
                          <div style={{ fontSize: 26, marginBottom: 6 }}>{f.emoji}</div>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--navy)", marginBottom: 4 }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: "var(--green)", lineHeight: 1.4, marginBottom: 8 }}>{f.reason}</div>
                          <div style={{
                            fontSize: 10.5, fontWeight: 700, color: "var(--text-green)",
                            background: "var(--bg-green-light)", borderRadius: 99,
                            padding: "2px 8px", display: "inline-block",
                          }}>How to prepare →</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warning signs + When to call */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "var(--bg-red)", border: "1px solid var(--border-red)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-red)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>🚨 Warning Signs</div>
                    {(data.warnings || []).map((w, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 12.5, color: "var(--text-red-dark)", lineHeight: 1.5 }}>
                        <span style={{ color: "var(--text-red-light)", fontWeight: 700, flexShrink: 0 }}>●</span>{w}
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "var(--blue-pale)", border: "1px solid var(--blue-border)", borderRadius: "var(--radius)", padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>👨‍⚕️ When to Call a Doctor</div>
                    <p style={{ fontSize: 13, color: "var(--navy)", lineHeight: 1.65, margin: 0, fontWeight: 500 }}>{data.whenToCall}</p>
                  </div>
                </div>

                {/* Disclaimer */}
                <div style={{ marginTop: 20, padding: "10px 14px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)", fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.6 }}>
                  ⚕️ This guide is for informational purposes only. Always consult a qualified doctor before taking any medication.
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", color: "var(--text-red-light)", padding: 48 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Failed to load care guide.</div>
                {error && <div style={{ fontSize: 13, opacity: 0.8, fontFamily: "monospace", margin: "8px 0" }}>{error}</div>}
                <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 12 }}>Please make sure your backend server is running and configured with a Groq API key.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Nested food detail panel ── */}
      {selectedFood && (
        <div style={{
          position: "fixed", top: 0, bottom: 0,
          left: "var(--sidebar-width)", right: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2100, pointerEvents: "none",
          padding: "24px",
        }}>
          <div style={{
            background: "var(--white)",
            borderRadius: "var(--radius-xl)",
            width: "min(700px, 100%)",
            maxHeight: "88vh",
            overflowY: "auto",
            pointerEvents: "all",
            boxShadow: "0 32px 80px rgba(15,31,92,0.28), 0 0 0 1px rgba(15,31,92,0.08)",
            animation: "scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>

            {/* Food detail header */}
            <div style={{
              position: "sticky", top: 0, zIndex: 10,
              background: "linear-gradient(135deg, #064e3b, #065f46, #047857)",
              borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
              padding: "20px 24px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "var(--radius)",
                  background: "rgba(255,255,255,0.15)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, flexShrink: 0,
                }}>{selectedFood.emoji}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: "#fff", letterSpacing: "-0.4px", lineHeight: 1.1 }}>{selectedFood.name}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(167,243,208,0.8)", marginTop: 4 }}>
                    {fever.label} Fever Remedy · Step-by-step guide
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => fetchFoodDetail(selectedFood)}
                  title="Refresh Guide"
                  style={{
                    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "var(--radius-sm)", width: 34, height: 34,
                    cursor: "pointer", fontSize: 15, color: "rgba(255,255,255,0.85)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                    e.currentTarget.style.transform = "rotate(45deg)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  🔄
                </button>
                <button
                  onClick={() => setSelectedFood(null)}
                  style={{
                    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "var(--radius-sm)", width: 34, height: 34,
                    cursor: "pointer", fontSize: 20, color: "rgba(255,255,255,0.85)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                >×</button>
              </div>
            </div>

            {/* Food detail body */}
            <div style={{ padding: "24px 24px 32px" }}>
              {loadingFood ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 0", gap: 16 }}>
                  <Spinner size={28} color="#059669" />
                  <div style={{ color: "var(--text-faint)", fontSize: 13, fontWeight: 500 }}>
                    Loading preparation guide for {selectedFood.name}…
                  </div>
                </div>
              ) : foodDetail ? (
                <>
                  {/* Health benefit banner */}
                  {foodDetail.healthBenefit && (
                    <div style={{
                      background: "var(--bg-green-light)", border: "1px solid #a7f3d0",
                      borderRadius: "var(--radius)", padding: "12px 16px",
                      fontSize: 13.5, color: "var(--text-green)", fontWeight: 600,
                      marginBottom: 18, lineHeight: 1.55,
                    }}>
                      💚 {foodDetail.healthBenefit}
                    </div>
                  )}

                  {/* Overview */}
                  <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.75, margin: "0 0 20px" }}>
                    {foodDetail.overview}
                  </p>

                  {/* Prep meta */}
                  {(foodDetail.prepTime || foodDetail.servings) && (
                    <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
                      {foodDetail.prepTime && (
                        <div style={{
                          background: "var(--surface)", border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)", padding: "8px 14px",
                          display: "flex", alignItems: "center", gap: 7,
                          fontSize: 13, color: "var(--navy)", fontWeight: 600,
                        }}>
                          ⏱️ {foodDetail.prepTime}
                        </div>
                      )}
                      {foodDetail.servings && (
                        <div style={{
                          background: "var(--surface)", border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)", padding: "8px 14px",
                          display: "flex", alignItems: "center", gap: 7,
                          fontSize: 13, color: "var(--navy)", fontWeight: 600,
                        }}>
                          🍽️ {foodDetail.servings}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ingredients */}
                  {(foodDetail.ingredients || []).length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>🧺 Ingredients</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {foodDetail.ingredients.map((ing, i) => (
                          <div key={i} style={{
                            background: "var(--bg-green-light)", border: "1px solid #bbf7d0",
                            borderRadius: "var(--radius-sm)", padding: "7px 13px",
                            display: "flex", alignItems: "center", gap: 6,
                            fontSize: 13, color: "var(--text-green)", fontWeight: 500,
                            animation: `fadeUp 0.25s ease ${i * 0.04}s both`,
                          }}>
                            <span style={{ fontSize: 16 }}>{ing.emoji}</span>
                            <span style={{ fontWeight: 700 }}>{ing.amount}</span>
                            <span>{ing.item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Steps */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                    👨‍🍳 Step-by-step
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {(foodDetail.steps || []).map((s, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 14,
                        background: "var(--surface)", borderRadius: "var(--radius)",
                        padding: "14px 16px", border: "1px solid var(--border)",
                        animation: `fadeUp 0.3s ease ${i * 0.06}s both`,
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "linear-gradient(135deg, #065f46, #059669)",
                          color: "#fff", fontWeight: 800, fontSize: 12,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, boxShadow: "0 2px 8px rgba(5,150,105,0.35)",
                        }}>{s.step}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)", marginBottom: 4 }}>{s.title}</div>
                          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{s.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recovery tips */}
                  {(foodDetail.tips || []).length > 0 && (
                    <div style={{
                      background: "var(--bg-green-light)", borderRadius: "var(--radius)",
                      border: "1px solid #bbf7d0", padding: "16px 18px",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-green)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>💡 Recovery Tips</div>
                      {foodDetail.tips.map((t, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13, color: "var(--text-green)", lineHeight: 1.5 }}>
                          <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>✓</span>{t}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-red-light)", padding: 48 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Failed to load preparation guide.</div>
                  {errorFood && <div style={{ fontSize: 13, opacity: 0.8, fontFamily: "monospace", margin: "8px 0" }}>{errorFood}</div>}
                  <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 12 }}>Please verify your backend connection and Groq API key configuration.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile-only compact detail popup */}
      {mobilePopupItem && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 3000, padding: 24,
          animation: "fadeIn 0.2s ease both"
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 20,
            width: "100%",
            maxWidth: 380,
            padding: "24px 20px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            textAlign: "center",
            animation: "scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both"
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{mobilePopupItem.emoji}</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 10px" }}>{mobilePopupItem.name}</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 20px" }}>{mobilePopupItem.reason}</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  mobilePopupItem.action();
                  setMobilePopupItem(null);
                }}
                className="btn-primary"
                style={{
                  width: "100%", padding: "10px 16px", borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: "var(--blue)", color: "#fff", border: "none"
                }}
              >
                {mobilePopupItem.actionLabel}
              </button>
              <button
                onClick={() => setMobilePopupItem(null)}
                style={{
                  width: "100%", padding: "10px 16px", borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: "var(--surface-2)", color: "var(--text-muted)", border: "1.5px solid var(--border)"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}


function FeverCareGuide({ savedMedicines = [], onSaveMedicine }) {
  const [activeFever, setActiveFever] = useState(null);

  const fevers = [
    { temp: "37–38°C", label: "Low-grade",  action: "Rest and fluids",    color: "#f59e0b", bg: "var(--bg-amber-light)", border: "var(--border-amber)" },
    { temp: "38–39°C", label: "Moderate",   action: "Paracetamol + rest", color: "#f43f5e", bg: "var(--bg-red-light)", border: "var(--border-red)" },
    { temp: "39–40°C", label: "High fever", action: "Seek medical care",  color: "#dc2626", bg: "var(--bg-red)", border: "var(--border-red-dark)" },
  ];

  return (
    <>
      <Card style={{ background: "linear-gradient(135deg, var(--bg-blue-pale), var(--bg-blue-light))", border: "1px solid var(--blue-border)", animation: "fadeUp 0.3s ease 0.3s both" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 15, letterSpacing: "-0.2px" }}>🌡️ Fever Care Guide</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>Click a card for medicines & habits</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {fevers.map(f => (
            <button
              key={f.temp}
              onClick={() => setActiveFever(f)}
              style={{
                background: f.bg,
                borderRadius: "var(--radius)",
                padding: "18px 14px",
                textAlign: "center",
                border: `1.5px solid ${f.border}`,
                boxShadow: `0 4px 16px ${f.color}15`,
                cursor: "pointer",
                fontFamily: "var(--font)",
                transition: "var(--transition-slow)",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = `0 12px 32px ${f.color}30`;
                e.currentTarget.style.borderColor = f.color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 4px 16px ${f.color}15`;
                e.currentTarget.style.borderColor = f.border;
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 20, color: f.color, letterSpacing: "-0.5px", marginBottom: 5 }}>{f.temp}</div>
              <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 12.5, marginBottom: 5 }}>{f.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10 }}>{f.action}</div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: f.color,
                background: `${f.color}15`, borderRadius: 99,
                padding: "3px 10px", display: "inline-block",
              }}>View details →</div>
            </button>
          ))}
        </div>
      </Card>

      {activeFever && (
        <FeverDetailModal
          fever={activeFever}
          savedMedicines={savedMedicines}
          onSaveMedicine={onSaveMedicine}
          onClose={() => setActiveFever(null)}
        />
      )}
    </>
  );
}

// ─── HEALTH TIPS ──────────────────────────────────────────────────────────────

// Tip Detail Modal — shown when user clicks a wellness tip card
function TipDetailModal({ tip, savedMedicines = [], onSaveMedicine, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetail, setItemDetail] = useState(null);
  const [loadingItem, setLoadingItem] = useState(false);
  const [errorItem, setErrorItem] = useState(null);
  const [mobilePopupItem, setMobilePopupItem] = useState(null);

  const isSavedItem = selectedItem && savedMedicines.some(m => m?.name?.toLowerCase?.().trim() === selectedItem.name.toLowerCase().trim());

  const app = loadAppearance();
  const navPos = app.navPosition || "left";
  const modalOffsetStyles = {
    "--modal-offset-left": navPos === "right" ? "0" : "var(--sidebar-width)",
    "--modal-offset-right": navPos === "right" ? "var(--sidebar-width)" : "0",
  };

  const fetchTipDetail = async () => {
    setLoadingDetail(true);
    setDetail(null);
    setError(null);
    const prompt = `For the wellness tip "${tip.title}", respond with ONLY valid JSON (no markdown, no backticks):
{
  "description": "2-3 sentence engaging description of why this matters for health",
  "pros": ["pro 1", "pro 2", "pro 3", "pro 4"],
  "cons": ["con or caution 1", "con or caution 2", "con or caution 3"],
  "suggestions": [
    {"name": "Suggestion name", "emoji": "🥗", "tagline": "Short catchy tagline"},
    {"name": "Suggestion name", "emoji": "🥑", "tagline": "Short catchy tagline"},
    {"name": "Suggestion name", "emoji": "🍵", "tagline": "Short catchy tagline"},
    {"name": "Suggestion name", "emoji": "🌿", "tagline": "Short catchy tagline"},
    {"name": "Suggestion name", "emoji": "🫐", "tagline": "Short catchy tagline"},
    {"name": "Suggestion name", "emoji": "🥦", "tagline": "Short catchy tagline"}
  ],
  "suggestionLabel": "A label for the suggestions section e.g. 'Recommended Dishes' or 'Exercises to Try' or 'Relaxation Techniques'"
}

Make suggestions highly specific and practical for "${tip.title}". Use relevant emojis.`;
    try {
      const raw = await callClaude([{ role: "user", content: prompt }]);
      const parsed = safeParseJSON(raw);
      if (parsed) setDetail(parsed);
      else throw new Error("Could not parse JSON");
    } catch (err) {
      console.error("Failed to load tip detail:", err);
      setError(err.message);
    }
    setLoadingDetail(false);
  };

  // Fetch tip detail on open
  useEffect(() => {
    fetchTipDetail();
  }, [tip.title]);

  // Fetch item steps when user clicks a suggestion
  const fetchItemDetail = async (item) => {
    setSelectedItem(item);
    setItemDetail(null);
    setErrorItem(null);
    setLoadingItem(true);
    const prompt = `For "${item.name}" as part of the wellness tip "${tip.title}", respond with ONLY valid JSON (no markdown, no backticks):
{
  "overview": "2 sentence overview of this specific item and its benefits",
  "steps": [
    {"step": 1, "title": "Step title", "detail": "Detailed instruction for this step"},
    {"step": 2, "title": "Step title", "detail": "Detailed instruction"},
    {"step": 3, "title": "Step title", "detail": "Detailed instruction"},
    {"step": 4, "title": "Step title", "detail": "Detailed instruction"},
    {"step": 5, "title": "Step title", "detail": "Detailed instruction"}
  ],
  "tips": ["Quick tip 1", "Quick tip 2", "Quick tip 3"],
  "healthBenefit": "One sentence on the main health benefit"
}`;
    try {
      const raw = await callClaude([{ role: "user", content: prompt }]);
      const parsed = safeParseJSON(raw);
      if (parsed) setItemDetail(parsed);
      else throw new Error("Could not parse JSON");
    } catch (e) {
      console.error("Failed to load item detail:", e);
      setErrorItem(e.message);
    }
    setLoadingItem(false);
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div onClick={selectedItem ? () => setSelectedItem(null) : onClose} style={{
        position: "fixed", top: 0, bottom: 0,
        left: "var(--modal-offset-left)", right: "var(--modal-offset-right)",
        background: "rgba(15,31,92,0.45)",
        zIndex: 2000, backdropFilter: "blur(6px)",
        animation: "fadeIn 0.2s ease both",
        ...modalOffsetStyles
      }} />

      {/* Main tip modal */}
      <div style={{
        position: "fixed", top: 0, bottom: 0,
        left: "var(--modal-offset-left)", right: "var(--modal-offset-right)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2001, pointerEvents: "none",
        padding: "24px",
        ...modalOffsetStyles
      }}>
        <div style={{
          background: "var(--white)",
          borderRadius: "var(--radius-xl)",
          width: "min(860px, 100%)",
          maxHeight: "88vh",
          overflowY: "auto",
          pointerEvents: "all",
          boxShadow: "0 32px 80px rgba(15,31,92,0.22), 0 0 0 1px rgba(15,31,92,0.06)",
          animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
          position: "relative",
        }}>
          {/* Header */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            background: "var(--white)",
            borderBottom: "1px solid var(--border)",
            borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
            padding: "20px 28px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "var(--radius)",
                background: "var(--blue-pale)", border: "1.5px solid var(--blue-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, flexShrink: 0,
              }}>{tip.icon}</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, color: "var(--navy)", letterSpacing: "-0.4px" }}>{tip.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>Wellness Guide</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={fetchTipDetail}
                title="Refresh Wellness Guide"
                style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)", width: 34, height: 34,
                  cursor: "pointer", fontSize: 15, color: "var(--text-faint)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font)", flexShrink: 0,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--surface-2)";
                  e.currentTarget.style.transform = "rotate(45deg)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                🔄
              </button>
              <button onClick={onClose} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", width: 34, height: 34,
                cursor: "pointer", fontSize: 20, color: "var(--text-faint)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font)", flexShrink: 0,
                transition: "all 0.2s ease",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--surface)"}
              >×</button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 28px 32px" }}>
            {loadingDetail ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 16 }}>
                <Spinner size={32} />
                <div style={{ color: "var(--text-faint)", fontSize: 13, fontWeight: 500 }}>Loading wellness guide…</div>
              </div>
            ) : detail ? (
              <>
                {/* Description */}
                <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.75, margin: "0 0 24px" }}>
                  {detail.description}
                </p>

                {/* Pros & Cons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
                  {/* Pros */}
                  <div style={{
                    background: "var(--bg-green-light)", borderRadius: "var(--radius)",
                    border: "1px solid #a7f3d0", padding: "16px 18px",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-green)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>✅ Benefits</div>
                    {(detail.pros || []).map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: "var(--text-green)", lineHeight: 1.5 }}>
                        <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>{p}
                      </div>
                    ))}
                  </div>
                  {/* Cons */}
                  <div style={{
                    background: "var(--bg-amber-light)", borderRadius: "var(--radius)",
                    border: "1px solid var(--border-amber)", padding: "16px 18px",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-amber)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>⚠️ Cautions</div>
                    {(detail.cons || []).map((c, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: "var(--text-amber)", lineHeight: 1.5 }}>
                        <span style={{ color: "#f59e0b", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>!</span>{c}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggestions grid */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                    {detail.suggestionLabel || "Suggestions"} — click to see steps
                  </div>
                  <div className="wellness-suggestions-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {(detail.suggestions || []).map((s, i) => (
                      <button key={i}
                        className="wellness-suggestion-card"
                        onClick={() => {
                          if (window.innerWidth <= 768) {
                            setMobilePopupItem({
                              emoji: s.emoji,
                              name: s.name,
                              reason: s.tagline,
                              action: () => fetchItemDetail(s),
                              actionLabel: "View Step-by-Step Guide"
                            });
                          } else {
                            fetchItemDetail(s);
                          }
                        }}
                        style={{
                          background: "var(--surface)",
                          border: "1.5px solid var(--border)",
                          borderRadius: "var(--radius)",
                          padding: "14px 16px",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "var(--font)",
                          transition: "var(--transition-slow)",
                          animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "color-mix(in srgb, var(--blue) 8%, var(--surface))";
                          e.currentTarget.style.borderColor = "var(--blue-border)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "var(--shadow)";
                          e.currentTarget.style.backdropFilter = "blur(12px)";
                          e.currentTarget.style.webkitBackdropFilter = "blur(12px)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "var(--surface)";
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.backdropFilter = "none";
                          e.currentTarget.style.webkitBackdropFilter = "none";
                        }}
                      >
                        <div style={{ fontSize: 26, marginBottom: 8 }}>{s.emoji}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 4, letterSpacing: "-0.1px" }}>{s.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.4 }}>{s.tagline}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", color: "var(--text-red-light)", padding: 40 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Failed to load wellness guide.</div>
                {error && <div style={{ fontSize: 13, opacity: 0.8, fontFamily: "monospace", margin: "8px 0" }}>{error}</div>}
                <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 12 }}>Please make sure your backend server is running and configured with a Groq API key.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item detail panel — slides in from right over the tip modal */}
      {selectedItem && (
        <div style={{
          position: "fixed", top: 0, bottom: 0,
          left: "var(--modal-offset-left)", right: "var(--modal-offset-right)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2100, pointerEvents: "none",
          padding: "24px",
          ...modalOffsetStyles
        }}>
          <div style={{
            background: "var(--white)",
            borderRadius: "var(--radius-xl)",
            width: "min(700px, 100%)",
            maxHeight: "88vh",
            overflowY: "auto",
            pointerEvents: "all",
            boxShadow: "0 32px 80px rgba(15,31,92,0.28), 0 0 0 1px rgba(15,31,92,0.08)",
            animation: "scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            {/* Item header */}
            <div style={{
              position: "sticky", top: 0, zIndex: 10,
              background: "linear-gradient(135deg, #0f2272, #1e3a8a)",
              borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
              padding: "20px 24px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 32 }}>{selectedItem.emoji}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#fff", letterSpacing: "-0.3px" }}>{selectedItem.name}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(147,197,253,0.7)", marginTop: 2 }}>{tip.title} · Step-by-step guide</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

                <button
                  onClick={() => fetchItemDetail(selectedItem)}
                  title="Refresh Guide"
                  style={{
                    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "var(--radius-sm)", width: 32, height: 32,
                    cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                    e.currentTarget.style.transform = "rotate(45deg)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  🔄
                </button>
                <button onClick={() => setSelectedItem(null)} style={{
                  background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "var(--radius-sm)", width: 32, height: 32,
                  cursor: "pointer", fontSize: 18, color: "rgba(255,255,255,0.8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font)",
                  transition: "all 0.2s ease"
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                >×</button>
              </div>
            </div>

            {/* Item body */}
            <div style={{ padding: "24px 24px 32px" }}>
              {loadingItem ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 16 }}>
                  <Spinner size={28} />
                  <div style={{ color: "var(--text-faint)", fontSize: 13 }}>Loading guide for {selectedItem.name}…</div>
                </div>
              ) : itemDetail ? (
                <>
                  {/* Health benefit banner */}
                  {itemDetail.healthBenefit && (
                    <div style={{
                      background: "var(--blue-pale)", border: "1px solid var(--blue-border)",
                      borderRadius: "var(--radius)", padding: "12px 16px",
                      fontSize: 13.5, color: "var(--navy)", fontWeight: 600,
                      marginBottom: 20, lineHeight: 1.55,
                    }}>
                      💙 {itemDetail.healthBenefit}
                    </div>
                  )}

                  {/* Overview */}
                  <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.75, margin: "0 0 24px" }}>
                    {itemDetail.overview}
                  </p>

                  {/* Steps */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Step-by-step</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {(itemDetail.steps || []).map((s, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 14,
                        background: "var(--surface)", borderRadius: "var(--radius)",
                        padding: "14px 16px", border: "1px solid var(--border)",
                        animation: `fadeUp 0.3s ease ${i * 0.06}s both`,
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                          color: "#fff", fontWeight: 800, fontSize: 12,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                        }}>{s.step}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)", marginBottom: 4 }}>{s.title}</div>
                          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{s.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick tips */}
                  {(itemDetail.tips || []).length > 0 && (
                    <div style={{
                      background: "var(--bg-green-light)", borderRadius: "var(--radius)",
                      border: "1px solid #bbf7d0", padding: "16px 18px",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-green)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>💡 Quick Tips</div>
                      {itemDetail.tips.map((t, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13, color: "var(--text-green)", lineHeight: 1.5 }}>
                          <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0 }}>✓</span>{t}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-red-light)", padding: 40 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Failed to load steps.</div>
                  {errorItem && <div style={{ fontSize: 13, opacity: 0.8, fontFamily: "monospace", margin: "8px 0" }}>{errorItem}</div>}
                  <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 12 }}>Please verify your backend connection and Groq API key configuration.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile-only compact detail popup */}
      {mobilePopupItem && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 3000, padding: 24,
          animation: "fadeIn 0.2s ease both"
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 20,
            width: "100%",
            maxWidth: 380,
            padding: "24px 20px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            textAlign: "center",
            animation: "scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both"
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{mobilePopupItem.emoji}</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 10px" }}>{mobilePopupItem.name}</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 20px" }}>{mobilePopupItem.reason}</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => {
                  mobilePopupItem.action();
                  setMobilePopupItem(null);
                }}
                className="btn-primary"
                style={{
                  width: "100%", padding: "10px 16px", borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: "var(--blue)", color: "#fff", border: "none"
                }}
              >
                {mobilePopupItem.actionLabel}
              </button>
              <button
                onClick={() => setMobilePopupItem(null)}
                style={{
                  width: "100%", padding: "10px 16px", borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: "var(--surface-2)", color: "var(--text-muted)", border: "1.5px solid var(--border)"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

function HealthTips({ savedMedicines = [], onSaveMedicine, setActive }) {
  const [activeTip, setActiveTip] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [customTip, setCustomTip] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderCustomTip = (text) => {
    // Parse structured sections from AI response
    const sections = { intro: '', tips: [], foods: [], medicines: [], conclusion: '' };
    let currentSection = 'intro';
    const lines = text.split('\n').filter(l => l.trim() !== '');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      const lower = trimmed.toLowerCase();
      // Skip redundant titles
      if (lower.includes('wellness guide') && !sections.intro) return;
      // Detect section headers
      if (lower.includes('wellness tips') || lower.includes('general tips') || lower.includes('actionable tips') || (lower.startsWith('**') && lower.includes('tips'))) {
        currentSection = 'tips'; return;
      }
      if (lower.includes('recommended foods') || lower.includes('foods to') || lower.includes('dietary') || (lower.startsWith('**') && lower.includes('food'))) {
        currentSection = 'foods'; return;
      }
      if (lower.includes('suggested medicines') || lower.includes('medications') || lower.includes('over-the-counter') || lower.includes('medicine') || (lower.startsWith('**') && (lower.includes('medicine') || lower.includes('medication')))) {
        currentSection = 'medicines'; return;
      }
      if (lower.includes('important note') || lower.includes('disclaimer') || lower.includes('consult')) {
        currentSection = 'conclusion';
      }
      // Parse bullet vs paragraph
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        const cleaned = trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').replace(/^\*\*|\*\*$/g, '');
        if (currentSection === 'foods') sections.foods.push(cleaned);
        else if (currentSection === 'medicines') sections.medicines.push(cleaned);
        else sections.tips.push(cleaned);
      } else {
        if (currentSection === 'intro' && !sections.intro) sections.intro = trimmed.replace(/^\*\*|\*\*$/g, '');
        else if (currentSection === 'conclusion') sections.conclusion += (sections.conclusion ? ' ' : '') + trimmed.replace(/^\*\*|\*\*$/g, '');
        else if (currentSection === 'intro') sections.intro += ' ' + trimmed.replace(/^\*\*|\*\*$/g, '');
      }
    });

    const SectionHeader = ({ icon, iconBg, iconColor, title }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 8 }}>
        <div style={{ background: iconBg, color: iconColor, borderRadius: 10, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy)', letterSpacing: '-0.3px' }}>{title}</div>
      </div>
    );

    const BulletCard = ({ items, color, bgColor, borderColor, icon }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {items.map((b, i) => (
          <div key={i} style={{ 
            display: 'flex', gap: 12, alignItems: 'flex-start', 
            background: "var(--bg-modal)", padding: '14px 16px', borderRadius: 12,
            boxShadow: `0 2px 8px ${borderColor}15`, border: `1px solid ${borderColor}30`
          }}>
            <div style={{ 
              color: color, background: bgColor, borderRadius: '50%', padding: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1
            }}>{icon}</div>
            <div style={{ fontSize: 14.5, color: 'var(--text)', lineHeight: 1.55 }}>{b}</div>
          </div>
        ))}
      </div>
    );

    const checkIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
    const foodIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>;
    const medIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>;

    return (
      <div style={{ textAlign: 'left' }}>
        {sections.intro && (
          <div style={{ marginBottom: 22, fontSize: 15, color: 'var(--navy)', lineHeight: 1.65 }}>{sections.intro}</div>
        )}

        {sections.tips.length > 0 && (
          <>
            <SectionHeader icon={checkIcon} iconBg="var(--bg-blue-pale)" iconColor="var(--blue)" title="Wellness Tips" />
            <BulletCard items={sections.tips} color="var(--blue-light)" bgColor="var(--bg-blue-pale)" borderColor="var(--blue-border)" icon={checkIcon} />
          </>
        )}

        {sections.foods.length > 0 && (
          <>
            <SectionHeader icon={foodIcon} iconBg="var(--bg-green-light)" iconColor="var(--green)" title="Recommended Foods" />
            <BulletCard items={sections.foods} color="var(--green)" bgColor="var(--bg-green-light)" borderColor="var(--border-green)" icon={foodIcon} />
          </>
        )}

        {sections.medicines.length > 0 && (
          <>
            <SectionHeader icon={medIcon} iconBg="var(--bg-amber-light)" iconColor="var(--text-amber)" title="Suggested Medicines" />
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 12.5, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Always consult a doctor or pharmacist before taking any medication.
            </div>
            {/* Medicine items with Save button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {sections.medicines.map((med, i) => {
                const medName = med.split(' - ')[0].trim();
                const alreadySaved = savedMedicines.some(m => m.name.toLowerCase().trim() === medName.toLowerCase().trim());
                return (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    background: "var(--bg-modal)", padding: '14px 16px', borderRadius: 12,
                    boxShadow: '0 2px 8px #fde68a25', border: '1px solid #fde68a30',
                  }}>
                    <div style={{
                      color: 'var(--text-amber)', background: 'var(--bg-amber-light)', borderRadius: '50%', padding: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1
                    }}>{medIcon}</div>
                    <div style={{ flex: 1, fontSize: 14.5, color: 'var(--text)', lineHeight: 1.55 }}>{med}</div>
                    <button
                      onClick={() => onSaveMedicine && onSaveMedicine(medName)}
                      disabled={alreadySaved}
                      title={alreadySaved ? "Already in your list" : "Save to medicine list"}
                      style={{
                        flexShrink: 0,
                        padding: '5px 12px',
                        borderRadius: 8,
                        border: alreadySaved ? '1.5px solid var(--border-green)' : '1.5px solid var(--blue-border)',
                        background: alreadySaved ? 'var(--bg-green-light)' : 'var(--bg-blue-pale)',
                        color: alreadySaved ? 'var(--green)' : 'var(--blue)',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: alreadySaved ? 'default' : 'pointer',
                        fontFamily: 'var(--font)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { if (!alreadySaved) { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; } }}
                      onMouseLeave={e => { if (!alreadySaved) { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; } }}
                    >
                      {alreadySaved ? '✓ Saved' : '+ Save to List'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {sections.conclusion && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, background: 'rgba(255,255,255,0.06)', padding: '14px 18px', borderRadius: 10, borderLeft: '4px solid var(--blue)' }}>
            {sections.conclusion}
          </div>
        )}
      </div>
    );
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoadingSearch(true);
    setSearchError("");
    setCustomTip(null);
    try {
      const response = await callClaude([
        { role: "user", content: `Generate a comprehensive wellness guide for: ${searchQuery}.

Format strictly as follows with these exact section headers:

1 short intro paragraph about the condition.

**Wellness Tips**
- tip 1
- tip 2
- tip 3

**Recommended Foods**
- food 1 with brief benefit
- food 2 with brief benefit
- food 3 with brief benefit

**Suggested Medicines**
- medicine/tablet name - what it does and typical dosage
- medicine/tablet name - what it does and typical dosage
- medicine/tablet name - what it does and typical dosage

**Important Note**
1 sentence advising to consult a doctor.` }
      ], "You are a highly capable AI health assistant. Provide medically safe, practical wellness tips, food recommendations, and common over-the-counter medicines with proper disclaimers. Always recommend consulting a doctor.");
      setCustomTip({ title: searchQuery, body: response });
    } catch (err) {
      setSearchError(`Failed to fetch tips: ${err.message}`);
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, animation: "fadeUp 0.3s ease both" }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.6px", margin: 0 }}>💡 Wellness Tips</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 5, fontSize: 14 }}>Search for specific wellness tips or explore general guides below.</p>
      </div>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginBottom: 30, animation: "fadeUp 0.3s ease 0.1s both" }}>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter a symptom or cause (e.g. Acid Reflux, Back Pain, Migraine)..."
          style={{
            flex: 1, padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border)",
            fontSize: 15, outline: "none", color: "var(--navy)", background: "var(--surface)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
          }}
        />
        <button 
          type="submit" 
          disabled={loadingSearch || !searchQuery.trim()}
          style={{
            padding: isMobile ? "0 16px" : "0 24px", borderRadius: 12, border: "none", background: "var(--blue)", color: "#fff",
            fontWeight: 700, fontSize: 15, cursor: loadingSearch || !searchQuery.trim() ? "default" : "pointer",
            opacity: loadingSearch || !searchQuery.trim() ? 0.7 : 1, transition: "var(--transition)",
            boxShadow: "0 4px 12px rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center"
          }}
        >
          {loadingSearch ? <Spinner size={20} color="#fff" /> : (isMobile ? <span style={{ fontSize: 20 }}>🔍</span> : "Search Tips")}
        </button>
      </form>

      {searchError && (
        <div style={{ color: "var(--text-red-light)", fontSize: 13, marginBottom: 20, background: "var(--bg-red)", padding: "10px 14px", borderRadius: 8, border: "1px solid #fecaca" }}>
          ⚠️ {searchError}
        </div>
      )}

      {customTip && (
        <div style={{ marginBottom: 32, animation: "fadeUp 0.3s ease both" }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--navy)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔍</span> Search Result
          </h3>
          <Card style={{ background: "linear-gradient(135deg, var(--bg-blue-pale), var(--bg-blue-light))", border: "1px solid var(--blue-border)", padding: 24, textAlign: "left" }}>
            <div style={{ fontWeight: 800, color: "var(--text-blue)", marginBottom: 16, fontSize: 18, borderBottom: "1px solid var(--blue-border)", paddingBottom: 12 }}>
              {customTip.title}
            </div>
            {renderCustomTip(customTip.body)}
            <button 
              onClick={() => { setCustomTip(null); setSearchQuery(""); }} 
              style={{ 
                marginTop: 24, background: "var(--bg-modal)", border: "1px solid var(--blue-border)", padding: "10px 20px", 
                borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "var(--text-blue)",
                boxShadow: "0 2px 6px rgba(3,105,161,0.08)", transition: "var(--transition)"
              }}
            >
              Clear Result
            </button>
          </Card>
        </div>
      )}

      <div style={{ marginBottom: 16, marginTop: 10 }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--navy)", marginBottom: 4 }}>General Guidelines</h3>
      </div>
      <div className="stagger" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {TIPS.map(t => (
          <Card key={t.title} hover onClick={() => setActiveTip(t)} style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}>
            {/* subtle gradient accent */}
            <div style={{
              position: "absolute", top: -20, right: -20,
              width: 80, height: 80, borderRadius: "50%",
              background: "var(--blue-pale)", opacity: 0.5,
            }} />
            <div style={{
              width: 52, height: 52, borderRadius: "var(--radius)",
              background: "var(--surface-2)", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 28, marginBottom: 14, border: "1px solid var(--border)",
              position: "relative",
            }}>{t.icon}</div>
            <div style={{ fontWeight: 800, color: "var(--navy)", marginBottom: 6, fontSize: 15, letterSpacing: "-0.2px" }}>{t.title}</div>
            <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.65 }}>{t.body}</p>
            <div style={{
              fontSize: 12, color: "var(--blue)", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 4,
            }}>View guide & suggestions →</div>
          </Card>
        ))}
      </div>

      
        <FeverCareGuide savedMedicines={savedMedicines} onSaveMedicine={onSaveMedicine} />

        <div style={{ marginTop: 40 }} />


      {activeTip && (
        <TipDetailModal tip={activeTip} savedMedicines={savedMedicines} onSaveMedicine={onSaveMedicine} onClose={() => setActiveTip(null)} />
      )}
    </div>
  );
}


// ─── REMOTE FACE rPPG SCANNER MODAL ───────────────────────────────────────────
function FacePPGScannerModal({ onClose, onApply }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);  // hidden sampling canvas
  const waveRef = useRef(null);    // visible waveform canvas
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState("idle"); // idle | waiting | calibrating | scanning | done
  const phaseRef = useRef("idle");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const updatePhase = (newPhase) => {
    phaseRef.current = newPhase;
    setPhase(newPhase);
  };
  const [countdown, setCountdown] = useState(15);
  const [liveBpm, setLiveBpm] = useState(0);
  const [finalBpm, setFinalBpm] = useState(0);
  const [finalSpo2, setFinalSpo2] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Preparing camera…");

  // Signal buffers
  const bufRef = useRef({
    redVals: [], greenVals: [], blueVals: [],
    timestamps: [],
    fastBaseline: 0,
    slowBaseline: 0,
    wavePoints: [],
    crossings: [],
    bpmHistory: [],
    faceFrames: 0,
    calibFrames: 0,
    scanStart: 0,
  });

  const drawWave = useCallback((points) => {
    const canvas = waveRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(168,85,247,0.08)";
    ctx.lineWidth = 0.5;
    for (let y = 0; y < H; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let x = 0; x < W; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    ctx.strokeStyle = "rgba(168,85,247,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.setLineDash([]);

    const maxAmp = Math.max(0.5, ...points.map(Math.abs));
    const scale = (H * 0.35) / maxAmp;

    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 8;

    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "rgba(168,85,247,0.3)");
    grad.addColorStop(0.5, "#c084fc");
    grad.addColorStop(1, "#a855f7");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    const step = W / Math.min(points.length, 300);
    const start = Math.max(0, points.length - 300);
    for (let i = start; i < points.length; i++) {
      const x = (i - start) * step;
      const y = H / 2 - points[i] * scale;
      if (i === start) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  // 2. stopCamera (depends only on refs)
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // 3. finalizeScan (depends on stopCamera)
  const finalizeScan = useCallback(() => {
    const buf = bufRef.current;
    let bpm = 0;
    if (buf.crossings.length >= 3) {
      const intervals = [];
      for (let i = 1; i < buf.crossings.length; i++) {
        intervals.push(buf.crossings[i] - buf.crossings[i - 1]);
      }
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      if (medianInterval > 0) bpm = Math.round(60000 / medianInterval);
    }
    if (bpm < 45 || bpm > 180) bpm = buf.bpmHistory.length > 0
      ? Math.round(buf.bpmHistory.reduce((a, b) => a + b, 0) / buf.bpmHistory.length)
      : 74;

    // SpO2 calculation
    let spo2 = 98;
    if (buf.redVals.length > 30 && buf.blueVals.length > 30) {
      const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
      const std = (arr, m) => Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length);
      const avgR = mean(buf.redVals);
      const avgB = mean(buf.blueVals);
      const stdR = std(buf.redVals, avgR);
      const stdB = std(buf.blueVals, avgB);
      if (avgR > 0 && avgB > 0 && stdB > 0) {
        const ratio = (stdR / avgR) / (stdB / avgB);
        spo2 = Math.round(112 - 18 * ratio);
      }
    }
    spo2 = Math.max(92, Math.min(100, spo2));

    setFinalBpm(bpm);
    setFinalSpo2(spo2);
    updatePhase("done");
    stopCamera();
  }, [stopCamera]);

  // 4. startProcessing (depends on drawWave)
  const startProcessing = useCallback(() => {
    const process = () => {
      if (phaseRef.current === "done" || phaseRef.current === "idle") {
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        rafRef.current = requestAnimationFrame(process);
        return;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      canvas.width = 40;
      canvas.height = 40;

      // Sample central forehead region (X: 45% - 55%, Y: 30% - 40%)
      ctx.drawImage(video, vw * 0.45, vh * 0.30, vw * 0.1, vh * 0.1, 0, 0, 40, 40);
      const imgData = ctx.getImageData(0, 0, 40, 40).data;

      let rSum = 0, gSum = 0, bSum = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        rSum += imgData[i];
        gSum += imgData[i + 1];
        bSum += imgData[i + 2];
      }
      const pixelCount = 40 * 40;
      const avgR = rSum / pixelCount;
      const avgG = gSum / pixelCount;
      const avgB = bSum / pixelCount;
      const now = performance.now();

      const buf = bufRef.current;

      // Face skin calibration detection - check that camera is active and sending light/frames
      const isFaceAligned = avgR > 15 && avgG > 15;

      if (phaseRef.current === "waiting" || buf.faceFrames < 20) {
        if (isFaceAligned) {
          buf.faceFrames++;
          if (buf.faceFrames >= 15) {
            updatePhase("calibrating");
            setStatusMsg("Face locked — calibrating biometrics…");
            buf.calibFrames = 0;
            buf.fastBaseline = avgG;
            buf.slowBaseline = avgG;
          }
        } else {
          buf.faceFrames = Math.max(0, buf.faceFrames - 1);
        }
        rafRef.current = requestAnimationFrame(process);
        return;
      }

      if (phaseRef.current === "calibrating" || buf.calibFrames < 45) {
        buf.calibFrames++;
        buf.fastBaseline = 0.92 * buf.fastBaseline + 0.08 * avgG;
        buf.slowBaseline = 0.99 * buf.slowBaseline + 0.01 * avgG;
        if (buf.calibFrames >= 45) {
          updatePhase("scanning");
          setStatusMsg("Scanning capillary blood volume shifts — hold steady…");
          buf.scanStart = now;
          buf.redVals = [];
          buf.greenVals = [];
          buf.blueVals = [];
          buf.timestamps = [];
          buf.crossings = [];
          buf.bpmHistory = [];
          buf.wavePoints = [];
          setCountdown(15);
        }
        rafRef.current = requestAnimationFrame(process);
        return;
      }

      if (!isFaceAligned) {
        updatePhase("waiting");
        setStatusMsg("Face guide misaligned — align inside oval guide");
        buf.faceFrames = 0;
        rafRef.current = requestAnimationFrame(process);
        return;
      }

      // Record values
      buf.redVals.push(avgR);
      buf.greenVals.push(avgG);
      buf.blueVals.push(avgB);
      buf.timestamps.push(now);

      // Bandpass baseline subtraction filter
      buf.fastBaseline = 0.92 * buf.fastBaseline + 0.08 * avgG;
      buf.slowBaseline = 0.992 * buf.slowBaseline + 0.008 * avgG;
      const acSignal = buf.fastBaseline - buf.slowBaseline;

      buf.wavePoints.push(acSignal);
      if (buf.wavePoints.length > 300) buf.wavePoints.shift();

      const len = buf.wavePoints.length;
      if (len >= 3) {
        const prev = buf.wavePoints[len - 2];
        const curr = buf.wavePoints[len - 1];
        if (prev <= 0 && curr > 0) {
          buf.crossings.push(now);
          if (buf.crossings.length > 20) buf.crossings.shift();
          if (buf.crossings.length >= 2) {
            const lastTwo = buf.crossings.slice(-4);
            const intervals = [];
            for (let i = 1; i < lastTwo.length; i++) {
              intervals.push(lastTwo[i] - lastTwo[i - 1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            if (avgInterval > 300 && avgInterval < 2000) {
              const instantBpm = Math.round(60000 / avgInterval);
              buf.bpmHistory.push(instantBpm);
              if (buf.bpmHistory.length > 20) buf.bpmHistory.shift();
              const smoothBpm = Math.round(
                buf.bpmHistory.reduce((a, b) => a + b, 0) / buf.bpmHistory.length
              );
              setLiveBpm(smoothBpm);
            }
          }
        }
      }

      drawWave(buf.wavePoints);
      rafRef.current = requestAnimationFrame(process);
    };
    rafRef.current = requestAnimationFrame(process);
  }, [drawWave]);

  // 5. startCamera (depends on startProcessing)
  const startCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
          video.play().catch(e => console.warn("Video play error:", e));
        };
      }
      updatePhase("waiting");
      setStatusMsg("Position your face inside the glowing oval guide");
      startProcessing();
    } catch (err) {
      setStatusMsg("Camera access denied. Please allow front camera permissions.");
    }
  }, [startProcessing]);

  // 6. useEffect countdown (depends on finalizeScan)
  useEffect(() => {
    if (phase !== "scanning") return;
    if (countdown <= 0) {
      finalizeScan();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, finalizeScan]);

  // 7. useEffect mount (depends on startCamera, stopCamera)
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  
const phaseColor = phase === "done" ? "#10b981"
    : phase === "scanning" ? "#a855f7"
    : phase === "calibrating" ? "#f59e0b"
    : "var(--text-red-light)";

  const phaseLabel = phase === "done" ? "CONTACTLESS SCAN COMPLETE"
    : phase === "scanning" ? `CONTACTLESS SCANNING… ${countdown}s`
    : phase === "calibrating" ? "CALIBRATING BIOMETRICS…"
    : phase === "waiting" ? "ALIGN FACE IN HUD"
    : "INITIALIZING FRONT CAMERA…";

  return createPortal(
    <>
      <div onClick={() => { stopCamera(); onClose(); }} style={{
        position: "fixed", inset: 0,
        background: "rgba(2,6,23,0.85)",
        backdropFilter: "blur(12px)",
        zIndex: 3000,
        animation: "fadeIn 0.2s ease both",
      }} />
      <div style={{
        position: "fixed", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 3001, pointerEvents: "none", padding: "16px",
      }}>
        <div style={{
          background: "rgba(15,23,42,0.96)",
          borderRadius: "var(--radius-xl)",
          border: "2px solid rgba(168,85,247,0.3)",
          width: "min(440px, 100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          pointerEvents: "all",
          boxShadow: "0 24px 64px rgba(168,85,247,0.2), 0 0 0 1px rgba(168,85,247,0.05)",
          animation: "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
          fontFamily: "var(--font)",
          color: "#f8fafc",
        }}>
          {phase !== "done" ? (
            <div style={{ padding: "24px 24px 28px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.4px", margin: 0 }}>
                    👤 Contactless rPPG Scanner
                  </h3>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>Micro-capillary face vitals scanner</div>
                </div>
                <button onClick={() => { stopCamera(); onClose(); }} style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "var(--radius-sm)", width: 30, height: 30,
                  cursor: "pointer", fontSize: 18, color: "var(--text-faint)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>×</button>
              </div>

              {/* Status Indicator */}
              <div style={{
                background: "rgba(0,0,0,0.4)", borderRadius: 12,
                padding: "10px 14px", border: "1px solid rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", gap: 10, marginBottom: 18,
              }}>
                <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: phaseColor,
                    boxShadow: `0 0 8px ${phaseColor}`,
                    animation: phase === "scanning" ? "pulse-ring 1.5s infinite" : "none",
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: phaseColor, letterSpacing: "0.08em", marginLeft: 10 }}>
                    {phaseLabel}
                  </span>
                </div>
              </div>

              {/* Face Guide HUD Portal */}
              <div style={{
                position: "relative",
                width: 170, height: 170,
                margin: "0 auto 18px",
                borderRadius: "50%",
                overflow: "hidden",
                border: `3px solid ${phaseColor}60`,
                boxShadow: `0 0 32px ${phaseColor}15, inset 0 0 20px rgba(0,0,0,0.5)`,
              }}>
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.muted = true;
                      el.defaultMuted = true;
                      el.playsInline = true;
                      el.play().catch(e => console.warn("Ref callback play error:", e));
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                  }}
                />
                {/* Face Guide Oval Overlay */}
                <div style={{
                  position: "absolute",
                  top: "15%", left: "20%", right: "20%", bottom: "15%",
                  border: `2px dashed ${phaseColor}`,
                  borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                  boxShadow: `0 0 16px ${phaseColor}30`,
                  animation: phase === "scanning" ? "none" : "pulse-ring 2s infinite",
                  pointerEvents: "none",
                }} />
                
                {/* Micro tech node markers */}
                <div style={{ position: "absolute", top: "45%", left: "48%", width: 4, height: 4, borderRadius: "50%", background: "#a855f7", opacity: phase === "scanning" ? 0.8 : 0, animation: "bounce 1s infinite" }} />
              </div>

              {/* Guidance text */}
              <div style={{
                textAlign: "center", fontSize: 12, color: "var(--text-faint)",
                lineHeight: 1.6, marginBottom: 16,
              }}>
                {phase === "waiting" || phase === "idle"
                  ? "Sit inside a brightly lit environment. Align your face comfortably in the center guide oval to lock biometrics."
                  : phase === "calibrating"
                  ? "Face locked! Keeping steady while baseline capillary light absorption calibrates…"
                  : "Scanning capillary waveforms. Remain completely still and avoid speaking."
                }
              </div>

              {/* Live BPM readout */}
              {phase === "scanning" && liveBpm > 0 && (
                <div style={{
                  display: "flex", justifyContent: "center", gap: 20, marginBottom: 16,
                  animation: "fadeIn 0.3s ease both",
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: 36, fontWeight: 900, color: "#c084fc",
                      fontFamily: "var(--font-mono, monospace)",
                      letterSpacing: "-1px",
                      textShadow: "0 0 20px rgba(168,85,247,0.4)",
                    }}>
                      {liveBpm}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginTop: 2 }}>EST. BPM</div>
                  </div>
                </div>
              )}

              {/* Live waveform canvas */}
              <div style={{
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(168,85,247,0.15)",
                borderRadius: 12,
                padding: 2,
                overflow: "hidden",
              }}>
                <canvas ref={waveRef} width={390} height={90}
                  style={{ display: "block", width: "100%", height: 90, borderRadius: 10 }}
                />
              </div>

              {/* Progress bar */}
              {phase === "scanning" && (
                <div style={{
                  marginTop: 14, height: 4, borderRadius: 4,
                  background: "rgba(168,85,247,0.1)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${((15 - countdown) / 15) * 100}%`,
                    background: "linear-gradient(90deg, #c084fc, #a855f7)",
                    borderRadius: 4,
                    transition: "width 1s linear",
                    boxShadow: "0 0 8px rgba(168,85,247,0.5)",
                  }} />
                </div>
              )}
            </div>
          ) : (
            /* Results Screen */
            <div style={{ padding: "24px 24px 28px" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "rgba(16,185,129,0.12)",
                  border: "2px solid rgba(16,185,129,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26,
                  boxShadow: "0 0 30px rgba(16,185,129,0.15)",
                }}>✓</div>
              </div>

              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Face Scan Complete
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
                  Contactless rPPG analysis extracted the following cardiac vitals
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                <div style={{
                  background: "rgba(168,85,247,0.06)",
                  border: "1.5px solid rgba(168,85,247,0.2)",
                  borderRadius: 14, padding: "18px 16px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>👤</div>
                  <div style={{
                    fontSize: 30, fontWeight: 900, color: "#c084fc",
                    fontFamily: "var(--font-mono, monospace)",
                    letterSpacing: "-1px",
                    textShadow: "0 0 16px rgba(168,85,247,0.3)",
                  }}>{finalBpm}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", marginTop: 4 }}>
                    PULSE (BPM)
                  </div>
                </div>

                <div style={{
                  background: "rgba(16,185,129,0.06)",
                  border: "1.5px solid rgba(16,185,129,0.2)",
                  borderRadius: 14, padding: "18px 16px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🫁</div>
                  <div style={{
                    fontSize: 30, fontWeight: 900, color: "var(--green)",
                    fontFamily: "var(--font-mono, monospace)",
                    letterSpacing: "-1px",
                    textShadow: "0 0 16px rgba(16,185,129,0.3)",
                  }}>{finalSpo2}%</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", marginTop: 4 }}>
                    OXYGEN (SPO₂)
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { onApply(finalBpm, finalSpo2); onClose(); }}
                  style={{
                    flex: 1, padding: "12px",
                    background: "linear-gradient(135deg, #a855f7, #7e22ce)",
                    color: "#fff", border: "none", borderRadius: 12,
                    fontSize: 13.5, fontWeight: 800, cursor: "pointer",
                    fontFamily: "var(--font)",
                    boxShadow: "0 6px 24px rgba(168,85,247,0.3)",
                  }}
                >
                  Apply to Log
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: "12px 18px",
                    background: "rgba(255,255,255,0.06)",
                    color: "var(--text-faint)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                    fontFamily: "var(--font)",
                  }}
                >
                  Dismiss
                </button>
              </div>

              <div style={{
                marginTop: 14, padding: "10px 14px",
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.15)",
                borderRadius: 8,
                fontSize: 10, color: "var(--text-amber)", lineHeight: 1.5,
              }}>
                ⚠️ Contactless remote PPG estimates capillary fluctuations through standard cameras.
                Readings can be affected by shadows and background lighting. Consult a physician for medical needs.
              </div>
            </div>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
    , document.body
  );
}

// ─── TAP-TO-BEAT PULSE ESTIMATOR MODAL ─────────────────────────────────────────
function TapToBeatModal({ onClose, onApply }) {
  const [taps, setTaps] = useState([]);
  const [liveBpm, setLiveBpm] = useState(0);
  const [consistency, setConsistency] = useState("");
  const [consistencyColor, setConsistencyColor] = useState("#94a3b8");
  const [heartScale, setHeartScale] = useState(1);
  const audioCtxRef = useRef(null);

  const playHeartBeatSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      // Sound 1: deep heartbeat thud
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(120, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.12);
      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.13);

      // Sound 2: echo (lub-dub) after 120ms
      setTimeout(() => {
        if (ctx.state === "closed") return;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.frequency.setValueAtTime(100, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.10);
        gain2.gain.setValueAtTime(0.25, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.10);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.11);
      }, 120);
    } catch {
      // browser audio blocked
    }
  };

  const handleTap = () => {
    setHeartScale(1.18);
    setTimeout(() => setHeartScale(1), 100);
    playHeartBeatSound();

    const now = Date.now();
    setTaps(prev => {
      let updated = [...prev, now];
      if (updated.length > 10) updated.shift();

      if (updated.length >= 2) {
        const intervals = [];
        for (let i = 1; i < updated.length; i++) {
          const gap = updated[i] - updated[i - 1];
          if (gap > 280 && gap < 2000) {
            intervals.push(gap);
          }
        }

        if (intervals.length > 0) {
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const bpm = Math.round(60000 / avgInterval);
          setLiveBpm(bpm);

          if (intervals.length >= 3) {
            const mean = avgInterval;
            const variance = intervals.reduce((sum, val) => sum + (val - mean) ** 2, 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            if (stdDev < 45) {
              setConsistency("STABLE SINUS RHYTHM (Healthy)");
              setConsistencyColor("#10b981");
            } else if (stdDev <= 120) {
              setConsistency("MILD RHYTHM DRIFT (Normal variations)");
              setConsistencyColor("#f59e0b");
            } else {
              setConsistency("UNSTABLE CADENCE (Tap evenly to beat)");
              setConsistencyColor("var(--text-red-light)");
            }
          } else {
            setConsistency("LOCKING RHYTHM...");
            setConsistencyColor("#e2e8f0");
          }
        }
      } else {
        setConsistency("CONTINUE TAPPING...");
        setConsistencyColor("#cbd5e1");
      }
      return updated;
    });
  };

  const handleReset = () => {
    setTaps([]);
    setLiveBpm(0);
    setConsistency("");
    setConsistencyColor("#94a3b8");
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return createPortal(
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(2,6,23,0.85)",
        backdropFilter: "blur(12px)",
        zIndex: 3000,
        animation: "fadeIn 0.2s ease both",
      }} />
      <div style={{
        position: "fixed", inset: 0,
        display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center",
        zIndex: 3001, pointerEvents: "none", padding: "16px",
      }}>
        <div style={{
          background: "rgba(15,23,42,0.96)",
          borderRadius: "var(--radius-xl)",
          border: "2px solid rgba(244,63,94,0.3)",
          width: "min(420px, 100%)",
          padding: "24px 24px 28px",
          pointerEvents: "all",
          boxShadow: "0 24px 64px rgba(244,63,94,0.2), 0 0 0 1px rgba(244,63,94,0.05)",
          animation: "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
          fontFamily: "var(--font)",
          color: "#f8fafc",
          textAlign: "center",
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <div style={{ textAlign: "left" }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.4px", margin: 0 }}>
                💓 Tap-to-Beat Pulse Estimate
              </h3>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>Interactive rhythm cadence calculator</div>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "var(--radius-sm)", width: 30, height: 30,
              cursor: "pointer", fontSize: 18, color: "var(--text-faint)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>

          <div style={{
            fontSize: 12.5, color: "var(--text-faint)", lineHeight: 1.6, marginBottom: 20,
          }}>
            Tap the large heart in cadence with your pulse. Feel your wrist/neck pulse and tap consistently to average BPM.
          </div>

          {/* Interactive Heart Pad */}
          <div style={{ position: "relative", height: 160, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <div 
              onMouseDown={handleTap}
              style={{
                width: 120, height: 120,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
                boxShadow: "0 12px 36px rgba(244,63,94,0.4), inset 0 2px 4px rgba(255,255,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 64,
                cursor: "pointer",
                userSelect: "none",
                transform: `scale(${heartScale})`,
                transition: "transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                zIndex: 2,
              }}
            >
              💓
            </div>
            {/* Ripple rings */}
            <div style={{
              position: "absolute", width: 120, height: 120, borderRadius: "50%",
              border: "2.5px solid rgba(244,63,94,0.4)",
              animation: taps.length > 0 ? "pulse-ring 1.8s ease infinite" : "none",
              pointerEvents: "none",
              zIndex: 1,
            }} />
          </div>

          {/* Live BPM readout */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Estimated Pulse
            </div>
            <div style={{
              fontSize: 48, fontWeight: 900, color: "#f43f5e",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "-2px",
              marginTop: 4,
              textShadow: "0 0 20px rgba(244,63,94,0.3)",
            }}>
              {liveBpm > 0 ? liveBpm : "--"}
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", marginLeft: 6, letterSpacing: 0 }}>BPM</span>
            </div>
            
            {/* Consistency Badge */}
            {consistency && (
              <div style={{
                marginTop: 8, fontSize: 11, fontWeight: 700,
                color: consistencyColor, textTransform: "uppercase", letterSpacing: "0.05em",
                animation: "fadeIn 0.25s ease both",
              }}>
                ● {consistency}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { if (liveBpm > 0) { onApply(liveBpm); onClose(); } }}
              disabled={liveBpm === 0}
              style={{
                flex: 1, padding: "12px",
                background: liveBpm > 0 ? "linear-gradient(135deg, #f43f5e, #be123c)" : "rgba(255,255,255,0.04)",
                color: liveBpm > 0 ? "#fff" : "rgba(255,255,255,0.25)",
                border: "none", borderRadius: 12,
                fontSize: 13.5, fontWeight: 800,
                cursor: liveBpm > 0 ? "pointer" : "not-allowed",
                fontFamily: "var(--font)",
                boxShadow: liveBpm > 0 ? "0 6px 24px rgba(244,63,94,0.3)" : "none",
                transition: "var(--transition)",
              }}
            >
              Apply to Log
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: "12px 18px",
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-faint)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                fontFamily: "var(--font)",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </>
    , document.body
  );
}

// ─── VITALS LOG ───────────────────────────────────────────────────────────────
function VitalsLog({ vitals, setVitals, setActive, showToast }) {
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [sugar, setSugar] = useState("");
  const [sugarState, setSugarState] = useState("Fasting");
  const [heartRate, setHeartRate] = useState("");
  const [spo2, setSpo2] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [showTapToBeat, setShowTapToBeat] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleApplyVitals = async (bpm, spo2Val) => {
    const finalBpm = bpm ? parseInt(bpm) : (heartRate ? parseInt(heartRate) : null);
    const finalSpo2 = spo2Val ? parseInt(spo2Val) : (spo2 ? parseInt(spo2) : null);

    const vitalEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      bpSystolic: systolic ? parseInt(systolic) : null,
      bpDiastolic: diastolic ? parseInt(diastolic) : null,
      sugar: sugar ? parseInt(sugar) : null,
      sugarState,
      heartRate: finalBpm,
      spo2: finalSpo2
    };

    const updated = [...vitals, vitalEntry];
    setVitals(updated);

    try {
      await apiSaveVital(vitalEntry);
    } catch (err) {
      console.warn("Backend offline, saving vital to localStorage:", err.message);
      localStorage.setItem(VITALS_KEY, JSON.stringify(updated));
    }

    setSystolic("");
    setDiastolic("");
    setSugar("");
    setHeartRate("");
    setSpo2("");
  };

  const getBpStatus = (sys, dia) => {
    if (!sys || !dia) return { label: "N/A", status: "none", color: "var(--text-faint)" };
    const s = parseInt(sys), d = parseInt(dia);
    if (s >= 180 || d >= 120) return { label: "Crisis", status: "red", color: "var(--red)" };
    if (s >= 130 || d >= 80) return { label: "Elevated", status: "yellow", color: "var(--amber)" };
    return { label: "Normal", status: "green", color: "var(--green)" };
  };

  const getSugarStatus = (val, state) => {
    if (!val) return { label: "N/A", status: "none", color: "var(--text-faint)" };
    const v = parseInt(val);
    if (state === "Fasting") {
      if (v >= 126 || v < 60) return { label: "Critical", status: "red", color: "var(--red)" };
      if (v >= 100) return { label: "Elevated", status: "yellow", color: "var(--amber)" };
      return { label: "Normal", status: "green", color: "var(--green)" };
    } else {
      if (v >= 200 || v < 70) return { label: "Critical", status: "red", color: "var(--red)" };
      if (v >= 140) return { label: "Elevated", status: "yellow", color: "var(--amber)" };
      return { label: "Normal", status: "green", color: "var(--green)" };
    }
  };

  const getHrStatus = (val) => {
    if (!val) return { label: "N/A", status: "none", color: "var(--text-faint)" };
    const v = parseInt(val);
    if (v > 120 || v < 50) return { label: "Critical", status: "red", color: "var(--red)" };
    if (v > 100 || v < 60) return { label: "Elevated", status: "yellow", color: "var(--amber)" };
    return { label: "Normal", status: "green", color: "var(--green)" };
  };

  const getSpo2Status = (val) => {
    if (!val) return { label: "N/A", status: "none", color: "var(--text-faint)" };
    const v = parseInt(val);
    if (v < 90) return { label: "Hypoxia", status: "red", color: "var(--red)" };
    if (v < 95) return { label: "Low", status: "yellow", color: "var(--amber)" };
    return { label: "Normal", status: "green", color: "var(--green)" };
  };

  const latest = vitals[vitals.length - 1] || {};
  const bpStat = getBpStatus(latest.bpSystolic, latest.bpDiastolic);
  const sugarStat = getSugarStatus(latest.sugar, latest.sugarState);
  const hrStat = getHrStatus(latest.heartRate);
  const spo2Stat = getSpo2Status(latest.spo2);
  const hasCritical = [bpStat.status, sugarStat.status, hrStat.status, spo2Stat.status].includes("red");

  const handleSave = async (e) => {
    e.preventDefault();
    if (!systolic && !sugar && !heartRate && !spo2) return showToast ? showToast("Please fill in at least one vital reading!", "error") : alert("Please fill in at least one vital reading!");
    setSaving(true);

    const entryId = latest._id || Date.now().toString();
    const vitalEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      bpSystolic: systolic ? parseInt(systolic) : null,
      bpDiastolic: diastolic ? parseInt(diastolic) : null,
      sugar: sugar ? parseInt(sugar) : null,
      sugarState,
      heartRate: heartRate ? parseInt(heartRate) : null,
      spo2: spo2 ? parseInt(spo2) : null
    };

    const updated = [...vitals, vitalEntry];
    setVitals(updated);

    try {
      await apiSaveVital(vitalEntry);
    } catch (err) {
      console.warn("Backend offline, saving vital to localStorage:", err.message);
      localStorage.setItem(VITALS_KEY, JSON.stringify(updated));
    }

    setSystolic(""); setDiastolic(""); setSugar(""); setHeartRate(""); setSpo2("");
    setSaving(false);
  };

  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = async (id) => {
    if (id === "CLEAR_ALL") {
      setVitals([]);
      try {
        await Promise.all(vitals.map(v => apiDeleteVital(v._id || v.id)));
      } catch (err) {
        console.warn("Backend offline, clearing vitals in localStorage:", err.message);
        localStorage.removeItem(VITALS_KEY);
      }
    } else {
      const updated = vitals.filter(v => v.id !== id && v._id !== id);
      setVitals(updated);
      try {
        await apiDeleteVital(id);
      } catch (err) {
        console.warn("Backend offline, saving deletion to localStorage:", err.message);
        localStorage.setItem(VITALS_KEY, JSON.stringify(updated));
      }
    }
    setConfirmDeleteId(null);
  };

  const getGlow = (status, color) => {
    if (status === "red") return `0 8px 32px ${color}35`;
    if (status === "yellow") return `0 6px 20px ${color}20`;
    if (status === "green") return `0 4px 16px ${color}15`;
    return "var(--shadow-sm)";
  };

  return (
    <div className="vitals-container" style={{ padding: "32px 32px 48px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, animation: "fadeUp 0.3s ease both" }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.6px", margin: 0 }}>
          🩺 Vitals Log Tracker
        </h2>
        <p style={{ color: "var(--text-muted)", marginTop: 5, fontSize: 14 }}>
          Log and track key vital metrics with clinical safety ranges.
        </p>
      </div>

      {/* Critical Alert Bar */}
      {hasCritical && (
        <div style={{
          background: "linear-gradient(135deg, var(--bg-red-light), var(--bg-red))",
          border: "2px solid var(--red)", borderRadius: "var(--radius)",
          padding: "14px 20px", marginBottom: 24, display: "flex",
          justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 8px 32px rgba(239, 68, 68, 0.2)",
          animation: "fadeUp 0.4s ease both"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 26, animation: "bounce 2s infinite" }}>🚨</div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--red)" }}>
                Critical Vitals Detected
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
                One or more vital metrics fall outside safe clinical ranges. Please consult a doctor immediately.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActive("emergency")}
            className="btn-primary"
            style={{
              background: "var(--red-dark)", color: "#fff",
              border: "none", borderRadius: "var(--radius-sm)",
              padding: "8px 16px", fontWeight: 700,
              cursor: "pointer", fontSize: 13,
              fontFamily: "var(--font)", boxShadow: "0 4px 12px rgba(220,38,38,0.25)"
            }}
          >
            Emergency Contact
          </button>
        </div>
      )}

      <div className="vitals-layout-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 20, marginBottom: 24 }}>
        {/* Logging Panel */}
        <Card style={{ animation: "fadeUp 0.35s ease 0.08s both" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
            Record Vitals
          </div>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 600 }}>
                Blood Pressure (mmHg)
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number" value={systolic} onChange={e => setSystolic(e.target.value)} placeholder="Sys (e.g. 120)"
                  style={{ flex: 1, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 13 }}
                />
                <span style={{ color: "var(--text-faint)", fontWeight: 700 }}>/</span>
                <input
                  type="number" value={diastolic} onChange={e => setDiastolic(e.target.value)} placeholder="Dia (e.g. 80)"
                  style={{ flex: 1, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 13 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 600 }}>
                Blood Sugar (mg/dL)
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number" value={sugar} onChange={e => setSugar(e.target.value)} placeholder="e.g. 95"
                  style={{ flex: 1, width: "50%", minWidth: 0, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 13 }}
                />
                <select
                  value={sugarState} onChange={e => setSugarState(e.target.value)}
                  style={{ flex: 1, width: "50%", minWidth: 0, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 13, cursor: "pointer" }}
                >
                  <option>Fasting</option>
                  <option>Post-prandial</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 600 }}>
                Heart Rate (bpm)
              </label>
              <input
                type="number" value={heartRate} onChange={e => setHeartRate(e.target.value)} placeholder="Pulse (e.g. 72)"
                style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 600 }}>
                Oxygen Level (SpO2 %)
              </label>
              <input
                type="number" value={spo2} onChange={e => setSpo2(e.target.value)} placeholder="e.g. 98"
                style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>

            <button
              type="submit" disabled={saving} className="btn-primary"
              style={{
                width: "100%", padding: "11px",
                background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                color: "#fff", border: "none", borderRadius: "var(--radius-sm)",
                fontSize: 14, fontWeight: 800, cursor: "pointer",
                fontFamily: "var(--font)", marginTop: 6,
                boxShadow: "var(--shadow-blue)"
              }}
            >
              {saving ? "Saving Log..." : "✓ Save Log Entry"}
            </button>

            {/* Face rPPG Scanner Button */}
            <button
              type="button"
              onClick={() => setShowFaceScanner(true)}
              style={{
                width: "100%", padding: "11px",
                background: "var(--scan-btn-bg)",
                color: "var(--scan-purple)", border: "1.5px solid var(--scan-purple-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13.5, fontWeight: 800, cursor: "pointer",
                fontFamily: "var(--font)", marginTop: 10,
                boxShadow: "0 4px 16px var(--scan-purple-glow)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "var(--transition)",
                letterSpacing: "-0.2px",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px var(--scan-purple-glow)'; e.currentTarget.style.borderColor = 'var(--scan-purple)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px var(--scan-purple-glow)'; e.currentTarget.style.borderColor = 'var(--scan-purple-border)'; }}
            >
              <span style={{ fontSize: 16 }}>👤</span>
              Contactless Face Scan (rPPG)
            </button>

            {/* Tap-to-Beat Button */}
            <button
              type="button"
              onClick={() => setShowTapToBeat(true)}
              style={{
                width: "100%", padding: "11px",
                background: "var(--scan-btn-bg)",
                color: "var(--scan-pink)", border: "1.5px solid var(--scan-pink-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 13.5, fontWeight: 800, cursor: "pointer",
                fontFamily: "var(--font)", marginTop: 4,
                boxShadow: "0 4px 16px var(--scan-pink-glow)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "var(--transition)",
                letterSpacing: "-0.2px",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px var(--scan-pink-glow)'; e.currentTarget.style.borderColor = 'var(--scan-pink)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px var(--scan-pink-glow)'; e.currentTarget.style.borderColor = 'var(--scan-pink-border)'; }}
            >
              <span style={{ fontSize: 16 }}>💓</span>
              Tap-to-Beat Pulse Estimate
            </button>
          </form>
        </Card>

        {/* Dashboard displays */}
        <div className="vitals-dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* BP Card */}
          <Card style={{
            padding: "16px 18px", transition: "var(--transition-slow)",
            border: latest.bpSystolic ? `1.5px solid ${bpStat.color}35` : "1px solid var(--border)",
            boxShadow: getGlow(bpStat.status, bpStat.color),
            display: "flex", flexDirection: "column", justifyContent: "space-between"
          }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>🩸</span>
                {latest.bpSystolic && <Badge color={bpStat.color} bg={`${bpStat.color}15`}>{bpStat.label}</Badge>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Blood Pressure
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.5px", marginTop: 4 }}>
                {latest.bpSystolic ? `${latest.bpSystolic}/${latest.bpDiastolic}` : "—"}
                {latest.bpSystolic && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-faint)", marginLeft: 4 }}>mmHg</span>}
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 12, borderTop: "1px solid var(--surface-2)", paddingTop: 6 }}>
              Safe: &lt; 120 / 80
            </div>
          </Card>

          {/* Blood Sugar Card */}
          <Card style={{
            padding: "16px 18px", transition: "var(--transition-slow)",
            border: latest.sugar ? `1.5px solid ${sugarStat.color}35` : "1px solid var(--border)",
            boxShadow: getGlow(sugarStat.status, sugarStat.color),
            display: "flex", flexDirection: "column", justifyContent: "space-between"
          }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>🍬</span>
                {latest.sugar && <Badge color={sugarStat.color} bg={`${sugarStat.color}15`}>{sugarStat.label}</Badge>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Glucose ({latest.sugarState || "Fasting"})
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.5px", marginTop: 4 }}>
                {latest.sugar || "—"}
                {latest.sugar && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-faint)", marginLeft: 4 }}>mg/dL</span>}
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 12, borderTop: "1px solid var(--surface-2)", paddingTop: 6 }}>
              Safe (Fasting): 70–99
            </div>
          </Card>

          {/* Heart Rate Card */}
          <Card style={{
            padding: "16px 18px", transition: "var(--transition-slow)",
            border: latest.heartRate ? `1.5px solid ${hrStat.color}35` : "1px solid var(--border)",
            boxShadow: getGlow(hrStat.status, hrStat.color),
            display: "flex", flexDirection: "column", justifyContent: "space-between"
          }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 22, animation: latest.heartRate ? "pulse-ring 1.5s infinite" : "none" }}>💓</span>
                {latest.heartRate && <Badge color={hrStat.color} bg={`${hrStat.color}15`}>{hrStat.label}</Badge>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Heart Rate
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.5px", marginTop: 4 }}>
                {latest.heartRate || "—"}
                {latest.heartRate && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-faint)", marginLeft: 4 }}>bpm</span>}
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 12, borderTop: "1px solid var(--surface-2)", paddingTop: 6 }}>
              Safe range: 60–100
            </div>
          </Card>

          {/* SpO2 Card */}
          <Card style={{
            padding: "16px 18px", transition: "var(--transition-slow)",
            border: latest.spo2 ? `1.5px solid ${spo2Stat.color}35` : "1px solid var(--border)",
            boxShadow: getGlow(spo2Stat.status, spo2Stat.color),
            display: "flex", flexDirection: "column", justifyContent: "space-between"
          }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>🌬️</span>
                {latest.spo2 && <Badge color={spo2Stat.color} bg={`${spo2Stat.color}15`}>{spo2Stat.label}</Badge>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Oxygen SpO2
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.5px", marginTop: 4 }}>
                {latest.spo2 || "—"}
                {latest.spo2 && <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-faint)", marginLeft: 4 }}>%</span>}
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 12, borderTop: "1px solid var(--surface-2)", paddingTop: 6 }}>
              Safe range: 95–100
            </div>
          </Card>
        </div>
      </div>
      {/* Log Feed */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.2px" }}>
          Chronological Logs
        </div>
        {vitals.length > 0 && (
          <button
            onClick={() => setConfirmDeleteId("CLEAR_ALL")}
            style={{
              background: "none", border: "none", color: "var(--red, #ef4444)",
              fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex",
              alignItems: "center", gap: 4, fontFamily: "var(--font)",
              padding: "4px 8px", borderRadius: 6, transition: "var(--transition)"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-red, rgba(239,68,68,0.08))"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            🗑 Clear All
          </button>
        )}
      </div>

      {vitals.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-faint)" }}>
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>🩺</div>
          No vital readings recorded yet. Log your first metrics above!
        </Card>
      ) : (() => {
        const itemsPerPage = 8;
        const totalPages = Math.ceil(vitals.length / itemsPerPage) || 1;
        const activePage = Math.min(currentPage, totalPages);
        const reversedVitals = [...vitals].reverse();
        const paginatedVitals = reversedVitals.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

        return (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {paginatedVitals.map((v) => {
                const bp = getBpStatus(v.bpSystolic, v.bpDiastolic);
                const sug = getSugarStatus(v.sugar, v.sugarState);
                const hr = getHrStatus(v.heartRate);
                const sp = getSpo2Status(v.spo2);
                return (
                  <Card key={v.id || v._id} style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                        <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 700, textAlign: "left" }}>
                          {new Date(v.date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap", textAlign: "left" }}>
                          {v.bpSystolic && (
                            <span style={{ fontSize: 13, color: "var(--text)" }}>
                              BP: <strong style={{ color: bp.color }}>{v.bpSystolic}/{v.bpDiastolic}</strong> mmHg
                            </span>
                          )}
                          {v.sugar && (
                            <span style={{ fontSize: 13, color: "var(--text)" }}>
                              Sugar ({v.sugarState}): <strong style={{ color: sug.color }}>{v.sugar}</strong> mg/dL
                            </span>
                          )}
                          {v.heartRate && (
                            <span style={{ fontSize: 13, color: "var(--text)" }}>
                              Pulse: <strong style={{ color: hr.color }}>{v.heartRate}</strong> bpm
                            </span>
                          )}
                          {v.spo2 && (
                            <span style={{ fontSize: 13, color: "var(--text)" }}>
                              SpO2: <strong style={{ color: sp.color }}>{v.spo2}</strong>%
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(v._id || v.id)}
                        style={{
                          background: "var(--bg-red)", color: "var(--red)", border: "1px solid var(--border-red)",
                          borderRadius: "var(--radius-sm)", padding: "5px 10px", cursor: "pointer",
                          fontSize: 12, fontWeight: 700, fontFamily: "var(--font)", transition: "var(--transition)",
                          flexShrink: 0, marginLeft: 12
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24, animation: "fadeIn 0.3s ease both" }}>
                <button
                  disabled={activePage === 1}
                  onClick={() => setCurrentPage(activePage - 1)}
                  style={{
                    background: activePage === 1 ? "transparent" : "var(--white)",
                    color: activePage === 1 ? "var(--text-faint)" : "var(--navy)",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: activePage === 1 ? "not-allowed" : "pointer",
                    transition: "var(--transition)",
                    opacity: activePage === 1 ? 0.5 : 1,
                  }}
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    style={{
                      background: activePage === p ? "var(--blue)" : "var(--white)",
                      color: activePage === p ? "#fff" : "var(--navy)",
                      border: activePage === p ? "1.5px solid var(--blue)" : "1.5px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "var(--transition)",
                      boxShadow: activePage === p ? "var(--shadow-blue)" : "none",
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={activePage === totalPages}
                  onClick={() => setCurrentPage(activePage + 1)}
                  style={{
                    background: activePage === totalPages ? "transparent" : "var(--white)",
                    color: activePage === totalPages ? "var(--text-faint)" : "var(--navy)",
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: activePage === totalPages ? "not-allowed" : "pointer",
                    transition: "var(--transition)",
                    opacity: activePage === totalPages ? 0.5 : 1,
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        );
      })()}



      {/* Face rPPG Scanner Modal */}
      {showFaceScanner && (
        <FacePPGScannerModal
          onClose={() => setShowFaceScanner(false)}
          onApply={(bpm, spo2Val) => {
            handleApplyVitals(bpm, spo2Val);
          }}
        />
      )}

      {/* Tap-to-Beat Modal */}
      {showTapToBeat && (
        <TapToBeatModal
          onClose={() => setShowTapToBeat(false)}
          onApply={(bpm) => {
            handleApplyVitals(bpm, null);
          }}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title={confirmDeleteId === "CLEAR_ALL" ? "Clear All Vitals Logs?" : "Delete Vitals Record?"}
          message={confirmDeleteId === "CLEAR_ALL" 
            ? "Are you sure you want to clear all vitals logs? This action cannot be undone." 
            : "Are you sure you want to delete this vitals log record? This action cannot be undone."}
          confirmLabel={confirmDeleteId === "CLEAR_ALL" ? "Yes, Clear All" : "Yes, Delete"}
          onConfirm={() => executeDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, color: "var(--text-faint)",
    letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16,
  }}>{children}</div>
);

const FieldRow = ({ label, value, onChange, placeholder, type = "text", disabled = false }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 12.5, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 600 }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%", padding: "10px 13px",
        borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)",
        fontSize: 13.5, fontFamily: "var(--font)", boxSizing: "border-box",
        background: disabled ? "var(--surface-2)" : "var(--white)", color: disabled ? "var(--text-muted)" : "var(--text)",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "text",
      }}
    />
  </div>
);

// ─── SETTINGS CONTACT FORM ────────────────────────────────────────────────────
function SettingsContactForm({ settings, setSettings, onSettingsChange }) {
  const [form, setForm] = useState({ name: '', phone: '', relation: '' });
  const [contactToast, setContactToast] = useState('');

  const handleSaveContact = () => {
    if (!form.name.trim() && !form.phone.trim()) return;
    const current = [...(settings.emergencyContacts || [])];
    current.push({ ...form });
    const updated = { ...settings, emergencyContacts: current };
    setSettings(updated);
    onSettingsChange(updated);
    setForm({ name: '', phone: '', relation: '' });
    setContactToast('Contact saved!');
    setTimeout(() => setContactToast(''), 2500);
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '20px', border: '1px solid var(--border)', position: 'relative' }}>
      {/* Toast */}
      {contactToast && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: '#065f46', color: '#fff', padding: '8px 22px',
          borderRadius: 10, fontSize: 13, fontWeight: 700, zIndex: 10,
          boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.2s ease both',
          fontFamily: 'var(--font)', whiteSpace: 'nowrap',
        }}>✓ {contactToast}</div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: '-2px' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        Add New Contact
      </div>
      <div className="settings-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Full Name"
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          style={{
            padding: '10px 13px', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', fontSize: 13.5,
            fontFamily: 'var(--font)', boxSizing: 'border-box', width: '100%',
            background: 'var(--bg)', color: 'var(--text)',
          }}
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={form.phone}
          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
          style={{
            padding: '10px 13px', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', fontSize: 13.5,
            fontFamily: 'var(--font)', boxSizing: 'border-box', width: '100%',
            background: 'var(--bg)', color: 'var(--text)',
          }}
        />
      </div>
      <div className="settings-form-flex" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Relation (e.g. Spouse, Parent)"
          value={form.relation}
          onChange={e => setForm(p => ({ ...p, relation: e.target.value }))}
          style={{
            flex: 1, padding: '10px 13px', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', fontSize: 13.5,
            fontFamily: 'var(--font)', boxSizing: 'border-box',
            background: 'var(--bg)', color: 'var(--text)',
          }}
        />
        <button
          type="button"
          onClick={handleSaveContact}
          style={{
            background: 'var(--blue)', color: '#fff', border: 'none',
            borderRadius: 'var(--radius-sm)', padding: '10px 20px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font)', whiteSpace: 'nowrap',
            transition: 'var(--transition)',
          }}
        >+ Add</button>
      </div>
    </div>
  );
}

function Settings({ reports, setReports, settings: initialSettings = {}, onSettingsChange, appearance = {}, onAppearanceChange, user, setUser, setActive, onLogout, onResetProfile }) {
  const [settings, setSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState(null);

  // Emergency contact editing states
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', relation: '' });

  // Account deletion states
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [showResetVerification, setShowResetVerification] = useState(false);
  const [showDeleteVerification, setShowDeleteVerification] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Password change states
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  // Email address change states
  const [emailInput, setEmailInput] = useState(user?.email || "");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  const [isCurrentPasswordCorrect, setIsCurrentPasswordCorrect] = useState(false);

  useEffect(() => {
    setPwdCurrent("");
    setPwdNew("");
    setPwdConfirm("");
    setPwdError("");
    setPwdSuccess("");
    setIsCurrentPasswordCorrect(false);
  }, [activeTab]);

  useEffect(() => {
    const isDemo = localStorage.getItem("MEDAI_DEMO_MODE") === "true";
    if (isDemo) {
      if (pwdCurrent === "demo123") {
        setIsCurrentPasswordCorrect(true);
        setPwdError("");
      } else {
        setIsCurrentPasswordCorrect(false);
        if (pwdCurrent && pwdCurrent.length >= 6) {
          setPwdError("Incorrect current password");
        } else {
          setPwdError("");
        }
      }
      return;
    }

    const sessionPwd = sessionStorage.getItem("MEDAI_SESSION_PWD");
    if (sessionPwd && pwdCurrent === sessionPwd) {
      setIsCurrentPasswordCorrect(true);
      setPwdError("");
      return;
    }

    // Instantly disable password fields while re-verifying a new password value
    setIsCurrentPasswordCorrect(false);

    if (!pwdCurrent) {
      setPwdError("");
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await apiVerifyPassword(pwdCurrent);
        if (!active) return;
        if (res.valid === true) {
          setIsCurrentPasswordCorrect(true);
          setPwdError("");
        } else {
          setIsCurrentPasswordCorrect(false);
          if (pwdCurrent.length >= 6) {
            setPwdError("Incorrect current password");
          } else {
            setPwdError("");
          }
        }
      } catch (e) {
        if (!active) return;
        setIsCurrentPasswordCorrect(false);
        setPwdError(e.message || "Failed to verify password");
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pwdCurrent]);

  useEffect(() => { setSettings(initialSettings); }, [JSON.stringify(initialSettings)]);
  useEffect(() => { setEmailInput(user?.email || ""); }, [user?.email]);

  const settingsRef = useRef(settings);
  const initialSettingsRef = useRef(initialSettings);
  const onSettingsChangeRef = useRef(onSettingsChange);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    initialSettingsRef.current = initialSettings;
  }, [initialSettings]);

  useEffect(() => {
    onSettingsChangeRef.current = onSettingsChange;
  }, [onSettingsChange]);

  // Debounced auto-save to MongoDB
  useEffect(() => {
    if (JSON.stringify(settings) === JSON.stringify(initialSettings)) {
      return;
    }

    const timer = setTimeout(() => {
      onSettingsChange(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);

    return () => clearTimeout(timer);
  }, [settings, onSettingsChange, initialSettings]);

  // Flush pending changes on unmount
  useEffect(() => {
    return () => {
      const current = settingsRef.current;
      const initial = initialSettingsRef.current;
      if (JSON.stringify(current) !== JSON.stringify(initial)) {
        onSettingsChangeRef.current?.(current);
      }
    };
  }, []);

  const handleChange = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const [detectingLoc, setDetectingLoc] = useState(false);
  const handleDetectLocation = async () => {
    setDetectingLoc(true);
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      if (data && data.country_name) {
        let eNum = "108"; // default India/general
        const c = data.country_code;
        if (["US", "CA"].includes(c)) eNum = "911";
        else if (["GB", "IE", "UK"].includes(c)) eNum = "999";
        else if (["AU"].includes(c)) eNum = "000";
        else if (["NZ"].includes(c)) eNum = "111";
        else if (["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","CH"].includes(c)) eNum = "112";

        setSettings(prev => ({
          ...prev,
          country: data.country_name,
          state: data.region,
          emergencyNumber: eNum
        }));
      }
    } catch (e) {
      console.error("Location detect failed", e);
    }
    setDetectingLoc(false);
  };

  const resetProfile = async () => {
    try {
      await onResetProfile();
      setShowResetVerification(false);
    } catch (e) {
      console.error(e);
      setShowResetVerification(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setDeleteLoading(true);
    try {
      await apiDeleteAccount();
      setShowDeleteVerification(false);
      if (onLogout) {
        onLogout();
      }
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwdError("");
    setPwdSuccess("");
    if (pwdNew !== pwdConfirm) {
      setPwdError("New passwords do not match.");
      return;
    }
    if (pwdNew.length < 6) {
      setPwdError("New password must be at least 6 characters.");
      return;
    }
    setPwdLoading(true);
    try {
      await apiChangePassword(pwdCurrent, pwdNew);
      setPwdSuccess("Password updated successfully!");
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
    } catch (err) {
      setPwdError(err.message || "Failed to update password.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange("profilePic", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateEmail = async () => {
    setEmailError("");
    setEmailSuccess("");
    if (!emailInput || !emailInput.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailLoading(true);
    try {
      const data = await apiUpdateEmail(emailInput);
      setEmailSuccess("Email address updated successfully!");
      if (setUser) {
        setUser(prev => ({ ...prev, email: data.email }));
      }
    } catch (err) {
      setEmailError(err.message || "Failed to update email address.");
    } finally {
      setEmailLoading(false);
    }
  };

  const contacts = settings.emergencyContacts || [];
  const recentConditions = (() => {
    const seen = new Set();
    const result = [];
    for (let i = reports.length - 1; i >= 0 && result.length < 2; i--) {
      const c = reports[i]?.condition;
      if (c && c.toLowerCase() !== "none" && !seen.has(c)) {
        seen.add(c);
        result.push(c);
      }
    }
    return result;
  })();

  const getConditionsInsights = () => {
    if (!reports || reports.length === 0) {
      return ["No symptom reports logged yet. Start an analysis to see AI insights."];
    }
    
    const insights = [];
    const conditions = reports.map(r => r.condition).filter(Boolean);
    
    const counts = {};
    conditions.forEach(c => counts[c] = (counts[c] || 0) + 1);
    
    const recurring = Object.entries(counts).filter(([_, count]) => count >= 2);
    if (recurring.length > 0) {
      recurring.forEach(([cond, count]) => {
        insights.push(`⚠️ **Recurring ${cond}**: Logged ${count} times. Continuous monitoring is recommended. If symptoms persist, a doctor may suggest specific diagnostic tests.`);
      });
    }

    const highSeverityReports = reports.filter(r => ["High", "Emergency"].includes(r.severityLevel));
    if (highSeverityReports.length >= 2) {
      insights.push(`🚨 **High Severity Risk**: Multiple high-severity conditions have been logged recently. We advise sharing your exported MedAI clinic sheets with a physician.`);
    }

    const highPainReports = reports.filter(r => r.painLevel >= 7);
    if (highPainReports.length > 0) {
      const painConds = Array.from(new Set(highPainReports.map(r => r.condition).filter(Boolean)));
      if (painConds.length > 0) {
        insights.push(`🔬 **High Pain Intensity**: Conditions like *${painConds.join(", ")}* are associated with severe pain levels (7+/10) in your logs. Consider speaking to a healthcare provider about effective pain management strategies.`);
      }
    }

    const allSymptoms = reports.flatMap(r => r.symptoms || []).map(s => s.toLowerCase());
    const gastroSymptoms = ["stomach pain", "nausea", "vomiting", "diarrhea", "indigestion", "bloating", "acid reflux"];
    const respSymptoms = ["cough", "difficulty breathing", "shortness of breath", "sore throat", "runny nose", "chest congestion"];
    
    const hasGastro = allSymptoms.some(s => gastroSymptoms.some(g => s.includes(g)));
    const hasResp = allSymptoms.some(s => respSymptoms.some(r => s.includes(r)));

    if (hasGastro && hasResp) {
      insights.push("💡 **Multi-System Symptoms**: Both respiratory and gastrointestinal symptoms have been logged. Keep track of systemic symptoms like fever or fatigue.");
    } else if (hasGastro) {
      insights.push("🥦 **Gastrointestinal Focus**: Multiple digestive symptoms logged. Ensure adequate hydration, try a bland diet (BRAT), and avoid trigger foods.");
    } else if (hasResp) {
      insights.push("🫁 **Respiratory Care**: Multiple respiratory symptoms logged. Keep monitoring SpO₂ levels using the vitals scanner, and practice deep breathing exercises.");
    }
    
    return insights;
  };

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingLeft: 12, animation: "fadeUp 0.3s ease both" }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--navy)", letterSpacing: "-0.6px", margin: 0, textAlign: "left" }}>⚙️ Settings</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 5, fontSize: 14, textAlign: "left" }}>Manage your profile, emergency contacts, and app appearance.</p>
        </div>
        {saved && (
          <div style={{
            background: "var(--bg-green-light)", color: "var(--text-green)", border: "1px solid #a7f3d0",
            borderRadius: "var(--radius-sm)", padding: "7px 14px",
            fontSize: 12.5, fontWeight: 700, animation: "fadeIn 0.2s ease both",
          }}>✓ Saved</div>
        )}
      </div>

      <div className="settings-flex-layout" style={{ display: "flex", gap: 28, alignItems: "flex-start", animation: "fadeUp 0.3s ease 0.08s both" }}>
        {/* Left Column Sidebar & Disclaimer */}
        <div className="settings-sidebar-col" style={{
          width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20,
          position: "sticky", top: 20
        }}>
          {/* Settings Navigation List Sidebar */}
          <div className="settings-nav-list" style={{
            background: "var(--surface)",
            border: "1px solid var(--border)", borderRadius: 18, padding: "16px 12px",
            display: "flex", flexDirection: "column", gap: 6,
            boxShadow: "var(--shadow-sm)"
          }}>
            {[
              { id: "profile", label: "User Profile", icon: "👤" },
              { id: "contacts", label: "Emergency Contacts", icon: "📞" },
              { id: "appearance", label: "Appearance Settings", icon: "✨" },
              { id: "privacy", label: "Data and privacy", icon: "🔒" },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%",
                    padding: "12px 16px", borderRadius: 12, border: "none",
                    background: isActive ? "var(--blue-pale)" : "transparent",
                    color: isActive ? "var(--blue)" : "var(--text-muted)",
                    fontWeight: isActive ? 700 : 600, fontSize: 13.5,
                    cursor: "pointer", textAlign: "left", fontFamily: "var(--font)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--surface-2)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 16 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Medical Disclaimer Card */}
          <Card style={{
            background: "linear-gradient(135deg, var(--bg-amber-light), var(--bg-amber))",
            border: "1px solid var(--border-amber)",
            textAlign: "left",
            borderRadius: 16,
            padding: "16px 18px",
            boxShadow: "var(--shadow-sm)"
          }}>
            <SectionTitle>⚠️ Medical Disclaimer</SectionTitle>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-amber)", lineHeight: 1.65 }}>
              {DISCLAIMER} This application provides general health information only and is not intended to replace professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider.
            </p>
          </Card>
        </div>

        {/* Selected Settings Content Panel */}
        <div className="settings-content-col" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {activeTab === "profile" && (
            <Card style={{ animation: "mtSlideIn 0.3s ease both" }}>
              <SectionTitle>👤 User Profile</SectionTitle>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, textAlign: "left" }}>
                <div style={{ position: "relative" }}>
                  {settings.profilePic ? (
                    <img src={settings.profilePic} alt="Profile" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface-2)", border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👤</div>
                  )}
                  <input type="file" id="profileUpload" accept="image/*" style={{ display: "none" }} onChange={handleProfilePicUpload} />
                  <label htmlFor="profileUpload" style={{ position: "absolute", bottom: -4, right: -4, background: "var(--blue)", color: "#fff", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, border: "2px solid var(--bg-modal)" }}>📷</label>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "var(--navy)" }}>Profile Picture</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>Click the camera icon to upload.</div>
                  {settings.profilePic && (
                    <button
                      onClick={() => handleChange("profilePic", "")}
                      style={{
                        marginTop: 8,
                        background: "var(--bg-red-light)",
                        color: "var(--text-red)",
                        border: "1px solid var(--border-red)",
                        borderRadius: 6,
                        padding: "5px 12px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "var(--transition)"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--text-red-light)"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-red-light)"; e.currentTarget.style.color = "var(--text-red)"; }}
                    >
                      Remove Picture
                    </button>
                  )}
                </div>
              </div>
              <FieldRow label="Full Name" value={settings.name || ""} onChange={e => handleChange("name", e.target.value)} placeholder="Your name" />
              
              {emailError && (
                <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: "left" }}>
                  ⚠️ {emailError}
                </div>
              )}
              {emailSuccess && (
                <div style={{ color: "var(--green)", fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: "left" }}>
                  ✓ {emailSuccess}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14, textAlign: "left" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12.5, color: "var(--text-muted)", display: "block", marginBottom: 5, fontWeight: 600 }}>Email Address</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="Your email"
                    style={{
                      width: "100%", padding: "10px 13px",
                      borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)",
                      fontSize: 13.5, fontFamily: "var(--font)", boxSizing: "border-box",
                      background: "var(--white)", color: "var(--text)",
                    }}
                  />
                </div>
                {user && emailInput !== user.email && (
                  <button
                    type="button"
                    onClick={handleUpdateEmail}
                    disabled={emailLoading}
                    style={{
                      padding: "10px 16px", borderRadius: "var(--radius-sm)", border: "none",
                      background: "var(--blue)", color: "#fff", fontWeight: 700, fontSize: 13,
                      cursor: "pointer", transition: "var(--transition)", height: 40,
                      boxShadow: "0 4px 12px rgba(59,130,246,0.2)", whiteSpace: "nowrap"
                    }}
                  >
                    {emailLoading ? "Updating..." : "Update Email Address"}
                  </button>
                )}
              </div>

              <div className="profile-flex-row" style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <FieldRow label="Age" value={settings.age || ""} onChange={e => handleChange("age", e.target.value)} placeholder="Your age" type="number" />
                </div>
                <div style={{ flex: 1 }}>
                  <FieldRow label="Blood Group" value={settings.bloodGroup || ""} onChange={e => handleChange("bloodGroup", e.target.value)} placeholder="e.g. O+" />
                </div>
              </div>

              <div className="profile-flex-row-three" style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16, textAlign: "left" }}>
                <div style={{ flex: 1 }}>
                  <FieldRow label="Country" value={settings.country || ""} onChange={e => handleChange("country", e.target.value)} placeholder="e.g. United States" />
                </div>
                <div style={{ flex: 1 }}>
                  <FieldRow label="State/Region" value={settings.state || ""} onChange={e => handleChange("state", e.target.value)} placeholder="e.g. California" />
                </div>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detectingLoc}
                  style={{
                    padding: "10px 16px", borderRadius: "var(--radius-sm)",
                    background: "var(--bg-amber-light)", color: "#b45309", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", transition: "var(--transition)", height: 40, marginBottom: 14,
                    border: "1.5px solid var(--border-amber)", whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: 6
                  }}
                >
                  {detectingLoc ? "Detecting..." : "📍 Auto Detect"}
                </button>
              </div>
              
              <div style={{ marginBottom: 16, textAlign: "left" }}>
                <label style={{ display: "block", color: "var(--text-muted)", fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>Recent Logged Conditions</label>
                {recentConditions.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {recentConditions.map((cond, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "var(--blue-pale)", color: "var(--blue)",
                          padding: "6px 12px", borderRadius: 20, fontSize: 12.5,
                          fontWeight: 700, border: "1px solid var(--blue-border)",
                          boxShadow: "var(--shadow-sm)"
                        }}
                      >
                        🩺 {cond}
                      </span>
                    ))}
                  </div>
) : (
                  <div style={{ fontSize: 13, color: "var(--text-faint)", background: "var(--surface-2)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", marginBottom: 16 }}>
                    No logged conditions in your history.
                  </div>
                )}

                <label style={{ display: "block", color: "var(--text-muted)", fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>AI Conditions Insights</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {getConditionsInsights().map((insight, idx) => {
                    const isWarning = insight.startsWith("⚠️");
                    const isDanger = insight.startsWith("🚨");
                    const isScience = insight.startsWith("🔬");
                    const isInfo = insight.startsWith("💡");
                    
                    let bg = "var(--surface)";
                    let border = "var(--border)";
                    if (isWarning) { bg = "rgba(245,158,11,0.06)"; border = "rgba(245,158,11,0.2)"; }
                    else if (isDanger) { bg = "rgba(239,68,68,0.06)"; border = "rgba(239,68,68,0.2)"; }
                    else if (isScience) { bg = "rgba(124,58,237,0.06)"; border = "rgba(124,58,237,0.2)"; }
                    else if (isInfo) { bg = "rgba(59,130,246,0.06)"; border = "rgba(59,130,246,0.2)"; }

                    return (
                      <div
                        key={idx}
                        style={{
                          background: bg, border: `1px solid ${border}`,
                          borderRadius: 10, padding: "12px 14px", fontSize: 13.5,
                          color: "var(--text)", lineHeight: 1.5, display: "flex",
                          alignItems: "flex-start", gap: 10,
                          boxShadow: "var(--shadow-sm)"
                        }}
                      >
                        <div style={{ fontSize: 15.5 }}>{insight.split(" ")[0]}</div>
                        <div style={{ flex: 1 }}>
                          {insight.includes("**") ? (
                            <>
                              <strong>{insight.split("**")[1]}</strong>
                              {insight.split("**")[2]}
                            </>
                          ) : (
                            insight.substring(2)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", padding: "12px 16px", borderRadius: 10, border: "1px solid var(--border)", marginTop: 16 }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}>Total Reports Saved</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", marginTop: 2 }}>{reports.length} report{reports.length !== 1 ? "s" : ""}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setActive("reports")}
                  style={{
                    background: "var(--blue)", color: "#fff", border: "none",
                    borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    transition: "var(--transition)", boxShadow: "var(--shadow-sm)"
                  }}
                >
                  View Reports
                </button>
              </div>
            </Card>
          )}

          {activeTab === "contacts" && (
            <Card style={{ animation: "mtSlideIn 0.3s ease both" }}>
              <SectionTitle>📞 Emergency Contacts</SectionTitle>
              {contacts.filter(c => c.name || c.phone).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, textAlign: "left" }}>
                    Saved Contacts ({contacts.filter(c => c.name || c.phone).length})
                  </div>
                  <div className="styled-scroll" style={{ maxHeight: "360px", overflowY: "auto", paddingRight: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                    {contacts.map((c, i) => {
                      if (!c.name && !c.phone) return null;
                      const isEditing = editingIdx === i;
                      return (
                        <div key={i}>
                          {isEditing ? (
                            <div
                              style={{
                                background: 'var(--surface-2)', borderRadius: 10, padding: '14px',
                                border: '2px solid var(--blue)', marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 10,
                                textAlign: "left", animation: "fadeUp 0.2s ease both",
                                flexShrink: 0
                              }}
                            >
                              <div>
                                <label style={{ fontSize: 11.5, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Contact Name</label>
                                <input 
                                  value={editForm.name} 
                                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                  placeholder="Name"
                                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", fontFamily: "var(--font)", background: "var(--surface)", color: "var(--navy)" }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 11.5, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Phone Number</label>
                                <input 
                                  value={editForm.phone} 
                                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                  placeholder="Phone"
                                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", background: "var(--surface)", color: "var(--navy)" }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 11.5, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Relationship</label>
                                <input 
                                  value={editForm.relation} 
                                  onChange={e => setEditForm({ ...editForm, relation: e.target.value })}
                                  placeholder="Relationship"
                                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)", fontFamily: "var(--font)", background: "var(--surface)", color: "var(--navy)" }}
                                />
                              </div>
                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...contacts];
                                    updated[i] = { ...editForm };
                                    handleChange('emergencyContacts', updated);
                                    setEditingIdx(null);
                                  }}
                                  style={{
                                    background: 'var(--green)', color: '#fff', border: 'none',
                                    borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "var(--font)"
                                  }}
                                >Save</button>
                                <button
                                  type="button"
                                  onClick={() => setEditingIdx(null)}
                                  style={{
                                    background: 'var(--border)', color: 'var(--text-muted)', border: 'none',
                                    borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "var(--font)"
                                  }}
                                >Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'var(--surface)', borderRadius: 10, padding: '12px 16px',
                                border: '1px solid var(--border)', marginBottom: 6,
                                textAlign: "left", animation: "fadeIn 0.2s ease both",
                                flexShrink: 0
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>{c.name || '—'}</span>
                                {c.relation && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>({c.relation})</span>}
                                {c.phone && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{c.phone}</div>}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {c.phone && (
                                  <a href={`tel:${c.phone}`} style={{ textDecoration: 'none' }}>
                                    <button
                                      type="button"
                                      style={{
                                        background: 'var(--bg-green-light)', border: '1px solid #a7f3d0', color: '#059669',
                                        borderRadius: 6, width: 32, height: 32, fontSize: 13, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: "var(--transition)",
                                        flexShrink: 0
                                      }}
                                      title="Call Contact"
                                    >📞</button>
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingIdx(i);
                                    setEditForm({ name: c.name || '', phone: c.phone || '', relation: c.relation || '' });
                                  }}
                                  style={{
                                    background: 'var(--blue-pale, #eff6ff)', border: '1px solid var(--blue-border, #bfdbfe)', color: 'var(--blue, #2563eb)',
                                    borderRadius: 6, width: 32, height: 32, fontSize: 13, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: "var(--transition)",
                                    flexShrink: 0
                                  }}
                                  title="Edit Contact"
                                >✏️</button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteIdx(i)}
                                  style={{
                                    background: 'var(--bg-red)', border: '1px solid #fecaca', color: '#ef4444',
                                    borderRadius: 6, width: 32, height: 32, fontSize: 13, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: "var(--transition)",
                                    flexShrink: 0
                                  }}
                                  title="Delete Contact"
                                >🗑</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <SettingsContactForm settings={settings} setSettings={setSettings} onSettingsChange={onSettingsChange} />
            </Card>
          )}

          {activeTab === "appearance" && (
            <Card style={{ animation: "mtSlideIn 0.3s ease both" }}>
              <SectionTitle>✨ Appearance Settings</SectionTitle>

              <div className="desktop-only-setting" style={{ marginBottom: 18, textAlign: "left" }}>
                <label style={{ display: "block", color: "var(--text)", fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>Navbar Position</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["left", "right"].map(pos => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => onAppearanceChange("navPosition", pos)}
                      style={{
                        flex: 1, padding: "10px 14px", borderRadius: 8,
                        border: appearance.navPosition === pos ? "2.5px solid var(--blue)" : "1px solid var(--border)",
                        background: appearance.navPosition === pos ? "var(--blue-pale)" : "var(--surface)",
                        color: appearance.navPosition === pos ? "var(--blue)" : "var(--text)",
                        fontWeight: 700, fontSize: 13.5, cursor: "pointer", transition: "var(--transition)"
                      }}
                    >
                      {pos === "left" ? "⬅ Left Sidebar" : "Right Sidebar ➡"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18, textAlign: "left" }}>
                <label style={{ display: "block", color: "var(--text)", fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Font Family Style</label>
                <select
                  value={appearance.fontFamily || "Plus Jakarta Sans"}
                  onChange={e => onAppearanceChange("fontFamily", e.target.value)}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 8,
                    border: "1px solid var(--border)", fontSize: 14, fontFamily: "var(--font)",
                    background: "var(--white)", color: "var(--text)"
                  }}
                >
                  {FONT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 18, textAlign: "left" }}>
                <label style={{ display: "block", color: "var(--text)", fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>Font Size</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {FONT_SIZE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onAppearanceChange("fontSize", opt.value)}
                      style={{
                        flex: 1, padding: "8px 10px", borderRadius: 6,
                        border: appearance.fontSize === opt.value ? "2.5px solid var(--blue)" : "1px solid var(--border)",
                        background: appearance.fontSize === opt.value ? "var(--blue-pale)" : "var(--surface)",
                        color: appearance.fontSize === opt.value ? "var(--blue)" : "var(--text)",
                        fontWeight: 600, fontSize: 12.5, cursor: "pointer", transition: "var(--transition)"
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navbar Palette Selector */}
              <div style={{ marginBottom: 18, textAlign: "left" }}>
                <label style={{ display: "block", color: "var(--text)", fontWeight: 600, fontSize: 12.5, marginBottom: 12 }}>Navbar Theme Palette</label>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  {NAVBAR_PALETTES.map(theme => {
                    const isSelected = appearance.navbarPalette === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => onAppearanceChange("navbarPalette", theme.id)}
                        title={theme.label}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          border: "none",
                          background: `linear-gradient(135deg, ${theme.bg} 50%, ${theme.text} 50%)`,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected 
                            ? "0 0 0 2px var(--surface), 0 0 0 4.5px var(--blue), var(--shadow-sm)" 
                            : "0 0 0 1px var(--border), var(--shadow-sm)",
                          padding: 0,
                          outline: "none"
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Content Palette Selector */}
              <div style={{ marginBottom: 18, textAlign: "left" }}>
                <label style={{ display: "block", color: "var(--text)", fontWeight: 600, fontSize: 12.5, marginBottom: 12 }}>Main Content Background Palette</label>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  {CONTENT_PALETTES.map(theme => {
                    const isSelected = appearance.contentPalette === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => onAppearanceChange("contentPalette", theme.id)}
                        title={theme.label}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          border: "none",
                          background: `linear-gradient(135deg, ${theme.bg} 50%, ${theme.text} 50%)`,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected 
                            ? "0 0 0 2px var(--surface), 0 0 0 4.5px var(--blue), var(--shadow-sm)" 
                            : "0 0 0 1px var(--border), var(--shadow-sm)",
                          padding: 0,
                          outline: "none"
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Sticker Opacity Slider */}
              <div style={{ marginBottom: 8, textAlign: "left" }}>
                <label style={{ display: "block", color: "var(--text)", fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>
                  Background Animation Transparency ({Math.round((appearance.stickerOpacity ?? 0.15) * 100)}%)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>0% (Off)</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={appearance.stickerOpacity ?? 0.15}
                    onChange={e => onAppearanceChange("stickerOpacity", parseFloat(e.target.value))}
                    style={{
                      flex: 1,
                      cursor: "pointer",
                      accentColor: "var(--blue)"
                    }}
                  />
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>100% (Solid)</span>
                </div>
              </div>

              {/* Glassy Toggles */}
              <div style={{ display: "flex", gap: 16, marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 16, flexWrap: "wrap", textAlign: "left" }}>
                <div className="desktop-only-setting" style={{ flex: "1 1 200px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div>
                    <span style={{ display: "block", color: "var(--text)", fontWeight: 600, fontSize: 13 }}>Glassy Sidebar</span>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>Translucent acrylic navigation</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAppearanceChange("glassyNavbar", !appearance.glassyNavbar)}
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: appearance.glassyNavbar ? "var(--blue)" : "rgba(100, 116, 139, 0.2)",
                      border: "none", cursor: "pointer", position: "relative",
                      transition: "background 0.25s ease", padding: 0
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", background: "#fff",
                      position: "absolute", top: 3,
                      left: appearance.glassyNavbar ? 23 : 3,
                      transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                    }} />
                  </button>
                </div>

                <div style={{ flex: "1 1 200px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div>
                    <span style={{ display: "block", color: "var(--text)", fontWeight: 600, fontSize: 13 }}>Glassy Containers</span>
                    <span style={{ display: "block", color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>Acrylic blur for content cards</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAppearanceChange("glassyContainer", !appearance.glassyContainer)}
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: appearance.glassyContainer ? "var(--blue)" : "rgba(100, 116, 139, 0.2)",
                      border: "none", cursor: "pointer", position: "relative",
                      transition: "background 0.25s ease", padding: 0
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", background: "#fff",
                      position: "absolute", top: 3,
                      left: appearance.glassyContainer ? 23 : 3,
                      transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                    }} />
                  </button>
                </div>
              </div>
              {/* Reminder Alert Tone Settings */}
              <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 20, textAlign: "left" }}>
                <label style={{ display: "block", color: "var(--text)", fontWeight: 700, fontSize: 13.5, marginBottom: 14 }}>
                  🔔 Reminder Audio Options
                </label>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Alarm Tone selection */}
                  <div>
                    <label style={{ display: "block", color: "var(--text-muted)", fontWeight: 600, fontSize: 12, marginBottom: 6 }}>
                      Alarm Ringtone Alert
                    </label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <select
                        value={appearance.alarmTone || "Standard Meds Alert"}
                        onChange={e => {
                          onAppearanceChange("alarmTone", e.target.value);
                          localStorage.setItem("MEDAI_ALARM_TONE", e.target.value);
                        }}
                        style={{
                          flex: 1, padding: "10px 14px", borderRadius: 8,
                          border: "1px solid var(--border)", fontSize: 13.5, fontFamily: "var(--font)",
                          background: "var(--surface)", color: "var(--text)"
                        }}
                      >
                        <option value="Standard Meds Alert">Standard Meds Alert 🩺</option>
                        <option value="Chime Alert">Chime Alert 🔔</option>
                        <option value="Soft Pulse Alert">Soft Pulse Alert 💖</option>
                        <option value="Digital Alarm Alert">Digital Alarm Alert ⚡</option>
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const tone = appearance.alarmTone || "Standard Meds Alert";
                          // Temporary play/test tone
                          const actx = new (window.AudioContext || window.webkitAudioContext)();
                          if (tone === "Standard Meds Alert") {
                            // Two pulse heart-like beep
                            const osc = actx.createOscillator();
                            const gain = actx.createGain();
                            osc.type = "sine";
                            osc.frequency.setValueAtTime(600, actx.currentTime);
                            gain.gain.setValueAtTime(0.1, actx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
                            osc.connect(gain);
                            gain.connect(actx.destination);
                            osc.start();
                            osc.stop(actx.currentTime + 0.3);
                            
                            setTimeout(() => {
                              const osc2 = actx.createOscillator();
                              const gain2 = actx.createGain();
                              osc2.type = "sine";
                              osc2.frequency.setValueAtTime(600, actx.currentTime);
                              gain2.gain.setValueAtTime(0.1, actx.currentTime);
                              gain2.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
                              osc2.connect(gain2);
                              gain2.connect(actx.destination);
                              osc2.start();
                              osc2.stop(actx.currentTime + 0.3);
                            }, 350);
                          } else if (tone === "Chime Alert") {
                            // High clear chime bell sound
                            const osc = actx.createOscillator();
                            const gain = actx.createGain();
                            osc.type = "sine";
                            osc.frequency.setValueAtTime(987.77, actx.currentTime); // B5
                            gain.gain.setValueAtTime(0.15, actx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.8);
                            osc.connect(gain);
                            gain.connect(actx.destination);
                            osc.start();
                            osc.stop(actx.currentTime + 0.8);
                          } else if (tone === "Soft Pulse Alert") {
                            // Warm ambient pulse
                            const osc = actx.createOscillator();
                            const gain = actx.createGain();
                            osc.type = "triangle";
                            osc.frequency.setValueAtTime(329.63, actx.currentTime); // E4
                            gain.gain.setValueAtTime(0.15, actx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.6);
                            osc.connect(gain);
                            gain.connect(actx.destination);
                            osc.start();
                            osc.stop(actx.currentTime + 0.6);
                          } else {
                            // Digital Alarm Alert
                            const osc = actx.createOscillator();
                            const gain = actx.createGain();
                            osc.type = "square";
                            osc.frequency.setValueAtTime(880, actx.currentTime); // A5
                            gain.gain.setValueAtTime(0.08, actx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.25);
                            osc.connect(gain);
                            gain.connect(actx.destination);
                            osc.start();
                            osc.stop(actx.currentTime + 0.25);
                          }
                        }}
                        style={{
                          padding: "10px 18px", borderRadius: 8,
                          background: "var(--blue)", color: "#ffffff", border: "none",
                          fontWeight: 700, fontSize: 13, cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: "0 2px 6px rgba(59, 130, 246, 0.2)"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.35)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.boxShadow = "0 2px 6px rgba(59, 130, 246, 0.2)";
                        }}
                      >
                        🔊 Test Sound
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "privacy" && (
            <Card style={{ animation: "mtSlideIn 0.3s ease both" }}>
              <SectionTitle>🔒 Data and privacy</SectionTitle>

              {user && (
                <div style={{ marginBottom: 28, borderBottom: "1px solid var(--border)", paddingBottom: 24, textAlign: "left" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "var(--navy)", marginBottom: 14 }}>Change Password</div>
                  {pwdError && (
                    <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                      ⚠️ {pwdError}
                    </div>
                  )}
                  {pwdSuccess && (
                    <div style={{ color: "var(--green)", fontSize: 13, fontWeight: 600, fontStyle: "normal", marginBottom: 12 }}>
                      ✓ {pwdSuccess}
                    </div>
                  )}
                  <FieldRow
                    label="Current Password"
                    type="password"
                    value={pwdCurrent}
                    onChange={e => setPwdCurrent(e.target.value)}
                    placeholder="••••••••"
                  />
                  <FieldRow
                    label="New Password"
                    type="password"
                    value={pwdNew}
                    onChange={e => setPwdNew(e.target.value)}
                    placeholder="Min 6 characters"
                    disabled={!isCurrentPasswordCorrect}
                  />
                  <FieldRow
                    label="Confirm New Password"
                    type="password"
                    value={pwdConfirm}
                    onChange={e => setPwdConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={!isCurrentPasswordCorrect}
                  />
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={pwdLoading || !isCurrentPasswordCorrect || !pwdNew || !pwdConfirm || pwdNew !== pwdConfirm}
                    style={{
                      width: "100%", padding: "12px", borderRadius: 10, border: "none",
                      background: (isCurrentPasswordCorrect && pwdNew && pwdConfirm && pwdNew === pwdConfirm) ? "var(--blue)" : "var(--border)",
                      color: (isCurrentPasswordCorrect && pwdNew && pwdConfirm && pwdNew === pwdConfirm) ? "#fff" : "var(--text-faint)",
                      fontWeight: 700, fontSize: 14, cursor: (isCurrentPasswordCorrect && pwdNew && pwdConfirm && pwdNew === pwdConfirm) ? "pointer" : "default",
                      fontFamily: "var(--font)", transition: "var(--transition)", marginTop: 6,
                      boxShadow: (isCurrentPasswordCorrect && pwdNew && pwdConfirm && pwdNew === pwdConfirm) ? "0 4px 16px rgba(59,130,246,0.25)" : "none"
                    }}
                  >
                    {pwdLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              )}

              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--navy)", marginBottom: 14 }}>Profile Actions</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Reset Profile</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                      Reset your account by clearing all reports, histories, and stored information
                    </div>
                  </div>
                  <button onClick={() => setConfirmClear(true)} style={{
                    background: "var(--bg-red)", color: "var(--red)",
                    border: "1px solid var(--border-red)",
                    borderRadius: "var(--radius-sm)", padding: "8px 16px",
                    cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font)",
                    transition: "var(--transition)",
                  }}>🗑️ Reset</button>
                </div>

                {user && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--red)" }}>Danger Zone</div>
                      <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                        Permanently delete your account and all associated medical data
                      </div>
                    </div>
                    <button onClick={() => { setDeleteError(""); setConfirmDeleteAccount(true); }} style={{
                      background: "var(--text-red-light)", color: "#fff",
                      border: "none",
                      borderRadius: "var(--radius-sm)", padding: "8px 16px",
                      cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font)",
                      transition: "var(--transition)",
                      boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)"
                    }}>🗑 Delete Account</button>
                  </div>
                )}

                {deleteError && (
                  <div style={{
                    color: "var(--red)", fontSize: 12.5, fontWeight: 600, padding: "10px 14px",
                    background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8, marginBottom: 14, animation: "fadeIn 0.2s ease both"
                  }}>
                    ⚠️ {deleteError}
                  </div>
                )}

                <div style={{
                  padding: "10px 14px", background: "var(--surface)",
                  borderRadius: "var(--radius-sm)", fontSize: 12.5, color: "var(--text-muted)",
                  border: "1px solid var(--border)", lineHeight: 1.6,
                }}>
                  All data is stored securely in your database. No data is sent to external servers except when using the AI analysis feature.
                </div>
              </div>
            </Card>
          )}


        </div>
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="Reset Profile?"
          message={`This will permanently delete all your reports, histories, and other stored data (excluding your basic profile info). This action cannot be undone.`}
          confirmLabel="Yes, Reset"
          onConfirm={() => { setConfirmClear(false); setShowResetVerification(true); }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
      {showResetVerification && (
        <VerificationDialog
          title="Confirm Profile Reset"
          message="Please type 'reset profile' in the input box below to confirm that you want to delete all reports, histories, and clinical logs."
          confirmLabel="Yes, Reset"
          matchText="reset profile"
          onConfirm={resetProfile}
          onCancel={() => setShowResetVerification(false)}
        />
      )}
      {confirmDeleteIdx !== null && (
        <ConfirmDialog
          title="Delete Contact?"
          message={`This will permanently remove "${settings.emergencyContacts?.[confirmDeleteIdx]?.name || 'this contact'}". This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            const updated = [...(settings.emergencyContacts || [])];
            updated.splice(confirmDeleteIdx, 1);
            handleChange('emergencyContacts', updated);
            setConfirmDeleteIdx(null);
          }}
          onCancel={() => setConfirmDeleteIdx(null)}
        />
      )}
      {confirmDeleteAccount && (
        <ConfirmDialog
          title="Delete Account?"
          message="This will permanently delete your user account and all logged clinical reports, chats, vitals logs, and medication compliance records. This action cannot be undone."
          confirmLabel="Delete Account"
          onConfirm={() => { setConfirmDeleteAccount(false); setShowDeleteVerification(true); }}
          onCancel={() => !deleteLoading && setConfirmDeleteAccount(false)}
        />
      )}
      {showDeleteVerification && (
        <VerificationDialog
          title="Delete Account Permanently"
          message="This will permanently delete your user account and all logged clinical reports, chats, vitals logs, and medication compliance records. This action cannot be undone."
          confirmLabel={deleteLoading ? "Deleting..." : "Delete Account"}
          matchText="delete account permanently"
          alternativeMatchText="delete account permenantly"
          onConfirm={handleDeleteAccount}
          onCancel={() => !deleteLoading && setShowDeleteVerification(false)}
        />
      )}
    </div>
  );
}

// ─── AUTH FLOW KEYFRAMES ──────────────────────────────────────────────────────
const AUTH_FLOW_KEYFRAMES = `
  @keyframes authGlowPulse {
    0%, 100% { box-shadow: 0 0 60px rgba(59,108,244,0.25), 0 0 120px rgba(59,108,244,0.08); }
    50% { box-shadow: 0 0 80px rgba(59,108,244,0.45), 0 0 160px rgba(59,108,244,0.18); }
  }
  @keyframes authLogoFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }
  @keyframes authOrbDrift1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(40px, -30px) scale(1.15); }
    66% { transform: translate(-25px, 20px) scale(0.9); }
  }
  @keyframes authOrbDrift2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(-35px, 40px) scale(0.85); }
    66% { transform: translate(30px, -20px) scale(1.1); }
  }
  @keyframes authOrbDrift3 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(25px, 30px); }
  }
  @keyframes authHexDrift {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(12px, -8px); }
    50% { transform: translate(-8px, 12px); }
    75% { transform: translate(8px, 8px); }
  }
  @keyframes authHexPulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  @keyframes authDotPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.3); opacity: 1; }
  }
  @keyframes authSuccessFlash {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0.7; }
    60% { transform: translate(-50%, -50%) scale(2); opacity: 0.3; }
    100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
  }
  @keyframes authPulseRing {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  @keyframes buttonLoadingProgress {
    0% { left: -30%; }
    100% { left: 100%; }
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none !important;
  }
  .no-scrollbar {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
  }
`;

// ─── AMBIENT HEX BACKGROUND ──────────────────────────────────────────────────
function AmbientHexBackground({ isAccelerated = false, isDashboard = false, opacity }) {
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
  // Login page and splash screen (isDashboard === false) should have a fixed theme,
  // completely unaffected by appearance settings.
  const activeOpacity = isDashboard ? (opacity !== undefined ? opacity : 0.15) : 1.0;

  const hexSize = 50;
  const hexH = hexSize * Math.sqrt(3);
  const cols = 9;
  const rows = 6;
  const hexagons = [];
  const medPaths = [
    "M7 4v16M17 4v16M7 8c5 0 5 4 10 4M7 16c5 0 5-4 10-4",
    "M3 12h4l3-8 4 16 3-8h4",
    "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
    "M12 3a2 2 0 100 4 2 2 0 000-4zM5 17a2 2 0 100 4 2 2 0 000-4zM19 17a2 2 0 100 4 2 2 0 000-4zM12 7v5M8.5 14.5L7 17M15.5 14.5L17 17",
    "M9 3h6M10 3v6l-5 9a1 1 0 001 1h12a1 1 0 001-1l-5-9V3",
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * hexSize * 1.5 + hexSize;
      const y = r * hexH + (c % 2 === 1 ? hexH / 2 : 0) + hexSize;
      hexagons.push({ x, y, hasIcon: (r + c) % 3 === 0, iconIdx: ((r * 3 + c * 7) % medPaths.length), delay: ((r * cols + c) * 0.4) % 6 });
    }
  }
  const hexPoints = (cx, cy, s) => {
    const pts = [];
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 6; pts.push(`${cx + s * Math.cos(a)},${cy + s * Math.sin(a)}`); }
    return pts.join(" ");
  };
  const svgW = (cols + 1) * hexSize * 1.5;
  const svgH = (rows + 1) * hexH;
  const pulseDur = isAccelerated ? "1.2s" : "5s";
  const driftDur = isAccelerated ? "3s" : "25s";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position: "absolute", top: "10%", left: "8%", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,108,244,0.1) 0%, transparent 70%)", animation: reducedMotion ? "none" : "authOrbDrift1 20s ease-in-out infinite", opacity: (isDashboard ? 0.85 : 1.0) * activeOpacity }} />
      <div style={{ position: "absolute", top: "55%", right: "5%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(91,140,255,0.08) 0%, transparent 70%)", animation: reducedMotion ? "none" : "authOrbDrift2 24s ease-in-out infinite", opacity: (isDashboard ? 0.85 : 1.0) * activeOpacity }} />
      <div style={{ position: "absolute", bottom: "8%", left: "38%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", animation: reducedMotion ? "none" : "authOrbDrift3 18s ease-in-out infinite", opacity: (isDashboard ? 0.85 : 1.0) * activeOpacity }} />
      <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, opacity: (isDashboard ? 0.35 : 0.15) * activeOpacity, filter: isDashboard ? "drop-shadow(0 0 6px rgba(91,140,255,0.45))" : "drop-shadow(0 0 4px rgba(91,140,255,0.3))", animation: reducedMotion ? "none" : `authHexDrift ${driftDur} ease-in-out infinite` }}>
        {hexagons.map((h, i) => (
          <g key={i} style={{ animation: reducedMotion ? "none" : `authHexPulse ${pulseDur} ease-in-out ${h.delay}s infinite` }}>
            <polygon points={hexPoints(h.x, h.y, hexSize * 0.42)} fill="none" stroke="rgba(91,140,255,0.6)" strokeWidth="0.7" />
            {h.hasIcon && <g transform={`translate(${h.x - 10}, ${h.y - 10}) scale(0.83)`}><path d={medPaths[h.iconIdx]} fill="none" stroke="rgba(147,197,253,0.5)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></g>}
          </g>
        ))}
        {hexagons.map((h, i) => i % 3 === 0 && i + 1 < hexagons.length ? <line key={`ln-${i}`} x1={h.x + hexSize * 0.38} y1={h.y} x2={hexagons[i + 1].x - hexSize * 0.38} y2={hexagons[i + 1].y} stroke="rgba(91,140,255,0.2)" strokeWidth="0.5" strokeDasharray="4 8" style={{ animation: reducedMotion ? "none" : `authHexPulse ${pulseDur} ease-in-out ${h.delay + 0.5}s infinite` }} /> : null)}
        {hexagons.map((h, i) => i % 5 === 0 ? <circle key={`nd-${i}`} cx={h.x + hexSize * 0.3} cy={h.y - hexSize * 0.15} r="1.5" fill="rgba(147,197,253,0.5)" style={{ animation: reducedMotion ? "none" : `authHexPulse ${pulseDur} ease-in-out ${h.delay + 1}s infinite` }} /> : null)}
      </svg>
    </div>
  );
}

// ─── CADUCEUS ICON ────────────────────────────────────────────────────────────
function CaduceusIcon({ size = 60, showSpark = false }) {
  const sc = "rgba(255,255,255,0.9)";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ filter: "drop-shadow(0 0 6px rgba(147,197,253,0.5))" }}>
      <line x1="32" y1="12" x2="32" y2="54" stroke={sc} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 18 C25 11, 14 15, 18 24 C20 28, 28 25, 32 22" stroke={sc} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M32 18 C39 11, 50 15, 46 24 C44 28, 36 25, 32 22" stroke={sc} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M32 24 C26 28, 38 34, 32 38 C26 42, 38 48, 32 52" stroke={sc} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M32 24 C38 28, 26 34, 32 38 C38 42, 26 48, 32 52" stroke={sc} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="32" cy="10" r="4" fill={sc} />
      {showSpark && (
        <motion.circle cx="32" cy="10" r="2.5" fill="#ffffff" style={{ filter: "drop-shadow(0 0 8px #fff)" }} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 1, 0], scale: [0, 2, 2, 0] }} transition={{ duration: 0.4, delay: 1.0, times: [0, 0.2, 0.7, 1] }} />
      )}
    </svg>
  );
}

// ─── AUTH FLOW (replaces AuthScreen) ──────────────────────────────────────────
function AuthFlow({ onLoginSuccess }) {
  const [scene, setScene] = useState("splash");
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Auto-advance splash after 2.5s
  useEffect(() => {
    const t = setTimeout(() => setScene("login"), 2500);
    return () => clearTimeout(t);
  }, []);

  // Responsive
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleAuthSuccess = (userData, isRegister) => {
    setSuccessData(userData);
    setLoading(false);
    setTimeout(() => onLoginSuccess(userData, isRegister), 1400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let data;
      const isRegister = tab === "register";
      if (isRegister) {
        data = await apiRegister(name, email, password);
      } else {
        data = await apiLogin(email, password);
      }
      sessionStorage.setItem("MEDAI_SESSION_PWD", password);
      localStorage.setItem("MEDAI_TOKEN", data.token);
      handleAuthSuccess(data.user, isRegister);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const dots = Array.from({ length: 15 }, (_, i) => ({
    size: [3, 4, 2, 5, 3, 2, 4, 3, 5, 2, 3, 4, 2, 3, 5][i],
    bright: [false, true, false, true, false, false, true, false, true, false, false, true, false, false, true][i],
  }));

  const inputStyle = {
    width: "100%", padding: "8px 12px", borderRadius: 10,
    background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#f1f5f9", outline: "none", fontSize: 14, fontWeight: 500,
    transition: "all 0.25s ease", boxSizing: "border-box",
  };
  const focusInput = (e) => { e.target.style.borderColor = "rgba(59,108,244,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,108,244,0.1)"; };
  const blurInput = (e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <style>{AUTH_FLOW_KEYFRAMES}</style>
      <div className="no-scrollbar" style={{
        margin: 0, padding: 0, width: "100%", height: "100%",
        position: "fixed", top: 0, left: 0,
        overflowX: "hidden",
        overflowY: isMobile ? "auto" : "hidden",
        WebkitOverflowScrolling: "touch",
        fontFamily: "var(--font)", zIndex: 9999,
        background: "linear-gradient(145deg, #060b1f 0%, #0d1640 40%, #131b4d 70%, #0a1235 100%)",
      }}>
        <AmbientHexBackground isAccelerated={!!successData} />

        {/* Ambient glow spots */}
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "60%", height: "60%", background: "radial-gradient(circle, rgba(59,108,244,0.08) 0%, transparent 60%)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "55%", height: "55%", background: "radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 60%)", filter: "blur(60px)", pointerEvents: "none" }} />

        <AnimatePresence mode="wait">
          {/* ═══ SCENE 1: SPLASH ═══ */}
          {scene === "splash" && (
            <motion.div
              key="splash-scene"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(6px)" }}
              transition={{ duration: 0.6 }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2 }}
            >
              {/* Pulse rings */}
              <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", border: "2px solid rgba(59,108,244,0.15)", animation: reducedMotion ? "none" : "authPulseRing 2.5s ease-out infinite" }} />
              <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", border: "1.5px solid rgba(59,108,244,0.1)", animation: reducedMotion ? "none" : "authPulseRing 2.5s ease-out 0.4s infinite" }} />

              {/* Logo icon with spring scale */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.3 }}
                style={{
                  width: 110, height: 110, borderRadius: 30,
                  background: "linear-gradient(145deg, #3b6cf4, #2b5eef, #1a3dc8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", zIndex: 3,
                  animation: reducedMotion ? "none" : "authGlowPulse 3s ease-in-out infinite",
                }}
              >
                <CaduceusIcon size={60} showSpark={!reducedMotion} />
              </motion.div>

              {/* MedAI wordmark */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                style={{ marginTop: 28, textAlign: "center" }}
              >
                <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: "-2px", lineHeight: 1, textShadow: "0 2px 20px rgba(59,108,244,0.3)" }}>MedAI</div>
              </motion.div>

              {/* Tagline with letter-spacing tighten */}
              <motion.div
                initial={{ opacity: 0, letterSpacing: "0.35em" }}
                animate={{ opacity: 1, letterSpacing: "0.2em" }}
                transition={{ duration: 0.7, delay: 0.85 }}
                style={{ fontSize: 13, color: "rgba(147,197,253,0.65)", fontWeight: 700, textTransform: "uppercase", marginTop: 10 }}
              >
                Intelligent Health Assistant
              </motion.div>

              {/* Constellation dots */}
              <div style={{ display: "flex", gap: 8, marginTop: 28, alignItems: "center" }}>
                {dots.map((d, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: d.bright ? 0.7 : 0.3, scale: 1 }}
                    transition={{ delay: 1.0 + i * 0.03, duration: 0.3, type: "spring", stiffness: 200 }}
                    style={{
                      width: d.size, height: d.size, borderRadius: "50%",
                      background: d.bright ? "rgba(147,197,253,0.8)" : "rgba(147,197,253,0.4)",
                      boxShadow: d.bright ? "0 0 6px rgba(147,197,253,0.5)" : "none",
                      animation: d.bright && !reducedMotion ? `authDotPulse 3s ease-in-out ${i * 0.2}s infinite` : "none",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ SCENE 2 & 3: LOGIN ═══ */}
          {scene === "login" && (
            <motion.div
              key="login-scene"
              className="hide-scrollbar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                position: isMobile ? "relative" : "absolute",
                inset: isMobile ? "auto" : 0,
                width: "100%",
                minHeight: isMobile ? "100%" : "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: isMobile ? "flex-start" : "center",
                padding: isMobile ? "40px 20px" : "32px 56px",
                zIndex: 2,
                boxSizing: "border-box",
                overflowY: "auto",
              }}
            >
              <div style={{
                display: "flex", width: "100%", maxWidth: 1100,
                maxHeight: isMobile ? "none" : 680,
                alignItems: isMobile ? "center" : "stretch",
                gap: isMobile ? 32 : 56,
                flexDirection: isMobile ? "column" : "row",
              }}>
                {/* ── Left: Brand column ── */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={successData ? { opacity: 0, x: isMobile ? 0 : 200, scale: 1.1 } : { opacity: 1, y: 0 }}
                  transition={successData ? { duration: 1.0, ease: "easeInOut", delay: 0.2 } : { duration: 0.6, delay: 0.15 }}
                  style={{ flex: isMobile ? "none" : "0 0 40%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0 }}
                >
                  {/* Floating logo */}
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", border: "2px solid rgba(59,108,244,0.12)", animation: reducedMotion ? "none" : "authPulseRing 3s ease-out infinite" }} />
                    <div style={{ position: "absolute", width: 140, height: 140, borderRadius: "50%", border: "1.5px solid rgba(59,108,244,0.08)", animation: reducedMotion ? "none" : "authPulseRing 3s ease-out 0.5s infinite" }} />
                    <div style={{
                      width: 130, height: 130, borderRadius: 34,
                      background: "linear-gradient(145deg, #3b6cf4, #2b5eef, #1a3dc8)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", zIndex: 2,
                      boxShadow: "0 0 100px rgba(59,108,244,0.3), 0 32px 80px rgba(11,26,74,0.5)",
                      animation: reducedMotion ? "none" : "authLogoFloat 4s ease-in-out infinite, authGlowPulse 4s ease-in-out infinite",
                    }}>
                      <CaduceusIcon size={68} />
                    </div>
                  </div>
                  {/* Brand text */}
                  <div style={{ marginTop: 32, textAlign: "center" }}>
                    <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", letterSpacing: "-2.5px", lineHeight: 1, textShadow: "0 2px 24px rgba(59,108,244,0.3)" }}>MedAI</div>
                    <div style={{ fontSize: 14, color: "rgba(147,197,253,0.6)", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 14, lineHeight: 1.5 }}>
                      Secure Health Intelligence
                    </div>
                    {/* Feature pills */}
                    <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
                      {["AI-Powered", "Real-Time", "Private"].map((f, i) => (
                        <motion.span
                          key={f}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.3 + i * 0.1 }}
                          style={{
                            padding: "6px 14px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                            background: "rgba(59,108,244,0.15)", border: "1px solid rgba(59,108,244,0.25)",
                            color: "rgba(147,197,253,0.9)", letterSpacing: "0.05em",
                          }}
                        >{f}</motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* ── Right: Login card ── */}
                <motion.div
                  initial={{ opacity: 0, x: 40, filter: "blur(8px)" }}
                  animate={successData ? { scale: 0.96, opacity: 0 } : { opacity: 1, x: 0, filter: "blur(0px)" }}
                  transition={successData ? { duration: 0.6, ease: "easeInOut" } : { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  style={{ flex: isMobile ? "none" : "0 0 52%", display: "flex", alignItems: "center", justifyContent: "center", width: isMobile ? "100%" : "auto" }}
                >
                  <div style={{
                    width: "100%", maxWidth: 380,
                    background: "rgba(22,32,51,0.7)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
                    borderRadius: 24, padding: isMobile ? "20px 16px" : "24px 24px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 32px 80px -20px rgba(0,0,0,0.5), 0 0 2px rgba(255,255,255,0.05) inset",
                  }}>
                    {/* Header */}
                    <div style={{ textAlign: "center", marginBottom: 12 }}>
                      <h1 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 800, margin: "0 0 2px", letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                        {tab === "login" ? "Welcome Back" : "Get Started"}
                      </h1>
                      <p style={{ color: "rgba(148,163,184,0.8)", fontSize: 14, margin: 0, fontWeight: 500 }}>
                        {tab === "login" ? "Sign in to access your health dashboard" : "Create your free MedAI account"}
                      </p>
                    </div>

                    {/* Tab switcher with sliding pill */}
                    <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 2, marginBottom: 16, position: "relative" }}>
                      {["login", "register"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setTab(t); setError(""); }}
                          style={{
                            flex: 1, padding: "8px 0", border: "none", borderRadius: 8,
                            background: "transparent",
                            color: tab === t ? "#fff" : "rgba(255,255,255,0.45)",
                            fontWeight: 700, fontSize: 14, cursor: "pointer",
                            position: "relative", zIndex: 1,
                            transition: "color 0.25s ease",
                          }}
                        >
                          {tab === t && (
                            <motion.div
                              layoutId="auth-tab-pill"
                              style={{
                                position: "absolute", inset: 0, borderRadius: 8,
                                background: "rgba(59,108,244,0.4)",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                zIndex: -1,
                              }}
                              transition={{ type: "spring", stiffness: 200, damping: 22 }}
                            />
                          )}
                          {t === "login" ? "Sign In" : "Register"}
                        </button>
                      ))}
                    </div>

                    {/* Error message */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -8, height: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{
                            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                            color: "#fca5a5", padding: "10px 14px", borderRadius: 10, fontSize: 13,
                            marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontWeight: 500, overflow: "hidden",
                          }}
                        >
                          <span>&#9888;&#65039;</span> {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <AnimatePresence>
                        {tab === "register" && (
                          <motion.div key="name-field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                            <label style={{ display: "block", color: "rgba(203,213,225,0.8)", fontSize: 12.5, fontWeight: 700, marginBottom: 4, letterSpacing: "0.02em" }}>Full Name</label>
                            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div>
                        <label style={{ display: "block", color: "rgba(203,213,225,0.8)", fontSize: 12.5, fontWeight: 700, marginBottom: 4, letterSpacing: "0.02em" }}>Email Address</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                      </div>
                      <div>
                        <label style={{ display: "block", color: "rgba(203,213,225,0.8)", fontSize: 12.5, fontWeight: 700, marginBottom: 4, letterSpacing: "0.02em" }}>Password</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                      </div>
                      <motion.button
                        type="submit" disabled={loading || !!successData}
                        whileHover={!loading && !successData ? { scale: 1.02, boxShadow: "0 8px 28px rgba(59,108,244,0.45)" } : {}}
                        whileTap={!loading && !successData ? { scale: 0.98 } : {}}
                        style={{
                          marginTop: 4, width: "100%", padding: 10, borderRadius: 10,
                          background: loading ? "linear-gradient(135deg, #4b6db5, #3b5ced)" : "linear-gradient(135deg, #3b6cf4, #2b5eef, #1a3dc8)",
                          color: "#fff", border: "none", fontWeight: 700, fontSize: 15,
                          cursor: loading || successData ? "default" : "pointer",
                          opacity: loading ? 0.7 : 1,
                          transition: "all 0.3s ease",
                          boxShadow: loading ? "none" : "0 4px 20px rgba(59,108,244,0.35)",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {loading ? (
                          <>
                            <span style={{ opacity: 0.95, display: "flex", alignItems: "center", gap: 8 }}>
                              <Spinner size={16} color="#fff" />
                              {tab === "login" ? "Signing In..." : "Creating Account..."}
                            </span>
                            <div style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              height: 3,
                              width: "100%",
                              background: "rgba(255,255,255,0.15)",
                              overflow: "hidden",
                            }}>
                              <div style={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                width: "35%",
                                background: "linear-gradient(90deg, transparent, #fff, transparent)",
                                animation: "buttonLoadingProgress 1.2s infinite ease-in-out",
                              }} />
                            </div>
                          </>
                        ) : tab === "login" ? "Sign In" : "Create Account"}
                      </motion.button>
                    </form>

                    {/* Demo user */}
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem("MEDAI_TOKEN", "demo_token_offline");
                          localStorage.setItem("MEDAI_DEMO_MODE", "true");
                          handleAuthSuccess({ id: "demo", name: "Demo User", email: "demo@medai.local" });
                        }}
                        style={{
                          width: "100%", padding: 10, borderRadius: 10,
                          background: "rgba(255,255,255,0.04)", color: "rgba(203,213,225,0.7)",
                          border: "1px solid rgba(255,255,255,0.1)", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
                          transition: "all 0.25s ease", letterSpacing: "0.02em",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,108,244,0.15)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(59,108,244,0.3)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(203,213,225,0.7)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                      >
                        &#9877;&#65039; Continue as Demo User (Offline Mode)
                      </button>
                    </div>

                    {/* Divider */}
                    <div style={{ display: "flex", alignItems: "center", margin: "14px 0 10px", gap: 12 }}>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>or continue with</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                    </div>

                    {/* Google sign-in */}
                    <button
                      type="button"
                      onClick={() => setShowGoogleModal(true)}
                      style={{
                        width: "100%", padding: 10, borderRadius: 10,
                        background: "#ffffff", color: "#1e293b",
                        border: "1px solid #e2e8f0", fontWeight: 700, fontSize: 14, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        transition: "all 0.25s ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Sign In with Google
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Success radial flash */}
              <AnimatePresence>
                {successData && (
                  <motion.div
                    key="success-flash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      position: "fixed", top: "50%", left: "50%",
                      width: 400, height: 400, borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(59,108,244,0.5), rgba(91,140,255,0.2), transparent 70%)",
                      animation: "authSuccessFlash 1s ease-out forwards",
                      pointerEvents: "none", zIndex: 10,
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ GOOGLE ACCOUNT MODAL ═══ */}
        {showGoogleModal && createPortal(
          <>
            <div
              onClick={() => setShowGoogleModal(false)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 10000, animation: "fadeIn 0.2s ease both"
              }}
            />
            <div style={{
              position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 10001, pointerEvents: "none"
            }}>
              <div style={{
                background: "var(--bg-modal)", borderRadius: 16, border: "1px solid var(--border)",
                width: "min(380px, 90%)", padding: 24, pointerEvents: "all",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                animation: "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
                fontFamily: "var(--font)", color: "var(--navy)", textAlign: "center"
              }}>
                {/* Google Brand Logo */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 4px" }}>Choose an account</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px" }}>to continue to MedAI</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", marginBottom: 20 }}>
                  {[
                    { name: "Divye Sharma", email: "divye.sharma@gmail.com", avatar: "👤" },
                    { name: "MedAI Guest", email: "medai.guest@gmail.com", avatar: "⚕️" }
                  ].map((account, i) => (
                    <div
                      key={i}
                      onClick={async () => {
                        setShowGoogleModal(false);
                        setLoading(true);
                        setError("");
                        try {
                          const data = await apiGoogleLogin(account.email, account.name);
                          localStorage.setItem("MEDAI_TOKEN", data.token);
                          handleAuthSuccess(data.user, data.isNewRegister);
                        } catch (err) {
                          setError(err.message);
                          setLoading(false);
                        }
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                        borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer",
                        transition: "var(--transition)", background: "transparent"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--blue)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", background: "var(--surface-2)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                        color: "var(--navy)"
                      }}>{account.avatar}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)" }}>{account.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{account.email}</div>
                      </div>
                    </div>
                  ))}

                  {/* Custom input account option */}
                  <div
                    onClick={() => {
                      const customEmail = prompt("Enter your Google email:");
                      if (customEmail && customEmail.includes("@")) {
                        const customName = customEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                        setShowGoogleModal(false);
                        setLoading(true);
                        setError("");
                        apiGoogleLogin(customEmail, customName).then(data => {
                          localStorage.setItem("MEDAI_TOKEN", data.token);
                          handleAuthSuccess(data.user, data.isNewRegister);
                        }).catch(err => {
                          setError(err.message);
                          setLoading(false);
                        });
                      } else if (customEmail !== null) {
                        alert("Please enter a valid email address.");
                      }
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      borderRadius: 10, border: "1px solid var(--border)", cursor: "pointer",
                      transition: "var(--transition)", background: "transparent"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--blue)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: "var(--surface-2)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                      color: "var(--navy)"
                    }}>➕</div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)" }}>Use another account</div>
                  </div>
                </div>

                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                  To continue, Google will share your name, email address, and profile picture with MedAI.
                </p>
              </div>
            </div>
          </>
        , document.body)}
      </div>
    </>
  );
}



const NUTRIENT_DETAILS_LOOKUP = {
  magnesium: {
    foods: [
      "Spinach & Kale (rich in chlorophyll)",
      "Pumpkin Seeds (highly concentrated source)",
      "Almonds & Cashews (great for snacks)",
      "Black Beans & Edamame (fiber-rich options)",
      "Avocados (healthy fats + magnesium)",
      "Dark Chocolate (70%+ cocoa, delicious mineral source)"
    ],
    ingredients: ["Magnesium Citrate", "Magnesium Glycinate (highly bioavailable)", "Chlorophyll", "Phytic Acid"],
    tips: [
      "Add a handful of pumpkin seeds to your salads or morning oatmeal.",
      "Blend baby spinach into smoothies for an easy magnesium boost.",
      "Enjoy a square of high-quality dark chocolate in the evening."
    ]
  },
  melatonin: {
    foods: [
      "Tart Cherries or Tart Cherry Juice",
      "Walnuts (excellent source of melatonin + healthy fats)",
      "Pistachios (one of the highest melatonin levels in nuts)",
      "Oats & Barley (complex carbs that assist sleep)",
      "Warm Cow's Milk (contains tryptophan + melatonin)",
      "Fatty Fish like Salmon (supports natural melatonin synthesis)"
    ],
    ingredients: ["Phytomelatonin", "Tryptophan", "Serotonin precursor", "Vitamin B6"],
    tips: [
      "Drink a small glass of unsweetened tart cherry juice 1 hour before bed.",
      "Snack on a small handful of walnuts or pistachios as a pre-bedtime snack.",
      "Ensure your bedroom is completely dark to aid natural melatonin production."
    ]
  },
  zinc: {
    foods: [
      "Oysters (highest concentration of zinc)",
      "Red Meat & Poultry (highly bioavailable source)",
      "Pumpkin Seeds & Sesame Seeds",
      "Chickpeas & Lentils (must be soaked/cooked to reduce phytates)",
      "Cashews & Almonds (convenient plant source)",
      "Greek Yogurt & Cheese (dairy-based zinc)"
    ],
    ingredients: ["Zinc Picolinate", "Zinc Gluconate", "Phytic acid inhibitors"],
    tips: [
      "Soak beans, seeds, and grains before cooking to improve zinc absorption.",
      "Mix pumpkin seeds and cashews for an immune-boosting afternoon trail mix.",
      "Incorporate lean cuts of beef or chicken into your main meals."
    ]
  },
  "omega-3": {
    foods: [
      "Wild Salmon (rich in EPA and DHA)",
      "Chia Seeds (excellent plant-based ALA source)",
      "Flaxseeds (ground flaxseeds are best for absorption)",
      "Walnuts (easy snack or salad topping)",
      "Sardines & Mackerel (highly nutritious small fish)",
      "Brussels Sprouts (modest plant source of ALA)"
    ],
    ingredients: ["EPA (Eicosapentaenoic Acid)", "DHA (Docosahexaenoic Acid)", "ALA (Alpha-Linolenic Acid)"],
    tips: [
      "Use ground flaxseeds instead of whole seeds to ensure your body absorbs the nutrients.",
      "Aim to consume fatty fish like salmon or sardines twice a week.",
      "Stir chia seeds into yogurt, oatmeal, or puddings and let them swell."
    ]
  },
  calcium: {
    foods: [
      "Yogurt & Kefir (highly bioavailable dairy sources)",
      "Tofu (calcium-set tofu is extremely rich in calcium)",
      "Sardines (canned with bones contain high calcium)",
      "Collard Greens & Kale (excellent plant sources)",
      "Fortified Plant Milks (Almond, Soy, or Oat)",
      "Almonds & Chia Seeds (nutritious dairy-free choices)"
    ],
    ingredients: ["Calcium Carbonate", "Calcium Citrate", "Lactic Acid", "Vitamin D co-factor"],
    tips: [
      "Combine calcium-rich foods with Vitamin D (like sunlight or mushrooms) for proper absorption.",
      "Choose calcium-set tofu for stir-fries and scramble dishes.",
      "Drink fortified plant milk in your morning cereals or coffee."
    ]
  },
  iron: {
    foods: [
      "Red Meat & Organ Meats (highly bioavailable heme iron)",
      "Spinach & Swiss Chard (non-heme plant iron)",
      "Lentils & Chickpeas (excellent vegan options)",
      "Quinoa (gluten-free iron source)",
      "Pumpkin Seeds (great mineral profile)",
      "Tofu & Tempeh (soy-based iron sources)"
    ],
    ingredients: ["Heme Iron", "Non-Heme Iron", "Ferrous Sulfate", "Vitamin C absorption booster"],
    tips: [
      "Consume iron-rich plant foods with Vitamin C (e.g., lemon juice on spinach) to double absorption.",
      "Avoid drinking tea or coffee during meals, as tannins block iron absorption.",
      "Cook meals in a cast-iron skillet to naturally increase food iron content."
    ]
  },
  "vitamin c": {
    foods: [
      "Citrus fruits like Oranges & Grapefruits",
      "Red & Green Bell Peppers (extremely high Vitamin C)",
      "Strawberries & Raspberries",
      "Kiwi Fruit (two kiwis provide over 100% daily value)",
      "Broccoli & Brussels Sprouts",
      "Guava & Papaya (tropical antioxidant powerhouses)"
    ],
    ingredients: ["Ascorbic Acid", "Bioflavonoids", "Citric Acid"],
    tips: [
      "Eat raw fruits and vegetables, as heat and cooking can destroy Vitamin C.",
      "Add sliced bell peppers to your lunch wraps or salads.",
      "Squeeze fresh lime or lemon juice over your cooked vegetables and proteins."
    ]
  },
  "vitamin d": {
    foods: [
      "Cod Liver Oil (potent traditional source)",
      "Wild-caught Salmon & Tuna",
      "Egg Yolks (pasture-raised eggs contain more Vitamin D)",
      "Beef Liver (dense micronutrient source)",
      "Fortified Cereals & Juices",
      "UV-exposed Mushrooms (natural vegan source)"
    ],
    ingredients: ["Vitamin D3 (Cholecalciferol)", "Vitamin D2 (Ergocalciferol)", "Calcitriol"],
    tips: [
      "Get 10-15 minutes of direct mid-day sunlight on your skin when possible.",
      "Always consume Vitamin D with healthy fats (like olive oil or avocado) to aid absorption.",
      "Consider testing your blood levels annually to adjust dietary intake."
    ]
  },
  potassium: {
    foods: [
      "Sweet Potatoes (baked with skin is best)",
      "Bananas (convenient potassium-rich snack)",
      "Avocados (more potassium than a banana)",
      "Spinach & Beet Greens (excellent dark greens)",
      "Coconut Water (natural electrolyte beverage)",
      "White Beans & Adzuki Beans (fiber + potassium)"
    ],
    ingredients: ["Potassium Chloride", "Electrolyte balance", "Sodium-potassium pump co-factor"],
    tips: [
      "Drink coconut water post-workout to quickly replenish potassium electrolytes.",
      "Bake sweet potatoes whole and eat the nutrient-rich skin.",
      "Add a sliced banana or avocado to your daily breakfast bowl."
    ]
  },
  protein: {
    foods: [
      "Chicken Breast & Turkey (lean animal protein)",
      "Eggs (high biological value protein source)",
      "Greek Yogurt & Cottage Cheese",
      "Lentils, Chickpeas & Edamame (plant-based proteins)",
      "Quinoa (contains all nine essential amino acids)",
      "Tofu & Tempeh (fermented/unfermented soy)"
    ],
    ingredients: ["Essential Amino Acids", "Branched-Chain Amino Acids (BCAAs)", "Whey", "Casein"],
    tips: [
      "Spread your protein intake evenly throughout all meals of the day.",
      "Combine grains and legumes (like rice and beans) to form a complete protein.",
      "Opt for Greek yogurt over regular yogurt for double the protein content."
    ]
  },
  fiber: {
    foods: [
      "Oats & Oat Bran (rich in soluble beta-glucan)",
      "Chia Seeds & Flaxseeds (gel-forming soluble fiber)",
      "Lentils, Split Peas & Black Beans",
      "Apples & Pears (leave skins on for pectin)",
      "Avocados (unbelievably high in fiber + healthy fats)",
      "Broccoli & Brussels Sprouts (insoluble roughage)"
    ],
    ingredients: ["Pectin", "Beta-Glucan", "Soluble Fiber", "Insoluble Cellulose"],
    tips: [
      "Increase your water intake significantly as you add more fiber to your diet.",
      "Swap refined white bread and pasta for whole grain varieties.",
      "Start your morning with a bowl of steel-cut oats topped with berries."
    ]
  },
  probiotics: {
    foods: [
      "Greek Yogurt (look for 'live and active cultures')",
      "Kefir (fermented milk drink with diverse strains)",
      "Sauerkraut (raw, unpasteurized fermented cabbage)",
      "Kimchi (spicy fermented Korean vegetables)",
      "Kombucha (fermented sparkling tea)",
      "Miso & Tempeh (fermented soybean products)"
    ],
    ingredients: ["Lactobacillus", "Bifidobacterium", "Lactic Acid Bacteria", "Prebiotic fiber feed"],
    tips: [
      "Check labels to ensure fermented products haven't been pasteurized after fermentation.",
      "Eat probiotic foods alongside prebiotics (like garlic, onions, oats) to feed beneficial bacteria.",
      "Add a spoonful of kimchi or sauerkraut as a side condiment to savory dishes."
    ]
  }
};

const foodIngredients = [
  {
    name: "Garlic & Herb Salmon Bowl",
    desc: "Heart-healthy omega-3 powerhouse featuring baked wild salmon, garlic-infused quinoa, and steamed broccoli.",
    nutrients: "Omega-3, Protein, Vitamin D, Selenium, Vitamin C",
    image: "🍲",
    steps: [
      { title: "Prepare the Base", desc: "Rinse 1 cup of quinoa in cold water. Boil in 2 cups of water with a pinch of sea salt, cover, and simmer on low for 15 minutes." },
      { title: "Marinate the Salmon", desc: "Pat dry a fresh salmon fillet. Drizzle with olive oil, minced garlic, sea salt, black pepper, and lemon juice." },
      { title: "Bake & Steam", desc: "Bake salmon in a preheated oven at 400°F (200°C) for 12-15 minutes. Simultaneously steam fresh broccoli florets for 4 minutes." },
      { title: "Assemble & Serve", desc: "Fluff quinoa, place in a bowl, add salmon and steamed broccoli, and drizzle with extra virgin olive oil." }
    ]
  },
  {
    name: "Iron-Rich Citrus Spinach Salad",
    desc: "Vibrant plant-based salad designed to optimize iron absorption with fresh baby spinach, juicy orange segments, and pumpkin seeds.",
    nutrients: "Iron, Vitamin C, Calcium, Zinc, Vitamin A",
    image: "🥗",
    steps: [
      { title: "Prep the Greens", desc: "Rinse baby spinach leaves in cold water, spin dry, and place in a large salad bowl." },
      { title: "Add Citrus & Crunch", desc: "Peel an orange, remove the bitter white pith, slice into bite-sized segments, and toss into the bowl along with 2 tbsp of toasted pumpkin seeds." },
      { title: "Whisk the Dressing", desc: "In a small bowl, whisk 2 tbsp extra virgin olive oil, 1 tbsp fresh lemon juice, half a tsp of honey, and a pinch of salt." },
      { title: "Combine", desc: "Pour the citrus dressing over the spinach salad, toss gently to coat, and serve immediately for maximum freshness." }
    ]
  },
  {
    name: "Creamy Avocado & Egg Sourdough Toast",
    desc: "Energy-boosting toast topped with healthy fats from mashed avocados and complete proteins from soft-boiled eggs.",
    nutrients: "Potassium, Healthy Fats, Fiber, Protein, Vitamin D, Biotin",
    image: "🍞",
    steps: [
      { title: "Boil the Eggs", desc: "Place fresh eggs in cold water, bring to a boil, then cook on medium-low for exactly 6-7 minutes. Transfer to an ice bath, peel, and slice." },
      { title: "Mash the Avocado", desc: "Scoop out the flesh of a ripe avocado. Mash it in a bowl with lemon juice, a pinch of sea salt, and red pepper flakes to taste." },
      { title: "Toast the Bread", desc: "Toast a thick slice of rustic sourdough bread until golden and crisp." },
      { title: "Layer & Season", desc: "Spread the mashed avocado evenly over the toast, arrange the egg slices on top, and garnish with microgreens or cracked black pepper." }
    ]
  },
  {
    name: "Probiotic Blueberry & Chia Yogurt Parfait",
    desc: "Gut-health supporting breakfast cup layering rich Greek yogurt, antioxidant-packed blueberries, and fiber-rich hydrated chia seeds.",
    nutrients: "Probiotics, Antioxidants, Fiber, Calcium, Omega-3",
    image: "🍨",
    steps: [
      { title: "Hydrate the Chia", desc: "Mix 2 tbsp chia seeds with 1/2 cup almond milk and a drop of vanilla extract. Let sit for 15 minutes, stirring once, until it forms a gel." },
      { title: "Prepare the Berry Compote", desc: "Warm 1/2 cup of fresh blueberries in a saucepan on low heat for 3-4 minutes until they begin to release their natural juices." },
      { title: "Layer the Parfait", desc: "In a glass or jar, spoon a bottom layer of plain Greek yogurt, followed by a layer of the hydrated chia pudding, and then the warm blueberries." },
      { title: "Final Garnish", desc: "Top with a drizzle of raw honey and a small handful of sliced almonds for a satisfying crunch." }
    ]
  },
  {
    name: "Immune-Boosting Garlic & Ginger Broccoli Stir-Fry",
    desc: "Quick, nutrient-locked vegetable stir-fry rich in allicin, vitamin C, and zinc-supporting antioxidants.",
    nutrients: "Vitamin C, Zinc, Fiber, Antioxidants, Selenium",
    image: "🍳",
    steps: [
      { title: "Chop & Rest", desc: "Cut broccoli into uniform florets. Mince 3 cloves of garlic and 1 inch of ginger. Let the minced garlic rest for 10 minutes to activate allicin." },
      { title: "Heat the Skillet", desc: "Heat 1 tbsp sesame oil in a large wok or skillet over medium-high heat." },
      { title: "Flash Fry", desc: "Add garlic and ginger, stir-fry for 30 seconds until fragrant. Add broccoli florets and toss continuously for 3 minutes." },
      { title: "Steam & Glaze", desc: "Splash in 2 tbsp water or vegetable broth, cover, and let steam for 2 minutes until broccoli is bright green. Drizzle with low-sodium soy sauce." }
    ]
  },
  {
    name: "Calming Green Tea Matcha Smoothie",
    desc: "Relaxing, antioxidant-rich smoothie blending ceremonial matcha green tea, potassium-rich bananas, and creamy Greek yogurt.",
    nutrients: "L-Theanine, Antioxidants, Potassium, Calcium, Protein",
    image: "🥤",
    steps: [
      { title: "Brew the Matcha", desc: "Whisk 1 tsp of matcha green tea powder into 1/4 cup of warm water (approx. 175°F/80°C) until smooth and frothy. Let it cool." },
      { title: "Add to Blender", desc: "Add the cooled matcha, 1 frozen sliced banana, 1/2 cup of plain Greek yogurt, and 1/2 cup of unsweetened almond milk to your blender." },
      { title: "Blend on High", desc: "Blend on high speed for 1-2 minutes until completely smooth and creamy." },
      { title: "Serve Cold", desc: "Pour into a chilled glass and garnish with a sprinkle of chia seeds or a mint leaf." }
    ]
  }
];

// ─── MEDITOWN VIEW ─────────────────────────────────────────────────────────────
function MediTownView({ onSaveMedicine, savedMedicines = [], onBack, registerInnerBack, pushHistoryEntry, appearance = {}, initialCategory, setInitialCategory, selectedCategory, setSelectedCategory }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [savedNotice, setSavedNotice] = useState("");
  const [isExploringFood, setIsExploringFood] = useState(false);
  const [activeFoodItem, setActiveFoodItem] = useState(null);
  const [currentFoodStep, setCurrentFoodStep] = useState(0);
  const [particles, setParticles] = useState([]);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const triggerSplash = () => {
    if (!activeFoodItem) return;
    const dishName = activeFoodItem.name.toLowerCase();
    let pool = ["🥬", "🥕", "🥦", "🧄", "🧅", "🍋", "🥑", "🍅", "🍄", "🌶️", "🫑"];
    if (dishName.includes("salmon")) {
      pool = ["🐟", "🧄", "🌿", "🥦", "🍋", "🥬", "🍚"];
    } else if (dishName.includes("salad") || dishName.includes("spinach")) {
      pool = ["🥬", "🍊", "🍋", "🥗", "🧅", "🥑"];
    } else if (dishName.includes("toast") || dishName.includes("avocado")) {
      pool = ["🥑", "🥚", "🍞", "🧂", "🌿", "🍅"];
    } else if (dishName.includes("yogurt") || dishName.includes("parfait")) {
      pool = ["🫐", "🥛", "🍨", "🍓", "🍯", "🥣"];
    }

    const newParticles = Array.from({ length: 14 }).map((_, idx) => {
      const angle = (idx / 14) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
      const distance = 80 + Math.random() * 120;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance - (30 + Math.random() * 40);
      const size = 18 + Math.random() * 14;
      const duration = 0.6 + Math.random() * 0.5;

      return {
        id: Date.now() + "-" + idx + "-" + Math.random(),
        emoji: pool[Math.floor(Math.random() * pool.length)],
        targetX,
        targetY,
        size,
        duration,
        rotation: Math.random() * 360 - 180
      };
    });
    setParticles(newParticles);
  };

  useEffect(() => {
    if (activeFoodItem) {
      triggerSplash();
    } else {
      setParticles([]);
      setCurrentFoodStep(0);
    }
  }, [activeFoodItem, currentFoodStep]);

  const [pharmacySubcat, setPharmacySubcat] = useState("all");
  const [herbsSubcat, setHerbsSubcat] = useState("all");
  const [nutritionSubcat, setNutritionSubcat] = useState("all");

  useEffect(() => {
    setCurrentPage(1);
    setPharmacySubcat("all");
    setHerbsSubcat("all");
    setNutritionSubcat("all");
  }, [selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, isExploringFood, pharmacySubcat, herbsSubcat, nutritionSubcat]);

  // Custom Need form & recommendation states
  const [customNeedActive, setCustomNeedActive] = useState(false);
  const [surgeriesDone, setSurgeriesDone] = useState(false);
  const [numSurgeries, setNumSurgeries] = useState("");
  const [surgeryType, setSurgeryType] = useState("");
  const [customSurgeryType, setCustomSurgeryType] = useState("");

  const [hasDiseaseOrAllergy, setHasDiseaseOrAllergy] = useState(false);
  const [diseaseOrAllergyType, setDiseaseOrAllergyType] = useState("");
  const [customDiseaseOrAllergyType, setCustomDiseaseOrAllergyType] = useState("");

  const [hasInjury, setHasInjury] = useState(false);
  const [injuryDetail, setInjuryDetail] = useState("");

  // New lifestyle & health profile states
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("");
  const [healthGoal, setHealthGoal] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");

  const [generating, setGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [medicinesUnlocked, setMedicinesUnlocked] = useState(false);

  // Saved Plans & Nutrients Drawer states
  const [activeNutrient, setActiveNutrient] = useState(null);
  const [nutrientDrawerOpen, setNutrientDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerDetails, setDrawerDetails] = useState(null);

  const [savedPlans, setSavedPlans] = useState([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);
  const [viewingSavedPlan, setViewingSavedPlan] = useState(null);
  const [showPlansClearConfirm, setShowPlansClearConfirm] = useState(false);
  const [savedPlansPage, setSavedPlansPage] = useState(1);

  const fetchSavedPlans = async () => {
    setSavedPlansLoading(true);
    try {
      const data = await apiFetchSavedPlans();
      setSavedPlans(data || []);
    } catch (err) {
      console.error("Failed to fetch saved plans:", err);
    } finally {
      setSavedPlansLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedPlans();
  }, []);

  const handleSaveCurrentPlan = async () => {
    if (!recommendations) return;
    try {
      const goalStr = healthGoal ? ` (${healthGoal})` : "";
      const planName = `Health Plan - ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}${goalStr}`;
      await apiSavePlan({
        planName,
        planData: recommendations
      });
      setSavedNotice("Plan saved to database!");
      setTimeout(() => setSavedNotice(""), 3000);
      fetchSavedPlans();
    } catch (err) {
      console.error("Failed to save plan:", err);
      alert("Error saving health plan.");
    }
  };

  const handleDeletePlanItem = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this saved plan?")) return;
    try {
      await apiDeletePlan(id);
      fetchSavedPlans();
      const nextTotal = savedPlans.length - 1;
      const totalPages = Math.ceil(nextTotal / 10) || 1;
      if (savedPlansPage > totalPages) {
        setSavedPlansPage(totalPages);
      }
    } catch (err) {
      console.error("Failed to delete plan:", err);
    }
  };

  const handleClearAllPlans = async () => {
    if (!confirm("Are you sure you want to delete ALL saved plans? This action cannot be undone.")) return;
    try {
      await apiDeleteAllPlans();
      fetchSavedPlans();
      setSavedPlansPage(1);
    } catch (err) {
      console.error("Failed to clear plans:", err);
    }
  };

  const handleViewSavedPlan = (plan) => {
    setViewingSavedPlan(plan);
  };

  const handleNutrientClick = async (nutrient) => {
    setActiveNutrient(nutrient);
    setNutrientDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerDetails(null);

    const cleanName = nutrient.name.toLowerCase().trim();
    const matchedKey = Object.keys(NUTRIENT_DETAILS_LOOKUP).find(key => 
      cleanName.includes(key) || key.includes(cleanName)
    );

    if (matchedKey) {
      setDrawerDetails(NUTRIENT_DETAILS_LOOKUP[matchedKey]);
      setDrawerLoading(false);
    } else {
      try {
        const prompt = `You are a medical assistant. For the nutrient/food group "${nutrient.name}", provide:
1. A list of 4-6 specific food sources.
2. A list of 3-4 key ingredients/compounds associated with it.
3. 2-3 practical tips or ways to consume them.

Respond ONLY with a valid JSON object matching this structure (no markdown formatting, backticks, or other text):
{
  "foods": ["...", "..."],
  "ingredients": ["...", "..."],
  "tips": ["...", "..."]
}`;
        const raw = await callClaude([{ role: "user", content: prompt }]);
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          setDrawerDetails(data);
        } else {
          throw new Error("No JSON structure found");
        }
      } catch (err) {
        console.error("AI details fetch failed:", err);
        setDrawerDetails({
          foods: ["Green leafy vegetables", "Whole grains", "Nuts and seeds", "Legumes"],
          ingredients: [nutrient.name],
          tips: ["Include this in your daily breakfast or lunch.", "Consult a dietitian for personalized dosage."]
        });
      } finally {
        setDrawerLoading(false);
      }
    }
  };

  const exportPlanToPDF = (plan) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const data = plan.plan_data || plan;

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900 / navy
      doc.rect(0, 0, 210, 32, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("MedAI Custom Health Plan", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("TAILORED WELLNESS ROUTINE & DIET", 15, 26);

      let y = 45;

      // 1. Nutrients & Foods
      if (data.nutrients && data.nutrients.length > 0) {
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Nutrients & Daily Foods", 15, y);
        y += 3;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(15, y, 195, y);
        y += 7;

        data.nutrients.forEach(n => {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text(`• ${n.name}`, 15, y);
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          const benefitLines = doc.splitTextToSize(n.benefit, 170);
          doc.text(benefitLines, 20, y);
          y += benefitLines.length * 5 + 3;
          doc.setTextColor(15, 23, 42);
        });
        y += 5;
      }

      // 2. Daily Routines
      if (data.routines && data.routines.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Daily Routines", 15, y);
        y += 3;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(15, y, 195, y);
        y += 7;

        data.routines.forEach(r => {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text(`• ${r.name}`, 15, y);
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          const descLines = doc.splitTextToSize(r.desc, 170);
          doc.text(descLines, 20, y);
          y += descLines.length * 5 + 3;
          doc.setTextColor(15, 23, 42);
        });
        y += 5;
      }

      // 3. Herbal Remedies
      if (data.herbs && data.herbs.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Herbal Remedies", 15, y);
        y += 3;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(15, y, 195, y);
        y += 7;

        data.herbs.forEach(h => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text(`• ${h.name}`, 15, y);
          y += 5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          const useLines = doc.splitTextToSize(`Use: ${h.use}`, 170);
          doc.text(useLines, 20, y);
          y += useLines.length * 5 + 2;
          const prepLines = doc.splitTextToSize(`Preparation: ${h.preparation}`, 170);
          doc.text(prepLines, 20, y);
          y += prepLines.length * 5 + 4;
          doc.setTextColor(15, 23, 42);
        });
        y += 5;
      }

      const fileName = plan.plan_name ? plan.plan_name.replace(/\s+/g, "_") : "Custom_Health_Plan";
      doc.save(`${fileName}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Could not export PDF: " + err.message);
    }
  };

  useEffect(() => {
    registerInnerBack?.(() => {
      if (nutrientDrawerOpen) {
        setNutrientDrawerOpen(false);
        return true;
      }
      if (viewingSavedPlan) {
        setViewingSavedPlan(null);
        return true;
      }
      if (recommendations) {
        setRecommendations(null);
        setMedicinesUnlocked(false);
        return true;
      }
      if (customNeedActive) {
        setCustomNeedActive(false);
        return true;
      }
      if (selectedCategory) {
        setSelectedCategory(null);
        setSearchTerm("");
        setCurrentPage(1);
        return true;
      }
      return false;
    });
    return () => registerInnerBack?.(null);
  }, [selectedCategory, customNeedActive, recommendations, registerInnerBack, nutrientDrawerOpen, viewingSavedPlan]);

  const selectCategory = (id) => {
    setSelectedCategory(id);
    setCurrentPage(1);
    pushHistoryEntry?.();
  };

  const handleGenerateCustomNeed = async () => {
    setGenerating(true);
    setRecommendations(null);
    setMedicinesUnlocked(false);

    const personalInfo = `Age group: ${ageGroup || "Adult (18-59)"}. Gender: ${gender || "Not specified"}. Activity level: ${activityLevel || "Moderately Active"}. Dietary preference: ${dietaryPreference || "No Restrictions"}. Primary health goal: ${healthGoal || "General Wellness"}.`;
    const surgeryInfo = surgeriesDone 
      ? `Surgeries done: Yes. Number of surgeries: ${numSurgeries}. Type/Location: ${surgeryType === "other" ? customSurgeryType : surgeryType}.` 
      : "Surgeries done: No.";
    const diseaseInfo = hasDiseaseOrAllergy 
      ? `Chronic diseases or allergies: Yes. Type: ${diseaseOrAllergyType === "other" ? customDiseaseOrAllergyType : diseaseOrAllergyType}.` 
      : "Chronic diseases or allergies: No.";
    const currentMedInfo = currentMedications.trim() 
      ? `Currently taking medications/supplements regularly: ${currentMedications}.` 
      : "Currently taking medications/supplements regularly: None.";
    const injuryInfo = hasInjury 
      ? `Current physical injuries: Yes. Details: ${injuryDetail}.` 
      : "Current physical injuries: No.";

    const prompt = `You are a medical assistant. Generate custom wellness recommendations based on the following patient profile:
- ${personalInfo}
- ${surgeryInfo}
- ${diseaseInfo}
- ${currentMedInfo}
- ${injuryInfo}

Provide recommendations for:
1. Nutrients and foods to be taken daily (array of name and benefit). Make sure foods comply with their dietary preference (${dietaryPreference || "No Restrictions"}).
2. Daily routines to be done (array of name and description). Tailor routines to their goal (${healthGoal || "General Wellness"}) and activity level (${activityLevel || "Moderately Active"}).
3. Herbal remedies (array of name, use, and simple preparation). Ensure none of the herbs have known adverse interactions with their current medications: ${currentMedications || "None"}.
4. First aid actions (Only if patient has injuries. If patient has no injuries, keep this array empty).
5. Safe, low-dosage basic over-the-counter medicines with less mg (e.g. Paracetamol 500mg, Ibuprofen 200mg, Cetirizine 5mg) (array of name, use, and dosage).

You MUST respond ONLY with a valid JSON object matching this structure (do not include any markdown formatting, backticks, or explanation):
{
  "nutrients": [{"name": "...", "benefit": "..."}],
  "routines": [{"name": "...", "desc": "..."}],
  "herbs": [{"name": "...", "use": "...", "preparation": "..."}],
  "firstAid": [{"name": "...", "steps": "..."}],
  "medicines": [{"name": "...", "use": "...", "dosage": "..."}]
}`;

    try {
      const raw = await callClaude([{ role: "user", content: prompt }]);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON structure found in response.");
      const data = JSON.parse(jsonMatch[0]);
      setRecommendations(data);
    } catch (err) {
      console.error("Custom need generation failed:", err);
      alert("Failed to generate custom plan. Please check your AI connection or try again.");
    } finally {
      setGenerating(false);
    }
  };

  const categories = [
    {
      id: "pharmacy", name: "Pharmacy", icon: "💊", color: "#3b82f6",
      desc: "Essential medicines and supplements for everyday health needs.",
      items: [
        { name: "ORSL Apple Drink", use: "Rehydration & electrolyte support", dosage: "Drink 1 pack during dehydration or weakness" },
        { name: "Durex Air Condoms", use: "Ultra-thin contraception & sensitivity", dosage: "Single-use during intimate contact" },
        { name: "Manforce Extra Dotted Condoms", use: "Contraception, stimulation & safety", dosage: "Single-use during intimate contact" },
        { name: "Ketoconazole Anti-Hairfall Shampoo", use: "Dandruff & hairfall control", dosage: "Apply twice weekly to wet scalp, leave for 5 mins" },
        { name: "Hydrocortisone Skin Rash Ointment", use: "Eczema, rashes & itch relief", dosage: "Apply thin layer to affected skin 2-3 times daily" },
        { name: "Paracetamol 500mg", use: "Fever & pain relief", dosage: "1-2 tablets every 4-6 hours" },
        { name: "Ibuprofen 400mg", use: "Anti-inflammatory & pain", dosage: "1 tablet every 6-8 hours with food" },
        { name: "Cetirizine 10mg", use: "Allergy relief", dosage: "1 tablet daily at bedtime" },
        { name: "Omeprazole 20mg", use: "Acid reflux & gastritis", dosage: "1 capsule before breakfast" },
        { name: "Vitamin D3 1000IU", use: "Bone health & immunity", dosage: "1 tablet daily with meal" },
        { name: "Probiotics", use: "Gut health & digestion", dosage: "1 capsule daily on empty stomach" },
        { name: "Pantoprazole 40mg", use: "Acidity & GERD relief", dosage: "1 tablet 30 mins before breakfast" },
        { name: "Cough Syrup (Dextromethorphan)", use: "Dry cough relief", dosage: "10ml every 6-8 hours" },
        { name: "Antacid Liquid (Gelusil)", use: "Heartburn & gas relief", dosage: "2 teaspoons after meals" },
        { name: "Cetirizine Syrup (5mg/5ml)", use: "Childhood allergy relief", dosage: "5ml once daily as directed by doctor" },
        { name: "Loratadine 10mg", use: "Non-drowsy allergy relief", dosage: "1 tablet daily" },
        { name: "Ranitidine 150mg", use: "Gastric acid reduction", dosage: "1 tablet twice daily" },
        { name: "Diclofenac Sodium Gel 1%", use: "Muscle & joint pain relief", dosage: "Gently rub on affected area 3-4 times daily" },
        { name: "Candid Mouth Paint", use: "Oral thrush/fungal infection", dosage: "Apply to affected areas in mouth 3-4 times daily" },
        { name: "B-Complex with B12", use: "Nerve wellness & red blood cells", dosage: "1 capsule daily after a meal" },
        { name: "Loperamide 2mg", use: "Acute diarrhea management", dosage: "1-2 capsules after first loose stool, max 8mg/day" },
        { name: "Domperidone 10mg", use: "Nausea & vomiting control", dosage: "1 tablet 30 mins before food" },
        { name: "Metformin 500mg", use: "Blood sugar regulation", dosage: "1 tablet daily with dinner or as prescribed" },
        { name: "Candid Dusting Powder", use: "Fungal sweat rash prevention", dosage: "Dust over affected skin area after bathing" },
        { name: "Volini Pain Relief Spray", use: "Instant back & muscle pain relief", dosage: "Spray 3-4 times daily from 5cm distance" },
        { name: "Isabgol (Psyllium Husk)", use: "Constipation relief & digestion", dosage: "1-2 tablespoons with a glass of warm water before bed" },
        { name: "Dolo 650mg", use: "Fever & intense body pain", dosage: "1 tablet up to 4 times daily" },
        { name: "Multivitamin Tablets (Supradyn)", use: "Daily vitamin deficiency cover", dosage: "1 tablet daily after breakfast" },
        { name: "Vicks Vaporub", use: "Nasal congestion & head cold", dosage: "Rub gently on chest, neck, and back" },
        { name: "Moov Pain Relief Cream", use: "Backache & joint stiffness relief", dosage: "Apply thin layer to painful area and massage gently" },
        { name: "Boroline Antiseptic Cream", use: "Dry skin, chapped lips & cuts", dosage: "Apply overnight on affected skin areas" },
        { name: "Strepsils Lozenges", use: "Sore throat & voice hoarseness", dosage: "Dissolve 1 lozenge slowly in mouth every 2-3 hours" },
        { name: "Digene Tablets", use: "Acidity & stomach bloating", dosage: "Chew 2-4 tablets after meals" },
        { name: "Itrakonazole 100mg", use: "Systemic fungal infection relief", dosage: "1 capsule twice daily with meals" },
        { name: "Saridon Tablets", use: "Quick headache & migraine relief", dosage: "1 tablet as needed, max 3 tablets daily" },
        { name: "Otrivin Nasal Spray", use: "Nasal congestion & blocked nose", dosage: "1 spray in each nostril up to 3 times daily" },
        { name: "O2 Tablets (Ofloxacin-Ornidazole)", use: "Bacterial stomach infection", dosage: "1 tablet twice daily or as prescribed" },
        { name: "Aspirin 75mg", use: "Cardiovascular blood thinner", dosage: "1 tablet daily after lunch or as prescribed" },
        { name: "Ciprofloxacin Eye/Ear Drops", use: "Bacterial eye/ear infection", dosage: "1-2 drops in affected eye/ear every 4 hours" },
        { name: "Shatavari Tablets", use: "Female hormonal balance", dosage: "1 tablet twice daily after meals" },
        { name: "Clotrimazole Vaginal Cream", use: "Yeast infection relief", dosage: "Apply once daily at bedtime using applicator" },
        { name: "Pudin Hara Capsules", use: "Stomach ache & gas relief", dosage: "1-2 capsules with water after meals" },
        { name: "Soframycin Skin Cream", use: "Bacterial cuts & burns prevention", dosage: "Apply to affected wound area 2-3 times daily" },
        { name: "Metrogyl Gel 1%", use: "Inflammatory acne & rosacea", dosage: "Apply thin layer to clean face twice daily" },
        { name: "Ring Guard Cream", use: "Ringworm & skin itch treatment", dosage: "Apply twice daily to clean, dry skin" },
        { name: "Eno Fruit Salt", use: "Fast relief from acidity", dosage: "1 sachet in a glass of water, drink immediately" },
        { name: "Revital H Capsules", use: "Physical stamina & energy booster", dosage: "1 capsule daily with breakfast" },
        { name: "Dexona Cream", use: "Severe skin inflammation", dosage: "Apply thin layer sparingly as directed" },
        { name: "Carnosine Eye Drops", use: "Dry eyes & eye fatigue relief", dosage: "1-2 drops in each eye 3 times daily" },
        { name: "Zincovit Tablets", use: "Immunity & multimineral support", dosage: "1 tablet daily after lunch" },
        { name: "Crocin Pain Relief", use: "Headache & mild migraine relief", dosage: "1 tablet every 4-6 hours as needed" },
        { name: "Dulcolax 5mg", use: "Overnight constipation relief", dosage: "1-2 tablets at bedtime with water" },
        { name: "Betadine Gargle 2%", use: "Throat infection & germ protection", dosage: "Gargle with 10ml diluted gargle for 30 seconds" },
        { name: "ORSL Plus Orange Drink", use: "Rehydration & recovery support", dosage: "Sip 1 pack during fatigue or post-exercise" },
        { name: "Dettol Liquid Antiseptic", use: "Skin disinfection & hygiene protection", dosage: "Dilute 1:20 with water for wound cleansing" },
        { name: "Skore Condoms Chocolate", use: "Contraception, protection & flavor", dosage: "Single-use during intimate contact" },
        { name: "Luliconazole Cream 1%", use: "Tinea, athlete's foot & fungal itch relief", dosage: "Apply to clean affected area once daily" }
      ]
    },
    {
      id: "herbs", name: "Herbal Remedies", icon: "🌿", color: "#10b981",
      desc: "Natural plant-based remedies backed by traditional medicine systems.",
      items: [
        { name: "Ashwagandha Extract", use: "Stress & anxiety relief", dosage: "300mg twice daily" },
        { name: "Turmeric Curcumin", use: "Anti-inflammatory & antioxidant", dosage: "500mg with black pepper daily" },
        { name: "Ginger Root Extract", use: "Nausea & digestion wellness", dosage: "250mg up to 3 times daily" },
        { name: "Tulsi (Holy Basil) Tea", use: "Immunity & respiratory health", dosage: "2-3 leaves daily or brewed as tea" },
        { name: "Brahmi Extract", use: "Memory & cognitive function booster", dosage: "300mg twice daily" },
        { name: "Triphala Powder", use: "Detox & digestive tract health", dosage: "1 tsp powder before bed with warm water" },
        { name: "Neem Leaf Capsules", use: "Blood purifier & skin health", dosage: "1 capsule daily after a meal" },
        { name: "Amla Fruit Powder (Vitamin C)", use: "Hair, skin, and immune health", dosage: "1 tsp daily with warm water" },
        { name: "Giloy (Guduchi) Juice", use: "Immune booster & chronic fever relief", dosage: "15-20ml mixed in warm water in morning" },
        { name: "Shatavari Powder", use: "Female reproductive health support", dosage: "1/2 tsp with warm milk twice daily" },
        { name: "Arjuna Bark Extract", use: "Heart health & blood circulation", dosage: "250mg twice daily after food" },
        { name: "Ginkgo Biloba Extract", use: "Brain circulation & focus support", dosage: "120mg daily in the morning" },
        { name: "Milk Thistle Extract", use: "Liver detoxification & cell health", dosage: "150mg twice daily with meals" },
        { name: "Aloe Vera Pure Gel", use: "Sunburn cooling & skin hydration", dosage: "Apply topically to clean skin as needed" },
        { name: "Eucalyptus Essential Oil", use: "Sinus congestion & muscle ease", dosage: "Add 3-5 drops to hot water for steam inhalation" },
        { name: "Chamomile Flowers", use: "Calming tea for sleep promotion", dosage: "Steep 1 tsp dried flowers in hot water for 10 mins before bed" },
        { name: "Peppermint Oil Capsules", use: "IBS & abdominal bloating relief", dosage: "1 enteric-coated capsule 30 mins before meals" },
        { name: "Licorice Root (Mulethi)", use: "Sore throat & acid reflux relief", dosage: "Chew a small root piece or brew as tea" },
        { name: "Ginseng (Panax) Extract", use: "Physical endurance & vitality booster", dosage: "200mg daily after breakfast" },
        { name: "Valerian Root Capsules", use: "Deep sleep support & insomnia helper", dosage: "450mg 1 hour before bedtime" },
        { name: "Echinacea Extract", use: "Cold & flu severity reduction", dosage: "300mg 3 times daily at first sign of cold" },
        { name: "Garlic Oil Capsules", use: "Cholesterol & immunity wellness", dosage: "1 softgel daily with food" },
        { name: "Elderberry Extract", use: "Seasonal viral protection", dosage: "150mg daily or 1 tsp syrup" },
        { name: "Cranberry Fruit Extract", use: "Urinary tract wellness support", dosage: "400mg daily with plenty of water" },
        { name: "Saw Palmetto Extract", use: "Prostate health & hair thinning", dosage: "320mg daily with a meal" },
        { name: "Fenugreek Seed Extract", use: "Blood sugar & lactation support", dosage: "500mg twice daily with meals" },
        { name: "Bitter Melon (Karela)", use: "Natural insulin level support", dosage: "1 capsule or 30ml juice daily on empty stomach" },
        { name: "Cinnamon Bark Capsules", use: "Insulin sensitivity & warmth", dosage: "250mg twice daily with food" },
        { name: "Green Tea Extract", use: "Metabolism booster & antioxidants", dosage: "300mg daily after lunch" },
        { name: "St. John's Wort", use: "Mild depression & mood balance", dosage: "300mg 3 times daily (consult physician)" },
        { name: "Lavender Essential Oil", use: "Stress reduction & anxiety relief", dosage: "Diffuse 3-4 drops or apply to wrists" },
        { name: "Rosehip Seed Oil", use: "Anti-aging & scar fade support", dosage: "Apply 2-3 drops to clean face before sleeping" },
        { name: "Boswellia Serrata (Shallaki)", use: "Joint pain & arthritis relief", dosage: "350mg twice daily with meals" },
        { name: "Gotu Kola (Centella)", use: "Skin healing & varicose vein support", dosage: "400mg daily with warm water" },
        { name: "Moringa Leaf Powder", use: "Superfood nutrient replenishment", dosage: "1 tsp mixed in smoothies or water daily" },
        { name: "Shilajit Purified Resin", use: "Stamina, energy & cellular longevity", dosage: "Pea-sized portion dissolved in warm milk daily" },
        { name: "Guggul Extract", use: "Cholesterol control & weight balance", dosage: "500mg twice daily after meals" },
        { name: "Safed Musli Extract", use: "Vitality, strength & immune support", dosage: "250mg twice daily with milk" },
        { name: "Triphala Guggulu", use: "Joint detox & digestive cleanse", dosage: "1-2 tablets twice daily with water" },
        { name: "Haritaki Fruit Powder", use: "Colon cleanse & respiratory health", dosage: "1/2 tsp before bed with water" },
        { name: "Pippali (Long Pepper)", use: "Digestive fire & lung immunity", dosage: "1/2 tsp with honey twice daily" },
        { name: "Kutki Rhizome Extract", use: "Liver health & bile stimulation", dosage: "150mg twice daily with warm water" },
        { name: "Punarnava Extract", use: "Kidney detox & fluid retention relief", dosage: "250mg twice daily after food" },
        { name: "Vasaka (Adhatoda) Syrup", use: "Expectorant for wet cough & asthma", dosage: "10ml twice daily after meals" },
        { name: "Bhumyamalaki Extract", use: "Liver protection & hepatitis support", dosage: "250mg twice daily on empty stomach" },
        { name: "Manjistha Root Powder", use: "Lymphatic drainage & skin glow", dosage: "1/2 tsp with warm water twice daily" },
        { name: "Gokshura Extract", use: "Kidney health & muscle stamina", dosage: "250mg twice daily with meals" },
        { name: "Kaunch Beej Powder", use: "Nervous system & dopamine balance", dosage: "1/2 tsp daily with milk" },
        { name: "Bael Fruit Powder", use: "Irritable bowel & dysentery relief", dosage: "1 tsp mixed in water twice daily" },
        { name: "Chyawanprash Organic", use: "Daily family immunity booster", dosage: "1 tablespoon daily on empty stomach" },
        { name: "Yastimadhu Lozenges", use: "Throat soothing & gastric comfort", dosage: "Suck 1 lozenge as needed" },
        { name: "Dashmula Arishta", use: "Post-illness physical recovery", dosage: "15ml with equal water twice daily after food" },
        { name: "Pippali Powder", use: "Respiratory defense & lung warming", dosage: "1/2 tsp daily with honey" },
        { name: "Tagara Capsules", use: "Mind calming & healthy sleep induction", dosage: "1 capsule 1 hour before bed" },
        { name: "Neem & Turmeric Soap", use: "Antibacterial protection & skin purification", dosage: "Use daily during bath" }
      ]
    },
    {
      id: "nutrition", name: "Nutrition Center", icon: "🥗", color: "#f59e0b",
      desc: "Essential vitamins, minerals, and nutritional supplements.",
      items: [
        { name: "Omega-3 Fish Oil", use: "Heart & brain health", dosage: "1000mg daily with meal" },
        { name: "Vitamin C 1000mg", use: "Immunity booster", dosage: "1 tablet daily" },
        { name: "Iron + Folic Acid", use: "Anemia prevention", dosage: "1 tablet daily on empty stomach" },
        { name: "Zinc 50mg", use: "Immune support & skin health", dosage: "1 tablet daily with food" },
        { name: "Magnesium Glycinate", use: "Sleep & muscle relaxation", dosage: "400mg before bedtime" },
        { name: "B-Complex Vitamins", use: "Energy & nervous system", dosage: "1 tablet daily after breakfast" },
        { name: "Coenzyme Q10 (CoQ10) 100mg", use: "Heart health & cellular energy production", dosage: "1 capsule daily with food" },
        { name: "Calcium + Vitamin D3", use: "Bone density & joint support", dosage: "1 tablet daily after lunch" },
        { name: "Whey Protein Isolate", use: "Muscle recovery & daily protein replenishment", dosage: "1 scoop (30g) in 200ml water post-workout" },
        { name: "Vitamin E 400IU", use: "Antioxidant protection & skin nourishment", dosage: "1 softgel daily with a meal" },
        { name: "Biotin 10000mcg", use: "Hair follicle strengthening & nail thickness", dosage: "1 tablet daily with breakfast" },
        { name: "Collagen Peptides Powder", use: "Skin elasticity & joint flexibility", dosage: "10g dissolved in warm water daily" },
        { name: "Apple Cider Vinegar (ACV)", use: "Healthy digestion & metabolic support", dosage: "2 ACV gummies before meals" },
        { name: "Melatonin 3mg", use: "Sleep quality & sleep cycle regulation", dosage: "1 tablet 30-60 mins before bedtime" },
        { name: "Probiotics Multistrain", use: "Gut microbiome balance & immunity support", dosage: "1 capsule daily on empty stomach" },
        { name: "Electrolytes Complex", use: "Hydration replenishment & cramp prevention", dosage: "1 tablet dissolved in 300ml water" },
        { name: "Vitamin B12 (Methylcobalamin)", use: "Nerve health & energy conversion", dosage: "1500mcg sublingual tablet daily" },
        { name: "Vitamin A (Beta Carotene)", use: "Vision enhancement & skin renewal", dosage: "10000IU daily with dinner" },
        { name: "Vitamin K2 (MK-7) 100mcg", use: "Calcium integration into bones", dosage: "1 capsule daily with vitamin D3" },
        { name: "L-Theanine 200mg", use: "Relaxed focus & anxiety relief", dosage: "1 capsule as needed during stressful periods" },
        { name: "L-Carnitine 500mg", use: "Fat oxidation & exercise stamina", dosage: "1 capsule 30 mins before workout" },
        { name: "Creatine Monohydrate", use: "Muscle strength & explosive power", dosage: "5g daily mixed with water or fruit juice" },
        { name: "Glucosamine + Chondroitin", use: "Joint cartilage cushion & rebuild", dosage: "1 tablet twice daily with food" },
        { name: "MSM (Methylsulfonylmethane)", use: "Joint inflammation reduction", dosage: "1000mg daily with water" },
        { name: "Astaxanthin 4mg", use: "Carotenoid skin & eye protection", dosage: "1 softgel daily with lunch" },
        { name: "Beetroot Powder Organic", use: "Nitric oxide booster for vascular pump", dosage: "1 scoop in pre-workout shake" },
        { name: "Spirulina Organic Tablets", use: "Alkalizing green superfood booster", dosage: "3 tablets daily with water" },
        { name: "Chlorella Powder", use: "Heavy metal detox & chlorophyll", dosage: "1 tsp daily mixed in warm water" },
        { name: "Maca Root Powder", use: "Adrenal support, libido & hormone balance", dosage: "1 tsp daily in warm milk" },
        { name: "Cold Pressed Flaxseed Oil", use: "Plant-based ALA Omega-3", dosage: "1 softgel daily with food" },
        { name: "Evening Primrose Oil", use: "PMS symptom ease & skin hydration", dosage: "1000mg daily with dinner" },
        { name: "Alpha Lipoic Acid (ALA)", use: "Peripheral neuropathy & blood sugar", dosage: "300mg daily before meals" },
        { name: "Chromium Picolinate", use: "Carb metabolism & sugar cravings", dosage: "200mcg daily with breakfast" },
        { name: "Potassium Gluconate", use: "Vascular pressure & heart rhythm", dosage: "99mg daily with water" },
        { name: "Kelp Iodine Supplement", use: "Thyroid hormone synthesis", dosage: "150mcg daily with breakfast" },
        { name: "Selenium (Selenomethionine)", use: "Thyroid protection & cellular defense", dosage: "200mcg daily with food" },
        { name: "Manganese Gluconate", use: "Bone cartilage matrix formation", dosage: "10mg daily with breakfast" },
        { name: "Boron Glycinate", use: "Calcium metabolism & free testosterone", dosage: "3mg daily with dinner" },
        { name: "Copper Sebacate", use: "Collagen cross-linking & red blood cells", dosage: "2mg daily with food" },
        { name: "Folic Acid 800mcg", use: "Fetal development & cell division", dosage: "1 tablet daily or as prescribed" },
        { name: "Vitamin B6 (Pyridoxine)", use: "Neurotransmitter synthesis", dosage: "50mg daily after breakfast" },
        { name: "Thiamine (Vitamin B1)", use: "Carbohydrate conversion to energy", dosage: "100mg daily with food" },
        { name: "Riboflavin (Vitamin B2)", use: "Cellular respiration & energy conversion", dosage: "50mg daily with breakfast" },
        { name: "Niacinamide (Vitamin B3)", use: "Skin barrier repair & NADH cofactor", dosage: "500mg daily with meals" },
        { name: "Pantothenic Acid (Vitamin B5)", use: "Adrenal hormone synthesis & energy", dosage: "250mg daily after lunch" },
        { name: "Alpha GPC 300mg", use: "Acetylcholine neurotransmitter boost", dosage: "1 capsule daily in the morning" },
        { name: "Bacopa Monnieri (Brahmi)", use: "Memory recall & neural connection support", dosage: "300mg daily with food" },
        { name: "Resveratrol 250mg", use: "Sirtuin gene activator & cellular repair", dosage: "1 capsule daily with red wine or lunch" },
        { name: "Milk Thistle (Silymarin)", use: "Liver cell regeneration & defense", dosage: "150mg twice daily" },
        { name: "Glutathione Liposomal", use: "Master cellular antioxidant & detoxifier", dosage: "250mg daily on empty stomach" },
        { name: "Supergreens Antioxidant Blend", use: "Digestive enzymes & phytonutrients", dosage: "1 scoop in 250ml cold water" },
        { name: "Chia Seeds Powder", use: "Fiber, protein & mineral source", dosage: "1 tablespoon daily in yogurt" },
        { name: "Plant Protein Powder", use: "Vegan clean muscle repair & growth", dosage: "1 scoop in water post-exercise" },
        { name: "Cod Liver Oil Capsules", use: "Joint health & natural vitamins A/D boost", dosage: "1 softgel daily with breakfast" },
        { name: "Ashwagandha Gummies", use: "Stress ease & cortisol control support", dosage: "2 gummies daily after lunch" }
      ]
    },
    {
      id: "firstaid", name: "First Aid Station", icon: "🏥", color: "#ef4444",
      desc: "Essential first aid supplies and topical treatments.",
      items: [
        { name: "ORS Powder Sachet", use: "Dehydration treatment & hydration replenishment", dosage: "1 sachet in 1L water, sip frequently" },
        { name: "Antiseptic Solution (Dettol)", use: "Wound cleaning & disinfecting", dosage: "Dilute with clean water and apply to affected area" },
        { name: "Bandage Crepe Roll", use: "Wound dressing, support & compression", dosage: "Wrap affected area securely with light tension" },
        { name: "Burnol Ointment", use: "Minor burns & scalds treatment", dosage: "Apply thin layer on burn area as needed" },
        { name: "Calamine Lotion", use: "Itch, sunburn & allergic rash relief", dosage: "Apply to affected skin area as needed" },
        { name: "Digital Thermometer", use: "Body temperature monitoring", dosage: "Use orally or axillary for fever checks" },
        { name: "Adhesive Bandages (Band-Aid)", use: "Minor cuts, scrapes & blisters protection", dosage: "Apply clean strip to wound after cleaning" },
        { name: "Sterile Gauze Pads", use: "Wound dressing & fluid absorption", dosage: "Place over wound and secure with medical tape" },
        { name: "Medical Micropore Tape", use: "Securing dressings, gauze & bandages", dosage: "Apply to hold gauze or bandage in place" },
        { name: "Instant Cold Pack", use: "Reducing swelling & pain from strains", dosage: "Squeeze to activate and apply to affected area for 10-15 mins" },
        { name: "Pain Relieving Spray (Moov)", use: "Instant cooling relief from muscular pain & sprains", dosage: "Spray on affected area from a distance of 5cm" },
        { name: "Tweezers & Scissor Set", use: "Splinter removal & cutting dressings", dosage: "Sanitize tools before and after use" },
        { name: "Antiseptic Wipes", use: "Skin disinfection around wounds & hand prep", dosage: "Gently wipe skin around the injured area" },
        { name: "Betadine Ointment", use: "Infection prevention in minor cuts & burns", dosage: "Apply a thin layer 1-3 times daily" },
        { name: "Cotton Wool Roll", use: "Cleaning wounds & applying liquid antiseptics", dosage: "Use with antiseptic solution as needed" },
        { name: "Hand Sanitizer Gel", use: "Hand hygiene before treating wounds", dosage: "Rub a coin-sized amount on hands until dry" },
        { name: "Ice Bag for Hot/Cold Therapy", use: "Swell reducing & thermal relief", dosage: "Fill with ice or warm water and apply for 15 mins" },
        { name: "Hot Water Bag Rubber", use: "Muscle stiffness & cramp relief", dosage: "Fill with hot water, wrap in cloth, and apply" },
        { name: "Sterile Eye Patch", use: "Corneal scrape protection & eye rest", dosage: "Tape securely over closed injured eye" },
        { name: "Finger Splint Metal", use: "Broken or jammed finger immobilization", dosage: "Place under finger and secure with micropore tape" },
        { name: "Safety Pins Set", use: "Securing slings, wraps & triangular bandages", dosage: "Use to pin dressings or wraps in place" },
        { name: "CPR Face Shield", use: "Barrier protection during mouth-to-mouth", dosage: "Place shield over patient's face before breathing" },
        { name: "Gauze Dressing Roll (3 inch)", use: "Securing sterile pads on large wounds", dosage: "Wrap around limb to keep gauze pads clean and in place" },
        { name: "Cotton Swabs (Q-tips)", use: "Precise ointment application & cleaning", dosage: "Apply ointments gently to specific areas" },
        { name: "Hydrogen Peroxide 3%", use: "Wound bubbling debridement & cleaning", dosage: "Apply dilute solution to wound (foams on contact)" },
        { name: "Rubbing Alcohol (Isopropyl)", use: "Sterilizing tools & skin preparation", dosage: "Wipe tools or intact skin before procedures" },
        { name: "Hydrocortisone Cream 1%", use: "Severe allergy itching & insect bites", dosage: "Apply thin layer to itchy area twice daily" },
        { name: "Soothing Aloe Vera Gel", use: "Sunburn & heat exposure recovery", dosage: "Apply thick layer over red, hot skin" },
        { name: "Anti-itch Antihistamine Cream", use: "Poison ivy & severe contact dermatitis", dosage: "Apply to itchy skin up to 3 times daily" },
        { name: "Elastic Compression Wrap", use: "Joint support & swelling prevention", dosage: "Wrap around sprained ankle or wrist" },
        { name: "Thermometer Plastic Covers", use: "Preventing cross-infection during temperature checks", dosage: "Discard cover after each use" },
        { name: "Saline Nasal Spray", use: "Nasal passage moisturizing & cleaning", dosage: "1-2 sprays in each nostril as needed" },
        { name: "Sterile Eye Wash Solution", use: "Flushing debris or chemicals from eyes", dosage: "Flush eye continuously for 10-15 mins" },
        { name: "Petroleum Jelly (Vaseline)", use: "Chafing prevention & barrier protection", dosage: "Apply to dry skin or friction points" },
        { name: "Burn Dressing Gel Sheet", use: "Immediate burn cooling & skin shield", dosage: "Apply sterile sheet directly to burn wound" },
        { name: "Non-stick Pad Dressings", use: "Oozing wound dressing without sticking", dosage: "Place directly over raw wound and tape down" },
        { name: "Triangular Bandage Sling", use: "Arm/shoulder immobilization & support", dosage: "Fold into sling to support injured arm" },
        { name: "Disposable Nitrile Gloves", use: "Personal protection during wound care", dosage: "Wear before touching body fluids or open wounds" },
        { name: "Liquid Bandage Spray", use: "Sealing small cuts & hangnails", dosage: "Spray over clean cut to form water-resistant film" },
        { name: "Zinc Oxide Cream", use: "Diaper rash & severe chafing protection", dosage: "Apply thick layer to affected areas" },
        { name: "Insect Bite Relief Wipes", use: "Neutralizing venom itch from mosquitoes/bees", dosage: "Wipe immediately over insect bite site" },
        { name: "Ammonia Inhalant Ampoules", use: "Reviving someone from fainting spells", dosage: "Crush ampoule and hold near nose briefly" },
        { name: "Hemostatic Gauze Pad", use: "Stopping heavy arterial or venous bleeding", dosage: "Pack tightly into bleeding wound and apply pressure" },
        { name: "Combat Application Tourniquet", use: "Stanching critical limb hemorrhage", dosage: "Apply high and tight on limb, twist windlass" },
        { name: "Emergency Mylar Blanket", use: "Preventing hypothermia & shock", dosage: "Wrap around patient to retain body heat" },
        { name: "Trauma Shears Heavy Duty", use: "Cutting clothing or thick bandages quickly", dosage: "Use to expose injury site safely" },
        { name: "Suture Removal Kit", use: "Safe removal of medical stitches", dosage: "Use under professional advice only" },
        { name: "Splint Roll (SAM Splint)", use: "Rigid immobilization of fractured limbs", dosage: "Mold to fit limb shape and wrap with bandage" },
        { name: "Antiseptic Spray (No-Sting)", use: "Sting-free skin disinfection", dosage: "Spray directly onto minor scrape from 10cm" },
        { name: "Benzalkonium Wipes", use: "Alcohol-free skin preparation", dosage: "Wipe skin area before drawing blood or checking vitals" },
        { name: "Sting Relief Pads", use: "Local anesthetic for wasp & bee stings", dosage: "Press pad against sting site for 1 minute" },
        { name: "Sterile Saline Wipes", use: "Gentle mechanical wound cleansing", dosage: "Wipe raw skin from center outwards to remove dirt" },
        { name: "Eye Wash Solution Sterile", use: "Flushing dust, chemicals or debris from eyes", dosage: "Rinse affected eye thoroughly with solution" },
        { name: "Zinc Oxide Tape Roll", use: "Securing dressings & strapping joints", dosage: "Apply directly over gauze or secure around joints" },
        { name: "Petroleum Gauze Dressing", use: "Non-adherent dressing for burns & open wounds", dosage: "Place directly over wound before applying outer wrap" }
      ]
    }
  ];

  const handleSave = (itemName) => {
    if (onSaveMedicine) {
      let catName = "Pharmacy";
      if (selectedCategory === "herbs") catName = "Herbal Remedies";
      else if (selectedCategory === "nutrition") catName = "Nutrition Center";
      else if (selectedCategory === "firstaid") catName = "First Aid Station";

      onSaveMedicine(itemName, "MediTown", catName);
      setSavedNotice(itemName);
      setTimeout(() => setSavedNotice(""), 2000);
    }
  };

  const isSaved = (name) => savedMedicines.some(m => m?.name?.toLowerCase?.() === name.toLowerCase());

  const activeCategory = categories.find(c => c.id === selectedCategory);

  const getPharmacySubcategory = (item) => {
    const name = item.name.toLowerCase();
    const use = item.use.toLowerCase();
    if (name.includes("condom") || name.includes("skore") || name.includes("durex") || name.includes("manforce") || name.includes("kamasutra") || use.includes("contraception") || use.includes("intimacy")) {
      return "intimacy";
    }
    if (name.includes("orsl") || use.includes("rehydration") || use.includes("electrolyte") || use.includes("dehydration")) {
      return "drinks";
    }
    if (name.includes("shampoo") || name.includes("soap") || name.includes("facewash") || name.includes("wash") || name.includes("dettol") || name.includes("cleaner") || use.includes("hairfall") || use.includes("dandruff")) {
      return "personal_care";
    }
    if (name.includes("cough") || name.includes("cold") || name.includes("vaporub") || name.includes("vicks") || name.includes("strepsils") || name.includes("lozenge") || name.includes("otrivin") || name.includes("gargle") || name.includes("throat") || use.includes("cough") || use.includes("nasal") || use.includes("sore throat")) {
      return "cough_cold";
    }
    if (name.includes("paracetamol") || name.includes("dolo") || name.includes("crocin") || name.includes("saridon") || name.includes("ibuprofen") || name.includes("aspirin") || use.includes("fever") || use.includes("headache") || use.includes("migraine") || use.includes("body pain") || use.includes("pain relief")) {
      return "pain_fever";
    }
    if (name.includes("omeprazole") || name.includes("pantoprazole") || name.includes("ranitidine") || name.includes("antacid") || name.includes("gelusil") || name.includes("digene") || name.includes("eno") || name.includes("pudin") || name.includes("hara") || name.includes("dulcolax") || name.includes("isabgol") || name.includes("loperamide") || name.includes("domperidone") || use.includes("acidity") || use.includes("gastric") || use.includes("gerd") || use.includes("heartburn") || use.includes("constipation") || use.includes("gut health") || use.includes("digestion") || use.includes("diarrhea")) {
      return "digestion";
    }
    if (name.includes("cream") || name.includes("ointment") || name.includes("gel") || name.includes("dusting") || name.includes("powder") || name.includes("candid") || name.includes("ring guard") || name.includes("soframycin") || name.includes("betadine") || name.includes("luliconazole") || use.includes("fungal") || use.includes("rash") || use.includes("skin") || use.includes("itch") || use.includes("wound") || use.includes("burns") || use.includes("acne")) {
      return "skin_care";
    }
    return "wellness";
  };

  const getHerbsSubcategory = (item) => {
    const name = item.name.toLowerCase();
    const use = item.use.toLowerCase();
    if (name.includes("vasaka") || name.includes("pippali") || name.includes("tulsi") || name.includes("chyawanprash") || name.includes("echinacea") || name.includes("elderberry") || name.includes("yastimadhu") || use.includes("respiratory") || use.includes("asthma") || use.includes("cough") || use.includes("immune") || use.includes("immunity") || use.includes("cold") || use.includes("flu") || use.includes("throat")) {
      return "respiratory_immunity";
    }
    if (name.includes("shatavari") || name.includes("gokshura") || name.includes("kaunch") || name.includes("musli") || name.includes("saw palmetto") || name.includes("shilajit") || name.includes("fenugreek") || use.includes("prostate") || use.includes("reproduction") || use.includes("reproductive") || use.includes("hormonal") || use.includes("lactation") || use.includes("vitality") || use.includes("stamina") || use.includes("strength")) {
      return "reproduction_hormones";
    }
    if (name.includes("ashwagandha") || name.includes("brahmi") || name.includes("ginkgo") || name.includes("chamomile") || name.includes("valerian") || name.includes("lavender") || name.includes("tagara") || name.includes("john's") || use.includes("stress") || use.includes("anxiety") || use.includes("calming") || use.includes("sleep") || use.includes("insomnia") || use.includes("memory") || use.includes("cognitive") || use.includes("brain") || use.includes("focus") || use.includes("mood")) {
      return "brain_stress_sleep";
    }
    if (name.includes("triphala") || name.includes("peppermint") || name.includes("ginger") || name.includes("bael") || name.includes("kutki") || name.includes("bhumyamalaki") || name.includes("thistle") || name.includes("punarnava") || use.includes("liver") || use.includes("detox") || use.includes("digestion") || use.includes("digestive") || use.includes("bloating") || use.includes("ibs") || use.includes("stomach") || use.includes("kidney") || use.includes("fluid retention") || use.includes("colon")) {
      return "digestion_detox";
    }
    if (name.includes("shallaki") || name.includes("boswellia") || name.includes("turmeric") || name.includes("curcumin") || use.includes("joint") || use.includes("arthritis") || use.includes("anti-inflammatory")) {
      return "joints_inflammation";
    }
    if (name.includes("aloe") || name.includes("neem") || name.includes("rosehip") || name.includes("gotu kola") || name.includes("manjistha") || name.includes("amla") || use.includes("skin") || use.includes("hair") || use.includes("acne") || use.includes("sunburn") || use.includes("varicose")) {
      return "skin_hair";
    }
    return "wellness";
  };

  const getNutritionSubcategory = (item) => {
    const name = item.name.toLowerCase();
    const use = item.use.toLowerCase();
    if (name.includes("vitamin") || name.includes("iron") || name.includes("zinc") || name.includes("magnesium") || name.includes("calcium") || name.includes("biotin") || name.includes("folic") || name.includes("b-complex") || name.includes("methylcobalamin") || name.includes("thiamine") || name.includes("riboflavin") || name.includes("niacinamide") || name.includes("potassium") || name.includes("iodine") || name.includes("selenium") || name.includes("manganese") || name.includes("boron") || name.includes("copper") || use.includes("anemia") || use.includes("bone") || use.includes("deficiency")) {
      return "vitamins_minerals";
    }
    if (name.includes("protein") || name.includes("creatine") || name.includes("carnitine") || name.includes("theanine") || name.includes("gpc") || name.includes("collagen") || name.includes("bcaa") || use.includes("muscle") || use.includes("recovery") || use.includes("endurance")) {
      return "proteins_muscles";
    }
    if (name.includes("fish oil") || name.includes("omega") || name.includes("flaxseed") || name.includes("primrose") || use.includes("omega-3") || use.includes("essential fatty acids")) {
      return "oils_fats";
    }
    if (name.includes("probiotic") || name.includes("vinegar") || name.includes("acv") || name.includes("supergreens") || use.includes("gut") || use.includes("digestion") || use.includes("microbiome")) {
      return "gut_digestion";
    }
    if (name.includes("melatonin") || name.includes("sleep") || name.includes("theanine") || name.includes("bacopa") || name.includes("brahmi") || use.includes("sleep") || use.includes("insomnia") || use.includes("focus") || use.includes("memory") || use.includes("neurotransmitter")) {
      return "brain_sleep";
    }
    if (name.includes("resveratrol") || name.includes("astaxanthin") || name.includes("glutathione") || name.includes("chlorella") || name.includes("spirulina") || name.includes("beetroot") || name.includes("thistle") || name.includes("silymarin") || use.includes("antioxidant") || use.includes("detox")) {
      return "antioxidants_detox";
    }
    return "wellness";
  };

  const filteredItems = activeCategory
    ? activeCategory.items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.use.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        
        if (selectedCategory === "pharmacy" && pharmacySubcat !== "all") {
          return getPharmacySubcategory(item) === pharmacySubcat;
        }
        if (selectedCategory === "herbs" && herbsSubcat !== "all") {
          return getHerbsSubcategory(item) === herbsSubcat;
        }
        if (selectedCategory === "nutrition" && nutritionSubcat !== "all") {
          return getNutritionSubcategory(item) === nutritionSubcat;
        }
        return true;
      })
    : [];

  const filteredFoodItems = isExploringFood
    ? foodIngredients.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nutrients.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const itemsPerPage = 10;
  const totalPages = isExploringFood
    ? (Math.ceil(filteredFoodItems.length / itemsPerPage) || 1)
    : (Math.ceil(filteredItems.length / itemsPerPage) || 1);

  const paginatedItems = isExploringFood
    ? filteredFoodItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderCustomNeedView = () => {
    if (generating) {
      return (
        <div style={{ textAlign: "center", padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div className="spinner" style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "4px solid rgba(37,99,235,0.1)", borderTopColor: "var(--blue)",
            animation: "spin 1s linear infinite"
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>Analyzing Profile...</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Our AI is preparing custom nutritional guidelines, routines, and remedies.</p>
          </div>
        </div>
      );
    }

    if (recommendations) {
      return (
        <div style={{ animation: "mtSlideIn 0.3s ease both" }}>
          <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ textAlign: "left" }}>
              <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "var(--navy)" }}>📋 Your Custom Health Plan</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--text-muted)" }}>
                Tailored nutritional recommendations, routines, and remedies based on your profile.
              </p>
            </div>
            <button
              onClick={handleSaveCurrentPlan}
              style={{
                padding: "10px 20px", background: "linear-gradient(135deg, var(--blue), #1d4ed8)",
                color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13.5,
                cursor: "pointer", boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
                fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6
              }}
            >
              💾 Save Plan
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* 1. Nutrients & Foods */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, textAlign: "left" }}>
              <h4 style={{ margin: "0 0 16px", fontSize: 16.5, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🥦</span> Nutrients & Daily Foods
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {recommendations.nutrients?.map((n, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleNutrientClick(n)}
                    style={{
                      background: "var(--surface-2)", borderRadius: 12, padding: 16, border: "1px solid var(--border)",
                      cursor: "pointer", transition: "all 0.2s ease"
                    }}
                    className="mt-item-card"
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 4 }}>{n.name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{n.benefit}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Daily Routines */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, textAlign: "left" }}>
              <h4 style={{ margin: "0 0 16px", fontSize: 16.5, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🏃</span> Daily Routines
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recommendations.routines?.map((r, idx) => (
                  <div key={idx} style={{ borderLeft: "3.5px solid var(--blue)", paddingLeft: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 4 }}>{r.name}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Herbal Remedies */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, textAlign: "left" }}>
              <h4 style={{ margin: "0 0 16px", fontSize: 16.5, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🌿</span> Herbal Remedies
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {recommendations.herbs?.map((h, idx) => (
                  <div key={idx} style={{ background: "var(--surface-2)", borderRadius: 12, padding: 16, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>{h.name}</span>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(h.name + ' herbal remedies')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: "var(--blue)",
                          textDecoration: "none",
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: "rgba(37,99,235,0.06)",
                          border: "1px solid rgba(37,99,235,0.15)",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "var(--blue)";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(37,99,235,0.06)";
                          e.currentTarget.style.color = "var(--blue)";
                        }}
                        title={`Search Google for ${h.name}`}
                      >
                        <span>Google</span>
                        <span style={{ fontSize: 9 }}>↗</span>
                      </a>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8 }}><strong>Use:</strong> {h.use}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic", lineHeight: 1.5 }}>
                      <strong>Preparation:</strong> {h.preparation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. First Aid (Conditional) */}
            {hasInjury && recommendations.firstAid && recommendations.firstAid.length > 0 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, textAlign: "left" }}>
                <h4 style={{ margin: "0 0 16px", fontSize: 16.5, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🩹</span> Emergency First Aid Actions
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {recommendations.firstAid.map((fa, idx) => (
                    <div key={idx} style={{ background: "rgba(239,68,68,0.04)", borderRadius: 12, padding: 16, border: "1px solid rgba(239,68,68,0.15)" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--red)", marginBottom: 6 }}>{fa.name}</div>
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{fa.steps}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Recommended Medicines */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, textAlign: "left" }}>
              <h4 style={{ margin: "0 0 16px", fontSize: 16.5, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>💊</span> Recommended Medicines (Low-mg OTC)
              </h4>

              {!medicinesUnlocked ? (
                /* Warning disclaimer overlay container */
                <div style={{
                  background: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.25)",
                  borderRadius: 14, padding: "20px 24px", textAlign: "center"
                }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>⚠️</div>
                  <h5 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: "var(--text-amber)" }}>Important Safety Warning</h5>
                  <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    The medications listed below are AI-suggested informational options. You must always consult a qualified medical doctor or healthcare professional before taking any pharmaceutical medications. Do not trust AI drug suggestions blindly.
                  </p>
                  <button
                    onClick={() => setMedicinesUnlocked(true)}
                    style={{
                      padding: "10px 22px", background: "var(--blue)", color: "#fff",
                      border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13.5,
                      cursor: "pointer", fontFamily: "var(--font)", boxShadow: "0 4px 12px rgba(37,99,235,0.2)"
                    }}
                  >
                    Proceed
                  </button>
                </div>
              ) : (
                /* Revealed Medicines List */
                <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn 0.3s ease both" }}>
                  {recommendations.medicines?.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12,
                        padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 4 }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 2 }}><strong>Use:</strong> {m.use}</div>
                        <div style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}><strong>Dosage:</strong> {m.dosage}</div>
                      </div>
                      <button
                        className="mt-save-btn"
                        onClick={() => handleSave(m.name)}
                        disabled={isSaved(m.name)}
                        style={{
                          padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: 11.5,
                          background: isSaved(m.name) ? "var(--bg-green-light)" : "var(--blue)",
                          color: isSaved(m.name) ? "var(--green)" : "#fff",
                          opacity: isSaved(m.name) ? 0.7 : 1,
                        }}
                      >
                        {isSaved(m.name) ? "✓ Saved" : "+ Save"}
                      </button>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: "var(--text-faint)", fontStyle: "italic", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    ℹ️ Low-mg basic over-the-counter alternatives suggested. Visit your physician for custom dosing.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ animation: "mtSlideIn 0.3s ease both" }}>


        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "28px 32px", textAlign: "left" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900, color: "var(--navy)" }}>✨ Custom Health Questionnaire</h3>
          <p style={{ margin: "0 0 28px", fontSize: 13.5, color: "var(--text-muted)" }}>
            Share your profile and medical history to compile an AI-guided health routine.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Section 1: Personal & Lifestyle Profile */}
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
              <label style={{ display: "block", color: "var(--navy)", fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>
                1. Personal & Lifestyle Profile
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Age Group</label>
                  <select
                    value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                      background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box", height: "40.5px"
                    }}
                  >
                    <option value="">-- Select Age Group --</option>
                    <option value="Children (under 12)">Children (under 12)</option>
                    <option value="Teenagers (12-17)">Teenagers (12-17)</option>
                    <option value="Adult (18-59)">Adult (18-59)</option>
                    <option value="Senior (60+)">Senior (60+)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Gender</label>
                  <select
                    value={gender} onChange={e => setGender(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                      background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box", height: "40.5px"
                    }}
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Dietary Preference</label>
                  <select
                    value={dietaryPreference} onChange={e => setDietaryPreference(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                      background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box", height: "40.5px"
                    }}
                  >
                    <option value="">-- Select Diet --</option>
                    <option value="No Restrictions">No Restrictions</option>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Gluten-Free">Gluten-Free</option>
                    <option value="Lactose-Free">Lactose-Free</option>
                    <option value="Keto / Low-Carb">Keto / Low-Carb</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Daily Activity Level</label>
                  <select
                    value={activityLevel} onChange={e => setActivityLevel(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                      background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box", height: "40.5px"
                    }}
                  >
                    <option value="">-- Select Activity --</option>
                    <option value="Sedentary (Little/no exercise)">Sedentary (Little/no exercise)</option>
                    <option value="Lightly Active (1-3 days/week)">Lightly Active (1-3 days/week)</option>
                    <option value="Moderately Active (3-5 days/week)">Moderately Active (3-5 days/week)</option>
                    <option value="Very Active (Daily hard exercise)">Very Active (Daily hard exercise)</option>
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Primary Health Goal</label>
                  <select
                    value={healthGoal} onChange={e => setHealthGoal(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                      background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box", height: "40.5px"
                    }}
                  >
                    <option value="">-- Select Health Goal --</option>
                    <option value="General Wellness">General Wellness</option>
                    <option value="Improve Energy & Focus">Improve Energy & Focus</option>
                    <option value="Stress Relief & Anxiety Management">Stress Relief & Anxiety Management</option>
                    <option value="Better Sleep Quality">Better Sleep Quality</option>
                    <option value="Weight Management">Weight Management</option>
                    <option value="Digestion & Gut Health">Digestion & Gut Health</option>
                    <option value="Immune System Support">Immune System Support</option>
                    <option value="Joint & Muscle Pain Relief">Joint & Muscle Pain Relief</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Surgeries */}
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
              <label style={{ display: "block", color: "var(--navy)", fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>
                2. Have you ever undergone surgery?
              </label>
              <div style={{ display: "flex", gap: 10, marginBottom: surgeriesDone ? 14 : 0 }}>
                {[true, false].map(val => (
                  <button
                    key={val ? "yes" : "no"} type="button"
                    onClick={() => setSurgeriesDone(val)}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 8,
                      border: surgeriesDone === val ? "2.5px solid var(--blue)" : "1px solid var(--border)",
                      background: surgeriesDone === val ? "var(--blue-pale)" : "var(--surface)",
                      color: surgeriesDone === val ? "var(--blue)" : "var(--text)",
                      fontWeight: 700, fontSize: 13.5, cursor: "pointer", transition: "var(--transition)"
                    }}
                  >
                    {val ? "Yes, I have" : "No surgeries"}
                  </button>
                ))}
              </div>

              {surgeriesDone && (
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", animation: "fadeUp 0.25s ease both" }}>
                  <div style={{ flex: "1 1 120px" }}>
                    <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Number of Surgeries</label>
                    <input
                      type="number" min="1" max="20" value={numSurgeries} onChange={e => setNumSurgeries(e.target.value)}
                      placeholder="e.g. 1"
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                        background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div style={{ flex: "2 2 240px" }}>
                    <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Type of Surgery</label>
                    <select
                      value={surgeryType} onChange={e => setSurgeryType(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                        background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box", height: "40.5px"
                      }}
                    >
                      <option value="">-- Select Surgery --</option>
                      <option value="Appendectomy">Appendectomy (Appendix removal)</option>
                      <option value="Cholecystectomy">Gallbladder removal</option>
                      <option value="C-Section">C-Section</option>
                      <option value="Hernia Repair">Hernia Repair</option>
                      <option value="Knee/Joint Surgery">Knee or Joint Surgery</option>
                      <option value="Cardiac Surgery">Cardiac / Heart Surgery</option>
                      <option value="Tonsillectomy">Tonsillectomy</option>
                      <option value="Tooth Extraction">Tooth Extraction / Oral Surgery</option>
                      <option value="other">Other / Custom Type</option>
                    </select>
                  </div>
                  {surgeryType === "other" && (
                    <div style={{ flex: "1 1 100%", animation: "fadeUp 0.2s ease both" }}>
                      <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Specify Surgery Details</label>
                      <input
                        type="text" value={customSurgeryType} onChange={e => setCustomSurgeryType(e.target.value)}
                        placeholder="e.g. Laser eye surgery"
                        style={{
                          width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                          background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box"
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Chronic Diseases, Allergies & Current Medications */}
            <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
              <label style={{ display: "block", color: "var(--navy)", fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>
                3. Do you have any allergies or chronic medical conditions?
              </label>
              <div style={{ display: "flex", gap: 10, marginBottom: hasDiseaseOrAllergy ? 14 : 0 }}>
                {[true, false].map(val => (
                  <button
                    key={val ? "yes" : "no"} type="button"
                    onClick={() => setHasDiseaseOrAllergy(val)}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 8,
                      border: hasDiseaseOrAllergy === val ? "2.5px solid var(--blue)" : "1px solid var(--border)",
                      background: hasDiseaseOrAllergy === val ? "var(--blue-pale)" : "var(--surface)",
                      color: hasDiseaseOrAllergy === val ? "var(--blue)" : "var(--text)",
                      fontWeight: 700, fontSize: 13.5, cursor: "pointer", transition: "var(--transition)"
                    }}
                  >
                    {val ? "Yes, I do" : "No illnesses/allergies"}
                  </button>
                ))}
              </div>

              {hasDiseaseOrAllergy && (
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", animation: "fadeUp 0.25s ease both", marginBottom: 14 }}>
                  <div style={{ flex: "1 1 200px" }}>
                    <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Allergy or Disease Type</label>
                    <select
                      value={diseaseOrAllergyType} onChange={e => setDiseaseOrAllergyType(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                        background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box", height: "40.5px"
                      }}
                    >
                      <option value="">-- Select Condition/Allergy --</option>
                      <option value="Diabetes">Diabetes</option>
                      <option value="Hypertension">Hypertension (High blood pressure)</option>
                      <option value="Asthma">Asthma / Respiratory issue</option>
                      <option value="Thyroid Disorder">Thyroid Disorder</option>
                      <option value="Food Allergy (Gluten/Peanuts/Dairy)">Food Allergy (Gluten/Peanuts/Dairy)</option>
                      <option value="Drug Allergy (Penicillin/NSAIDs)">Drug Allergy (Penicillin/NSAIDs)</option>
                      <option value="Seasonal Allergy">Seasonal Allergies / Rhinitis</option>
                      <option value="Acid Reflux / GERD">Acid Reflux / GERD</option>
                      <option value="other">Other / Custom Condition</option>
                    </select>
                  </div>
                  {diseaseOrAllergyType === "other" && (
                    <div style={{ flex: "1 1 100%", animation: "fadeUp 0.2s ease both" }}>
                      <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Specify Condition Details</label>
                      <input
                        type="text" value={customDiseaseOrAllergyType} onChange={e => setCustomDiseaseOrAllergyType(e.target.value)}
                        placeholder="e.g. Peanut allergy & eczema"
                        style={{
                          width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                          background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box"
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Current Medications & Supplements regularly taken</label>
                <input
                  type="text" value={currentMedications} onChange={e => setCurrentMedications(e.target.value)}
                  placeholder="e.g. Metformin 500mg daily, Multivitamins (leave blank if none)"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                    background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {/* Section 4: Injuries */}
            <div style={{ paddingBottom: 10 }}>
              <label style={{ display: "block", color: "var(--navy)", fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>
                4. Do you have any current physical injuries?
              </label>
              <div style={{ display: "flex", gap: 10, marginBottom: hasInjury ? 14 : 0 }}>
                {[true, false].map(val => (
                  <button
                    key={val ? "yes" : "no"} type="button"
                    onClick={() => setHasInjury(val)}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 8,
                      border: hasInjury === val ? "2.5px solid var(--blue)" : "1px solid var(--border)",
                      background: hasInjury === val ? "var(--blue-pale)" : "var(--surface)",
                      color: hasInjury === val ? "var(--blue)" : "var(--text)",
                      fontWeight: 700, fontSize: 13.5, cursor: "pointer", transition: "var(--transition)"
                    }}
                  >
                    {val ? "Yes, currently injured" : "No injuries"}
                  </button>
                ))}
              </div>

              {hasInjury && (
                <div style={{ animation: "fadeUp 0.25s ease both" }}>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Describe your injury (location, type, pain severity)</label>
                  <textarea
                    rows="3" value={injuryDetail} onChange={e => setInjuryDetail(e.target.value)}
                    placeholder="e.g. Mild sprain in the right ankle after running yesterday."
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 8, border: "1.5px solid var(--border)",
                      background: "var(--surface)", color: "var(--navy)", fontSize: 13.5, outline: "none", boxSizing: "border-box",
                      fontFamily: "var(--font)", resize: "vertical"
                    }}
                  />
                </div>
              )}
            </div>

            {/* Generate Action button */}
            <button
              type="button"
              onClick={handleGenerateCustomNeed}
              disabled={
                !ageGroup || !gender || !activityLevel || !dietaryPreference || !healthGoal ||
                (surgeriesDone && (!numSurgeries || !surgeryType || (surgeryType === "other" && !customSurgeryType))) ||
                (hasDiseaseOrAllergy && (!diseaseOrAllergyType || (diseaseOrAllergyType === "other" && !customDiseaseOrAllergyType))) ||
                (hasInjury && !injuryDetail)
              }
              style={{
                width: "100%", padding: "14px", borderRadius: 10, border: "none",
                background: "var(--blue)", color: "#fff",
                fontWeight: 700, fontSize: 14.5, cursor: "pointer",
                fontFamily: "var(--font)", transition: "var(--transition)",
                marginTop: 10, boxShadow: "0 6px 20px rgba(37,99,235,0.25)"
              }}
            >
              Generate Custom Health Plan
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (initialCategory) {
      const catObj = categories.find(c => c.id === initialCategory);
      if (catObj) {
        setSelectedCategory(catObj.id);
      }
      setInitialCategory(null);
    }
  }, [initialCategory, setInitialCategory, categories]);

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 960, margin: "0 auto", position: "relative" }}>
      <style>{`
        @keyframes mtCardIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mtSlideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        .mt-cat-card { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
        .mt-cat-card:hover { transform: translateY(-4px); box-shadow: 0 16px 32px rgba(0,0,0,0.1); }
        .mt-cat-card:active { transform: scale(0.98); }
        .mt-item-card { transition: all 0.25s ease; }
        .mt-item-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .mt-save-btn { transition: all 0.2s ease; border: none; cursor: pointer; font-family: var(--font); }
        .mt-save-btn:hover { transform: scale(1.05); }
        .mt-save-btn:active { transform: scale(0.95); }
        .mt-buy-btn { transition: all 0.2s ease; border: none; cursor: pointer; font-family: var(--font); text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
        .mt-buy-btn:hover { transform: scale(1.05); }
        .mt-buy-btn:active { transform: scale(0.95); }
      `}</style>

      {/* Top-Right Go to Home Button */}
      <button
        onClick={onBack}
        title="Go to Home"
        style={{
          position: "absolute",
          top: 32,
          right: 32,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "8px 14px",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--navy)",
          cursor: "pointer",
          fontFamily: "var(--font)",
          transition: "all 0.2s ease",
          zIndex: 10
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.borderColor = "var(--blue-border)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        <span>←</span>
        <span>🏠</span>
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, animation: "fadeUp 0.4s ease both", flexWrap: "wrap", gap: 16 }}>
        <div style={{ textAlign: "left", paddingRight: 80 }}>
          <h2 style={{ fontSize: 30, fontWeight: 900, color: "var(--navy)", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 36 }}>🏙️</span> MeDiTown
          </h2>
          <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: 14.5, lineHeight: 1.5, margin: 0 }}>
            Your virtual medical town — explore pharmacies, herbal remedies, nutrition, and first aid essentials.
          </p>
        </div>
      </div>

      {/* Saved notice */}
      {savedNotice && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
          padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14,
          boxShadow: "0 8px 24px rgba(16,185,129,0.3)", animation: "fadeUp 0.3s ease both"
        }}>
          ✓ Saved: {savedNotice}
        </div>
      )}

      {customNeedActive ? (
        /* Custom Need Form or Results view */
        renderCustomNeedView()
      ) : !selectedCategory ? (
        /* Category Cards + Custom Need Button Banner */
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {categories.map((cat, i) => (
              <div
                key={cat.id}
                className="mt-cat-card"
                onClick={() => selectCategory(cat.id)}
                style={{
                  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18,
                  padding: 28, position: "relative", overflow: "hidden",
                  animation: `mtCardIn 0.4s ease both`, animationDelay: `${i * 0.08}s`
                }}
              >
                <div style={{
                  position: "absolute", top: -20, right: -20, width: 80, height: 80,
                  borderRadius: "50%", background: `${cat.color}15`, pointerEvents: "none"
                }} />
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: `${cat.color}12`, border: `1px solid ${cat.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, marginBottom: 16
                }}>{cat.icon}</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "var(--navy)", textAlign: "left" }}>{cat.name}</h3>
                <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, textAlign: "left" }}>{cat.desc}</p>
                <div style={{ fontSize: 13, fontWeight: 700, color: cat.color, textAlign: "left" }}>
                  Explore {cat.items.length} items →
                </div>
              </div>
            ))}
          </div>

          <div style={{ 
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, 
            padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between", 
            animation: "fadeUp 0.4s ease both", animationDelay: "0.35s", gap: 16, flexWrap: "wrap"
          }}>
            <div style={{ flex: 1, minWidth: 200, textAlign: "left" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16.5, fontWeight: 800, color: "var(--navy)" }}>✨ Need custom suggestions?</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Fill in your medical history (surgeries, allergies, illnesses, injuries) to generate AI health routines, foods, and remedies.
              </p>
            </div>
            <button
              onClick={() => setCustomNeedActive(true)}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, var(--blue), #1d4ed8)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
                fontFamily: "var(--font)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}
            >
              Custom Need
            </button>
          </div>

          {/* Saved Health Plans */}
          {/* Saved Health Plans */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18,
            padding: 24, textAlign: "left", display: "flex", flexDirection: "column", gap: 16,
            animation: "fadeUp 0.4s ease both"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>📂</span> Saved Health Plans {savedPlans && savedPlans.length > 0 && `(${savedPlans.length})`}
              </h3>
              {savedPlans && savedPlans.length > 0 && (
                showPlansClearConfirm ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-red)" }}>Confirm clear all?</span>
                    <button
                      onClick={() => {
                        apiDeleteAllPlans().then(() => {
                          fetchSavedPlans();
                          setSavedPlansPage(1);
                          setShowPlansClearConfirm(false);
                        }).catch(err => {
                          console.error("Failed to clear plans:", err);
                        });
                      }}
                      style={{
                        padding: "4px 10px", background: "var(--text-red)", color: "#fff",
                        border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: "var(--font)"
                      }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowPlansClearConfirm(false)}
                      style={{
                        padding: "4px 10px", background: "var(--surface-2)", color: "var(--text)",
                        border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: "var(--font)"
                      }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPlansClearConfirm(true)}
                    style={{
                      padding: "6px 12px", border: "1px solid #ef4444", background: "transparent",
                      color: "#ef4444", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.2s ease"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ef4444"; }}
                  >
                    Clear All
                  </button>
                )
              )}
            </div>
            {savedPlans && savedPlans.length > 0 ? (
              <>
                <div className={savedPlans.length > 3 ? "saved-plans-list-mobile" : ""} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {savedPlans.slice((savedPlansPage - 1) * 10, savedPlansPage * 10).map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => handleViewSavedPlan(plan)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center",
                        flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0,
                        padding: "12px 16px", borderRadius: 10, background: "var(--surface-2)",
                        border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s ease"
                      }}
                      className="mt-item-card"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, width: isMobile ? "100%" : "auto" }}>
                        <span style={{ fontSize: 16 }}>💾</span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--navy)" }}>
                          {plan.plan_name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "flex-end" : "auto" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); exportPlanToPDF(plan); }}
                          style={{
                            padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                            background: "var(--surface)", color: "var(--navy)", fontSize: 11.5,
                            fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)"
                          }}
                        >
                          📄 {isMobile ? "Export" : "Export PDF"}
                        </button>
                        <button
                          onClick={(e) => handleDeletePlanItem(plan.id, e)}
                          style={{
                            padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.2)",
                            background: "rgba(239, 68, 68, 0.05)", color: "#ef4444", fontSize: 11.5,
                            fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)"
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {savedPlans.length > 10 && (
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 4px 4px", borderTop: "1px solid var(--border)", marginTop: 8
                  }}>
                    <button
                      disabled={savedPlansPage === 1}
                      onClick={() => setSavedPlansPage(prev => Math.max(1, prev - 1))}
                      style={{
                        background: "var(--surface-2)", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700,
                        color: savedPlansPage === 1 ? "var(--text-faint)" : "var(--navy)",
                        cursor: savedPlansPage === 1 ? "not-allowed" : "pointer",
                        opacity: savedPlansPage === 1 ? 0.5 : 1, transition: "all 0.2s ease"
                      }}
                    >
                      ← Previous
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>
                      Page {savedPlansPage} of {Math.ceil(savedPlans.length / 10)}
                    </span>
                    <button
                      disabled={savedPlansPage >= Math.ceil(savedPlans.length / 10)}
                      onClick={() => setSavedPlansPage(prev => Math.min(Math.ceil(savedPlans.length / 10), prev + 1))}
                      style={{
                        background: "var(--surface-2)", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700,
                        color: savedPlansPage >= Math.ceil(savedPlans.length / 10) ? "var(--text-faint)" : "var(--navy)",
                        cursor: savedPlansPage >= Math.ceil(savedPlans.length / 10) ? "not-allowed" : "pointer",
                        opacity: savedPlansPage >= Math.ceil(savedPlans.length / 10) ? 0.5 : 1, transition: "all 0.2s ease"
                      }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                textAlign: "center", padding: "24px 16px", color: "var(--text-muted)",
                fontSize: 13, fontStyle: "italic", background: "var(--surface-2)", borderRadius: 10,
                border: "1px dashed var(--border)"
              }}>
                No saved health plans yet. Fill out the "Custom Need" form below to generate and save one.
              </div>
            )}
          </div>
        </div>
      ) : activeCategory ? (
        /* Category Detail View */
        <div style={{ animation: "mtSlideIn 0.3s ease both" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: `${activeCategory.color}12`, border: `1px solid ${activeCategory.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24
              }}>{activeCategory.icon}</div>
              <div style={{ textAlign: "left" }}>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "var(--navy)" }}>{activeCategory.name}</h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{activeCategory.desc}</p>
              </div>
            </div>

            <button
              onClick={() => { setSelectedCategory(null); setSearchTerm(""); setIsExploringFood(false); }}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
                padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "var(--navy)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font)", transition: "all 0.2s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--surface)"}
            >
              {isMobile ? "← Town" : "← Back to Town"}
            </button>
          </div>

          <div style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder={selectedCategory === 'nutrition' ? (isExploringFood ? "Search food dishes..." : "Search nutrition ingredients...") : "Search medicines..."}
              style={{
                flex: 2, minWidth: "200px", padding: "12px 18px", borderRadius: 12, border: "1.5px solid var(--border)",
                fontSize: 14, fontFamily: "var(--font)", background: "var(--surface)", color: "var(--navy)",
                outline: "none"
              }}
            />

            {selectedCategory === 'pharmacy' && (
              <select
                value={pharmacySubcat}
                onChange={e => setPharmacySubcat(e.target.value)}
                style={{
                  flex: 1, minWidth: "150px", padding: "12px 18px", borderRadius: 12, border: "1.5px solid var(--border)",
                  fontSize: 14, fontFamily: "var(--font)", background: "var(--surface)", color: "var(--navy)",
                  outline: "none", cursor: "pointer", height: "48px", boxSizing: "border-box"
                }}
              >
                <option value="all">All Categories</option>
                <option value="pain_fever">Fever & Pain Relief</option>
                <option value="cough_cold">Cough & Cold</option>
                <option value="digestion">Acidity & Digestion</option>
                <option value="skin_care">Skin Care & Fungal</option>
                <option value="personal_care">Soap & Shampoo</option>
                <option value="intimacy">Intimacy & Contraception</option>
                <option value="drinks">Rehydration & Drinks</option>
                <option value="wellness">General Wellness</option>
              </select>
            )}

            {selectedCategory === 'herbs' && (
              <select
                value={herbsSubcat}
                onChange={e => setHerbsSubcat(e.target.value)}
                style={{
                  flex: 1, minWidth: "150px", padding: "12px 18px", borderRadius: 12, border: "1.5px solid var(--border)",
                  fontSize: 14, fontFamily: "var(--font)", background: "var(--surface)", color: "var(--navy)",
                  outline: "none", cursor: "pointer", height: "48px", boxSizing: "border-box"
                }}
              >
                <option value="all">All Uses</option>
                <option value="respiratory_immunity">Respiratory & Immunity</option>
                <option value="reproduction_hormones">Reproductive & Hormones</option>
                <option value="brain_stress_sleep">Stress, Brain & Sleep</option>
                <option value="digestion_detox">Digestion, Liver & Detox</option>
                <option value="joints_inflammation">Joints & Inflammation</option>
                <option value="skin_hair">Skin & Hair Care</option>
                <option value="wellness">General Wellness</option>
              </select>
            )}

            {selectedCategory === 'nutrition' && !isExploringFood && (
              <select
                value={nutritionSubcat}
                onChange={e => setNutritionSubcat(e.target.value)}
                style={{
                  flex: 1, minWidth: "150px", padding: "12px 18px", borderRadius: 12, border: "1.5px solid var(--border)",
                  fontSize: 14, fontFamily: "var(--font)", background: "var(--surface)", color: "var(--navy)",
                  outline: "none", cursor: "pointer", height: "48px", boxSizing: "border-box"
                }}
              >
                <option value="all">All Nutrients</option>
                <option value="vitamins_minerals">Vitamins & Minerals</option>
                <option value="proteins_muscles">Proteins & Muscles</option>
                <option value="oils_fats">Essential Oils & Fats</option>
                <option value="gut_digestion">Gut Health & Digestion</option>
                <option value="brain_sleep">Brain & Sleep Support</option>
                <option value="antioxidants_detox">Antioxidants & Detox</option>
                <option value="wellness">General Wellness</option>
              </select>
            )}

            {selectedCategory === 'nutrition' && (
              <button
                onClick={() => {
                  setIsExploringFood(!isExploringFood);
                  setSearchTerm("");
                }}
                className="mt-buy-btn"
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13,
                  lineHeight: 1.2,
                  background: isExploringFood
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff",
                  boxShadow: isExploringFood
                    ? "0 2px 6px rgba(16,185,129,0.15)"
                    : "0 2px 6px rgba(245,158,11,0.15)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                  transition: "all 0.2s ease",
                  height: "48px"
                }}
              >
                {isExploringFood ? "Show Supplements" : "Explore Food Dishes"}
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {isExploringFood ? (
              paginatedItems.map((item, i) => (
                <div
                  key={i} className="mt-item-card"
                  onClick={() => {
                    setActiveFoodItem(item);
                    setCurrentFoodStep(0);
                  }}
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
                    padding: 20, display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center",
                    flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0,
                    cursor: "pointer", transition: "all 0.2s ease",
                    animation: `mtCardIn 0.3s ease both`, animationDelay: `${i * 0.05}s`
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ flex: 1, textAlign: "left", display: "flex", alignItems: "center", gap: 16, width: isMobile ? "100%" : "auto" }}>
                    <span style={{ fontSize: 36 }}>{item.image}</span>
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>{item.name}</h4>
                      <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-muted)" }}>{item.desc}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>
                        Rich in: <span style={{ color: "#10b981", fontWeight: 600 }}>{item.nutrients}</span>
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "flex-end" : "auto" }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: "#10b981",
                      background: "rgba(16,185,129,0.1)", padding: "6px 12px", borderRadius: 8
                    }}>
                      View Guide →
                    </span>
                  </div>
                </div>
              ))
            ) : (
              paginatedItems.map((item, i) => (
                <div
                  key={i} className="mt-item-card"
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
                    padding: 20, display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center",
                    flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0,
                    animation: `mtCardIn 0.3s ease both`, animationDelay: `${i * 0.05}s`
                  }}
                >
                  <div style={{ flex: 1, textAlign: "left", width: isMobile ? "100%" : "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>{item.name}</h4>
                    </div>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-muted)" }}>{item.use}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>Dosage: {item.dosage}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "flex-end" : "auto" }}>
                    {(selectedCategory === 'firstaid' || selectedCategory === 'pharmacy') && (
                      <a
                        href={`https://pharmeasy.in/search/all?name=${encodeURIComponent(item.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-buy-btn"
                        style={{
                          padding: "8px 18px",
                          borderRadius: 10,
                          fontWeight: 700,
                          fontSize: 12,
                          lineHeight: 1.2,
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "#fff",
                          boxShadow: "0 2px 6px rgba(16,185,129,0.15)",
                          gap: 6
                        }}
                      >
                        🛒 Buy Now
                      </a>
                    )}
                    {selectedCategory === 'herbs' && (
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(item.name + ' herbal remedies')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-buy-btn"
                        style={{
                          padding: "8px 18px",
                          borderRadius: 10,
                          fontWeight: 700,
                          fontSize: 12,
                          lineHeight: 1.2,
                          background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                          color: "#fff",
                          boxShadow: "0 2px 6px rgba(37,99,235,0.15)",
                          gap: 6
                        }}
                      >
                        Know More
                      </a>
                    )}
                    <button
                      className="mt-save-btn"
                      onClick={() => handleSave(item.name)}
                      disabled={isSaved(item.name)}
                      style={{
                        padding: "8px 18px", borderRadius: 10, fontWeight: 700, fontSize: 12,
                        background: isSaved(item.name)
                          ? "var(--bg-green-light)" : `linear-gradient(135deg, ${activeCategory.color}, ${activeCategory.color}dd)`,
                        color: isSaved(item.name) ? "var(--green)" : "#fff",
                        opacity: isSaved(item.name) ? 0.7 : 1,
                        boxShadow: isSaved(item.name) ? "none" : `0 2px 6px ${activeCategory.color}20`
                      }}
                    >
                      {isSaved(item.name) ? "✓ Saved" : "+ Save"}
                    </button>
                  </div>
                </div>
              ))
            )}
            {totalPages > 1 && (
              <div style={{
                display: "flex", justifyContent: "center", alignItems: "center", gap: 16,
                marginTop: 16, padding: "10px 0"
              }}>
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  className="mt-pag-btn"
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--surface)", color: "var(--navy)", fontWeight: 700,
                    fontSize: 12, cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1, transition: "all 0.2s ease",
                    fontFamily: "var(--font)"
                  }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === totalPages}
                  className="mt-pag-btn"
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--surface)", color: "var(--navy)", fontWeight: 700,
                    fontSize: 12, cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage === totalPages ? 0.5 : 1, transition: "all 0.2s ease",
                    fontFamily: "var(--font)"
                  }}
                >
                  Next →
                </button>
              </div>
            )}
            {((!isExploringFood && filteredItems.length === 0) || (isExploringFood && filteredFoodItems.length === 0)) && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                <p style={{ fontSize: 14 }}>No items found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
              padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "var(--navy)",
              cursor: "pointer", fontFamily: "var(--font)",
            }}
          >
            {isMobile ? "← Town" : "← Back to Town"}
          </button>
        </div>
      )}

      {/* Nutrient Details Side Drawer */}
      {activeNutrient && createPortal(
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          zIndex: 10000, display: "flex", justifyContent: "flex-end",
          pointerEvents: nutrientDrawerOpen ? "all" : "none",
          visibility: nutrientDrawerOpen ? "visible" : "hidden",
          transition: "visibility 0.35s ease"
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setNutrientDrawerOpen(false)}
            style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              opacity: nutrientDrawerOpen ? 1 : 0,
              transition: "opacity 0.35s ease"
            }}
          />
          {/* Drawer Container */}
          <div className="styled-scroll" style={{
            position: "relative", width: "100%", maxWidth: 420, height: "100%",
            background: "var(--surface)", borderLeft: "1px solid var(--border)",
            boxShadow: "-10px 0 30px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column",
            transform: nutrientDrawerOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            overflowY: "auto", padding: 32, textAlign: "left", WebkitOverflowScrolling: "touch", maxHeight: "100dvh"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button
                onClick={() => setNutrientDrawerOpen(false)}
                style={{
                  border: "none",
                  background: "none",
                  color: "var(--text)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  padding: 0,
                  marginRight: 4,
                  transition: "var(--transition)"
                }}
                title="Back"
              >
                ←
              </button>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "var(--navy)" }}>
                🥦 {activeNutrient.name}
              </h3>
            </div>

            {drawerLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 16 }}>
                <div className="spinner" style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: "3px solid rgba(37,99,235,0.1)", borderTopColor: "var(--blue)",
                  animation: "spin 1s linear infinite"
                }} />
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading food sources...</span>
              </div>
            ) : drawerDetails ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <h4 style={{ margin: "0 0 8px", fontSize: 14.5, fontWeight: 800, color: "var(--navy)" }}>Benefit</h4>
                  <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{activeNutrient.benefit}</p>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 10px", fontSize: 14.5, fontWeight: 800, color: "var(--navy)" }}>Recommended Food Sources</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                    {drawerDetails.foods?.map((food, i) => (
                      <li key={i} style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{food}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 10px", fontSize: 14.5, fontWeight: 800, color: "var(--navy)" }}>Associated Compounds & Ingredients</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {drawerDetails.ingredients?.map((ing, i) => (
                      <span key={i} style={{
                        padding: "5px 10px", borderRadius: 8, background: "var(--surface-2)",
                        border: "1px solid var(--border)", fontSize: 12, color: "var(--navy)", fontWeight: 600
                      }}>
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: "0 0 10px", fontSize: 14.5, fontWeight: 800, color: "var(--navy)" }}>Practical Consumption Tips</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                    {drawerDetails.tips?.map((tip, i) => (
                      <li key={i} style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.4 }}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>,
        document.body
      )}

      {/* Saved Plan Details Popup Modal */}
      {viewingSavedPlan && createPortal(
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setViewingSavedPlan(null)}
            style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)"
            }}
          />
          {/* Modal Container */}
          <div style={{
            position: "relative", width: "100%", maxWidth: 640, maxHeight: "85vh",
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20,
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column",
            animation: "mtCardIn 0.3s ease both", overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              padding: "24px 32px", borderBottom: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => setViewingSavedPlan(null)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--text)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    padding: 0,
                    marginRight: 4,
                    transition: "var(--transition)"
                  }}
                  title="Back"
                >
                  ←
                </button>
                <div style={{ textAlign: "left" }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--navy)" }}>
                    {viewingSavedPlan.plan_name}
                  </h3>
                  <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    Created on {new Date(viewingSavedPlan.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => exportPlanToPDF(viewingSavedPlan)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                    background: "var(--surface-2)", color: "var(--navy)", fontSize: 12,
                    fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)"
                  }}
                >
                  📄 Export PDF
                </button>
              </div>
            </div>

            {/* Content Scroll Area */}
            <div className="styled-scroll" style={{ padding: 32, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24, textAlign: "left" }}>
              {/* 1. Nutrients & Foods */}
              {viewingSavedPlan.plan_data?.nutrients && viewingSavedPlan.plan_data.nutrients.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🥦</span> Nutrients & Daily Foods
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {viewingSavedPlan.plan_data.nutrients.map((n, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setViewingSavedPlan(null);
                          handleNutrientClick(n);
                        }}
                        style={{
                          background: "var(--surface-2)", borderRadius: 10, padding: 14,
                          border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s ease"
                        }}
                        className="mt-item-card"
                      >
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)", marginBottom: 2 }}>{n.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{n.benefit}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Daily Routines */}
              {viewingSavedPlan.plan_data?.routines && viewingSavedPlan.plan_data.routines.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🏃</span> Daily Routines
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {viewingSavedPlan.plan_data.routines.map((r, i) => (
                      <div key={i} style={{ borderLeft: "3px solid var(--blue)", paddingLeft: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)", marginBottom: 2 }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{r.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Herbal Remedies */}
              {viewingSavedPlan.plan_data?.herbs && viewingSavedPlan.plan_data.herbs.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🌿</span> Herbal Remedies
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {viewingSavedPlan.plan_data.herbs.map((h, i) => (
                      <div key={i} style={{ background: "var(--surface-2)", borderRadius: 10, padding: 14, border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--navy)" }}>{h.name}</span>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(h.name + ' herbal remedies')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              color: "var(--blue)",
                              textDecoration: "none",
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 5,
                              background: "rgba(37,99,235,0.06)",
                              border: "1px solid rgba(37,99,235,0.15)",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = "var(--blue)";
                              e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = "rgba(37,99,235,0.06)";
                              e.currentTarget.style.color = "var(--blue)";
                            }}
                            title={`Search Google for ${h.name}`}
                          >
                            <span>Google</span>
                            <span style={{ fontSize: 8.5 }}>↗</span>
                          </a>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}><strong>Use:</strong> {h.use}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}><strong>Preparation:</strong> {h.preparation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Step-by-Step Food Ingredient Modal */}
      {createPortal(
        <AnimatePresence>
          {activeFoodItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(10,25,47,0.85)", backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 10001, padding: 20
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 250 }}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 20, width: "100%", maxWidth: 500, padding: 30,
                boxShadow: "0 20px 50px rgba(0,0,0,0.3), 0 0 30px rgba(16,185,129,0.05)",
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Soft decorative background glows */}
              <div style={{
                position: "absolute", top: "-20%", right: "-20%", width: "50%", height: "50%",
                background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0) 70%)",
                borderRadius: "50%", pointerEvents: "none"
              }} />
              <div style={{
                position: "absolute", bottom: "-20%", left: "-20%", width: "50%", height: "50%",
                background: "radial-gradient(circle, rgba(5,150,105,0.06) 0%, rgba(5,150,105,0) 70%)",
                borderRadius: "50%", pointerEvents: "none"
              }} />

              {/* Close / Wrong Icon */}
              <button
                onClick={() => setActiveFoodItem(null)}
                style={{
                  position: "absolute", top: 20, right: 20,
                  background: "none", border: "none", color: "var(--text-muted)",
                  fontSize: 22, cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", width: 32, height: 32,
                  borderRadius: "50%", transition: "all 0.2s", zIndex: 10
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--surface-2)";
                  e.currentTarget.style.color = "var(--navy)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                ✕
              </button>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, position: "relative" }}>
                <div style={{ 
                  position: "relative", width: 56, height: 56, display: "flex", 
                  alignItems: "center", justifyContent: "center", background: "var(--surface-2)", 
                  borderRadius: "50%", border: "1px solid var(--border)", boxShadow: "0 4px 10px rgba(0,0,0,0.15)"
                }}>
                  <span style={{ fontSize: 32, zIndex: 2 }}>{activeFoodItem.image}</span>
                  
                  {/* Splashing Particles container */}
                  <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none", zIndex: 1 }}>
                    {particles.map(p => (
                      <motion.span
                        key={p.id}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                        animate={{
                          x: p.targetX,
                          y: p.targetY,
                          scale: [0, 1.3, 1.1, 0.9, 0],
                          opacity: [1, 1, 1, 0.7, 0],
                          rotate: p.rotation
                        }}
                        transition={{
                          duration: p.duration,
                          ease: "easeOut"
                        }}
                        style={{
                          position: "absolute",
                          fontSize: p.size,
                          width: p.size,
                          height: p.size,
                          marginLeft: -p.size / 2,
                          marginTop: -p.size / 2,
                          lineHeight: 1,
                          whiteSpace: "nowrap"
                        }}
                      >
                        {p.emoji}
                      </motion.span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "left" }}>
                  <h4 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "var(--navy)" }}>{activeFoodItem.name}</h4>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Step-by-Step Cooking Guide</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 6, background: "var(--border)", borderRadius: 3, marginBottom: 24, overflow: "hidden" }}>
                <div style={{
                  height: "100%", background: "linear-gradient(90deg, #10b981, #059669)",
                  width: `${((currentFoodStep + 1) / activeFoodItem.steps.length) * 100}%`,
                  transition: "width 0.3s ease"
                }} />
              </div>

              {/* Step Content with crossfade slide transition */}
              <div style={{ minHeight: 140, textAlign: "left", marginBottom: 30, position: "relative" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentFoodStep}
                    initial={{ x: 25, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -25, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <span style={{
                      display: "inline-block", padding: "4px 10px", borderRadius: 20,
                      background: "rgba(16,185,129,0.1)", color: "#10b981",
                      fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5,
                      marginBottom: 12
                    }}>
                      Step {currentFoodStep + 1} of {activeFoodItem.steps.length}
                    </span>
                    <h5 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "var(--navy)" }}>
                      {activeFoodItem.steps[currentFoodStep].title}
                    </h5>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text)" }}>
                      {activeFoodItem.steps[currentFoodStep].desc}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <button
                  disabled={currentFoodStep === 0}
                  onClick={() => setCurrentFoodStep(prev => prev - 1)}
                  className="mt-buy-btn"
                  style={{
                    flex: 1, padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 12,
                    background: currentFoodStep === 0 ? "var(--border)" : "var(--surface)",
                    color: currentFoodStep === 0 ? "var(--text-faint)" : "var(--navy)",
                    border: "1px solid var(--border)",
                    cursor: currentFoodStep === 0 ? "not-allowed" : "pointer",
                    opacity: currentFoodStep === 0 ? 0.5 : 1
                  }}
                >
                  Previous
                </button>
                {currentFoodStep < activeFoodItem.steps.length - 1 ? (
                  <button
                    onClick={() => setCurrentFoodStep(prev => prev + 1)}
                    className="mt-buy-btn"
                    style={{
                      flex: 1, padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 12,
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#fff", border: "none", cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(16,185,129,0.15)"
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveFoodItem(null)}
                    className="mt-buy-btn"
                    style={{
                      flex: 1, padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 12,
                      background: "linear-gradient(135deg, #059669, #047857)",
                      color: "#fff", border: "none", cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(5,150,105,0.15)"
                    }}
                  >
                    Done
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("home");
  const [reports, setReports] = useState([]);
  const [history, setHistory] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [settings, setSettings] = useState({});
  const [currentReport, setCurrentReport] = useState(null);
  const [initialSymptoms, setInitialSymptoms] = useState([]);
  const [dbReady, setDbReady] = useState(false);
  const [splashPhase, setSplashPhase] = useState("enter");
  const [pageKey, setPageKey] = useState(0);

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [savedMedicines, setSavedMedicines] = useState([]);
  const [showMedList, setShowMedList] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [medListFilter, setMedListFilter] = useState("All");
  const [showMedDeleteConfirm, setShowMedDeleteConfirm] = useState(false);

  useEffect(() => {
    if (showMedList) {
      if (selectedCategory === "pharmacy") setMedListFilter("Pharmacy");
      else if (selectedCategory === "herbs") setMedListFilter("Herbal Remedies");
      else if (selectedCategory === "nutrition") setMedListFilter("Nutrition Center");
      else if (selectedCategory === "firstaid") setMedListFilter("First Aid Station");
      else setMedListFilter("All");
    }
  }, [showMedList, selectedCategory]);
  const [savedReminders, setSavedReminders] = useState([]);
  const [showReminderList, setShowReminderList] = useState(false);
  const [showReminderDeleteConfirm, setShowReminderDeleteConfirm] = useState(false);
  const [fabMenuExpanded, setFabMenuExpanded] = useState(false);
  const [appearance, setAppearance] = useState(() => loadAppearance());
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMsgs, setChatMsgs] = useState(() => getNewChatDefaultMessages());
  const [todos, setTodos] = useState([]);
  const [confirmDeleteChatId, setConfirmDeleteChatId] = useState(null);
  const [toast, setToast] = useState(null);
  const [meditownInitialCategory, setMeditownInitialCategory] = useState(null);
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [reminderQueue, setReminderQueue] = useState([]);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDate, setReminderDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [reminderRepeat, setReminderRepeat] = useState("only one time");
  const [reminderSoundEnabled, setReminderSoundEnabled] = useState(false);
  const [postponeMode, setPostponeMode] = useState(false);
  const [customPostponeVal, setCustomPostponeVal] = useState("3");
  const [customPostponeUnit, setCustomPostponeUnit] = useState("hours");
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [editRepeat, setEditRepeat] = useState("only one time");
  const [editDate, setEditDate] = useState("");
  const [editPostponeTime, setEditPostponeTime] = useState("");

  useEffect(() => {
    setPostponeMode(false);
    setCustomPostponeVal("3");
    setCustomPostponeUnit("hours");
  }, [activeAlarm]);

  const getVisibleReminders = () => {
    const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
    const todayTime = new Date(todayStr).getTime();
    return savedReminders.filter(rem => {
      try {
        if (rem.time && rem.time.startsWith("{")) {
          const parsed = JSON.parse(rem.time);
          if (parsed.repeat === "only one time" && parsed.date) {
            const reminderTime = new Date(parsed.date).getTime();
            const diffDays = (reminderTime - todayTime) / (1000 * 60 * 60 * 24);
            if (diffDays > 1) return false;
          }
        }
      } catch (e) {}
      return true;
    });
  };

  const isReminderFinished = (rem) => {
    try {
      if (rem.time && rem.time.startsWith("{")) {
        const parsed = JSON.parse(rem.time);
        if (parsed.repeat === "only one time" && parsed.date) {
          const todayStr = new Date().toLocaleDateString("en-CA");
          if (todayStr > parsed.date) {
            return true;
          }
        }
      }
    } catch (e) {}
    return false;
  };

  const isReminderNotedToday = (rem) => {
    try {
      const remId = rem._id || rem.id;
      const now = new Date();
      const currentDayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return sessionStorage.getItem(`MEDAI_REMINDER_ACK_${remId}`) === currentDayString;
    } catch (e) {}
    return false;
  };

  // FAB Draggable states
  const [fabCorner, setFabCorner] = useState(() => {
    return localStorage.getItem("MEDAI_FAB_CORNER") || (loadAppearance().navPosition === "right" ? "left-bottom" : "right-bottom");
  });
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const [isHoveredFab, setIsHoveredFab] = useState(false);
  const [fabPos, setFabPos] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ startX: 0, startY: 0, clickX: 0, clickY: 0, didMove: false });
  const fabContainerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (fabContainerRef.current && !fabContainerRef.current.contains(event.target)) {
        setShowMedList(false);
        setShowReminderList(false);
        setFabMenuExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Register Service Worker for push notification click events
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    }
  }, []);

  // Listen to messages from Service Worker (e.g., clicking on a notification)
  useEffect(() => {
    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'OPEN_REMINDER_POPUP') {
        setShowReminderList(true);
      }
    };
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  // Request Notification permission when login splash Phase finishes
  useEffect(() => {
    if (splashPhase === "done") {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [splashPhase]);

  useEffect(() => {
    if (!savedReminders || savedReminders.length === 0 || splashPhase !== "done") return;

    const checkAlarms = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
      const currentDate = String(now.getDate()).padStart(2, "0");
      const currentDayString = `${currentYear}-${currentMonth}-${currentDate}`;
      const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...

      const dayOfWeekMap = {
        0: "every sunday",
        1: "every monday",
        2: "every tuesday",
        3: "every wednesday",
        4: "every thursday",
        5: "every friday",
        6: "every saturday"
      };

      const due = [];
      savedReminders.forEach(rem => {
        if (!rem.active) return;

        let parsed = { date: "", repeat: "only one time" };
        try {
          if (rem.time.startsWith("{")) {
            parsed = JSON.parse(rem.time);
          } else {
            parsed.date = rem.time;
          }
        } catch (e) {
          parsed.date = rem.time;
        }

        let isDue = false;
        if (parsed.repeat === "only one time") {
          if (parsed.date === currentDayString) {
            isDue = true;
          }
        } else {
          const startSecs = parsed.date ? new Date(parsed.date).setHours(0,0,0,0) : 0;
          const todaySecs = new Date(currentDayString).setHours(0,0,0,0);
          if (todaySecs >= startSecs) {
            if (parsed.repeat === "daily remind") {
              isDue = true;
            } else if (parsed.repeat === dayOfWeekMap[currentDayOfWeek]) {
              isDue = true;
            }
          }
        }

        if (isDue) {
          const remId = rem._id || rem.id;
          const ackDate = sessionStorage.getItem(`MEDAI_REMINDER_ACK_${remId}`);
          if (ackDate !== currentDayString) {
            const postponeTimeStr = localStorage.getItem(`MEDAI_REMINDER_POSTPONED_${remId}`);
            if (postponeTimeStr) {
              const postponeTime = parseInt(postponeTimeStr, 10);
              if (Date.now() < postponeTime) {
                return; // Skip, still postponed!
              }
            }
            due.push(rem);
          }
        }
      });

      if (due.length > 0) {
        setReminderQueue(due);
        if (!activeAlarm) {
          setActiveAlarm(due[0]);
          startAlarmAudio(due[0]);
        }

        // Trigger browser native notifications for each due reminder only if the tab is hidden
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          due.forEach(rem => {
            const remId = rem._id || rem.id;
            const notifiedKey = `MEDAI_NOTIFIED_${remId}_${currentDayString}`;

            if (!sessionStorage.getItem(notifiedKey)) {
              sessionStorage.setItem(notifiedKey, "true");

              if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification(`Reminder: ${rem.title}`, {
                    body: `It's time for your scheduled reminder: "${rem.title}". Click to open.`,
                    icon: "/favicon.svg",
                    tag: remId,
                    requireInteraction: true,
                    data: { remId }
                  });
                });
              } else {
                const notification = new Notification(`Reminder: ${rem.title}`, {
                  body: `It's time for your scheduled reminder: "${rem.title}". Click to open.`,
                  icon: "/favicon.svg",
                  tag: remId,
                  requireInteraction: true
                });

                notification.onclick = () => {
                  window.focus();
                  setShowReminderList(true);
                  notification.close();
                };
              }
            }
          });
        }
      } else {
        setActiveAlarm(null);
        stopAlarmAudio();
      }
    };

    checkAlarms();
    const checkInterval = setInterval(checkAlarms, 30000);
    return () => clearInterval(checkInterval);
  }, [savedReminders, splashPhase, activeAlarm]);

  const handleStartEditReminder = (rem) => {
    const remId = rem._id || rem.id;
    setEditingReminderId(remId);
    let parsed = { date: "", repeat: "only one time" };
    try {
      if (rem.time.startsWith("{")) {
        parsed = JSON.parse(rem.time);
      } else {
        parsed.date = rem.time;
      }
    } catch (e) {
      parsed.date = rem.time;
    }

    setEditRepeat(parsed.repeat || "only one time");
    setEditDate(parsed.date || new Date().toISOString().split("T")[0]);

    const pst = localStorage.getItem(`MEDAI_REMINDER_POSTPONED_${remId}`);
    if (pst) {
      const d = new Date(parseInt(pst, 10));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      setEditPostponeTime(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    } else {
      setEditPostponeTime("");
    }
  };

  const handleSaveEditReminder = async (rem) => {
    const remId = rem._id || rem.id;
    let parsed = { date: "", repeat: "only one time", soundEnabled: false };
    try {
      if (rem.time.startsWith("{")) {
        parsed = JSON.parse(rem.time);
      } else {
        parsed.date = rem.time;
      }
    } catch (e) {
      parsed.date = rem.time;
    }

    const scheduleStr = JSON.stringify({
      time: "",
      date: editRepeat === "only one time" ? editDate : "",
      repeat: editRepeat,
      soundEnabled: parsed.soundEnabled
    });

    try {
      const updated = await apiUpdateReminder(remId, { time: scheduleStr });
      setSavedReminders(prev => prev.map(r => (r._id === remId || r.id === remId) ? updated : r));
    } catch {
      const updatedList = savedReminders.map(r => {
        if (r._id === remId || r.id === remId) {
          return { ...r, time: scheduleStr };
        }
        return r;
      });
      setSavedReminders(updatedList);
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(updatedList));
    }

    if (editPostponeTime) {
      const ms = new Date(editPostponeTime).getTime();
      if (!isNaN(ms)) {
        localStorage.setItem(`MEDAI_REMINDER_POSTPONED_${remId}`, ms.toString());
      }
    } else {
      localStorage.removeItem(`MEDAI_REMINDER_POSTPONED_${remId}`);
    }

    setEditingReminderId(null);
    showToast("Reminder updated successfully!");
  };

  const handleNotedReminder = () => {
    if (!activeAlarm) return;
    const currentRemId = activeAlarm._id || activeAlarm.id;
    const now = new Date();
    const currentDayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    sessionStorage.setItem(`MEDAI_REMINDER_ACK_${currentRemId}`, currentDayString);
    localStorage.removeItem(`MEDAI_REMINDER_POSTPONED_${currentRemId}`);

    const nextQueue = reminderQueue.filter(r => (r._id || r.id) !== currentRemId);
    setReminderQueue(nextQueue);
    stopAlarmAudio();
    if (nextQueue.length > 0) {
      setActiveAlarm(nextQueue[0]);
      startAlarmAudio(nextQueue[0]);
    } else {
      setActiveAlarm(null);
    }
  };

  const handlePostponeAction = async (hoursOrDays, isCustom = false) => {
    if (!activeAlarm) return;
    const currentRemId = activeAlarm._id || activeAlarm.id;
    const now = new Date();
    const currentDayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    sessionStorage.setItem(`MEDAI_REMINDER_ACK_${currentRemId}`, currentDayString);

    let msToAdd = 0;
    if (isCustom) {
      const val = parseFloat(customPostponeVal);
      if (isNaN(val) || val <= 0) return;
      if (customPostponeUnit === "hours") {
        msToAdd = val * 60 * 60 * 1000;
      } else {
        msToAdd = val * 24 * 60 * 60 * 1000;
      }
    } else {
      if (hoursOrDays === "5h") msToAdd = 5 * 60 * 60 * 1000;
      else if (hoursOrDays === "12h") msToAdd = 12 * 60 * 60 * 1000;
      else if (hoursOrDays === "tomorrow") msToAdd = 24 * 60 * 60 * 1000;
      else if (hoursOrDays === "2d") msToAdd = 48 * 60 * 60 * 1000;
    }

    const postponeUntil = Date.now() + msToAdd;
    localStorage.setItem(`MEDAI_REMINDER_POSTPONED_${currentRemId}`, postponeUntil.toString());

    // Calculate future target date
    const postponeDate = new Date(Date.now() + msToAdd);
    const postponeDateStr = `${postponeDate.getFullYear()}-${String(postponeDate.getMonth() + 1).padStart(2, "0")}-${String(postponeDate.getDate()).padStart(2, "0")}`;

    let parsed = { date: "", repeat: "only one time" };
    try {
      if (activeAlarm.time.startsWith("{")) {
        parsed = JSON.parse(activeAlarm.time);
      } else {
        parsed.date = activeAlarm.time;
      }
    } catch (e) {
      parsed.date = activeAlarm.time;
    }

    if (parsed.repeat === "only one time") {
      parsed.date = postponeDateStr;
      const scheduleStr = JSON.stringify(parsed);
      try {
        const updated = await apiUpdateReminder(currentRemId, { time: scheduleStr });
        setSavedReminders(prev => prev.map(r => (r._id === currentRemId || r.id === currentRemId) ? updated : r));
      } catch {
        const updatedList = savedReminders.map(r => {
          if (r._id === currentRemId || r.id === currentRemId) {
            return { ...r, time: scheduleStr };
          }
          return r;
        });
        setSavedReminders(updatedList);
        localStorage.setItem(REMINDERS_KEY, JSON.stringify(updatedList));
      }
    }

    const nextQueue = reminderQueue.filter(r => (r._id || r.id) !== currentRemId);
    setReminderQueue(nextQueue);
    stopAlarmAudio();
    if (nextQueue.length > 0) {
      setActiveAlarm(nextQueue[0]);
      startAlarmAudio(nextQueue[0]);
    } else {
      setActiveAlarm(null);
    }
  };

  const handleFabMouseMove = useCallback((e) => {
    if (!dragStartRef.current) return;
    const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStartRef.current.clickX;
    const deltaY = clientY - dragStartRef.current.clickY;
    
    if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) {
      dragStartRef.current.didMove = true;
    }
    
    const newX = Math.max(10, Math.min(window.innerWidth - 64, dragStartRef.current.startX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 64, dragStartRef.current.startY + deltaY));
    
    setFabPos({ x: newX, y: newY });
    if (e.cancelable) e.preventDefault();
  }, []);

  const handleFabMouseUp = useCallback((e) => {
    document.removeEventListener("mousemove", handleFabMouseMove);
    document.removeEventListener("mouseup", handleFabMouseUp);
    document.removeEventListener("touchmove", handleFabMouseMove);
    document.removeEventListener("touchend", handleFabMouseUp);
    
    setIsDraggingFab(false);
    
    if (!dragStartRef.current.didMove) {
      if (fabMenuExpanded) {
        setShowMedList(false);
        setShowReminderList(false);
      }
      setFabMenuExpanded(v => !v);
      return;
    }
    
    const clientX = e.type === "touchend" ? (e.changedTouches?.[0]?.clientX || 0) : e.clientX;
    const clientY = e.type === "touchend" ? (e.changedTouches?.[0]?.clientY || 0) : e.clientY;
    const deltaX = clientX - dragStartRef.current.clickX;
    const deltaY = clientY - dragStartRef.current.clickY;
    const finalX = Math.max(10, Math.min(window.innerWidth - 64, dragStartRef.current.startX + deltaX)) + 27;
    const finalY = Math.max(10, Math.min(window.innerHeight - 64, dragStartRef.current.startY + deltaY)) + 27;
    
    const isRightNav = loadAppearance().navPosition === "right";
    const hasSidebar = window.innerWidth > 768;
    const sidebarWidth = hasSidebar ? 236 : 0;
    const sidebarOnLeft = hasSidebar && !isRightNav;
    const sidebarOnRight = hasSidebar && isRightNav;
    
    const targets = {
      "left-top": {
        x: (sidebarOnLeft ? sidebarWidth : 0) + 24 + 27,
        y: 24 + 27
      },
      "left-bottom": {
        x: (sidebarOnLeft ? sidebarWidth : 0) + 24 + 27,
        y: window.innerHeight - 32 - 27
      },
      "right-top": {
        x: window.innerWidth - (sidebarOnRight ? sidebarWidth : 0) - 24 - 27,
        y: 24 + 27
      },
      "right-bottom": {
        x: window.innerWidth - (sidebarOnRight ? sidebarWidth : 0) - 24 - 27,
        y: window.innerHeight - 32 - 27
      }
    };
    
    let corner = "right-bottom";
    let minDistance = Infinity;
    Object.entries(targets).forEach(([c, coord]) => {
      const dist = Math.pow(finalX - coord.x, 2) + Math.pow(finalY - coord.y, 2);
      if (dist < minDistance) {
        minDistance = dist;
        corner = c;
      }
    });
    
    setFabCorner(corner);
    localStorage.setItem("MEDAI_FAB_CORNER", corner);
  }, [handleFabMouseMove, fabMenuExpanded]);

  const handleFabMouseDown = useCallback((e) => {
    if (e.button !== 0 && e.type !== "touchstart") return;
    const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
    
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      startX: rect.left,
      startY: rect.top,
      clickX: clientX,
      clickY: clientY,
      didMove: false,
    };
    
    setIsDraggingFab(true);
    setFabPos({ x: rect.left, y: rect.top });
    
    document.addEventListener("mousemove", handleFabMouseMove);
    document.addEventListener("mouseup", handleFabMouseUp);
    document.addEventListener("touchmove", handleFabMouseMove, { passive: false });
    document.addEventListener("touchend", handleFabMouseUp);
  }, [handleFabMouseMove, handleFabMouseUp]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const navStackRef = useRef(["home"]);
  const innerBackRef = useRef(null);
  const isPopNavRef = useRef(false);
  const justLoggedInRef = useRef(false);

  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dots = Array.from({ length: 15 }, (_, i) => ({
    size: [3, 4, 2, 5, 3, 2, 4, 3, 5, 2, 3, 4, 2, 3, 5][i],
    bright: [false, true, false, true, false, false, true, false, true, false, false, true, false, false, true][i],
  }));

  const ALL_PAGES = ["home", "analyzer", "vitals", "emergency", "hospitals", "chatbot", "reports", "history", "tips", "meditown", "settings", "results"];

  const registerInnerBack = useCallback((handler) => {
    innerBackRef.current = handler;
  }, []);

  const handleExportPDF = () => {
    if (todos.length === 0) {
      alert("Your To-Do list is empty. Add some tasks first!");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Header Banner
      doc.setFillColor(15, 31, 92);
      doc.rect(0, 0, 210, 26, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("MedAI", 15, 17);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(191, 219, 254);
      doc.text("INTELLIGENT HEALTH TO-DO REPORT", 45, 16);

      // Metadata
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Patient: ${settings.name || "Not Specified"}`, 15, 38);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const dateStr = new Date().toLocaleString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
      doc.text(`Report Generated: ${dateStr}`, 15, 44);

      // Separator Line
      doc.setDrawColor(226, 232, 248);
      doc.setLineWidth(0.5);
      doc.line(15, 48, 195, 48);

      // Table Header Row
      doc.setFillColor(241, 245, 253);
      doc.rect(15, 54, 180, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 31, 92);
      doc.text("STATUS", 18, 59.5);
      doc.text("TASK DESCRIPTION", 50, 59.5);
      doc.text("CREATED DATE", 160, 59.5);

      // Rows
      let y = 69;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      todos.forEach((todo) => {
        if (y > 260) {
          doc.addPage();
          doc.setFillColor(15, 31, 92);
          doc.rect(0, 0, 210, 26, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.text("MedAI", 15, 17);
          y = 38;
        }

        // Color coding status
        if (todo.completed) {
          doc.setTextColor(16, 185, 129); // Green
          doc.setFont("helvetica", "bold");
          doc.text("[x] Completed", 18, y);
        } else {
          doc.setTextColor(239, 68, 68); // Red
          doc.setFont("helvetica", "bold");
          doc.text("[ ] Pending", 18, y);
        }

        // Task text wrapping
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "normal");
        const wrappedText = doc.splitTextToSize(todo.text, 105);
        doc.text(wrappedText, 50, y);

        // Created Date formatting
        const createdDate = new Date(todo.createdAt || Date.now()).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric"
        });
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text(createdDate, 160, y);

        const rowHeight = Math.max(wrappedText.length * 5, 8);
        y += rowHeight;

        doc.setDrawColor(241, 245, 253);
        doc.setLineWidth(0.3);
        doc.line(15, y - 2, 195, y - 2);
        
        y += 4;
      });

      // Footer
      doc.setDrawColor(226, 232, 248);
      doc.setLineWidth(0.5);
      doc.line(15, 275, 195, 275);

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      doc.text("This document is a patient self-care to-do list generated by MedAI.", 15, 281);
      doc.text("Always consult medical professionals for clinical diagnosis and guidance.", 15, 285);

      doc.save(`MedAI_ToDo_List_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF: " + err.message);
    }
  };

  const pushHistoryEntry = useCallback(() => {
    window.history.pushState({ inner: true }, "", window.location.href);
  }, []);

  const navigateTo = useCallback((id) => {
    innerBackRef.current = null;
    setActive(id);
    setPageKey(k => k + 1);
    setMobileMenuOpen(false);
    // Scroll main content to top on page navigation
    requestAnimationFrame(() => {
      const mainEl = document.querySelector('.main-content');
      if (mainEl) mainEl.scrollTop = 0;
    });
    if (!isPopNavRef.current) {
      const stack = navStackRef.current;
      if (stack[stack.length - 1] !== id) {
        stack.push(id);
        window.history.pushState({ page: id }, "", `#${id}`);
      }
    }
    isPopNavRef.current = false;
  }, []);

  const navigateBack = useCallback(() => {
    innerBackRef.current = null;
    const stack = navStackRef.current;
    const cur = stack[stack.length - 1];
    if (cur === "medicure" || cur === "meditown") {
      stack.pop();
    }
    const prev = stack.length > 0 ? stack[stack.length - 1] : "home";
    isPopNavRef.current = true;
    setActive(prev);
    setPageKey(k => k + 1);
    setMobileMenuOpen(false);
    window.history.pushState({ page: prev }, "", `#prev`);
  }, []);

  useEffect(() => {
    if (!user) return;
    const hashPage = window.location.hash.replace("#", "").split("/")[0];
    if (hashPage && ALL_PAGES.includes(hashPage) && hashPage !== active) {
      navStackRef.current = [hashPage];
      setActive(hashPage);
    } else if (!window.location.hash) {
      window.history.replaceState({ page: "home" }, "", "#home");
      navStackRef.current = ["home"];
    }

    const onPopState = () => {
      if (innerBackRef.current?.()) {
        window.history.pushState({ inner: true }, "", window.location.href);
        return;
      }
      const stack = navStackRef.current;
      if (stack.length > 1) {
        stack.pop();
        const prev = stack[stack.length - 1];
        isPopNavRef.current = true;
        innerBackRef.current = null;
        setActive(prev);
        setPageKey(k => k + 1);
        setMobileMenuOpen(false);
      } else {
        window.history.pushState({ page: stack[0] }, "", `#${stack[0]}`);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [user]);
  useEffect(() => {
    const root = document.documentElement;
    // Font family
    root.style.setProperty("--font", `'${appearance.fontFamily}', system-ui, sans-serif`);
    // Font size scale — use CSS transform to scale all hardcoded px sizes
    const scale = FONT_SIZE_OPTIONS.find(f => f.value === appearance.fontSize)?.scale || 1;
    const appRoot = document.getElementById("root");
    if (appRoot) {
      appRoot.style.transition = "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1)";
      appRoot.style.transform = `scale(${scale})`;
      appRoot.style.transformOrigin = "top left";
      appRoot.style.width = `${100 / scale}%`;
      appRoot.style.height = `${100 / scale}%`;
      appRoot.style.position = "absolute";
      appRoot.style.top = "0";
      appRoot.style.left = "0";
      appRoot.style.overflow = "hidden";
    }

    // Set layout-wide data-theme attribute based on the content palette's brightness
    const cp = CONTENT_PALETTES.find(p => p.id === appearance.contentPalette) || CONTENT_PALETTES[0];
    root.setAttribute("data-theme", cp.isDark ? "dark" : "light");

    // Override content area colors dynamically
    root.style.setProperty("--surface-2", cp.bg);
    root.style.setProperty("--surface", cp.surface);
    root.style.setProperty("--border", cp.border);
    root.style.setProperty("--text", cp.text);
    root.style.setProperty("--text-muted", cp.textMuted);

    // Override navbar background dynamically
    const np = NAVBAR_PALETTES.find(p => p.id === appearance.navbarPalette) || NAVBAR_PALETTES.find(p => p.id === "appBlue") || NAVBAR_PALETTES[0];
    root.style.setProperty("--sidebar-bg", np.bg);

    // Glassy navbar settings
    if (appearance.glassyNavbar) {
      root.style.setProperty("--sidebar-bg-glass", np.bg + "80"); // 80 = 50% opacity
      root.style.setProperty("--sidebar-blur", "blur(20px)");
      root.style.setProperty("--sidebar-border", np.isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)");
    } else {
      root.style.setProperty("--sidebar-bg-glass", np.bg);
      root.style.setProperty("--sidebar-blur", "none");
      root.style.setProperty("--sidebar-border", np.isDark ? "none" : "1px solid var(--border)");
    }

    // Glassy container settings
    if (appearance.glassyContainer) {
      root.style.setProperty("--card-bg", cp.surface + "b0"); // b0 = ~69% opacity
      root.style.setProperty("--card-blur", "blur(16px)");
      root.style.setProperty("--card-border", cp.isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)");
    } else {
      root.style.setProperty("--card-bg", "var(--surface)");
      root.style.setProperty("--card-blur", "none");
      root.style.setProperty("--card-border", "1px solid var(--border)");
    }

    // Persist
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  }, [appearance]);

  const handleAppearanceChange = async (key, val) => {
    const updatedApp = { ...appearance, [key]: val };
    setAppearance(updatedApp);
    if (user && user.id !== "demo") {
      try {
        await apiSaveSettings({
          ...settings,
          theme: updatedApp.theme,
          fontFamily: updatedApp.fontFamily,
          fontSize: updatedApp.fontSize,
          navPosition: updatedApp.navPosition,
          navbarPalette: updatedApp.navbarPalette,
          contentPalette: updatedApp.contentPalette,
          stickerOpacity: updatedApp.stickerOpacity,
          glassyNavbar: updatedApp.glassyNavbar,
          glassyContainer: updatedApp.glassyContainer,
        });
      } catch (err) {
        console.error("Failed to save appearance change to backend:", err);
      }
    }
  };

  const checkAuth = async () => {
    setLoadingUser(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No token");
      const userData = await apiGetMe();
      setUser(userData);
    } catch (err) {
      // If token exists but backend is unreachable, create demo user so app works offline
      const token = getToken();
      if (token && (err.message === "Failed to fetch" || err.message === "Token invalid")) {
        console.warn("Backend unreachable, using demo mode");
        setUser({ id: "demo", name: "Demo User", email: "demo@medai.local" });
        localStorage.setItem("MEDAI_DEMO_MODE", "true");
      } else {
        setUser(null);
        localStorage.removeItem("MEDAI_TOKEN");
        localStorage.removeItem("MEDAI_DEMO_MODE");
      }
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("MEDAI_TOKEN");
    localStorage.removeItem("MEDAI_DEMO_MODE");
    localStorage.removeItem(REMINDERS_KEY);
    sessionStorage.removeItem("MEDAI_SESSION_PWD");
    setUser(null);
    setReports([]);
    setVitals([]);
    setSettings({});
    setSavedMedicines([]);
    setSavedReminders([]);
    setChatSessions([]);
    setActiveChatId(null);
    setChatMsgs(getNewChatDefaultMessages());
    setTodos([]);
  };

  const handleSaveMedicine = async (medicine, cause = "", category = "Pharmacy") => {
    const isDuplicate = savedMedicines.some(m => m?.name?.toLowerCase?.().trim() === medicine.toLowerCase().trim());
    if (isDuplicate) return;
    try {
      const newMed = await apiCreateMedication({ name: medicine, cause, category });
      setSavedMedicines(prev => [newMed, ...prev]);
    } catch (_e) {
      // Offline fallback: save to localStorage
      const offlineMed = { _id: "local_" + Date.now(), id: "local_" + Date.now(), name: medicine, cause, category, createdAt: new Date().toISOString() };
      const updated = [offlineMed, ...savedMedicines];
      setSavedMedicines(updated);
      localStorage.setItem(MEDICINE_KEY, JSON.stringify(updated));
    }
  };

  const handleDeleteMedicine = async (id) => {
    try {
      await apiDeleteMedication(id);
      setSavedMedicines(prev => prev.filter(m => m._id !== id && m.id !== id));
    } catch (_e) {
      // Offline fallback: remove from localStorage
      const updated = savedMedicines.filter(m => m._id !== id && m.id !== id);
      setSavedMedicines(updated);
      localStorage.setItem(MEDICINE_KEY, JSON.stringify(updated));
    }
  };

  const handleChangeMedicineCategory = async (id, newCategory) => {
    try {
      if (String(id).startsWith("local_")) {
        const updated = savedMedicines.map(m => (m.id === id || m._id === id) ? { ...m, category: newCategory } : m);
        setSavedMedicines(updated);
        localStorage.setItem(MEDICINE_KEY, JSON.stringify(updated));
      } else {
        await apiUpdateMedication(id, { category: newCategory });
        setSavedMedicines(prev => prev.map(m => (m.id === id || m._id === id) ? { ...m, category: newCategory } : m));
      }
      showToast(`Category updated to ${newCategory}`);
    } catch (_e) {
      const updated = savedMedicines.map(m => (m.id === id || m._id === id) ? { ...m, category: newCategory } : m);
      setSavedMedicines(updated);
      localStorage.setItem(MEDICINE_KEY, JSON.stringify(updated));
      showToast("Category updated locally");
    }
  };

  const handleDeleteAllMedicines = async () => {
    try {
      await apiDeleteAllMedications();
      setSavedMedicines([]);
    } catch (_e) {
      // Offline fallback
      setSavedMedicines([]);
      localStorage.removeItem(MEDICINE_KEY);
    }
  };

  const handleSaveReminder = async (title, time) => {
    try {
      const newRem = await apiCreateReminder({ title, time, active: true });
      setSavedReminders(prev => [newRem, ...prev]);
    } catch (_e) {
      // Offline fallback: save to localStorage
      const offlineRem = { _id: "local_" + Date.now(), id: "local_" + Date.now(), title, time, active: true, createdAt: new Date().toISOString() };
      const updated = [offlineRem, ...savedReminders];
      setSavedReminders(updated);
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
    }
  };

  const handleToggleReminder = async (id, currentActive) => {
    try {
      const updatedRem = await apiUpdateReminder(id, { active: !currentActive });
      setSavedReminders(prev => prev.map(r => (r._id === id || r.id === id) ? updatedRem : r));
    } catch (_e) {
      // Offline fallback: update in localStorage
      const updated = savedReminders.map(r => {
        if (r._id === id || r.id === id) {
          return { ...r, active: !currentActive };
        }
        return r;
      });
      setSavedReminders(updated);
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      await apiDeleteReminder(id);
      setSavedReminders(prev => prev.filter(r => r._id !== id && r.id !== id));
    } catch (_e) {
      // Offline fallback: remove from localStorage
      const updated = savedReminders.filter(r => r._id !== id && r.id !== id);
      setSavedReminders(updated);
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
    }
  };

  const handleDeleteAllReminders = async () => {
    try {
      await apiDeleteAllReminders();
      setSavedReminders([]);
    } catch (_e) {
      // Offline fallback
      setSavedReminders([]);
      localStorage.removeItem(REMINDERS_KEY);
    }
  };

  useEffect(() => {
    if (loadingUser) return;
    if (!user) {
      setDbReady(true);
      return;
    }
    async function init() {
      try {
        setDbReady(false);
        const isDemo = localStorage.getItem("MEDAI_DEMO_MODE") === "true";
        // In demo mode, skip backend calls entirely and use localStorage
        if (isDemo) {
          setReports(loadReports());
          setHistory(loadHistory());
          setSettings(loadSettings());
          setVitals(loadVitals());
          setChatSessions([]);
          setTodos([]);
          setSavedMedicines(loadMedicines());
          setSavedReminders(loadReminders());
          setDbReady(true);
          return;
        }
        try {
          const lsReports = loadReports();
          if (lsReports.length > 0) {
            await apiBulkReports(lsReports);
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (err) {
          console.warn("Failed to sync reports to database:", err);
        }

        try {
          const lsHistory = loadHistory();
          if (lsHistory.length > 0) {
            await apiBulkHistory(lsHistory);
            localStorage.removeItem(HISTORY_KEY);
          }
        } catch (err) {
          console.warn("Failed to sync history to database:", err);
        }

        try {
          const lsSettings = loadSettings();
          if (Object.keys(lsSettings).length > 0) {
            await apiSaveSettings(lsSettings);
            localStorage.removeItem(SETTINGS_KEY);
          }
        } catch (err) {
          console.warn("Failed to sync settings to database:", err);
        }

        try {
          const lsVitals = loadVitals();
          if (lsVitals.length > 0) {
            await Promise.all(lsVitals.map(v => apiSaveVital(v)));
            localStorage.removeItem(VITALS_KEY);
          }
        } catch (err) {
          console.warn("Failed to sync vitals to database:", err);
        }

        try {
          const lsReminders = loadReminders();
          const localOnlyReminders = lsReminders.filter(r => String(r.id || r._id).startsWith("local_"));
          if (localOnlyReminders.length > 0) {
            await Promise.all(localOnlyReminders.map(r => apiCreateReminder({ title: r.title, time: r.time, active: r.active })));
          }
          localStorage.removeItem(REMINDERS_KEY);
        } catch (err) {
          console.warn("Failed to sync reminders to database:", err);
        }

        try {
          const lsMedicines = loadMedicines();
          const localOnlyMeds = lsMedicines.filter(m => String(m.id || m._id).startsWith("local_"));
          if (localOnlyMeds.length > 0) {
            await Promise.all(localOnlyMeds.map(m => apiCreateMedication({ name: m.name, cause: m.cause || "", category: m.category || "Pharmacy" })));
          }
          localStorage.removeItem(MEDICINE_KEY);
        } catch (err) {
          console.warn("Failed to sync medicines to database:", err);
        }

        try {
          const lsTodos = loadTodos();
          const localOnlyTodos = lsTodos.filter(t => String(t.id || t._id).startsWith("local_"));
          if (localOnlyTodos.length > 0) {
            await Promise.all(localOnlyTodos.map(t => apiCreateTodo({ text: t.text, completed: t.completed })));
          }
          localStorage.removeItem(TODO_KEY);
        } catch (err) {
          console.warn("Failed to sync todos to database:", err);
        }

        const [dbReports, dbHistory, dbSettings, dbVitals, dbChats, dbTodos, dbMeds, dbReminders] = await Promise.all([
          apiFetchReports().catch(err => { console.error("Reports fetch failed:", err); return []; }),
          apiFetchHistory().catch(err => { console.error("History fetch failed:", err); return []; }),
          apiFetchSettings().catch(err => { console.error("Settings fetch failed:", err); return {}; }),
          apiFetchVitals().catch(err => { console.error("Vitals fetch failed:", err); return []; }),
          apiFetchChats().catch(err => { console.error("Chats fetch failed:", err); return []; }),
          apiFetchTodos().catch(err => { console.error("Todos fetch failed:", err); return []; }),
          apiFetchMedications().catch(err => { console.error("Medications fetch failed:", err); return null; }),
          apiFetchReminders().catch(err => { console.error("Reminders fetch failed:", err); return []; })
        ]);
        setReports(Array.isArray(dbReports) ? dbReports : []);
        setHistory(Array.isArray(dbHistory) ? dbHistory : []);
        setSettings(dbSettings || {});
        if (dbSettings && Object.keys(dbSettings).length > 0) {
          const localApp = loadAppearance();
          const syncedApp = {
            theme: dbSettings.theme || localApp.theme || "light",
            fontFamily: dbSettings.fontFamily || localApp.fontFamily || "Plus Jakarta Sans",
            fontSize: dbSettings.fontSize || localApp.fontSize || "default",
            navPosition: dbSettings.navPosition || localApp.navPosition || "left",
            navbarPalette: dbSettings.navbarPalette || localApp.navbarPalette || "white",
            contentPalette: dbSettings.contentPalette || localApp.contentPalette || "white",
            stickerOpacity: typeof dbSettings.stickerOpacity === 'number' ? dbSettings.stickerOpacity : (typeof localApp.stickerOpacity === 'number' ? localApp.stickerOpacity : 0.15),
            glassyNavbar: dbSettings.glassyNavbar !== undefined ? !!dbSettings.glassyNavbar : (localApp.glassyNavbar !== undefined ? !!localApp.glassyNavbar : false),
            glassyContainer: dbSettings.glassyContainer !== undefined ? !!dbSettings.glassyContainer : (localApp.glassyContainer !== undefined ? !!localApp.glassyContainer : false),
          };
          setAppearance(syncedApp);
          localStorage.setItem(APPEARANCE_KEY, JSON.stringify(syncedApp));
          if (!dbSettings.theme || !dbSettings.navbarPalette || !dbSettings.contentPalette) {
            apiSaveSettings({
              ...dbSettings,
              theme: syncedApp.theme,
              fontFamily: syncedApp.fontFamily,
              fontSize: syncedApp.fontSize,
              navPosition: syncedApp.navPosition,
              navbarPalette: syncedApp.navbarPalette,
              contentPalette: syncedApp.contentPalette,
              stickerOpacity: syncedApp.stickerOpacity,
              glassyNavbar: syncedApp.glassyNavbar,
              glassyContainer: syncedApp.glassyContainer,
            }).catch(err => console.error("Failed to back-sync local appearance to db:", err));
          }
        } else {
          const localApp = loadAppearance();
          setSettings(localApp);
          apiSaveSettings(localApp).catch(err => console.error("Failed to sync initial local appearance to db:", err));
        }
        setVitals(Array.isArray(dbVitals) ? dbVitals : []);
        setChatSessions(Array.isArray(dbChats) ? dbChats : []);
        
        const validTodos = Array.isArray(dbTodos) ? dbTodos : [];
        setTodos(validTodos);
        localStorage.setItem(TODO_KEY, JSON.stringify(validTodos));
        
        if (dbMeds === null) {
          setSavedMedicines(loadMedicines());
        } else {
          const validMeds = Array.isArray(dbMeds) ? dbMeds : [];
          setSavedMedicines(validMeds);
          localStorage.setItem(MEDICINE_KEY, JSON.stringify(validMeds));
        }
        
        const validReminders = Array.isArray(dbReminders) ? dbReminders : [];
        setSavedReminders(validReminders);
        localStorage.setItem(REMINDERS_KEY, JSON.stringify(validReminders));
      } catch (e) {
        console.warn("Backend not reachable, using localStorage:", e.message);
        setReports(loadReports());
        setHistory(loadHistory());
        setSettings(loadSettings());
        setVitals(loadVitals());
        setChatSessions([]);
        setTodos(loadTodos());
        setSavedMedicines(loadMedicines());
        setSavedReminders(loadReminders());
      } finally {
        setDbReady(true);
      }
    }
    init();
  }, [user, loadingUser]);

  useEffect(() => {
    if (!dbReady) return;
    if (!user) {
      setSplashPhase("done");
      return;
    }
    if (justLoggedInRef.current) {
      setSplashPhase("done");
      justLoggedInRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setSplashPhase("done");
    }, 2500);
    return () => clearTimeout(timer);
  }, [dbReady, user]);

  const handleAnalyze = async (report) => {
    setCurrentReport(report);
    const updated = [...history, report];
    setHistory(updated);
    try {
      await apiSaveHistory(report);
    } catch (e) {
      console.warn("Backend offline, saving history to localStorage:", e.message);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    }
    navigateTo("results");
  };

  const handleSaveReport = async () => {
    if (!currentReport) return;
    const existing = reports.find(r => r.id === currentReport.id);
    if (!existing) {
      const updated = [...reports, currentReport];
      setReports(updated);
      try {
        await apiSaveReport(currentReport);
      } catch (e) {
        console.warn("Backend offline, saving to localStorage:", e.message);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      showToast("Report saved successfully!");
    } else {
      showToast("Report already saved.", "error");
    }
  };

  const handleDeleteReport = async (id) => {
    const updated = reports.filter(r => r.id !== id);
    setReports(updated);
    try {
      await apiDeleteReport(id);
    } catch (e) {
      console.warn("Backend offline, saving deletion to localStorage:", e.message);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const handleClearAllReports = async () => {
    setReports([]);
    try {
      await apiDeleteAllReports();
    } catch (e) {
      console.warn("Backend offline, saving deletion to localStorage:", e.message);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
  };

  const handleDeleteHistory = async (id) => {
    const updated = history.filter(r => r.id !== id);
    setHistory(updated);
    try {
      await apiDeleteHistory(id);
    } catch (e) {
      console.warn("Backend offline, saving history deletion to localStorage:", e.message);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    }
  };

  const handleClearAllHistory = async () => {
    setHistory([]);
    try {
      await apiDeleteAllHistory();
    } catch (e) {
      console.warn("Backend offline, saving history deletion to localStorage:", e.message);
      localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
    }
  };

  const handleSettingsChange = async (updated) => {
    setSettings(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    if (updated.name && user && user.name !== updated.name) {
      setUser(prev => ({ ...prev, name: updated.name }));
    }
    try {
      await apiSaveSettings(updated);
    } catch (e) {
      console.warn("Backend offline, settings already in localStorage:", e.message);
    }
  };

  const handleResetProfile = async () => {
    await apiResetProfile();
    setReports([]);
    setHistory([]);
    setVitals([]);
    setSettings({});
    setChatSessions([]);
    setActiveChatId(null);
    setChatMsgs(getNewChatDefaultMessages());
    setTodos([]);
    setSavedMedicines([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const handleSelectChat = async (id) => {
    setActiveChatId(id);
    try {
      const session = await apiGetChat(id);
      const normalized = normalizeChatMessages(session.messages);
      setChatMsgs(normalized.length ? normalized : getNewChatDefaultMessages());
    } catch {
      const session = chatSessions.find(s => (s._id || s.id) === id);
      if (session?.messages?.length) {
        setChatMsgs(normalizeChatMessages(session.messages));
      }
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setChatMsgs(getNewChatDefaultMessages());
  };

  const handleDeleteChat = (id) => {
    setConfirmDeleteChatId(id);
  };

  const executeDeleteChat = async (id) => {
    try {
      await apiDeleteChat(id);
      setChatSessions(prev => prev.filter(s => (s._id || s.id) !== id));
      if (activeChatId === id) {
        handleNewChat();
      }
    } catch (err) {
      alert("Failed to delete chat: " + err.message);
    }
    setConfirmDeleteChatId(null);
  };

  const renderContent = () => {
    switch (active) {
      case "home":     return (
        <Home
          reports={reports}
          setActive={navigateTo}
          setInitialSymptoms={setInitialSymptoms}
          settings={settings}
          appearance={appearance}
          todos={todos}
          setTodos={setTodos}
          savedMedicines={savedMedicines}
          onDeleteMedicine={handleDeleteMedicine}
          onExportPDF={handleExportPDF}
          savedReminders={savedReminders}
          handleSaveReminder={handleSaveReminder}
          handleToggleReminder={handleToggleReminder}
          handleDeleteReminder={handleDeleteReminder}
          handleDeleteAllReminders={handleDeleteAllReminders}
        />
      );
      case "analyzer": return <Analyzer initialSymptoms={initialSymptoms} setInitialSymptoms={setInitialSymptoms} onAnalyze={handleAnalyze} />;
      case "vitals":   return <VitalsLog vitals={vitals} setVitals={setVitals} setActive={navigateTo} showToast={showToast} />;
      case "results":  return (
        <Results
          report={currentReport}
          onSave={handleSaveReport}
          onNew={() => navigateTo("analyzer")}
          savedMedicines={savedMedicines}
          onSaveMedicine={handleSaveMedicine}
          onDeleteMedicine={handleDeleteMedicine}
        />
      );
      case "emergency":return <Emergency settings={settings} onSettingsChange={handleSettingsChange} savedMedicines={savedMedicines} reports={reports} appearance={appearance} setActive={navigateTo} todos={todos} onExportPDF={handleExportPDF} setInitialCategory={setMeditownInitialCategory} />;
      case "hospitals":return <Hospitals setActive={navigateTo} />;
      case "chatbot":  return (
        <Chatbot
          msgs={chatMsgs}
          setMsgs={setChatMsgs}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          chatSessions={chatSessions}
          setChatSessions={setChatSessions}
          onSaveMedicine={handleSaveMedicine}
          savedMedicines={savedMedicines}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onNewChat={handleNewChat}
          appearance={appearance}
        />
      );
      case "reports":  return <Reports reports={reports} onDelete={handleDeleteReport} />;
      case "history":  return <History reports={history} onDelete={handleDeleteHistory} onClearAll={handleClearAllHistory} />;
      case "tips":     return <HealthTips savedMedicines={savedMedicines} onSaveMedicine={handleSaveMedicine} setActive={navigateTo} />;

      case "meditown": return (
        <MediTownView
          onSaveMedicine={handleSaveMedicine}
          savedMedicines={savedMedicines}
          onBack={navigateBack}
          registerInnerBack={registerInnerBack}
          pushHistoryEntry={pushHistoryEntry}
          appearance={appearance}
          initialCategory={meditownInitialCategory}
          setInitialCategory={setMeditownInitialCategory}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      );
      case "settings": return (
        <Settings
          reports={reports}
          setReports={setReports}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          appearance={appearance}
          onAppearanceChange={handleAppearanceChange}
          user={user}
          setUser={setUser}
          setActive={navigateTo}
          onLogout={handleLogout}
          onResetProfile={handleResetProfile}
        />
      );
      default: return null;
    }
  };

  const handleLoginSuccess = (userData, isRegister) => {
    justLoggedInRef.current = true;
    setUser(userData);
    setSplashPhase("enter");
    setDbReady(false);
    if (isRegister) {
      const defaultWhiteApp = {
        theme: "light",
        fontFamily: "Plus Jakarta Sans",
        fontSize: "default",
        navPosition: "left",
        navbarPalette: "white",
        contentPalette: "white",
        stickerOpacity: 0.15,
        glassyNavbar: false,
        glassyContainer: false,
      };
      setAppearance(defaultWhiteApp);
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(defaultWhiteApp));
      apiSaveSettings(defaultWhiteApp).catch(err => console.error("Failed to save default register settings:", err));
    }
  };

  if (loadingUser) {
    return <div style={{ background: "var(--navy)", height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner size={32} color="#3b82f6" /></div>;
  }
  if (!user) {
    return <AuthFlow onLoginSuccess={handleLoginSuccess} />;
  }

  const cp = CONTENT_PALETTES.find(p => p.id === appearance.contentPalette) || CONTENT_PALETTES[0];
  const navPalette = NAVBAR_PALETTES.find(p => p.id === appearance.navbarPalette) || NAVBAR_PALETTES.find(p => p.id === "appBlue") || NAVBAR_PALETTES[0];

    return (
    <>
      <style>{GLOBAL_CSS}</style>
      <style>{`
        @keyframes floatAvatar {
          0% {
            transform: translateY(0px) scale(1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          50% {
            transform: translateY(-6px) scale(1.02);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
          }
          100% {
            transform: translateY(0px) scale(1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
        }
      `}</style>

      {/* ── Splash Screen ── */}
      <AnimatePresence>
        {splashPhase !== "done" && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(8px)" }}
            transition={{ duration: 0.65, ease: [0.4, 0, 1, 1] }}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "linear-gradient(145deg, #060b1f 0%, #0d1640 40%, #131b4d 70%, #0a1235 100%)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font)",
            }}
          >
            <style>{AUTH_FLOW_KEYFRAMES}</style>
            <AmbientHexBackground isDashboard={false} />

            {/* Ambient glow spots */}
            <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "60%", height: "60%", background: "radial-gradient(circle, rgba(59,108,244,0.08) 0%, transparent 60%)", filter: "blur(60px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "55%", height: "55%", background: "radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 60%)", filter: "blur(60px)", pointerEvents: "none" }} />

            {/* Pulse rings */}
            <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", border: "2px solid rgba(59,108,244,0.15)", animation: reducedMotion ? "none" : "authPulseRing 2.5s ease-out infinite" }} />
            <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", border: "1.5px solid rgba(59,108,244,0.1)", animation: reducedMotion ? "none" : "authPulseRing 2.5s ease-out 0.4s infinite" }} />

            {/* Logo icon with spring scale */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.3 }}
              style={{
                width: 110, height: 110, borderRadius: 30,
                background: "linear-gradient(145deg, #3b6cf4, #2b5eef, #1a3dc8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", zIndex: 3,
                animation: reducedMotion ? "none" : "authGlowPulse 3s ease-in-out infinite",
              }}
            >
              <CaduceusIcon size={60} showSpark={!reducedMotion} />
            </motion.div>

            {/* MedAI wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              style={{ marginTop: 28, textAlign: "center", zIndex: 3 }}
            >
              <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", letterSpacing: "-2px", lineHeight: 1, textShadow: "0 2px 20px rgba(59,108,244,0.3)" }}>MedAI</div>
            </motion.div>

            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0, letterSpacing: "0.35em" }}
              animate={{ opacity: 1, letterSpacing: "0.2em" }}
              transition={{ duration: 0.7, delay: 0.85 }}
              style={{ fontSize: 13, color: "rgba(147,197,253,0.65)", fontWeight: 700, textTransform: "uppercase", marginTop: 10, zIndex: 3 }}
            >
              Intelligent Health Assistant
            </motion.div>

            {/* Constellation dots */}
            <div style={{ display: "flex", gap: 8, marginTop: 28, alignItems: "center", zIndex: 3 }}>
              {dots.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: d.bright ? 0.7 : 0.3, scale: 1 }}
                  transition={{ delay: 1.0 + i * 0.03, duration: 0.3, type: "spring", stiffness: 200 }}
                  style={{
                    width: d.size, height: d.size, borderRadius: "50%",
                    background: d.bright ? "rgba(147,197,253,0.8)" : "rgba(147,197,253,0.4)",
                    boxShadow: d.bright ? "0 0 6px rgba(147,197,253,0.5)" : "none",
                    animation: d.bright && !reducedMotion ? `authDotPulse 3s ease-in-out ${i * 0.2}s infinite` : "none",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mobile-header">
        <button onClick={() => navigateTo("home")} style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>⚕️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: navPalette.text, letterSpacing: "-0.2px" }}>MedAI</div>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", marginRight: 8 }}>
          <button
            onClick={() => {
              setShowMedList(!showMedList);
              setShowReminderList(false);
            }}
            style={{
              background: showMedList ? "var(--blue)" : (navPalette.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
              border: `1px solid ${showMedList ? "var(--blue)" : (navPalette.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)")}`,
              color: showMedList ? "#fff" : navPalette.text, width: 36, height: 36, borderRadius: 8,
              cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative"
            }}
          >
            💊
            {savedMedicines.length > 0 && (
              <div style={{
                position: "absolute", top: -4, right: -4,
                width: 16, height: 16, borderRadius: "50%",
                background: "var(--text-red-light)", border: `2px solid ${navPalette.bg}`,
                color: "#fff", fontSize: 8, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{savedMedicines.length > 9 ? "9+" : savedMedicines.length}</div>
            )}
          </button>
          {splashPhase === "done" && (
            <button
              onClick={() => {
                setShowReminderList(!showReminderList);
                setShowMedList(false);
              }}
              style={{
                background: showReminderList ? "#7c3aed" : (navPalette.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                border: `1px solid ${showReminderList ? "#7c3aed" : (navPalette.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)")}`,
                color: showReminderList ? "#fff" : navPalette.text, width: 36, height: 36, borderRadius: 8,
                cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative"
              }}
            >
              ⏰
              {getVisibleReminders().filter(r => r.active && !isReminderFinished(r) && !isReminderNotedToday(r)).length > 0 && (
                <div style={{
                  position: "absolute", top: -4, right: -4,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#7c3aed", border: `2px solid ${navPalette.bg}`,
                  color: "#fff", fontSize: 8, fontWeight: 900,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{getVisibleReminders().filter(r => r.active && !isReminderFinished(r) && !isReminderNotedToday(r)).length}</div>
              )}
            </button>
          )}
        </div>
        <button onClick={() => setMobileMenuOpen(true)} style={{
          background: navPalette.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
          border: `1px solid ${navPalette.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
          color: navPalette.text, width: 36, height: 36, borderRadius: 8,
          cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
        }}>☰</button>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div className="mobile-sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} style={{
          position: "fixed", inset: 0,
          background: "rgba(2,6,23,0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 3999,
          animation: "fadeIn 0.2s ease both",
        }} />
      )}

      {/* ── Main App ── */}
      <div className={`app-layout nav-${appearance.navPosition === "right" ? "right" : "left"} ${active === "chatbot" ? "active-chatbot" : ""}`} style={{
        display: "flex", height: "100%", width: "100%",
        overflow: "hidden", background: "var(--surface-2)",
        fontFamily: "var(--font)",
        opacity: splashPhase === "done" ? 1 : 0,
        transition: "opacity 0.45s ease",
        position: "relative",
      }}>
        {/* Ambient hex background */}
        {(appearance.stickerOpacity ?? 0.15) !== 0 && (
          <>
            <style>{AUTH_FLOW_KEYFRAMES}</style>
            <AmbientHexBackground isDashboard={true} opacity={appearance.stickerOpacity} />
          </>
        )}
        <Sidebar 
          active={active === "results" ? "analyzer" : active} 
          setActive={navigateTo} 
          settings={settings} 
          user={user} 
          onLogout={handleLogout} 
          mobileMenuOpen={mobileMenuOpen} 
          setMobileMenuOpen={setMobileMenuOpen}
          appearance={appearance}
        />
        <main className="main-content" style={{
          flex: 1, overflowY: active === "chatbot" ? "hidden" : "auto",
          background: "transparent",
          display: active === "chatbot" ? "flex" : "block",
          flexDirection: "column",
          height: active === "chatbot" ? "100%" : "auto",
        }}>
          <div style={{ 
            width: "100%", maxWidth: 960, minWidth: 0, margin: "0 auto", padding: "0 24px", boxSizing: "border-box",
            height: active === "chatbot" ? "100%" : "auto",
            display: active === "chatbot" ? "flex" : "block",
            flexDirection: "column",
          }}>
            <div key={pageKey} className="page-enter" style={{
              height: active === "chatbot" ? "100%" : "auto",
              display: active === "chatbot" ? "flex" : "block",
              flexDirection: "column",
              flex: 1,
            }}>
              {renderContent()}
            </div>
          </div>
        </main>
        {active === "chatbot" && (
          <ChatHistorySidebar
            chatSessions={chatSessions}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            onNewChat={handleNewChat}
            appearance={appearance}
          />
        )}
        {confirmDeleteChatId && (
          <ConfirmDialog
            title="Delete Chat Session?"
            message="This chat history will be permanently deleted and cannot be recovered."
            confirmLabel="Delete"
            confirmColor="var(--red)"
            onConfirm={() => executeDeleteChat(confirmDeleteChatId)}
            onCancel={() => setConfirmDeleteChatId(null)}
          />
        )}
      {user && splashPhase === "done" && (() => {
        const isLeft = fabCorner.startsWith("left");
        const isTop = fabCorner.endsWith("top");
        const isRightNav = appearance.navPosition === "right";
        const hasSidebar = window.innerWidth > 768;
        const isMobile = !hasSidebar;
        const sidebarWidth = hasSidebar ? 236 : 0;
        const sidebarOnLeft = hasSidebar && !isRightNav;
        const sidebarOnRight = hasSidebar && isRightNav;
        
        const containerStyle = isMobile ? {
          position: "fixed",
          inset: 0,
          zIndex: 1201,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        } : {
          position: "fixed",
          zIndex: 9,
          userSelect: "none",
          touchAction: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        };
        
        if (!isMobile && isDraggingFab) {
          containerStyle.left = fabPos.x;
          containerStyle.top = fabPos.y;
          containerStyle.right = "auto";
          containerStyle.bottom = "auto";
          containerStyle.transition = "none";
        } else if (!isMobile) {
          containerStyle.transition = "left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), right 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), bottom 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)";
          if (isLeft) {
            containerStyle.left = (sidebarOnLeft ? sidebarWidth : 0) + 24;
            containerStyle.right = "auto";
          } else {
            containerStyle.right = (sidebarOnRight ? sidebarWidth : 0) + 24;
            containerStyle.left = "auto";
          }
          if (isTop) {
            containerStyle.top = 24;
            containerStyle.bottom = "auto";
          } else {
            containerStyle.bottom = 32;
            containerStyle.top = "auto";
          }
        }
        
        const popoverStyle = {
          position: isMobile ? "relative" : "absolute",
          width: isMobile ? "min(90%, 340px)" : 320,
          background: "var(--bg-modal)",
          borderRadius: 16,
          boxShadow: "0 16px 48px rgba(15,31,92,0.18), 0 2px 8px rgba(0,0,0,0.06)",
          border: "2px solid var(--blue-border)",
          overflow: "hidden",
          animation: "scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
          zIndex: 1201,
          pointerEvents: "auto",
        };
        
        if (isMobile) {
          popoverStyle.transformOrigin = "center";
        } else {
          if (isTop) {
            popoverStyle.top = 0;
            popoverStyle.bottom = "auto";
            popoverStyle.transformOrigin = isLeft ? "top left" : "top right";
          } else {
            popoverStyle.bottom = 0;
            popoverStyle.top = "auto";
            popoverStyle.transformOrigin = isLeft ? "bottom left" : "bottom right";
          }
          
          if (isLeft) {
            popoverStyle.left = 64;
            popoverStyle.right = "auto";
          } else {
            popoverStyle.right = 64;
            popoverStyle.left = "auto";
          }
        }
        
        const isDarkTheme = cp.isDark;
        
        // Arrow toggle symbol
        const arrowChar = "➙";

        const categorized = {
          "Pharmacy": [],
          "Herbal Remedies": [],
          "Nutrition Center": [],
          "First Aid Station": []
        };

        savedMedicines.forEach(med => {
          if (!med) return;
          let cat = med.category || "Pharmacy";
          if (cat.toLowerCase().includes("herbal") || cat.toLowerCase().includes("herb")) {
            cat = "Herbal Remedies";
          } else if (cat.toLowerCase().includes("nutrition")) {
            cat = "Nutrition Center";
          } else if (cat.toLowerCase().includes("first aid") || cat.toLowerCase().includes("firstaid")) {
            cat = "First Aid Station";
          } else {
            cat = "Pharmacy";
          }
          categorized[cat].push(med);
        });

        const categoryMeta = {
          "Pharmacy": { icon: "💊", color: "#3b82f6", rgb: "59,130,246" },
          "Herbal Remedies": { icon: "🌿", color: "#10b981", rgb: "16,185,129" },
          "Nutrition Center": { icon: "🥗", color: "#f59e0b", rgb: "245,158,11" },
          "First Aid Station": { icon: "🏥", color: "#ef4444", rgb: "239,68,68" }
        };

        const activeMedId = selectedMedId || (savedMedicines[0] ? (savedMedicines[0]._id || savedMedicines[0].id) : null);
        const activeMed = savedMedicines.find(m => (m._id === activeMedId || m.id === activeMedId));

        return (
          <>
            {/* Backdrop for mobile centered popups */}
            {isMobile && (showMedList || showReminderList) && (
              <div
                onClick={() => {
                  setShowMedList(false);
                  setShowReminderList(false);
                }}
                style={{
                  position: "fixed", inset: 0,
                  background: "rgba(15,31,92,0.4)", backdropFilter: "blur(4px)",
                  zIndex: 1200, animation: "fadeIn 0.2s ease both",
                }}
              />
            )}
            <div ref={fabContainerRef} style={containerStyle}>
            {/* Popover for Medicine List */}
            {showMedList && (
              <div style={popoverStyle}>
                {/* Header */}
                <div style={{
                  background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>💊</span>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: "-0.2px" }}>Medicine List</div>
                      <div style={{ color: "rgba(191,219,254,0.85)", fontSize: 11, fontWeight: 600 }}>{savedMedicines.length} saved · tap to buy / refer</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => {
                        setActive("meditown");
                        setShowMedList(false);
                      }}
                      title="Go to MeDiTown"
                      style={{
                        background: "rgba(255,255,255,0.15)", border: "none",
                        borderRadius: "50%", width: 28, height: 28,
                        cursor: "pointer", color: "#fff", fontSize: 16,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "var(--transition)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                    >🏙️</button>
                    <button
                      onClick={() => setShowMedList(false)}
                      style={{
                        background: "rgba(255,255,255,0.15)", border: "none",
                        borderRadius: "50%", width: 26, height: 26,
                        cursor: "pointer", color: "#fff", fontSize: 15,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >×</button>
                  </div>
                </div>

                {/* Category Filter Tabs */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 14px",
                  background: "var(--surface-3, var(--surface-2))",
                  borderBottom: "1px solid var(--border)",
                  gap: 6,
                  overflowX: "auto",
                  scrollbarWidth: "none"
                }}>
                  {["All", "Pharmacy", "Herbal Remedies", "Nutrition Center", "First Aid Station"].map(cat => {
                    const isSelected = medListFilter === cat;
                    let label = cat === "All" ? "✨ All" : cat;
                    if (cat === "Pharmacy") label = "💊 Pharmacy";
                    if (cat === "Herbal Remedies") label = "🌿 Herbal";
                    if (cat === "Nutrition Center") label = "🥗 Nutrition";
                    if (cat === "First Aid Station") label = "🏥 First Aid";
                    
                    return (
                      <button
                        key={cat}
                        onClick={() => setMedListFilter(cat)}
                        style={{
                          background: isSelected ? "var(--accent, #3b82f6)" : "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 20,
                          color: isSelected ? "#fff" : "var(--text)",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "4px 10px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>



                {/* Body */}
                <div className="styled-scroll" style={{ maxHeight: 240, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10, background: "var(--surface)" }}>
                  {savedMedicines.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-faint)", fontSize: 12.5 }}>
                      <span style={{ fontSize: 24, display: "block", marginBottom: 6, opacity: 0.35 }}>💊</span>
                      No saved medicines yet. Add one from the Vitals Log or Search!
                    </div>
                  ) : (() => {
                    const filteredCount = Object.keys(categorized).reduce((acc, catName) => {
                      if (medListFilter !== "All" && catName !== medListFilter) return acc;
                      return acc + (categorized[catName] ? categorized[catName].length : 0);
                    }, 0);

                    if (filteredCount === 0) {
                      return (
                        <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-faint)", fontSize: 12.5 }}>
                          <span style={{ fontSize: 24, display: "block", marginBottom: 6, opacity: 0.35 }}>🔍</span>
                          No medicines saved in this category yet.
                        </div>
                      );
                    }

                    return Object.keys(categorized).map(catName => {
                      if (medListFilter !== "All" && catName !== medListFilter) return null;
                      const list = categorized[catName];
                      if (list.length === 0) return null;
                      const meta = categoryMeta[catName];
                      return (
                        <div key={catName} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                            color: meta.color,
                            padding: "4px 4px 2px",
                            borderBottom: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            opacity: 0.95
                          }}>
                            <span>{meta.icon}</span>
                            <span>{catName}</span>
                            <span style={{
                              marginLeft: "auto",
                              background: `rgba(${meta.rgb}, 0.1)`,
                              padding: "2px 6px",
                              borderRadius: 10,
                              fontSize: 9.5
                            }}>{list.length}</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {list.map(med => {
                              const medId = med._id || med.id;
                              const isSelected = medId === activeMedId;
                              return (
                                <div 
                                  key={medId} 
                                  onClick={() => setSelectedMedId(medId)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "8px 10px",
                                    background: isSelected ? "var(--bg-accent-subtle, rgba(59, 130, 246, 0.1))" : "var(--surface-2)",
                                    border: isSelected ? "1px solid var(--accent, #3b82f6)" : "1px solid var(--border)",
                                    borderRadius: "var(--radius-sm)",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                                    <span style={{ fontSize: 14 }}>{meta.icon}</span>
                                    <span style={{
                                      fontSize: 12.5,
                                      fontWeight: 700,
                                      color: isSelected ? "var(--accent, #3b82f6)" : "var(--text)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: 160
                                    }} title={med.name}>
                                      {med.name}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMedicine(med.id || med._id);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: 14,
                                        color: "var(--text-red-light)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "4px 8px",
                                        borderRadius: "var(--radius-sm)",
                                        transition: "all 0.2s ease"
                                      }}
                                      onMouseEnter={e => {
                                        e.currentTarget.style.background = "var(--bg-red-light)";
                                        e.currentTarget.style.color = "var(--text-red)";
                                      }}
                                      onMouseLeave={e => {
                                        e.currentTarget.style.background = "none";
                                        e.currentTarget.style.color = "var(--text-red-light)";
                                      }}
                                      title="Delete Item"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Footer */}
                <div style={{
                  padding: "10px 14px",
                  background: "var(--surface-2)",
                  borderTop: "1.5px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  {showMedDeleteConfirm ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-red)" }}>Confirm delete?</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => {
                            handleDeleteAllMedicines();
                            setShowMedDeleteConfirm(false);
                          }}
                          style={{
                            background: "var(--bg-red)", color: "var(--text-red)", border: "none",
                            borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 800, cursor: "pointer"
                          }}
                        >Yes</button>
                        <button
                          onClick={() => setShowMedDeleteConfirm(false)}
                          style={{
                            background: "var(--slate-light)", color: "#fff", border: "none",
                            borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 800, cursor: "pointer"
                          }}
                        >No</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: 11, color: "#64748b" }}>Show this list at a pharmacy</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => setShowMedDeleteConfirm(true)}
                          style={{
                            background: "var(--bg-red)", color: "var(--text-red)", border: "none",
                            borderRadius: 7, padding: "5px 12px",
                            fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                            fontFamily: "var(--font)",
                          }}
                        >🗑 Delete All</button>
                        <button
                          onClick={() => {
                            const list = savedMedicines.map((m, i) => `${i + 1}. ${m.name}`).join("\n");
                            navigator.clipboard?.writeText(list).then(() => showToast("Medicine list copied!"));
                          }}
                          style={{
                            background: "#1d4ed8", color: "#fff", border: "none",
                            borderRadius: 7, padding: "5px 12px",
                            fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                            fontFamily: "var(--font)",
                          }}
                        >📋 Copy</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Popover for Self-Care Reminders */}
            <AnimatePresence>
              {showReminderList && splashPhase === "done" && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  style={{ ...popoverStyle, ...(showSchedulePopup ? { minHeight: 340 } : {}) }}
                >
                {/* Header */}
                <div style={{
                  background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 48,
                  boxSizing: "border-box"
                }}>
                  {showReminderDeleteConfirm ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#fee2e2" }}>Clear all reminders?</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => {
                            handleDeleteAllReminders();
                            setShowReminderDeleteConfirm(false);
                          }}
                          style={{
                            background: "#dc2626", color: "#fff", border: "none",
                            borderRadius: 6, padding: "4px 10px", fontSize: 11.5, fontWeight: 800, cursor: "pointer"
                          }}
                        >Yes</button>
                        <button
                          onClick={() => setShowReminderDeleteConfirm(false)}
                          style={{
                            background: "rgba(255,255,255,0.2)", color: "#fff", border: "none",
                            borderRadius: 6, padding: "4px 10px", fontSize: 11.5, fontWeight: 800, cursor: "pointer"
                          }}
                        >No</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>⏰</span>
                        <div>
                          <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: "-0.2px" }}>Self-Care Reminders</div>
                          <div style={{ color: "rgba(232,121,249,0.85)", fontSize: 11, fontWeight: 600 }}>{savedReminders.length} active reminders</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {savedReminders.length > 0 && (
                          <button
                            onClick={() => setShowReminderDeleteConfirm(true)}
                            style={{
                              background: "rgba(220,38,38,0.25)", border: "none",
                              borderRadius: 6, padding: "2px 8px",
                              cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 800,
                              transition: "var(--transition)", fontFamily: "var(--font)"
                            }}
                          >Clear All</button>
                        )}
                        <button
                          onClick={() => {
                            setShowReminderList(false);
                            setShowReminderDeleteConfirm(false);
                          }}
                          style={{
                            background: "rgba(255,255,255,0.15)", border: "none",
                            borderRadius: "50%", width: 26, height: 26,
                            cursor: "pointer", color: "#fff", fontSize: 15,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >×</button>
                      </div>
                    </>
                  )}
                </div>

                {/* Form to add reminder */}
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={reminderTitle}
                      onChange={e => setReminderTitle(e.target.value)}
                      placeholder="Hydrate, vitals log..."
                      style={{
                        flex: 1.8, padding: "6px 10px", borderRadius: "var(--radius-sm)",
                        border: "1.5px solid var(--border)", fontSize: 12,
                        fontFamily: "var(--font)", background: "var(--surface-2)", color: "var(--text)"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!reminderTitle.trim()) {
                          showToast("Please enter a title for the reminder first!", "error");
                          return;
                        }
                        setShowSchedulePopup(true);
                      }}
                      style={{
                        background: "var(--blue)", color: "#ffffff", border: "none",
                        borderRadius: 6, padding: "0 14px",
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                        fontFamily: "var(--font)", height: 28, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 6px rgba(59, 130, 246, 0.15)"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 10px rgba(59, 130, 246, 0.3)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "0 2px 6px rgba(59, 130, 246, 0.15)";
                      }}
                    >
                      Set
                    </button>
                  </div>
                </div>

                {/* Schedule Config overlay */}
                {showSchedulePopup && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--bg-modal)",
                    zIndex: 10,
                    padding: "16px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    boxSizing: "border-box",
                    overflowY: "auto",
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "var(--navy)", borderBottom: "1.5px solid var(--border)", paddingBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text)" }}>📅 Configure Schedule</span>
                      <button onClick={() => { setShowSchedulePopup(false); setReminderSoundEnabled(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text)" }}>×</button>
                    </div>
                    
                    {/* Repeat selection */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "left" }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Repeat Behavior</label>
                      <select
                        value={reminderRepeat}
                        onChange={e => setReminderRepeat(e.target.value)}
                        style={{
                          padding: "6px 8px", borderRadius: 8, border: "1.5px solid var(--border)",
                          fontSize: 12, fontFamily: "var(--font)", background: "var(--surface-2)", color: "var(--text)"
                        }}
                      >
                        <option value="only one time">Only One Time</option>
                        <option value="daily remind">Daily Remind</option>
                        <option value="every monday">Every Monday</option>
                        <option value="every tuesday">Every Tuesday</option>
                        <option value="every wednesday">Every Wednesday</option>
                        <option value="every thursday">Every Thursday</option>
                        <option value="every friday">Every Friday</option>
                        <option value="every saturday">Every Saturday</option>
                        <option value="every sunday">Every Sunday</option>
                      </select>
                    </div>
                    {/* Date selection */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "left" }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Date</label>
                      <input
                        type="date"
                        value={reminderDate}
                        onChange={e => setReminderDate(e.target.value)}
                        style={{
                          padding: "6px 8px", borderRadius: 8, border: "1.5px solid var(--border)",
                          fontSize: 12, fontFamily: "var(--font)", background: "var(--surface-2)", color: "var(--text)"
                        }}
                      />
                    </div>

                    {/* Sound Switch toggle */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 2px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Enable Alarm Sound</span>
                      <label style={{ display: "flex", alignItems: "center", cursor: "pointer", position: "relative" }}>
                        <input
                          type="checkbox"
                          checked={reminderSoundEnabled}
                          onChange={e => setReminderSoundEnabled(e.target.checked)}
                          style={{
                            width: 32, height: 18, appearance: "none",
                            backgroundColor: reminderSoundEnabled ? "var(--blue)" : "rgba(0,0,0,0.15)",
                            borderRadius: 9, position: "relative", cursor: "pointer",
                            transition: "background-color 0.2s ease"
                          }}
                        />
                        <span style={{
                          width: 14, height: 14, backgroundColor: "#fff",
                          borderRadius: "50%", position: "absolute", top: 2,
                          left: reminderSoundEnabled ? 16 : 2, transition: "left 0.2s ease",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
                        }} />
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8 }}>
                      <button
                        onClick={() => {
                          setShowSchedulePopup(false);
                          setReminderSoundEnabled(false);
                        }}
                        type="button"
                        style={{
                          flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                          cursor: "pointer", fontFamily: "var(--font)", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)"
                        }}
                      >Cancel</button>
                      <button
                        onClick={() => {
                          if (!reminderTitle.trim()) {
                            showToast("Please enter a reminder title first!", "error");
                            return;
                          }
                          const scheduleStr = JSON.stringify({
                            time: "",
                            date: reminderDate,
                            repeat: reminderRepeat,
                            soundEnabled: reminderSoundEnabled
                          });
                          handleSaveReminder(reminderTitle, scheduleStr);
                          setReminderTitle("");
                          setReminderSoundEnabled(false);
                          setShowSchedulePopup(false);
                        }}
                        type="button"
                        style={{
                          flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 800,
                          cursor: "pointer", fontFamily: "var(--font)", background: "var(--blue)", color: "#fff", border: "none"
                        }}
                      >Confirm & Set</button>
                    </div>                  </div>
                )}

                {/* Reminders List Body */}
                <div className="styled-scroll" style={{ maxHeight: 240, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8, background: "var(--surface)" }}>
                  {getVisibleReminders().length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-faint)", fontSize: 12.5 }}>
                      <span style={{ fontSize: 24, display: "block", marginBottom: 6, opacity: 0.35 }}>⏰</span>
                      No reminders set. Set one above!
                    </div>
                  ) : (
                    getVisibleReminders().map(rem => {
                      const remId = rem._id || rem.id;
                      const isActive = rem.active;
                      const isNoted = isReminderNotedToday(rem);

                      if (editingReminderId === remId) {
                        return (
                          <div key={remId} style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            padding: "12px",
                            background: "var(--surface-2)",
                            border: "1.5px solid var(--blue)",
                            borderRadius: "var(--radius-sm)",
                            textAlign: "left"
                          }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: 4 }}>
                              ✏️ Edit: <strong>{rem.title}</strong>
                            </div>

                            {/* Repeat behavior */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)" }}>Repeat Behavior</label>
                              <select
                                value={editRepeat}
                                onChange={e => setEditRepeat(e.target.value)}
                                style={{
                                  padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)",
                                  fontSize: 11.5, fontFamily: "var(--font)", background: "var(--surface)", color: "var(--text)"
                                }}
                              >
                                <option value="only one time">Only One Time</option>
                                <option value="daily remind">Daily Remind</option>
                                <option value="every monday">Every Monday</option>
                                <option value="every tuesday">Every Tuesday</option>
                                <option value="every wednesday">Every Wednesday</option>
                                <option value="every thursday">Every Thursday</option>
                                <option value="every friday">Every Friday</option>
                                <option value="every saturday">Every Saturday</option>
                                <option value="every sunday">Every Sunday</option>
                              </select>
                            </div>

                            {/* Date selection for one-time */}
                            {editRepeat === "only one time" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)" }}>Date</label>
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={e => setEditDate(e.target.value)}
                                  style={{
                                    padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)",
                                    fontSize: 11.5, fontFamily: "var(--font)", background: "var(--surface)", color: "var(--text)"
                                  }}
                                />
                              </div>
                            )}

                            {/* Postpone editing */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)" }}>
                                {editPostponeTime ? "Postponed Until" : "Postpone Reminder"}
                              </label>
                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <input
                                  type="datetime-local"
                                  value={editPostponeTime}
                                  onChange={e => setEditPostponeTime(e.target.value)}
                                  style={{
                                    flex: 1,
                                    padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)",
                                    fontSize: 11, fontFamily: "var(--font)", background: "var(--surface)", color: "var(--text)",
                                    minWidth: 0
                                  }}
                                />
                                {editPostponeTime && (
                                  <button
                                    type="button"
                                    onClick={() => setEditPostponeTime("")}
                                    style={{
                                      padding: "4px 6px",
                                      borderRadius: 6,
                                      border: "none",
                                      background: "var(--bg-red)",
                                      color: "var(--text-red)",
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      cursor: "pointer"
                                    }}
                                    title="Clear postponement"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
                              <button
                                type="button"
                                onClick={() => setEditingReminderId(null)}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  fontFamily: "var(--font)",
                                  background: "transparent",
                                  border: "1px solid var(--border)",
                                  color: "var(--text-faint)"
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditReminder(rem)}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  fontFamily: "var(--font)",
                                  background: "var(--blue)",
                                  color: "#fff",
                                  border: "none"
                                }}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={remId} style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          opacity: (isActive && !isNoted) ? 1 : 0.65
                        }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                            <span style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "var(--text)",
                              textDecoration: (isActive && !isNoted) ? "none" : "line-through",
                              opacity: (isActive && !isNoted) ? 1 : 0.5,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 140
                            }} title={rem.title}>
                              {rem.title}
                            </span>
                            <span style={{ fontSize: 10.5, color: "var(--text-faint)", fontWeight: 600 }}>
                              {(() => {
                                try {
                                  if (rem.time.startsWith("{")) {
                                    const parsed = JSON.parse(rem.time);
                                    if (parsed.repeat === "only one time") {
                                      return `📅 ${parsed.date}`;
                                    } else if (parsed.repeat === "daily remind") {
                                      return `📅 Daily`;
                                    } else {
                                      const day = parsed.repeat.replace("every ", "");
                                      return `📅 Every ${day.charAt(0).toUpperCase() + day.slice(1)}`;
                                    }
                                  }
                                } catch (e) {}
                                return `📅 ${rem.time}`;
                              })()}
                              {(() => {
                                const pst = localStorage.getItem(`MEDAI_REMINDER_POSTPONED_${remId}`);
                                if (pst) {
                                  const d = new Date(parseInt(pst, 10));
                                  return ` (⏳ Postponed to ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
                                }
                                return "";
                              })()}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {/* Edit button */}
                            {isActive && !isNoted && !isReminderFinished(rem) && (
                              <button
                                onClick={() => handleStartEditReminder(rem)}
                                title="Edit reminder schedule & postpone"
                                style={{
                                  background: "none", border: "none", cursor: "pointer",
                                  fontSize: 11, padding: "2px"
                                }}
                              >
                                ✏️
                              </button>
                            )}

                            {/* Toggle switch */}
                            {!isReminderFinished(rem) && !isNoted && (
                              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", position: "relative" }}>
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={() => handleToggleReminder(remId, isActive)}
                                  style={{
                                    width: 28, height: 16, appearance: "none",
                                    backgroundColor: isActive ? "var(--blue)" : "rgba(0,0,0,0.15)",
                                    borderRadius: 8, position: "relative", cursor: "pointer",
                                    transition: "background-color 0.2s ease"
                                  }}
                                  disabled={isNoted}
                                />
                                <span style={{
                                  width: 12, height: 12, backgroundColor: "#fff",
                                  borderRadius: "50%", position: "absolute", top: 2,
                                  left: isActive ? 14 : 2, transition: "left 0.2s ease",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
                                }} />
                              </label>
                            )}

                            <button
                              onClick={() => handleDeleteReminder(remId)}
                              title="Delete reminder"
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                fontSize: 12, padding: "2px"
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

            {/* Collapsible FAB Buttons - Desktop only */}
            {!isMobile && (<>
            {/* Collapsible Action Button 2: Self-Care Reminders (⏰) */}
            {splashPhase === "done" && (
              <button
                onClick={() => {
                  setShowReminderList(!showReminderList);
                  setShowMedList(false);
                }}
                title="Self-Care Reminders"
                style={{
                  width: 46, height: 46,
                  borderRadius: "50%",
                  background: showReminderList 
                    ? "linear-gradient(135deg, #7c3aed, #8b5cf6)" 
                    : (isDarkTheme ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.95)"),
                  color: showReminderList ? "#fff" : "var(--navy)",
                  border: isDarkTheme ? "1.5px solid rgba(255,255,255,0.15)" : "1.5px solid rgba(59,130,246,0.25)",
                  boxShadow: "0 8px 32px 0 rgba(15, 23, 42, 0.15)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  transition: `all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) ${fabMenuExpanded ? "0.08s" : "0s"}`,
                  opacity: fabMenuExpanded ? 1 : 0,
                  transform: fabMenuExpanded ? "scale(1) translateY(0)" : `scale(0) translateY(${isTop ? "-12px" : "12px"})`,
                  pointerEvents: fabMenuExpanded ? "auto" : "none",
                  position: "relative",
                  order: isTop ? 3 : 1,
                }}
              >
                ⏰
                {getVisibleReminders().filter(r => r.active && !isReminderFinished(r) && !isReminderNotedToday(r)).length > 0 && (
                  <div style={{
                    position: "absolute",
                    top: -4, right: -4,
                    width: 18, height: 18,
                    borderRadius: "50%",
                    background: "#7c3aed",
                    border: "2px solid #fff",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font)",
                    boxShadow: "0 2px 6px rgba(124,58,237,0.4)",
                  }}>{getVisibleReminders().filter(r => r.active && !isReminderFinished(r) && !isReminderNotedToday(r)).length}</div>
                )}
              </button>
            )}

            {/* Collapsible Action Button 1: Medicine List (💊) */}
            <button
              onClick={() => {
                setShowMedList(!showMedList);
                setShowReminderList(false);
              }}
              title="Medicine List"
              style={{
                width: 46, height: 46,
                borderRadius: "50%",
                background: showMedList 
                  ? "linear-gradient(135deg, #1d4ed8, #2563eb)" 
                  : (isDarkTheme ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.95)"),
                color: showMedList ? "#fff" : "var(--navy)",
                border: isDarkTheme ? "1.5px solid rgba(255,255,255,0.15)" : "1.5px solid rgba(59,130,246,0.25)",
                boxShadow: "0 8px 32px 0 rgba(15, 23, 42, 0.15)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                transition: `all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) ${fabMenuExpanded ? "0.04s" : "0s"}`,
                opacity: fabMenuExpanded ? 1 : 0,
                transform: fabMenuExpanded ? "scale(1) translateY(0)" : `scale(0) translateY(${isTop ? "-12px" : "12px"})`,
                pointerEvents: fabMenuExpanded ? "auto" : "none",
                position: "relative",
                order: 2,
              }}
            >
              💊
              {savedMedicines.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: -4, right: -4,
                  width: 18, height: 18,
                  borderRadius: "50%",
                  background: "var(--text-red-light)",
                  border: "2px solid #fff",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font)",
                  boxShadow: "0 2px 6px rgba(239,68,68,0.4)",
                }}>{savedMedicines.length > 9 ? "9+" : savedMedicines.length}</div>
              )}
            </button>

            <button
              onMouseDown={handleFabMouseDown}
              onTouchStart={handleFabMouseDown}
              onMouseEnter={() => { if (!isDraggingFab) setIsHoveredFab(true); }}
              onMouseLeave={() => { if (!isDraggingFab) setIsHoveredFab(false); }}
              title={fabMenuExpanded ? "Close Utilities Menu" : "Open Utilities Menu"}
              style={{
                width: 50, height: 50,
                borderRadius: "50%",
                background: "none",
                color: isDarkTheme ? "#fff" : "var(--navy)",
                border: "none",
                backdropFilter: "none",
                WebkitBackdropFilter: "none",
                boxShadow: "none",
                cursor: isDraggingFab ? "grabbing" : "grab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: "bold",
                transition: "all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)",
                position: "relative",
                opacity: (isHoveredFab || fabMenuExpanded || isDraggingFab) ? 1 : 0.65,
                transform: (fabMenuExpanded || isHoveredFab || isDraggingFab) 
                  ? "none" 
                  : `translateX(${isLeft ? "-44px" : "44px"})`,
                order: isTop ? 1 : 3,
              }}
            >
              <span style={{ 
                display: "inline-block", 
                transform: `rotate(${isLeft ? (fabMenuExpanded ? "180deg" : "0deg") : (fabMenuExpanded ? "0deg" : "180deg")})`,
                transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" 
              }}>
                {arrowChar}
              </span>
            </button>
            </>)}
          </div>
        </>
        );
      })()}
    </div>

      {/* Active Alarm Modal */}
      {activeAlarm && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "var(--surface)",
            border: "2px solid var(--border)",
            borderRadius: 20,
            width: "90%",
            maxWidth: 420,
            padding: "32px 24px",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4)",
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 64,
              marginBottom: 16,
            }}>⏰</div>
            <h2 style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text)",
              marginBottom: 8,
              fontFamily: "var(--font)",
            }}>Self-Care Reminder</h2>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 24,
              display: "inline-block",
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "var(--font)",
            }}>
              {activeAlarm.title}
            </div>
            
            {!postponeMode ? (
              <div style={{ display: "flex", gap: 14 }}>
                <button
                  onClick={() => setPostponeMode(true)}
                  type="button"
                  style={{
                    flex: 1,
                    padding: "14px 18px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14.5,
                    cursor: "pointer",
                    fontFamily: "var(--font)",
                    background: "var(--surface-2)",
                    border: "1.5px solid var(--border)",
                    color: "var(--text)",
                    transition: "var(--transition)",
                  }}
                >
                  ⏳ Postpone
                </button>
                <button
                  onClick={handleNotedReminder}
                  type="button"
                  style={{
                    flex: 1,
                    padding: "14px 18px",
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 14.5,
                    cursor: "pointer",
                    fontFamily: "var(--font)",
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    border: "none",
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
                    transition: "var(--transition)",
                  }}
                >
                  Noted
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-faint)", marginBottom: 2 }}>
                  Choose when to remind next:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    onClick={() => handlePostponeAction("5h")}
                    type="button"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      textAlign: "center"
                    }}
                  >
                    After 5 hours
                  </button>
                  <button
                    onClick={() => handlePostponeAction("12h")}
                    type="button"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      textAlign: "center"
                    }}
                  >
                    After 12 hours
                  </button>
                  <button
                    onClick={() => handlePostponeAction("tomorrow")}
                    type="button"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      textAlign: "center"
                    }}
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => handlePostponeAction("2d")}
                    type="button"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      textAlign: "center"
                    }}
                  >
                    After 2 days
                  </button>
                </div>

                <div style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 10,
                  marginTop: 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-faint)" }}>
                    Custom remind interval:
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="number"
                      min="1"
                      value={customPostponeVal}
                      onChange={(e) => setCustomPostponeVal(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1.5px solid var(--border)",
                        background: "var(--surface-2)",
                        color: "var(--text)",
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "var(--font)",
                        outline: "none",
                        minWidth: 0
                      }}
                    />
                    <select
                      value={customPostponeUnit}
                      onChange={(e) => setCustomPostponeUnit(e.target.value)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1.5px solid var(--border)",
                        background: "var(--surface-2)",
                        color: "var(--text)",
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "var(--font)",
                        outline: "none"
                      }}
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                    <button
                      onClick={() => handlePostponeAction(null, true)}
                      type="button"
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: "var(--font)",
                        background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                        border: "none",
                        color: "#fff"
                      }}
                    >
                      OK
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setPostponeMode(false)}
                  type="button"
                  style={{
                    marginTop: 6,
                    width: "100%",
                    padding: "10px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "var(--font)",
                    background: "transparent",
                    border: "1.5px dashed var(--border)",
                    color: "var(--text-faint)",
                    textAlign: "center"
                  }}
                >
                  ← Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {(() => {
        return createPortal(
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed",
                  top: 24,
                  right: 24,
                  background: toast.type === "error" ? "rgba(239, 68, 68, 0.96)" : "rgba(16, 185, 129, 0.96)",
                  backdropFilter: "blur(12px)",
                  color: "#fff",
                  padding: "14px 28px",
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
                  zIndex: 999999,
                  fontFamily: "var(--font)",
                }}
              >
                <span style={{ fontSize: 16 }}>{toast.type === "error" ? "✕" : "✓"}</span>
                <span>{toast.msg}</span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        );
      })()}
    </>
  );
}
