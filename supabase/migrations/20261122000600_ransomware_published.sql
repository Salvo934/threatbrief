-- ransomware.live espone la data di pubblicazione del post (non la data dell'attacco).
-- Gli indirizzi dei leak site (.onion) non vengono salvati: post_url resta per un
-- eventuale link a ransomware.live, mai al sito del gruppo.
alter table public.ransomware_victims drop column attack_date;
alter table public.ransomware_victims add column published_at timestamptz;
comment on table public.ransomware_victims is
  'Rivendicazioni pubblicate dai gruppi ransomware sui leak site, raccolte da ransomware.live (solo Italia). Non verificate.';
