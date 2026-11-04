-- "Also want to…": extra training focuses on top of the one main goal (which sets calories).
alter table public.profiles add column if not exists focuses text[] check (focuses is null or cardinality(focuses) <= 10);
