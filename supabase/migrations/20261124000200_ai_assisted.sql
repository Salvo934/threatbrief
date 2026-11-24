-- Report le cui parti testuali sono state scritte con IA (sempre da verificare dall'analista).
alter table public.reports add column ai_assisted boolean not null default false;
