-- Shared dishes from every saved diet plan, used to offer extra swap options with matching
-- nutrition, slot, category and diet type. Signed-in users can read; only the server
-- (/api/dishes, secret key, after verifying the user) writes.

create table if not exists public.dish_catalog (
  dish_key text primary key check (char_length(dish_key) between 3 and 140),
  name text not null check (char_length(name) between 2 and 120),
  slot text not null check (slot in ('Breakfast', 'Lunch', 'Snack', 'Dinner')),
  category text not null check (char_length(category) between 2 and 40),
  diet text not null check (diet in ('veg', 'egg', 'nonveg', 'vegan')),
  calories integer not null check (calories between 20 and 3000),
  protein_g numeric(5, 1) not null check (protein_g between 0 and 300),
  carbs_g numeric(5, 1) check (carbs_g between 0 and 500),
  fat_g numeric(5, 1) check (fat_g between 0 and 300),
  serving text,
  recipe text check (char_length(recipe) <= 1500),
  uses integer not null default 1,
  created_at timestamptz not null default now()
);

comment on table public.dish_catalog is 'Dishes contributed by saved diet plans. dish_key = lower(name) || ''|'' || slot.';

-- Swap lookup: same slot, calories in a band.
create index if not exists dish_catalog_slot_cal_idx on public.dish_catalog (slot, calories);

alter table public.dish_catalog enable row level security;

drop policy if exists "dish_catalog: signed-in users can read" on public.dish_catalog;
create policy "dish_catalog: signed-in users can read"
  on public.dish_catalog for select
  to authenticated
  using (true);

revoke all on public.dish_catalog from anon, authenticated;
grant select on public.dish_catalog to authenticated;
