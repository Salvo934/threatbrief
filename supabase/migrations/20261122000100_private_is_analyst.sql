-- is_analyst() era chiamabile via /rest/v1/rpc (advisor Supabase 0028/0029).
-- La spostiamo in uno schema non esposto dall'API: le policy la usano ancora,
-- ma i client non possono invocarla direttamente.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_analyst()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.analysts a where a.user_id = auth.uid());
$$;
revoke execute on function private.is_analyst() from public;
grant execute on function private.is_analyst() to anon, authenticated;

-- Ricrea le policy che usavano public.is_analyst()
drop policy "analyses: analyst insert" on public.analyses;
drop policy "analyses: analyst update own" on public.analyses;
drop policy "analyses: analyst delete own" on public.analyses;
drop policy "reports: analyst insert" on public.reports;
drop policy "reports: analyst update own" on public.reports;
drop policy "reports: analyst delete own" on public.reports;

create policy "analyses: analyst insert" on public.analyses
  for insert to authenticated
  with check ((select private.is_analyst()) and owner_id = (select auth.uid()) and not is_example);
create policy "analyses: analyst update own" on public.analyses
  for update to authenticated
  using ((select private.is_analyst()) and owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and not is_example);
create policy "analyses: analyst delete own" on public.analyses
  for delete to authenticated
  using ((select private.is_analyst()) and owner_id = (select auth.uid()));

create policy "reports: analyst insert" on public.reports
  for insert to authenticated
  with check ((select private.is_analyst()) and owner_id = (select auth.uid()) and not is_example);
create policy "reports: analyst update own" on public.reports
  for update to authenticated
  using ((select private.is_analyst()) and owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and not is_example);
create policy "reports: analyst delete own" on public.reports
  for delete to authenticated
  using ((select private.is_analyst()) and owner_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array[
    'report_sources', 'report_statements', 'report_techniques', 'report_iocs'
  ] loop
    execute format('drop policy "write via own report" on public.%I', t);
    execute format($f$
      create policy "write via own report" on public.%1$I
        for all to authenticated
        using ((select private.is_analyst()) and exists (
          select 1 from public.reports r
          where r.id = report_id and r.owner_id = (select auth.uid())))
        with check ((select private.is_analyst()) and exists (
          select 1 from public.reports r
          where r.id = report_id and r.owner_id = (select auth.uid())));
    $f$, t);
  end loop;
end $$;

drop function public.is_analyst();
