create or replace view public.v_pdb_membrane_records_compat as
with
txt as (select * from public.entry_uniprot_predictions where model_version like 'text_%'),
img as (select * from public.entry_uniprot_predictions where model_version like 'image_%')
select
  e.pdb_id,
  u.accession_id as uniprot_id,
  e.title,
  e.release_date,
  null::date as deposition_date,
  e.experimental_method,
  e.resolution,
  e.pubmed_id,
  p.doi,
  p.journal,
  p.volume as journal_volume,
  p.page_first,
  p.page_last,
  p.year,
  p.citation_title as citationtitle,
  null::text as taxonomy,
  u.length as sequence_length,
  u.tm_segments as num_tm_segments,
  uc.classification,
  array[txt1.subgroup[1], img1.subgroup[1]] as subgroup,
  array[txt1.subgroup_prob[1], img1.subgroup_prob[1]] as subgroupscore,
  coalesce(txt1.is_membrane, img1.is_membrane) as is_membrane,
  coalesce(txt1.is_membrane_prob, img1.is_membrane_prob) as is_membrane_prob,
  n.status,
  n.memo,
  coalesce(txt1.model_version, img1.model_version) as model_version,
  now() as updated_at
from public.pdb_entry e
join public.entry_uniprot_ref x on x.entry_id = e.id
join public.uniprot u          on u.id = x.uniprot_id
left join public.uniprot_classification uc on uc.accession_id = u.accession_id
left join public.pubmed p                  on p.pubmed_id = e.pubmed_id
left join lateral (
  select t.* from txt t
  where t.entry_id = e.id and t.uniprot_id = u.id
  order by t.lastupdate desc limit 1
) txt1 on true
left join lateral (
  select i.* from img i
  where i.entry_id = e.id and i.uniprot_id = u.id
  order by i.lastupdate desc limit 1
) img1 on true
left join public.note n
  on n.pubmed_id = e.pubmed_id and n.pdb_id = e.pdb_id;
