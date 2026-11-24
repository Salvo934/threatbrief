-- Per il Worker «sveglia»: solo il NUMERO di richieste di approfondimento in coda, nessun dato.
-- Così può decidere se avviare il workflow senza conoscere chiavi segrete.
create or replace function public.pending_investigations()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.investigations where status = 'richiesta';
$$;
revoke execute on function public.pending_investigations() from public;
grant execute on function public.pending_investigations() to anon, authenticated;
