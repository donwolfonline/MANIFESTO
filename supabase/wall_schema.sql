-- ============================================================================
-- WORKING_COPY.md — /wall & /admin Supabase PostgreSQL Schema
-- Run this once inside Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Public submissions table (moderated via status = 'pending' -> 'approved' | 'rejected')
create table if not exists public.wall_submissions (
  id uuid primary key default gen_random_uuid(),
  principle text not null check (char_length(trim(principle)) between 8 and 140),
  author text not null check (char_length(trim(author)) between 2 and 40),
  country_flag text null check (country_flag is null or char_length(country_flag) <= 12),
  author_url text null check (author_url is null or author_url ~* '^https?://'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  likes integer not null default 0 check (likes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_wall_submissions_status_created
  on public.wall_submissions (status, created_at desc);

-- 2. Privacy-preserving rate-limit table (stores ONLY salted SHA-256 IP hashes, never raw IPs)
create table if not exists public.wall_rate_limits (
  id bigserial primary key,
  ip_hash text not null,
  action text not null check (action in ('submit', 'like', 'admin_auth', 'error_report')),
  created_at timestamptz not null default now()
);

create index if not exists idx_wall_rate_limits_lookup
  on public.wall_rate_limits (ip_hash, action, created_at desc);

-- 3. Atomic like counter increment (only on approved cards)
create or replace function public.increment_wall_like(submission_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  new_likes integer;
begin
  update public.wall_submissions
  set likes = likes + 1
  where id = submission_id
    and status = 'approved'
  returning likes into new_likes;

  return new_likes;
end;
$$;

-- 4. Lock down Row Level Security: serverless API uses SUPABASE_SERVICE_ROLE_KEY.
--    Direct browser anon clients can only read approved submissions, never insert/update/delete.
alter table public.wall_submissions enable row level security;
alter table public.wall_rate_limits enable row level security;

drop policy if exists "Public can read approved wall submissions" on public.wall_submissions;
create policy "Public can read approved wall submissions"
  on public.wall_submissions
  for select
  using (status = 'approved');
