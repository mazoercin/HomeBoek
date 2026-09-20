-- ============================================================
-- Sleepbare dashboard-kaarten: de volgorde van de (herschikbare)
-- secties wordt per huishouden bewaard, gedeeld door alle leden.
--
-- Een gewone UPDATE-policy op households staat enkel de eigenaar toe
-- (households_update_owner, zie 0018_huishoudens.sql) — bewust, want
-- naam/valuta horen enkel door de eigenaar gewijzigd te worden. De
-- dashboard-volgorde mag wél door editors aangepast worden (het is
-- geen instelling, eerder gewoon "waar staat wat"), dus dat gaat via
-- een eigen SECURITY DEFINER-functie met haar eigen can_edit-check —
-- zelfde patroon als herschik_doelen() in 0004_herschik_doelen.sql.
-- ============================================================

begin;

alter table households add column if not exists dashboard_kaart_volgorde text[];

create or replace function zet_dashboard_volgorde(p_household_id uuid, p_volgorde text[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.can_edit(p_household_id) then
    raise exception 'Geen toegang tot dit huishouden.';
  end if;

  update households set dashboard_kaart_volgorde = p_volgorde where id = p_household_id;
end;
$$;

revoke all on function zet_dashboard_volgorde(uuid, text[]) from public;
grant execute on function zet_dashboard_volgorde(uuid, text[]) to authenticated;

commit;
