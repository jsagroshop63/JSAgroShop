-- JS Agro Shop — run this in the Supabase SQL editor
-- Dashboard: SQL Editor → New query → Run
-- Then create a public Storage bucket named: media (the setup script also does this)

create table if not exists products (
  id text primary key,
  name text not null,
  headline text not null default '',
  description text not null default '',
  price numeric not null,
  compare_price numeric,
  image text not null,
  gallery jsonb not null default '[]'::jsonb,
  category text not null default '',
  stock int not null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  items jsonb not null default '[]'::jsonb,
  customer_name text not null,
  phone text not null,
  address text not null,
  district text not null,
  shipping_type text not null,
  shipping_fee numeric not null,
  subtotal numeric not null,
  total numeric not null,
  status text not null default 'pending',
  notes text not null default '',
  source text not null default '',
  campaign text not null default '',
  created_at timestamptz not null default now()
);

alter table orders add column if not exists source text not null default '';
alter table orders add column if not exists campaign text not null default '';

create table if not exists carousel_slides (
  id text primary key,
  image text not null,
  title text not null default '',
  subtitle text not null default '',
  cta_text text not null default '',
  cta_link text not null default '/',
  sort_order int not null default 0,
  active boolean not null default true
);

create table if not exists landing_media (
  id text primary key,
  type text not null check (type in ('image', 'video')),
  url text not null,
  title text not null default '',
  caption text not null default '',
  sort_order int not null default 0,
  active boolean not null default true
);

create table if not exists landing_content (
  id int primary key default 1,
  hero_title text not null default '',
  hero_subtitle text not null default '',
  package_title text not null default '',
  package_items jsonb not null default '[]'::jsonb,
  story_title text not null default '',
  story_body text not null default '',
  why_title text not null default '',
  why_items jsonb not null default '[]'::jsonb,
  payment_title text not null default '',
  payment_number text not null default '',
  payment_note text not null default '',
  offer_product_id text not null default 'prod_papaya'
);

alter table landing_content add column if not exists meta_pixel_id text not null default '';
alter table landing_content add column if not exists offer_title text not null default '';
alter table landing_content add column if not exists offer_price numeric not null default 0;
alter table landing_content add column if not exists offer_compare_price numeric;
alter table landing_content add column if not exists offer_media_ids jsonb not null default '[]'::jsonb;
alter table landing_content add column if not exists cta_label text not null default '';
alter table landing_content add column if not exists checkout_title text not null default '';
alter table landing_content add column if not exists help_title text not null default '';
alter table landing_content add column if not exists help_subtitle text not null default '';
alter table landing_content add column if not exists checkout_billing_title text not null default '';
alter table landing_content add column if not exists checkout_order_title text not null default '';
alter table landing_content add column if not exists checkout_submit_label text not null default '';
alter table landing_content add column if not exists checkout_cod_note text not null default '';
alter table landing_content add column if not exists updated_at timestamptz not null default now();

create table if not exists site_settings (
  id int primary key default 1,
  name text not null default '',
  name_en text not null default '',
  slogan text not null default '',
  tagline text not null default '',
  about text not null default '',
  phone text not null default '',
  phone2 text not null default '',
  email text not null default '',
  address text not null default '',
  hours text not null default '',
  facebook text not null default '',
  home_banner_title text not null default '',
  home_banner_cta text not null default '',
  header_offer_label text not null default ''
);

alter table site_settings enable row level security;
drop policy if exists "public read site" on site_settings;
drop policy if exists "admin all site" on site_settings;
create policy "public read site" on site_settings for select using (true);
create policy "admin all site" on site_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table products enable row level security;
alter table orders enable row level security;
alter table carousel_slides enable row level security;
alter table landing_media enable row level security;
alter table landing_content enable row level security;

drop policy if exists "public read products" on products;
drop policy if exists "public read slides" on carousel_slides;
drop policy if exists "public read media" on landing_media;
drop policy if exists "public read landing" on landing_content;
drop policy if exists "public read orders" on orders;
drop policy if exists "public insert orders" on orders;
drop policy if exists "public create orders" on orders;
drop policy if exists "admin all products" on products;
drop policy if exists "admin all orders" on orders;
drop policy if exists "admin all slides" on carousel_slides;
drop policy if exists "admin all media" on landing_media;
drop policy if exists "admin all landing" on landing_content;

create policy "public read products" on products for select using (true);
create policy "public read slides" on carousel_slides for select using (true);
create policy "public read media" on landing_media for select using (true);
create policy "public read landing" on landing_content for select using (true);
create policy "public read orders" on orders for select using (true);
create policy "public create orders" on orders for insert with check (true);
drop policy if exists "public update pending orders" on orders;
create policy "public update pending orders" on orders
  for update using (status = 'pending') with check (status = 'pending');

create policy "admin all products" on products for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all orders" on orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all slides" on carousel_slides for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all media" on landing_media for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all landing" on landing_content for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "public read media bucket" on storage.objects;
drop policy if exists "auth upload media" on storage.objects;
drop policy if exists "auth update media" on storage.objects;

create policy "public read media bucket" on storage.objects for select using (bucket_id = 'media');
create policy "auth upload media" on storage.objects for insert with check (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "auth update media" on storage.objects for update using (bucket_id = 'media' and auth.role() = 'authenticated');
drop policy if exists "auth delete media" on storage.objects;
create policy "auth delete media" on storage.objects for delete using (bucket_id = 'media' and auth.role() = 'authenticated');

-- Live admin order alerts (safe to re-run)
alter table orders replica identity full;
do $$
begin
  alter publication supabase_realtime add table orders;
exception
  when duplicate_object then null;
end $$;
