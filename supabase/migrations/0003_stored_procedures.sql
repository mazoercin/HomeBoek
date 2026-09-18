-- ============================================================
-- Stored procedures voor dagelijkse dashboard-mutaties.
--
-- Waarom deze bestaan naast gewone insert/update/delete-calls:
-- 1) Eén duidelijke, benoemde plek per bedrijfsregel (bv. "wat betekent
--    het om een kost als betaald te markeren?") in plaats van die
--    logica te verspreiden over TypeScript-server-actions.
-- 2) Input-validatie (bv. het "YYYY-MM"-maandformaat) gebeurt hier
--    ÉÉN keer, in de database zelf — ongeacht welke client ooit nog
--    aanroept (web nu, later evt. mobiel/CLI).
-- 3) Uitbreidbaar: nieuwe functies volgen hetzelfde patroon
--    (werkwoord_onderwerp, expliciete parameters, korte doc-comment).
--
-- Naamgevingsconventie: <werkwoord>_<onderwerp>(parameters), in het
-- Nederlands, consistent met de rest van het schema.
-- ============================================================

-- ------------------------------------------------------------
-- zet_vaste_kost_betaald
-- Markeert een vaste kost als (niet-)betaald voor één specifieke
-- maand. Gebruikt upsert-semantiek: de eerste keer dat een maand
-- wordt aangeraakt, ontstaat de rij; nadien wordt ze bijgewerkt.
-- ------------------------------------------------------------
create or replace function zet_vaste_kost_betaald(
  p_vaste_kost_id uuid,
  p_maand text,
  p_betaald boolean
)
returns void as $$
begin
  if p_maand !~ '^\d{4}-\d{2}$' then
    raise exception 'Ongeldig maandformaat: % (verwacht YYYY-MM)', p_maand;
  end if;

  insert into vaste_kosten_betaald (vaste_kost_id, maand, betaald)
  values (p_vaste_kost_id, p_maand, p_betaald)
  on conflict (vaste_kost_id, maand)
  do update set betaald = excluded.betaald;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- zet_factuur_betaald
-- Zelfde gedrag als zet_vaste_kost_betaald, maar voor facturen —
-- bewust een aparte functie (geen generieke tabelnaam-parameter),
-- zodat SQL-injectie via een dynamische tabelnaam structureel
-- onmogelijk is en elke functie type-veilig blijft.
-- ------------------------------------------------------------
create or replace function zet_factuur_betaald(
  p_factuur_id uuid,
  p_maand text,
  p_betaald boolean
)
returns void as $$
begin
  if p_maand !~ '^\d{4}-\d{2}$' then
    raise exception 'Ongeldig maandformaat: % (verwacht YYYY-MM)', p_maand;
  end if;

  insert into facturen_betaald (factuur_id, maand, betaald)
  values (p_factuur_id, p_maand, p_betaald)
  on conflict (factuur_id, maand)
  do update set betaald = excluded.betaald;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- zet_extra_uitgave_geskipt
-- Registreert (p_geskipt = true) of verwijdert (p_geskipt = false)
-- de "deze maand overgeslagen"-status van een extra/variabele
-- uitgave. Dit is de databaseknop achter zowel de "Wat als?"-
-- toepassen-actie als de automatische tekort-voorstellen.
-- ------------------------------------------------------------
create or replace function zet_extra_uitgave_geskipt(
  p_extra_uitgave_id uuid,
  p_maand text,
  p_geskipt boolean
)
returns void as $$
begin
  if p_maand !~ '^\d{4}-\d{2}$' then
    raise exception 'Ongeldig maandformaat: % (verwacht YYYY-MM)', p_maand;
  end if;

  if p_geskipt then
    insert into geskipte_uitgaven (extra_uitgave_id, maand)
    values (p_extra_uitgave_id, p_maand)
    on conflict (extra_uitgave_id, maand) do nothing;
  else
    delete from geskipte_uitgaven
    where extra_uitgave_id = p_extra_uitgave_id and maand = p_maand;
  end if;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- verplaats_doel_prioriteit
-- Wisselt de prioriteit van twee doelen atomisch om (drag & drop op
-- het dashboard doet één omwisseling per sleep-actie). Atomisch via
-- deze functie voorkomt dat twee doelen tijdelijk dezelfde
-- prioriteitswaarde delen bij een gedeeltelijke fout.
-- ------------------------------------------------------------
create or replace function verplaats_doel_prioriteit(
  p_doel_id_a uuid,
  p_prioriteit_a integer,
  p_doel_id_b uuid,
  p_prioriteit_b integer
)
returns void as $$
begin
  update doelen set prioriteit = p_prioriteit_a where id = p_doel_id_a;
  update doelen set prioriteit = p_prioriteit_b where id = p_doel_id_b;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- bereken_reeds_gespaard_voor_doel
-- Leesfunctie: hoeveel is er (bij benadering) al gespaard voor een
-- doel, uitgaande van volledig-verstreken-maanden sinds aanmaak ×
-- het maandelijks bedrag. Een gepauzeerd doel spaart niet verder.
-- Bestaat als SQL-functie zodat toekomstige rapportage-queries
-- (bv. een overzicht van alle doelen) dezelfde logica hergebruiken
-- zonder ze in elke query te herhalen.
-- ------------------------------------------------------------
create or replace function bereken_reeds_gespaard_voor_doel(p_doel_id uuid)
returns numeric as $$
declare
  v_doel doelen%rowtype;
  v_maanden_verschil integer;
begin
  select * into v_doel from doelen where id = p_doel_id;

  if not found or v_doel.gepauzeerd then
    return 0;
  end if;

  v_maanden_verschil := greatest(
    0,
    (extract(year from now())::integer - extract(year from v_doel.created_at)::integer) * 12
      + (extract(month from now())::integer - extract(month from v_doel.created_at)::integer)
  );

  return v_maanden_verschil * v_doel.maandelijks_bedrag;
end;
$$ language plpgsql stable;
