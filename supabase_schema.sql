-- SQL Script to set up the PostgreSQL tables on Supabase
-- Run this in your Supabase project's SQL Editor

-- Enable UUID extension
create extension if not exists pgcrypto;

-- 1. Create Users Table
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password text not null,
  created_at timestamp with time zone default now()
);

-- Index for fast user lookups by email
create index if not exists users_email_idx on public.users (email);

-- 2. Create Reports Table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  report_id integer not null, -- Unique per user
  date text,
  symptoms text[],
  duration text,
  pain_level integer,
  has_fever boolean,
  condition text,
  conditions jsonb,
  severity text,
  severity_level text,
  severity_reason text,
  self_care text[],
  doctor_warning text,
  simple_explanation text,
  recommended_action text,
  created_at timestamp with time zone default now(),
  unique (user_id, report_id)
);

-- Index for queries by user_id
create index if not exists reports_user_id_idx on public.reports (user_id);

-- 3. Create Settings Table
create table if not exists public.settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  name text,
  age text,
  blood_group text,
  emergency_contacts jsonb, -- Array of emergency contact objects
  profile_pic text,
  country text,
  state text,
  emergency_number text,
  theme text,
  nav_position text,
  font_family text,
  font_size text,
  navbar_palette text,
  content_palette text,
  sticker_opacity real,
  glassy_navbar boolean,
  glassy_container boolean,
  updated_at timestamp with time zone default now()
);

-- 4. Create Vitals Table
create table if not exists public.vitals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date timestamp with time zone default now(),
  bp_systolic integer,
  bp_diastolic integer,
  sugar integer,
  sugar_state text,
  heart_rate integer,
  spo2 integer
);

-- Index for vitals by user_id
create index if not exists vitals_user_id_idx on public.vitals (user_id);

-- 5. Create Chat Sessions Table
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text default 'New Chat',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for chat sessions by user_id
create index if not exists chat_sessions_user_id_idx on public.chat_sessions (user_id);

-- 6. Create Todos Table
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  completed boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for todos by user_id
create index if not exists todos_user_id_idx on public.todos (user_id);

-- 7. Create Medications Table
create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  cause text default '',
  category text default 'Pharmacy',
  created_at timestamp with time zone default now()
);

-- Index for medications by user_id
create index if not exists medications_user_id_idx on public.medications (user_id);

-- 8. Create Saved Plans Table
create table if not exists public.saved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_name text not null,
  plan_data jsonb not null,
  created_at timestamp with time zone default now()
);

-- Index for saved plans by user_id
create index if not exists saved_plans_user_id_idx on public.saved_plans (user_id);

-- 9. Create Reminders Table
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  time text not null,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- Index for reminders by user_id
create index if not exists reminders_user_id_idx on public.reminders (user_id);

-- 10. Create History Table
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  history_id integer not null, -- Unique per user
  date text,
  symptoms text[],
  duration text,
  pain_level integer,
  has_fever boolean,
  condition text,
  conditions jsonb,
  severity text,
  severity_level text,
  severity_reason text,
  self_care text[],
  doctor_warning text,
  simple_explanation text,
  recommended_action text,
  created_at timestamp with time zone default now(),
  unique (user_id, history_id)
);

-- Index for history by user_id
create index if not exists history_user_id_idx on public.history (user_id);

