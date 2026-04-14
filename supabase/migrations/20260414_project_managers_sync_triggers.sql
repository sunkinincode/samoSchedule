-- Keep projects.manager_id (CSV) and project_managers (relational) in sync.
-- Bidirectional sync with loop protection via pg_trigger_depth().

-- 1) From projects.manager_id -> project_managers
create or replace function public.sync_project_managers_from_projects()
returns trigger
language plpgsql
as $$
declare
  sid text;
begin
  -- Prevent infinite recursion when the other trigger updates projects.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Only act when manager_id changed or on insert.
  if tg_op = 'UPDATE' and coalesce(new.manager_id, '') = coalesce(old.manager_id, '') then
    return new;
  end if;

  -- Remove all existing mappings for this project, then re-insert from CSV.
  delete from public.project_managers where project_id = new.id;

  for sid in
    select trim(x) as student_id
    from regexp_split_to_table(coalesce(new.manager_id, ''), ',') as x
    where trim(x) <> ''
  loop
    insert into public.project_managers(project_id, student_id)
    values (new.id, sid)
    on conflict do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_sync_project_managers_from_projects on public.projects;
create trigger trg_sync_project_managers_from_projects
after insert or update of manager_id
on public.projects
for each row
execute function public.sync_project_managers_from_projects();


-- 2) From project_managers -> projects.manager_id
create or replace function public.sync_projects_manager_id_from_project_managers()
returns trigger
language plpgsql
as $$
declare
  pid uuid;
  csv text;
begin
  -- Prevent infinite recursion when the other trigger updates project_managers.
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;

  pid := coalesce(new.project_id, old.project_id);

  select
    case
      when count(*) = 0 then null
      else string_agg(student_id, ', ' order by student_id)
    end
  into csv
  from public.project_managers
  where project_id = pid;

  update public.projects
  set manager_id = csv
  where id = pid;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_projects_manager_id_from_project_managers on public.project_managers;
create trigger trg_sync_projects_manager_id_from_project_managers
after insert or update or delete
on public.project_managers
for each row
execute function public.sync_projects_manager_id_from_project_managers();

