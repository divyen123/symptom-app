/* global process */
import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const app = express();
const allowedOrigins = ["http://localhost:5173"];
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(",").forEach(url => {
    allowedOrigins.push(url.trim().replace(/\/$/, ""));
  });
}
app.use(cors({
  origin: allowedOrigins
}));
app.use(express.json({ limit: "2mb" }));

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Service role key recommended for backend
const JWT_SECRET = process.env.JWT_SECRET || "medai_super_secret_key_change_in_production";
const JWT_EXPIRES = "7d";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

console.log("✅ Supabase Client initialized successfully");

// ─── Auth Middleware ───────────────────────────────────────────────────────────
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] === "demo_token_offline") {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password are required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const { data: existing, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing)
      return res.status(409).json({ error: "An account with this email already exists" });

    const hashed = await bcrypt.hash(password, 12);
    const { data: user, error: createError } = await supabase
      .from("users")
      .insert({ name, email: email.toLowerCase(), password: hashed })
      .select()
      .single();

    if (createError) throw createError;

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const { data: user, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (findError) throw findError;
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/google-login
app.post("/api/auth/google-login", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name)
      return res.status(400).json({ error: "Email and name are required" });

    let { data: user, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (findError) throw findError;

    let isNewRegister = false;
    if (!user) {
      isNewRegister = true;
      const dummyPassword = await bcrypt.hash(Math.random().toString(36), 12);
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({ name, email: email.toLowerCase(), password: dummyPassword })
        .select()
        .single();

      if (createError) throw createError;
      user = newUser;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      isNewRegister
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me  — verify token & return user info
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const { data: user, error: findError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", req.userId)
      .single();

    if (findError) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/change-password
app.post("/api/auth/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const { data: user, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.userId)
      .single();

    if (findError || !user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    const hashedNew = await bcrypt.hash(newPassword, 12);
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: hashedNew })
      .eq("id", req.userId);

    if (updateError) throw updateError;

    res.json({ message: "Password updated successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/verify-password
app.post("/api/auth/verify-password", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const { data: user, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.userId)
      .single();

    if (findError || !user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    res.json({ valid: match });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/auth/update-email
app.put("/api/auth/update-email", authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required" });
    }
    const lowerEmail = email.toLowerCase();
    
    // Check if email is already taken by another user
    const { data: existing, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("email", lowerEmail)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing && existing.id !== req.userId) {
      return res.status(400).json({ error: "Email address is already in use by another account" });
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ email: lowerEmail })
      .eq("id", req.userId);

    if (updateError) throw updateError;

    res.json({ message: "Email updated successfully", email: lowerEmail });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/auth/delete-account — delete account and all user data
app.delete("/api/auth/delete-account", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { data: user, error: findError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (findError) throw findError;
    if (user && user.email === "default@medai.local") {
      return res.status(403).json({ error: "Cannot delete the default demo account" });
    }

    // CASCADE handles reports, settings, vitals, chats, todos, medications deletions
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (deleteError) throw deleteError;

    res.json({ message: "Account and all associated data deleted successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/auth/reset-profile - delete all user data except account details
app.delete("/api/auth/reset-profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { data: user, error: findError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (findError) throw findError;
    if (user && user.email === "default@medai.local") {
      return res.status(403).json({ error: "Cannot reset the default demo account" });
    }

    await Promise.all([
      supabase.from("settings").delete().eq("user_id", userId),
      supabase.from("reports").delete().eq("user_id", userId),
      supabase.from("history").delete().eq("user_id", userId),
      supabase.from("vitals").delete().eq("user_id", userId),
      supabase.from("chat_sessions").delete().eq("user_id", userId),
      supabase.from("todos").delete().eq("user_id", userId),
      supabase.from("medication_checkins").delete().eq("user_id", userId),
      supabase.from("medications").delete().eq("user_id", userId),
      supabase.from("reminders").delete().eq("user_id", userId)
    ]);

    res.json({ message: "Profile data reset successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Reports API (protected) ──────────────────────────────────────────────────

// GET all reports for the logged-in user
app.get("/api/reports", authMiddleware, async (req, res) => {
  try {
    const { data: reports, error } = await supabase
      .from("reports")
      .select(`
        id:report_id,
        date,
        symptoms,
        duration,
        painLevel:pain_level,
        hasFever:has_fever,
        condition,
        conditions,
        severity,
        severityLevel:severity_level,
        severityReason:severity_reason,
        selfCare:self_care,
        doctorWarning:doctor_warning,
        simpleExplanation:simple_explanation,
        recommendedAction:recommended_action
      `)
      .eq("user_id", req.userId)
      .order("report_id", { ascending: true });

    if (error) throw error;
    res.json(reports || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST single report (upsert)
app.post("/api/reports", authMiddleware, async (req, res) => {
  try {
    const record = {
      user_id: req.userId,
      report_id: req.body.id,
      date: req.body.date,
      symptoms: req.body.symptoms,
      duration: req.body.duration,
      pain_level: req.body.painLevel,
      has_fever: req.body.hasFever,
      condition: req.body.condition,
      conditions: req.body.conditions,
      severity: req.body.severity,
      severity_level: req.body.severityLevel,
      severity_reason: req.body.severityReason,
      self_care: req.body.selfCare,
      doctor_warning: req.body.doctorWarning,
      simple_explanation: req.body.simpleExplanation,
      recommended_action: req.body.recommendedAction
    };

    const { data: doc, error } = await supabase
      .from("reports")
      .upsert(record, { onConflict: "user_id,report_id" })
      .select(`
        id:report_id,
        date,
        symptoms,
        duration,
        painLevel:pain_level,
        hasFever:has_fever,
        condition,
        conditions,
        severity,
        severityLevel:severity_level,
        severityReason:severity_reason,
        selfCare:self_care,
        doctorWarning:doctor_warning,
        simpleExplanation:simple_explanation,
        recommendedAction:recommended_action
      `)
      .single();

    if (error) throw error;
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST bulk reports (migration from localStorage)
app.post("/api/reports/bulk", authMiddleware, async (req, res) => {
  try {
    const reports = req.body;
    if (!Array.isArray(reports) || reports.length === 0) return res.json({ inserted: 0 });

    const records = reports.map((r) => ({
      user_id: req.userId,
      report_id: r.id,
      date: r.date,
      symptoms: r.symptoms,
      duration: r.duration,
      pain_level: r.painLevel,
      has_fever: r.hasFever,
      condition: r.condition,
      conditions: r.conditions,
      severity: r.severity,
      severity_level: r.severityLevel,
      severity_reason: r.severityReason,
      self_care: r.selfCare,
      doctor_warning: r.doctorWarning,
      simple_explanation: r.simpleExplanation,
      recommended_action: r.recommendedAction
    }));

    const { data, error } = await supabase
      .from("reports")
      .upsert(records, { onConflict: "user_id,report_id" })
      .select();

    if (error) throw error;
    res.json({ inserted: data ? data.length : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE one report
app.delete("/api/reports/:id", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("user_id", req.userId)
      .eq("report_id", Number(req.params.id));

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE all reports
app.delete("/api/reports", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("user_id", req.userId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── History API (protected) ───────────────────────────────────────────────────

// GET all history records
app.get("/api/history", authMiddleware, async (req, res) => {
  try {
    const { data: history, error } = await supabase
      .from("history")
      .select(`
        id:history_id,
        date,
        symptoms,
        duration,
        painLevel:pain_level,
        hasFever:has_fever,
        condition,
        conditions,
        severity,
        severityLevel:severity_level,
        severityReason:severity_reason,
        selfCare:self_care,
        doctorWarning:doctor_warning,
        simpleExplanation:simple_explanation,
        recommendedAction:recommended_action
      `)
      .eq("user_id", req.userId)
      .order("history_id", { ascending: true });

    if (error) throw error;
    res.json(history || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST single history record (upsert)
app.post("/api/history", authMiddleware, async (req, res) => {
  try {
    const record = {
      user_id: req.userId,
      history_id: req.body.id,
      date: req.body.date,
      symptoms: req.body.symptoms,
      duration: req.body.duration,
      pain_level: req.body.painLevel,
      has_fever: req.body.hasFever,
      condition: req.body.condition,
      conditions: req.body.conditions,
      severity: req.body.severity,
      severity_level: req.body.severityLevel,
      severity_reason: req.body.severityReason,
      self_care: req.body.selfCare,
      doctor_warning: req.body.doctorWarning,
      simple_explanation: req.body.simpleExplanation,
      recommended_action: req.body.recommendedAction
    };

    const { data: doc, error } = await supabase
      .from("history")
      .upsert(record, { onConflict: "user_id,history_id" })
      .select(`
        id:history_id,
        date,
        symptoms,
        duration,
        painLevel:pain_level,
        hasFever:has_fever,
        condition,
        conditions,
        severity,
        severityLevel:severity_level,
        severityReason:severity_reason,
        selfCare:self_care,
        doctorWarning:doctor_warning,
        simpleExplanation:simple_explanation,
        recommendedAction:recommended_action
      `)
      .single();

    if (error) throw error;
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST bulk history records (migration from localStorage)
app.post("/api/history/bulk", authMiddleware, async (req, res) => {
  try {
    const historyList = req.body;
    if (!Array.isArray(historyList) || historyList.length === 0) return res.json({ inserted: 0 });

    const records = historyList.map((r) => ({
      user_id: req.userId,
      history_id: r.id,
      date: r.date,
      symptoms: r.symptoms,
      duration: r.duration,
      pain_level: r.painLevel,
      has_fever: r.hasFever,
      condition: r.condition,
      conditions: r.conditions,
      severity: r.severity,
      severity_level: r.severityLevel,
      severity_reason: r.severityReason,
      self_care: r.selfCare,
      doctor_warning: r.doctorWarning,
      simple_explanation: r.simpleExplanation,
      recommended_action: r.recommendedAction
    }));

    const { data, error } = await supabase
      .from("history")
      .upsert(records, { onConflict: "user_id,history_id" })
      .select();

    if (error) throw error;
    res.json({ inserted: data ? data.length : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE one history record
app.delete("/api/history/:id", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("history")
      .delete()
      .eq("user_id", req.userId)
      .eq("history_id", Number(req.params.id));

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE all history records
app.delete("/api/history", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("history")
      .delete()
      .eq("user_id", req.userId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Settings API (protected) ─────────────────────────────────────────────────

// GET settings
app.get("/api/settings", authMiddleware, async (req, res) => {
  try {
    const { data: s, error } = await supabase
      .from("settings")
      .select(`
        name,
        age,
        bloodGroup:blood_group,
        emergencyContacts:emergency_contacts,
        profilePic:profile_pic,
        country,
        state,
        emergencyNumber:emergency_number,
        theme,
        navPosition:nav_position,
        fontFamily:font_family,
        fontSize:font_size,
        navbarPalette:navbar_palette,
        contentPalette:content_palette,
        stickerOpacity:sticker_opacity,
        glassyNavbar:glassy_navbar,
        glassyContainer:glassy_container
      `)
      .eq("user_id", req.userId)
      .maybeSingle();

    if (error) throw error;
    res.json(s || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT settings (upsert)
app.put("/api/settings", authMiddleware, async (req, res) => {
  try {
    const record = {
      user_id: req.userId,
      name: req.body.name,
      age: req.body.age,
      blood_group: req.body.bloodGroup,
      emergency_contacts: req.body.emergencyContacts,
      profile_pic: req.body.profilePic,
      country: req.body.country,
      state: req.body.state,
      emergency_number: req.body.emergencyNumber,
      theme: req.body.theme,
      nav_position: req.body.navPosition,
      font_family: req.body.fontFamily,
      font_size: req.body.fontSize,
      navbar_palette: req.body.navbarPalette,
      content_palette: req.body.contentPalette,
      sticker_opacity: req.body.stickerOpacity,
      glassy_navbar: req.body.glassyNavbar,
      glassy_container: req.body.glassyContainer
    };

    const { data: doc, error } = await supabase
      .from("settings")
      .upsert(record, { onConflict: "user_id" })
      .select(`
        name,
        age,
        bloodGroup:blood_group,
        emergencyContacts:emergency_contacts,
        profilePic:profile_pic,
        country,
        state,
        emergencyNumber:emergency_number,
        theme,
        navPosition:nav_position,
        fontFamily:font_family,
        fontSize:font_size,
        navbarPalette:navbar_palette,
        contentPalette:content_palette,
        stickerOpacity:sticker_opacity,
        glassyNavbar:glassy_navbar,
        glassyContainer:glassy_container
      `)
      .single();

    if (error) throw error;
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Vitals API (protected) ───────────────────────────────────────────────────

// GET all vitals logs
app.get("/api/vitals", authMiddleware, async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from("vitals")
      .select(`
        id,
        date,
        bpSystolic:bp_systolic,
        bpDiastolic:bp_diastolic,
        sugar,
        sugarState:sugar_state,
        heartRate:heart_rate,
        spo2
      `)
      .eq("user_id", req.userId)
      .order("date", { ascending: true });

    if (error) throw error;
    res.json(logs || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST new vital log
app.post("/api/vitals", authMiddleware, async (req, res) => {
  try {
    const record = {
      user_id: req.userId,
      bp_systolic: req.body.bpSystolic,
      bp_diastolic: req.body.bpDiastolic,
      sugar: req.body.sugar,
      sugar_state: req.body.sugarState,
      heart_rate: req.body.heartRate,
      spo2: req.body.spo2
    };

    if (req.body.date) {
      record.date = req.body.date;
    }

    const { data: doc, error } = await supabase
      .from("vitals")
      .insert(record)
      .select(`
        id,
        date,
        bpSystolic:bp_systolic,
        bpDiastolic:bp_diastolic,
        sugar,
        sugarState:sugar_state,
        heartRate:heart_rate,
        spo2
      `)
      .single();

    if (error) throw error;
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE a vital log
app.delete("/api/vitals/:id", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("vitals")
      .delete()
      .eq("user_id", req.userId)
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Chat Sessions API (protected) ────────────────────────────────────────────

// GET all chat sessions
app.get("/api/chats", authMiddleware, async (req, res) => {
  try {
    const { data: chats, error } = await supabase
      .from("chat_sessions")
      .select("id, title, messages, createdAt:created_at, updatedAt:updated_at")
      .eq("user_id", req.userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    res.json(chats || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET single chat session details
app.get("/api/chats/:id", authMiddleware, async (req, res) => {
  try {
    const { data: chat, error } = await supabase
      .from("chat_sessions")
      .select("id, title, messages, createdAt:created_at, updatedAt:updated_at")
      .eq("user_id", req.userId)
      .eq("id", req.params.id)
      .single();

    if (error || !chat) return res.status(404).json({ error: "Chat session not found" });
    res.json(chat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST new chat session
app.post("/api/chats", authMiddleware, async (req, res) => {
  try {
    const record = {
      user_id: req.userId,
      title: req.body.title || "New Chat",
      messages: req.body.messages || []
    };

    const { data: doc, error } = await supabase
      .from("chat_sessions")
      .insert(record)
      .select("id, title, messages, createdAt:created_at, updatedAt:updated_at")
      .single();

    if (error) throw error;
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT update chat session
app.put("/api/chats/:id", authMiddleware, async (req, res) => {
  try {
    const record = {
      title: req.body.title,
      messages: req.body.messages,
      updated_at: new Date()
    };

    const { data: doc, error } = await supabase
      .from("chat_sessions")
      .update(record)
      .eq("user_id", req.userId)
      .eq("id", req.params.id)
      .select("id, title, messages, createdAt:created_at, updatedAt:updated_at")
      .single();

    if (error) throw error;
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE a chat session
app.delete("/api/chats/:id", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("user_id", req.userId)
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Todos API (protected) ────────────────────────────────────────────────────

// GET all todos
app.get("/api/todos", authMiddleware, async (req, res) => {
  try {
    const { data: todos, error } = await supabase
      .from("todos")
      .select("id, text, completed, createdAt:created_at, updatedAt:updated_at")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json(todos || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST new todo
app.post("/api/todos", authMiddleware, async (req, res) => {
  try {
    const record = {
      user_id: req.userId,
      text: req.body.text,
      completed: req.body.completed || false
    };

    const { data: doc, error } = await supabase
      .from("todos")
      .insert(record)
      .select("id, text, completed, createdAt:created_at, updatedAt:updated_at")
      .single();

    if (error) throw error;
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT update todo
app.put("/api/todos/:id", authMiddleware, async (req, res) => {
  try {
    const record = {
      text: req.body.text,
      completed: req.body.completed,
      updated_at: new Date()
    };

    const { data: doc, error } = await supabase
      .from("todos")
      .update(record)
      .eq("user_id", req.userId)
      .eq("id", req.params.id)
      .select("id, text, completed, createdAt:created_at, updatedAt:updated_at")
      .single();

    if (error) throw error;
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE a todo
app.delete("/api/todos/:id", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("user_id", req.userId)
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Medications API (protected) ──────────────────────────────────────────────

// GET all medications
app.get(["/api/rx-list", "/api/medications"], authMiddleware, async (req, res) => {
  try {
    const { data: meds, error } = await supabase
      .from("medications")
      .select("id, name, cause, category, createdAt:created_at")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(meds || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST new medication
app.post(["/api/rx-list", "/api/medications"], authMiddleware, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Medicine name is required" });

    const normalizedName = name.toLowerCase();
    const { data: existingRows, error: existingError } = await supabase
      .from("medications")
      .select("id, name, cause, category, createdAt:created_at")
      .eq("user_id", req.userId);

    if (existingError) throw existingError;
    const existing = (existingRows || []).find(item => item.name.trim().toLowerCase() === normalizedName);
    if (existing) return res.json(existing);

    const record = {
      user_id: req.userId,
      name,
      cause: req.body.cause || "",
      category: req.body.category || "Pharmacy"
    };

    const { data: doc, error } = await supabase
      .from("medications")
      .insert(record)
      .select("id, name, cause, category, createdAt:created_at")
      .single();

    if (error) throw error;
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT update medication
app.put(["/api/rx-list/:id", "/api/medications/:id"], authMiddleware, async (req, res) => {
  try {
    const updates = {};
    if (req.body.category !== undefined) updates.category = String(req.body.category).trim() || "Pharmacy";
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: "Medicine name is required" });
      updates.name = name;
    }
    if (req.body.cause !== undefined) updates.cause = String(req.body.cause);
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No medication changes provided" });

    const { data: doc, error } = await supabase
      .from("medications")
      .update(updates)
      .eq("user_id", req.userId)
      .eq("id", req.params.id)
      .select("id, name, cause, category, createdAt:created_at")
      .single();

    if (error) throw error;
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE one medication
app.delete(["/api/rx-list/:id", "/api/medications/:id"], authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("medications")
      .delete()
      .eq("user_id", req.userId)
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE ALL medications for a user
app.delete(["/api/rx-list", "/api/medications"], authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("medications")
      .delete()
      .eq("user_id", req.userId);

    if (error) throw error;
    res.json({ message: "All medications deleted successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET all saved plans
app.get("/api/saved-plans", authMiddleware, async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from("saved_plans")
      .select("id, plan_name, plan_data, created_at")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    // Map backend snake_case to frontend keys if needed, or return as is
    const mapped = (plans || []).map(p => ({
      id: p.id,
      plan_name: p.plan_name,
      plan_data: p.plan_data,
      created_at: p.created_at
    }));
    res.json(mapped);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST new saved plan
app.post("/api/saved-plans", authMiddleware, async (req, res) => {
  try {
    const record = {
      user_id: req.userId,
      plan_name: req.body.planName || `Health Plan - ${new Date().toLocaleDateString()}`,
      plan_data: req.body.planData
    };

    const { data: doc, error } = await supabase
      .from("saved_plans")
      .insert(record)
      .select("id, plan_name, plan_data, created_at")
      .single();

    if (error) throw error;
    res.status(201).json({
      id: doc.id,
      plan_name: doc.plan_name,
      plan_data: doc.plan_data,
      created_at: doc.created_at
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE one saved plan
app.delete("/api/saved-plans/:id", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("saved_plans")
      .delete()
      .eq("user_id", req.userId)
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE all saved plans
app.delete("/api/saved-plans", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("saved_plans")
      .delete()
      .eq("user_id", req.userId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ─── Reminders API (protected) ─────────────────────────────────────────────────

// GET all reminders
app.get("/api/reminders", authMiddleware, async (req, res) => {
  try {
    const { data: reminders, error } = await supabase
      .from("reminders")
      .select("id, title, time, active, createdAt:created_at")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(reminders || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST new reminder
app.post("/api/reminders", authMiddleware, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    if (!title) return res.status(400).json({ error: "Reminder title is required" });
    const time = String(req.body.time || "");

    const { data: existingRows, error: existingError } = await supabase
      .from("reminders")
      .select("id, title, time, active, createdAt:created_at")
      .eq("user_id", req.userId);

    if (existingError) throw existingError;
    const existing = (existingRows || []).find(item => item.title.trim() === title && item.time === time);
    if (existing) return res.json(existing);

    const record = {
      user_id: req.userId,
      title,
      time,
      active: req.body.active !== undefined ? req.body.active : true
    };

    const { data: doc, error } = await supabase
      .from("reminders")
      .insert(record)
      .select("id, title, time, active, createdAt:created_at")
      .single();

    if (error) throw error;
    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT update reminder (toggle active state or update values)
app.put("/api/reminders/:id", authMiddleware, async (req, res) => {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.time !== undefined) updates.time = req.body.time;
    if (req.body.active !== undefined) updates.active = req.body.active;

    const { data: doc, error } = await supabase
      .from("reminders")
      .update(updates)
      .eq("user_id", req.userId)
      .eq("id", req.params.id)
      .select("id, title, time, active, createdAt:created_at")
      .single();

    if (error) throw error;
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE one reminder
app.delete("/api/reminders/:id", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("user_id", req.userId)
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE all reminders
app.delete("/api/reminders", authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("user_id", req.userId);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Daily pill check-ins (protected and scoped to the signed-in profile)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidDateKey = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

app.get("/api/pill-checkins", authMiddleware, async (req, res) => {
  try {
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    if (!isValidDateKey(date)) {
      return res.status(400).json({ error: "date must use YYYY-MM-DD" });
    }

    const { data: checkins, error } = await supabase
      .from("medication_checkins")
      .select("medicationId:medication_id, checkinDate:checkin_date, taken, updatedAt:updated_at")
      .eq("user_id", req.userId)
      .eq("checkin_date", date)
      .order("updated_at", { ascending: true });

    if (error) throw error;
    res.json(checkins || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/pill-checkins/:medicationId", authMiddleware, async (req, res) => {
  try {
    const medicationId = String(req.params.medicationId || "");
    const date = String(req.body.date || "");
    const taken = req.body.taken;

    if (!UUID_PATTERN.test(medicationId)) {
      return res.status(400).json({ error: "Invalid medication id" });
    }
    if (!isValidDateKey(date)) {
      return res.status(400).json({ error: "date must use YYYY-MM-DD" });
    }
    if (typeof taken !== "boolean") {
      return res.status(400).json({ error: "taken must be a boolean" });
    }

    const { data: medicine, error: ownershipError } = await supabase
      .from("medications")
      .select("id")
      .eq("id", medicationId)
      .eq("user_id", req.userId)
      .maybeSingle();

    if (ownershipError) throw ownershipError;
    if (!medicine) return res.status(404).json({ error: "Medicine not found" });

    const { data: checkin, error } = await supabase
      .from("medication_checkins")
      .upsert({
        user_id: req.userId,
        medication_id: medicationId,
        checkin_date: date,
        taken,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,medication_id,checkin_date" })
      .select("medicationId:medication_id, checkinDate:checkin_date, taken, updatedAt:updated_at")
      .single();

    if (error) throw error;
    res.json(checkin);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/chat
// Secure proxy route to Groq API using JWT authorization
app.post("/api/ai/chat", authMiddleware, async (req, res) => {
  try {
    const { messages, system } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "Groq API key not configured on backend server" });
    }

    const groqMessages = system
      ? [{ role: "system", content: system }, ...messages]
      : messages;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 1000,
        messages: groqMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Groq API error: ${errText}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    res.json({ content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Listen ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 MedAI backend server listening on port ${PORT}`);
});