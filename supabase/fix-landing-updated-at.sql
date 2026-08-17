-- Run this on the LIVE Supabase project (the one jsagroshop.com uses).
-- Supabase Dashboard → SQL Editor → New query → paste → Run

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

notify pgrst, 'reload schema';
