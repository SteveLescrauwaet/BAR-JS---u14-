-- À exécuter dans Supabase > SQL Editor > New query > Run.
-- IMPORTANT : remplacer CHANGEZ_CE_MOT_DE_PASSE_AVANT_EXECUTION par un mot de passe long, unique et secret.
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.bar_settings(team_id text primary key, event_date date);
create table if not exists public.bar_registrations(id uuid primary key default gen_random_uuid(), team_id text not null, slot_id text not null check(slot_id in ('09-12','12-15','15-18','18-fin')),first_name text not null,last_name text not null,player_name text not null default '',created_at timestamptz not null default now(),check(length(first_name) between 1 and 50),check(length(last_name) between 1 and 50),check(length(player_name)<=50));
create table if not exists public.bar_reserves(id uuid primary key default gen_random_uuid(),team_id text not null,first_name text not null,last_name text not null,player_name text not null default '',slots text[] not null,created_at timestamptz not null default now(),check(length(first_name) between 1 and 50),check(length(last_name) between 1 and 50),check(length(player_name)<=50));
create table if not exists public.bar_admin_config(id integer primary key check(id=1),password_hash text not null);
insert into public.bar_admin_config(id,password_hash) values (1,extensions.crypt('CHANGEZ_CE_MOT_DE_PASSE_AVANT_EXECUTION',extensions.gen_salt('bf'))) on conflict (id) do update set password_hash=excluded.password_hash;
revoke all on public.bar_settings,public.bar_registrations,public.bar_reserves,public.bar_admin_config from anon,authenticated;
alter table public.bar_settings enable row level security;
alter table public.bar_registrations enable row level security;
alter table public.bar_reserves enable row level security;
alter table public.bar_admin_config enable row level security;
create or replace function public.bar_valid_team(t text) returns boolean language sql immutable set search_path = '' as $$ select t=any(array['u6','u8-a','u8-b','u10-loups','u10-lions','u10-tigres','u12-garcons-a','u12-garcons-b','u12-filles','u14-awbb-garcons','u14-b-garcons','u14-filles','u16-hommes','u16-awbb-dames','u16-b-dames','u18-hommes','u21-hommes','p4-hommes','p3-hommes','p2-hommes','veterans']) $$;
create or replace function public.bar_check_admin(p_password text) returns boolean language sql security definer set search_path='' as $$select coalesce((select c.password_hash=extensions.crypt(p_password,c.password_hash) from public.bar_admin_config c where id=1),false)$$;
create or replace function public.bar_get_planning(p_team text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.bar_valid_team(p_team) then raise exception 'Équipe inconnue'; end if;
 return jsonb_build_object('event_date',(select to_char(event_date,'YYYY-MM-DD') from public.bar_settings where team_id=p_team),
 'registrations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slot_id',slot_id,'first_name',first_name,'last_name',last_name,'player_name',player_name) order by created_at) from public.bar_registrations where team_id=p_team),'[]'::jsonb),
 'reserve',coalesce((select jsonb_agg(jsonb_build_object('id',id,'first_name',first_name,'last_name',last_name,'player_name',player_name,'slots',slots) order by created_at) from public.bar_reserves where team_id=p_team),'[]'::jsonb));
end;$$;
create or replace function public.bar_register(p_team text,p_slot text,p_first text,p_last text,p_player text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare n integer; maxcount integer; new_id uuid;
begin
 if not public.bar_valid_team(p_team) or p_slot not in ('09-12','12-15','15-18','18-fin') then raise exception 'Équipe ou créneau invalide';end if;
 if length(trim(p_first)) not between 1 and 50 or length(trim(p_last)) not between 1 and 50 or length(coalesce(p_player,''))>50 then raise exception 'Nom invalide';end if;
 perform pg_advisory_xact_lock(hashtext(p_team||':'||p_slot));
 if not exists(select 1 from public.bar_settings where team_id=p_team and event_date is not null) then raise exception 'Aucune date configurée';end if;
 select count(*) into n from public.bar_registrations where team_id=p_team and slot_id=p_slot;
 maxcount:=case when p_slot in ('09-12','12-15') then 4 else 3 end;
 if n>=maxcount then raise exception 'COMPLET';end if;
 insert into public.bar_registrations(team_id,slot_id,first_name,last_name,player_name) values(p_team,p_slot,trim(p_first),trim(p_last),trim(coalesce(p_player,''))) returning id into new_id;
 return new_id;
end;$$;
create or replace function public.bar_add_reserve(p_team text,p_first text,p_last text,p_player text,p_slots text[]) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if not public.bar_valid_team(p_team) then raise exception 'Équipe inconnue';end if;
 if not exists(select 1 from public.bar_settings where team_id=p_team and event_date is not null) then raise exception 'Aucune date configurée';end if;
 if length(trim(p_first)) not between 1 and 50 or length(trim(p_last)) not between 1 and 50 or length(coalesce(p_player,''))>50 then raise exception 'Nom invalide';end if;
 if coalesce(array_length(p_slots,1),0)<1 or exists(select 1 from unnest(p_slots) s where s not in('09-12','12-15','15-18','18-fin')) then raise exception 'Créneaux invalides';end if;
 insert into public.bar_reserves(team_id,first_name,last_name,player_name,slots) values(p_team,trim(p_first),trim(p_last),trim(coalesce(p_player,'')),p_slots) returning id into new_id;
 return new_id;
end;$$;
create or replace function public.bar_admin_set_date(p_team text,p_password text,p_date date) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.bar_check_admin(p_password) then raise exception 'Accès refusé';end if;
 if not public.bar_valid_team(p_team) then raise exception 'Équipe inconnue';end if;
 insert into public.bar_settings(team_id,event_date) values(p_team,p_date) on conflict(team_id) do update set event_date=excluded.event_date;
end;$$;
create or replace function public.bar_admin_delete(p_team text,p_password text,p_kind text,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.bar_check_admin(p_password) then raise exception 'Accès refusé';end if;
 if not public.bar_valid_team(p_team) then raise exception 'Équipe inconnue';end if;
 if p_kind='registration' then delete from public.bar_registrations where id=p_id and team_id=p_team;
 elsif p_kind='reserve' then delete from public.bar_reserves where id=p_id and team_id=p_team;
 else raise exception 'Type inconnu';end if;
end;$$;
revoke all on function public.bar_valid_team(text),public.bar_check_admin(text),public.bar_get_planning(text),public.bar_register(text,text,text,text,text),public.bar_add_reserve(text,text,text,text,text[]),public.bar_admin_set_date(text,text,date),public.bar_admin_delete(text,text,text,uuid) from public;
grant execute on function public.bar_check_admin(text),public.bar_get_planning(text),public.bar_register(text,text,text,text,text),public.bar_add_reserve(text,text,text,text,text[]),public.bar_admin_set_date(text,text,date),public.bar_admin_delete(text,text,text,uuid) to anon,authenticated;
