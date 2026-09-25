-- Finagnon Vision — base Neon (Data API + Managed Better Auth).
-- À exécuter dans Neon > SQL Editor, APRÈS avoir activé la Data API et Neon Auth.

create table if not exists public.lunettes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text default '',
  details text default '',
  prix integer default 16000,
  ancien_prix integer default 25000,
  en_promo boolean default true,
  genre text default 'mixte',
  type text default 'vue',
  forme text default 'rect',
  badge text default 'PROMO 16 000 F',
  disponible boolean default true,
  image_url text,
  created_at timestamptz default now());

-- Migration si la table existait déjà sans les colonnes promo :
alter table public.lunettes add column if not exists ancien_prix integer default 25000;
alter table public.lunettes add column if not exists en_promo boolean default true;

create table if not exists public.blog (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  texte text default '',
  url text default '',
  image_url text,
  publie boolean default true,
  created_at timestamptz default now());

create table if not exists public.reglages (
  id int primary key default 1,
  data jsonb default '{}'::jsonb);

-- Liste des administrateurs : seul cet identifiant peut modifier le site.
create table if not exists public.admins (user_id text primary key);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where user_id = auth.user_id()) $$;

alter table public.lunettes enable row level security;
alter table public.blog enable row level security;
alter table public.reglages enable row level security;
alter table public.admins enable row level security;

-- Tout le monde lit le contenu ; seuls les administrateurs écrivent.
drop policy if exists "lecture lunettes" on public.lunettes;
drop policy if exists "lecture blog" on public.blog;
drop policy if exists "lecture reglages" on public.reglages;
drop policy if exists "mon statut admin" on public.admins;
drop policy if exists "admin lunettes" on public.lunettes;
drop policy if exists "admin blog" on public.blog;
drop policy if exists "admin reglages" on public.reglages;

create policy "lecture lunettes" on public.lunettes
  for select to anonymous, authenticated using (true);
create policy "lecture blog" on public.blog
  for select to anonymous, authenticated using (publie or public.is_admin());
create policy "lecture reglages" on public.reglages
  for select to anonymous, authenticated using (true);
create policy "mon statut admin" on public.admins
  for select to authenticated using (user_id = auth.user_id());

-- Réglages par défaut avec bandeau promo
insert into public.reglages (id, data) values (1, '{"PROMO_BANNER": "🔥 PROMO EXCEPTIONNELLE : Toutes nos montures à 16 000 FCFA • Expédition partout !", "PROMO_ACTIVE": "true", "EXPEDITION_NOTE": "Expédition rapide partout au Burkina Faso"}'::jsonb)
on conflict (id) do nothing;

-- Les 15 modèles de départ à 16 000 FCFA
insert into public.lunettes (nom, description, prix, ancien_prix, en_promo, genre, type, forme, badge, disponible, image_url)
select * from (values
 ('Demi-cerclée Or & Rouge','Monture métal dorée, demi-cerclée, verres anti-lumière bleue',16000,25000,true,'femme','bluelight','papillon','PROMO 16 000 F',true,'images/lunette-01.jpg'),
 ('Rectangulaire Gris Mat','Monture légère gris mat, branches métal',16000,25000,true,'homme','bluelight','rect','PROMO 16 000 F',true,'images/lunette-02.jpg'),
 ('Écaille Noir & Ambre','Acétate noir et écaille ambrée, détails dorés',16000,25000,true,'mixte','bluelight','carree','PROMO 16 000 F',true,'images/lunette-03.jpg'),
 ('Métal Bleu Nuit','Fine monture métal bleu nuit, plaquettes confort',16000,25000,true,'homme','bluelight','rect','PROMO 16 000 F',true,'images/lunette-04.jpg'),
 ('Sans cadre Argent','Monture sans cadre, branches argentées',16000,25000,true,'homme','bluelight','rect','PROMO 16 000 F',true,'images/lunette-05.jpg'),
 ('Demi-cerclée Argent & Noir','Style browline argent et noir',16000,25000,true,'mixte','bluelight','rect','PROMO 16 000 F',true,'images/lunette-06.jpg'),
 ('Acétate Écaille Dorée','Acétate écaille, finitions dorées sur les branches',16000,25000,true,'mixte','bluelight','carree','PROMO 16 000 F',true,'images/lunette-07.jpg'),
 ('Browline Noir & Or','Arcade noire, cerclage or',16000,25000,true,'mixte','bluelight','carree','PROMO 16 000 F',true,'images/lunette-08.jpg'),
 ('Ronde Noire & Orange','Ronde noire, embouts orange',16000,25000,true,'mixte','bluelight','ronde','PROMO 16 000 F',true,'images/lunette-09.jpg'),
 ('Rectangulaire Noir & Bleu','Noir texturé, branches bleu marine',16000,25000,true,'homme','bluelight','rect','PROMO 16 000 F',true,'images/lunette-10.jpg'),
 ('Sans cadre Argent Bianco','Monture sans cadre, argent et noir',16000,25000,true,'homme','bluelight','rect','PROMO 16 000 F',true,'images/lunette-11.jpg'),
 ('Carrée Noire Cloutée','Acétate noir brillant, clous décoratifs',16000,25000,true,'mixte','bluelight','carree','PROMO 16 000 F',true,'images/lunette-12.jpg'),
 ('Fine Noire & Argent','Monture fine noire, branches argentées',16000,25000,true,'mixte','bluelight','rect','PROMO 16 000 F',true,'images/lunette-13.jpg'),
 ('Noir & Cristal','Bicolore noir et cristal transparent',16000,25000,true,'homme','bluelight','carree','PROMO 16 000 F',true,'images/lunette-14.jpg'),
 ('Carrée Gris Transparent','Acétate gris transparent, style oversize',16000,25000,true,'mixte','bluelight','carree','PROMO 16 000 F',true,'images/lunette-15.jpg')
) as v(nom, description, prix, ancien_prix, en_promo, genre, type, forme, badge, disponible, image_url)
where not exists (select 1 from public.lunettes);

create policy "admin lunettes" on public.lunettes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin blog" on public.blog
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin reglages" on public.reglages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anonymous, authenticated;
grant select on public.lunettes, public.blog, public.reglages to anonymous;
grant select, insert, update, delete on public.lunettes, public.blog, public.reglages to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.is_admin() to authenticated;
