-- Create relational table for project managers.
-- This replaces slow substring search on projects.manager_id (comma-separated).

create table if not exists public.project_managers (
  project_id uuid not null references public.projects(id) on delete cascade,
  student_id text not null,
  created_at timestamptz not null default now(),
  primary key (project_id, student_id)
);

create index if not exists project_managers_student_id_idx
  on public.project_managers (student_id);

create index if not exists project_managers_project_id_idx
  on public.project_managers (project_id);

-- Backfill from existing comma-separated projects.manager_id
-- Example: "6710..., 6710..." -> rows in project_managers
insert into public.project_managers (project_id, student_id)
select
  p.id as project_id,
  trim(x) as student_id
from public.projects p
cross join lateral regexp_split_to_table(coalesce(p.manager_id, ''), ',') as x
where trim(x) <> ''
on conflict do nothing;

