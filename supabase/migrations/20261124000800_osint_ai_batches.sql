-- OSINT + IA: nota dell'analista scritta con IA (sui soli dati raccolti) e triage di liste.
alter table public.osint_lookups add column ai jsonb;            -- { summary, next_steps, model, rejected }
alter table public.osint_lookups add column batch_id uuid;

-- Una lista indagata insieme: gruppi calcolati dal codice (dati condivisi) e descritti dall'IA.
create table public.osint_batches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name       text not null check (char_length(name) <= 200),
  clusters   jsonb not null default '[]',  -- [{ id, members[], reasons[] }]
  ai         jsonb,                        -- { clusters: [{ id, title, description, action }], model }
  created_at timestamptz not null default now()
);
create index on public.osint_batches (user_id, created_at desc);
alter table public.osint_lookups add constraint osint_lookups_batch_fk foreign key (batch_id) references public.osint_batches (id) on delete set null;
create index on public.osint_lookups (batch_id);

alter table public.osint_batches enable row level security;
create policy "osint_batches: own read" on public.osint_batches
  for select to authenticated using (user_id = (select auth.uid()) and (select private.is_analyst()));
create policy "osint_batches: analyst insert" on public.osint_batches
  for insert to authenticated with check (user_id = (select auth.uid()) and (select private.is_analyst()));
create policy "osint_batches: own update" on public.osint_batches
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "osint_batches: own delete" on public.osint_batches
  for delete to authenticated using (user_id = (select auth.uid()));
