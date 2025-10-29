begin;

-- classification table (curated, 1 row per accession_id)
create table if not exists public.uniprot_classification (
  accession_id text primary key references public.uniprot(accession_id) on delete cascade,
  classification text null check (classification in ('Inner-Membrane','Outer-Membrane','Multi-Pass','Single-Pass','Peripheral','non-membrane')),
  lastupdate timestamptz default now()
);

-- helpful indexes for predictions
create index if not exists idx_eup_modelver on public.entry_uniprot_predictions(model_version);
create index if not exists idx_eup_family on public.entry_uniprot_predictions(entry_id, uniprot_id, lastupdate desc)
  include (model_version, is_membrane, is_membrane_prob, subgroup, subgroup_prob);

commit;
