-- Run once in the Supabase SQL Editor before deploying the matching backend/frontend.
-- Safe to run more than once.

begin;

create extension if not exists pgcrypto;

alter table public.medications add column if not exists cause text;
alter table public.medications add column if not exists category text;
update public.medications set cause = '' where cause is null;
update public.medications set category = 'Pharmacy' where category is null;
alter table public.medications alter column cause set default '';
alter table public.medications alter column category set default 'Pharmacy';

create table if not exists public.medication_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  checkin_date date not null,
  taken boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, medication_id, checkin_date)
);

create index if not exists medication_checkins_user_date_idx
  on public.medication_checkins (user_id, checkin_date);
create index if not exists medication_checkins_medication_idx
  on public.medication_checkins (medication_id);

commit;
