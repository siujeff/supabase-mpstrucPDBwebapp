import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient'
import StructureViewerInline from './StructureViewerInline.jsx';

function formatPredictions(subgroup, subgroupscore) {
  const groups = Array.isArray(subgroup)
    ? subgroup
    : subgroup != null && subgroup !== ""
    ? [subgroup]
    : [];

  const scores = Array.isArray(subgroupscore)
    ? subgroupscore
    : subgroupscore != null && subgroupscore !== ""
    ? [subgroupscore]
    : [];

  const n = Math.max(groups.length, scores.length);
  const out = [];

  for (let i = 0; i < n; i++) {
    const g = (groups[i] ?? groups[0] ?? "").toString().trim();
    const raw = scores[i];

    let pctText = "";
    if (raw !== undefined && raw !== null && raw !== "") {
      const num = Number(raw);
      if (!Number.isNaN(num)) {
        const pct = num <= 1 ? num * 100 : num; // 0–1 → %
        pctText = ` (${pct.toFixed(1)}%)`;
      }
    }

    if (g || pctText) out.push(`${g}${pctText}`);
  }

  return out;
}

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleGroups, setVisibleGroups] = useState({})
  const [filterstatus, setFilterstatus] = useState('__ALL__')
  const [sortDesc, setSortDesc] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const correctPassword = process.env.REACT_APP_PROTECT_PASS
  const [searchPdb, setSearchPdb] = useState('');
  const [filterPdb, setFilterPdb] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [editedMetadata, setEditedMetadata] = useState({});
  const primaryThumbByPubmed = useRef({});

  useEffect(() => {
    fetchData()
  }, [])

	async function fetchData() {
	  const { data: rows, error } = await supabase
		.from('v_pdb_membrane_records_compat')
		.select(`
		  pdb_id,
		  title,
		  release_date,
		  experimental_method,
		  resolution,
		  pubmed_id,
		  doi,
		  journal,
		  journal_volume,
		  page_first,
		  page_last,
		  year,
		  taxonomy,
		  sequence_length,
		  num_tm_segments,
		  uniprot_id,
		  classification,
		  status,
		  memo,
		  citationtitle,
		  subgroup,
		  subgroupscore
		`)
		.order('release_date', { ascending: false });

	  if (error) {
		console.error('Fetch error:', error);
		setData([]);
	  } else {
		// If you want to see everything while debugging, don’t filter yet:
		// setData(rows || []);
		// If you really want to hide rows missing pmid, keep this:
		setData((rows || []).filter(r => r.pubmed_id));
		console.log('Fetched rows:', (rows || []).length);
	  }
	  setLoading(false);
	}


	async function updateGroup(pubmedId, newstatus, newMemo) {
	  // collect all PDBs under this PubMed group currently loaded
	  const entriesToUpdate = data.filter(entry => entry.pubmed_id === pubmedId);

	  // Build an upsert payload into the NOTE table
	  const payload = entriesToUpdate.map(e => ({
		pubmed_id: e.pubmed_id,
		pdb_id: e.pdb_id,
		status: newstatus ?? e.status ?? null,
		memo: (newMemo ?? e.memo ?? '').toString(),
	  }));

	  // Upsert by composite key
	  const { error } = await supabase
		.from('note')
		.upsert(payload, { onConflict: 'pubmed_id,pdb_id' });

	  if (error) {
		console.error('Note upsert error:', error);
		alert('❌ Failed to save note/status. See console for details.');
		return;
	  }

	  // Refresh the view
	  fetchData();
	}


  function exportToCSV() {
    const header = ["PDB_ID", "status", "memo", "Title", "Release Date", "Deposition Date", "Experimental Method", "Resolution", "PubMed ID", "DOI", "Journal", "Journal Volume", "Page First", "Page Last", "Year", "Taxonomy", "Sequence Length", "Num TM Segments", "UniProt ID", "Classification"]
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.release_date)
      const dateB = new Date(b.release_date)
      return sortDesc ? dateB - dateA : dateA - dateB
    })

    const rows = sortedData.map(row => [
      row.pdb_id,
      row.status || "",
      row.memo || "",
      row.title || "",
      row.release_date || "",
      row.deposition_date || "",
      row.experimental_method || "",
      row.resolution || "",
      row.pubmed_id || "",
      row.doi || "",
      row.journal || "",
      row.journal_volume || "",
      row.page_first || "",
      row.page_last || "",
      row.year || "",
      row.taxonomy || "",
      row.sequence_length || "",
      row.num_tm_segments || "",
      row.uniprot_id || "",
      row.classification || ""
    ])

    const csvContent = [header, ...rows]
      .map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "pdb_membrane_export.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!authorized) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', fontFamily: 'Arial' }}>
        <h2>🔐 Protected App</h2>
        <input
          type="password"
          placeholder="Enter password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <br /><br />
        <button
          style={{ padding: '10px 20px', fontSize: '16px' }}
          onClick={() => {
            if (passwordInput === correctPassword) {
              setAuthorized(true)
            } else {
              alert('❌ Incorrect password')
            }
          }}
        >
          Unlock
        </button>
      </div>
    )
  }

  if (loading) return <p style={{ padding: 20 }}>Loading data...</p>

  const grouped = data.reduce((acc, item) => {
    if (!acc[item.pubmed_id]) acc[item.pubmed_id] = []
    acc[item.pubmed_id].push(item)
    return acc
  }, {})

  // The rest of your rendering logic stays the same...

return (
  <div style={{ padding: 20, fontFamily: 'Arial', maxWidth: 1200, margin: '0 auto' }}>
    {/* Header + controls */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1>🧬 mpstruc Data Browser</h1>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label htmlFor="statusFilter" style={{ marginRight: 6 }}>Filter by IsMembraneProtein:</label>
        <select
          id="statusFilter"
          value={filterstatus}
          onChange={(e) => setFilterstatus(e.target.value)}
        >
          <option value="__ALL__">(All)</option>
          <option value="__EMPTY__">(Blank)</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
          <option value="Maybe">Maybe</option>
          <option value="Already in">Already in</option>
          <option value="Pubmed ready">Pubmed ready</option>
          <option value="Ready for yes">Ready for yes</option>
        </select>

        <button onClick={() => setSortDesc((p) => !p)}>
          Sort: {sortDesc ? 'Newest First' : 'Oldest First'}
        </button>

        <input
          type="text"
          placeholder="Search PDB ID"
          value={searchPdb}
          onChange={(e) => setSearchPdb(e.target.value)}
          style={{ padding: 6, fontSize: '1rem' }}
        />
        <button onClick={() => setFilterPdb(searchPdb)} style={{ padding: '6px 12px' }}>
          🔍 Search
        </button>

        <button onClick={exportToCSV}>🟩 Export to CSV</button>
      </div>
    </div>

    {/* Cards */}
    {Object.entries(grouped)
      .sort((a, b) => {
        const dateA = new Date(a[1][0]?.release_date);
        const dateB = new Date(b[1][0]?.release_date);
        return sortDesc ? dateB - dateA : dateA - dateB;
      })
      .map(([pubmed, group]) => {
        const first = group[0];
	    const idLower = first.pdb_id?.toLowerCase();
	    const modelThumb = `https://cdn.rcsb.org/images/structures/${idLower}_model-1.jpeg`;

        // filtering
        const filtered = group.filter((row) => {
		  const status = (row.status || '').trim().toLowerCase();
		  const filter = filterstatus.trim().toLowerCase();
		  if (filter === '__all__') return true;
		  if (filter === '__empty__') return status === '';
		  return status === filter;
		});
        if (filterPdb && !group.some((r) => r.pdb_id.toLowerCase().includes(filterPdb.toLowerCase()))) return null;
        if (filtered.length === 0) return null;

        // computed displays
        const releaseDates = [...new Set(group.map((e) => e.release_date).filter(Boolean))].join(', ');
        const classifications = [...new Set(group.map((e) => e.classification).filter(Boolean))]
          .sort((x, y) => ['Multi-Pass', 'Single-Pass', 'Peripheral', 'non-membrane'].indexOf(x) - ['Multi-Pass', 'Single-Pass', 'Peripheral', 'non-membrane'].indexOf(y))
          .join(', ');

        const expanded = visibleGroups[pubmed];
		
		if (!primaryThumbByPubmed.current[pubmed]) {
		  primaryThumbByPubmed.current[pubmed] = group[0]?.pdb_id || '';
		}
		const primaryPdbId = primaryThumbByPubmed.current[pubmed];
		
        return (
          <div key={pubmed} style={{ border: '1px solid #ccc', marginBottom: 20, padding: 10 }}>
            {/* ROW: left details + right viewer */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12
              }}
            >
              {/* LEFT COLUMN */}
              <div style={{ flex: '1 1 560px', minWidth: 420 }}>
                <p><strong>PubMed Group:</strong>{' '}
                  <a href={`https://www.ncbi.nlm.nih.gov/pubmed/?term=${first.pubmed_id}`} target="_blank" rel="noopener noreferrer">
                    {first.pubmed_id}
                  </a>
                </p>

                <p>
                  <strong>Journal:</strong><br />
                  <span>
                    ({first.year || 'N/A'}) {first.journal || 'N/A'} {first.journal_volume || ' '}:{' '}
                    {first.page_first || ' '}
                    {first.page_first !== first.page_last && <> - {first.page_last || ' '}</>}
                  </span>
                  <br />
                  {first.citationtitle && <div><em style={{ color: '#555' }}>{first.citationtitle}</em></div>}
                  {first.doi && (
                    <a href={`https://doi.org/${first.doi}`} target="_blank" rel="noopener noreferrer">
                      https://doi.org/{first.doi}
                    </a>
                  )}
                </p>

                <p><strong>Title:</strong> {first.title || 'N/A'}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <strong style={{ marginRight: 6 }}>PDB IDs:</strong>
                  {[...new Set(group.map((e) => e.pdb_id))].map((pdb) => (
                    <a key={pdb} href={`https://www.rcsb.org/structure/${pdb}`} target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>
                      {pdb}
                    </a>
                  ))}
                </div>

                <p><strong>Release Date(s):</strong> {releaseDates}</p>
                <p><strong>Taxonomy:</strong> {Array.isArray(first.taxonomy)
				  ? (first.taxonomy.length ? first.taxonomy.join(', ') : 'N/A')
				  : (first.taxonomy || 'N/A')}</p>
                <p><strong>Resolution:</strong> {first.resolution ? `${first.resolution} Å` : 'N/A'}</p>

                <p><strong>UniProt ID(s):</strong>{' '}
                  {[...new Set(group.map((e) => e.uniprot_id))].map((id, i, arr) => (
                    <span key={id}>
                      <a href={`https://www.uniprot.org/uniprotkb/${id}`} target="_blank" rel="noopener noreferrer">{id}</a>
                      {i < arr.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>

                <p><strong>Classification(s):</strong> {classifications}</p>

                <p>
                  <a href={`https://www.rcsb.org/structure/${first.pdb_id}`} target="_blank" rel="noopener noreferrer">🔗 PDB Link</a> |{' '}
                  <a href={`https://www.ncbi.nlm.nih.gov/pubmed/?term=${first.pubmed_id}`} target="_blank" rel="noopener noreferrer">📄 PubMed Link</a> |{' '}
                  <a href={`https://www.uniprot.org/uniprotkb/${first.uniprot_id}`} target="_blank" rel="noopener noreferrer">🔗 UniProt Link</a>
                </p>

				{(() => {
				  // Normalize arrays				  
				  const groups = Array.isArray(first.subgroup)
					? first.subgroup
					: first.subgroup != null && first.subgroup !== ""
					? [first.subgroup]
					: [];

				  const scores = Array.isArray(first.subgroupscore)
					? first.subgroupscore
					: first.subgroupscore != null && first.subgroupscore !== ""
					? [first.subgroupscore]
					: [];

				  const maxN = Math.max(groups.length, scores.length);
				  if (maxN === 0) return null;

				  // Label order: 0 = Text model (title classifier), 1 = Image model (static image)
				  const modelNames = ["Text model on title", "Image model on 2D"];

				  const rows = [];
				  for (let i = 0; i < maxN; i++) {
					const label = modelNames[i] || `Model ${i + 1}`;

					const candidate = Array.isArray(groups) ? groups[i] : undefined;
					const fallback  = groups.length ? groups[0] : "";
					const cls = (candidate ?? fallback) || "";

					const raw = Array.isArray(scores) ? scores[i] : undefined;
					let pctText = "";
					if (raw !== undefined && raw !== null && raw !== "") {
					  const num = Number(raw);
					  if (!Number.isNaN(num)) {
						const pct = num <= 1 ? num * 100 : num; // 0–1 → %
						pctText = `${pct.toFixed(2)}%`;
					  }
					}

					rows.push({ label, cls, pctText });
				  }

				  return (
					<div style={{ marginTop: 6 }}>
					  <div style={{ fontWeight: 700, marginBottom: 4 }}>Predictions</div>
					  <div>
						{rows.map((r, idx) => (
						  <div key={idx} style={{ margin: '2px 0' }}>
							<em>{r.label}:</em>{' '}
							<span>{r.cls || '—'}</span>
							{r.pctText && <> — <span>{r.pctText}</span></>}
						  </div>
						))}
					  </div>
					</div>
				  );
				})()}


                {/* Status / Metadata / Memo row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <label htmlFor={`status-${pubmed}`}>IsMembraneProtein:</label>
                  <select
                    id={`status-${pubmed}`}
                    defaultValue={first.status || ''}
                    onChange={(e) => updateGroup(pubmed, e.target.value, first.memo)}
                  >
                    <option value="">(Blank)</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Maybe">Maybe</option>
                    <option value="Already in">Already in</option>
                    <option value="Pubmed ready">Pubmed ready</option>
                    <option value="Ready for yes">Ready for yes</option>
                  </select>

                  <button
                    style={{ marginLeft: 4 }}
                    onClick={() => {
                      setModalData(first);
                      const family = first.subgroup_family?.toLowerCase().includes('alpha')
                        ? 'ALPHA-HELICAL'
                        : first.subgroup_family?.toLowerCase().includes('beta')
                        ? 'BETA-BARREL'
                        : first.subgroup_family?.toLowerCase().includes('monotopic')
                        ? 'MONOTOPIC'
                        : '';
                      const subfamily = Array.isArray(first.subgroup) ? first.subgroup[0] : '';
                      const organism = first.rcsb_entity_source_organism?.[0]?.scientific_name || first.organism || '';
                      const expressed_in = first.pdbx_host_org_scientific_name || first.expressed_in || '';
                      const species = first.ncbi_scientific_name || first.species || '';
                      const taxonomy = first.ncbi_parent_scientific_name || first.taxonomy || '';
                      setEditedMetadata({ ...first, family, subfamily, organism, expressed_in, species, taxonomy });
                      setShowModal(true);
                    }}
                  >
                    🧾 Metadata
                  </button>
				  <div style={{ flexBasis: '100%' }} />
                  <div style={{
					  display: 'flex',
					  alignItems: 'center',
					  gap: 8,
					  flexBasis: '100%',    // or width: '100%'
					  justifyContent: 'flex-start',
					  marginTop: 4
					}}>
					  <label htmlFor={`memo-${pubmed}`} style={{ margin: 0 }}>Memo:</label>
					  <input
						id={`memo-${pubmed}`}
						defaultValue={first.memo || ''}
						onBlur={(e) => updateGroup(pubmed, first.status, e.target.value)}
						style={{ width: 320 }}
					  />
					</div>
                </div>
              </div>

              {/* RIGHT COLUMN: sticky viewer card */}
              <div
                style={{
                  flex: '0 0 300px',
                  marginLeft: 16,
                  alignSelf: 'flex-start',
                  position: 'sticky',
                  top: 12,
                  zIndex: 1
                }}
              >
                <div style={{ border: '1px solid #e6e6e6', borderRadius: 12, padding: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
					<StructureViewerInline
					  key={first.pdb_id}
					  pdbId={first.pdb_id}
					  thumbUrl={modelThumb}      // prefer model-1.jpeg
					  canExpand={group.length > 1}
					  onExpand={() =>
						setVisibleGroups(prev => ({ ...prev, [pubmed]: !expanded }))
					  }
					/>
                </div>
              </div>
            </div>

            {/* Expanded rows */}
            {expanded && group.map((row) => (
              <div
                key={row.pdb_id}
                style={{ marginTop: 15, borderTop: '1px solid #ddd', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}
              >
                <div style={{ flex: '1 1 520px' }}>
                  <p><strong>PDB ID:</strong> {row.pdb_id}</p>
                  <p><strong>Title:</strong> {row.title}</p>
                  <p><strong>Release Date:</strong> {row.release_date || 'N/A'}</p>
                  <p><strong>Taxonomy:</strong> {row.taxonomy || 'N/A'}</p>
                  <p><strong>Resolution:</strong> {row.resolution || 'N/A'}</p>
                  <p><strong>UniProt:</strong> <a href={`https://www.uniprot.org/uniprotkb/${row.uniprot_id}`} target="_blank" rel="noopener noreferrer">{row.uniprot_id}</a></p>
                  <p><strong>Classification:</strong> {row.classification || 'N/A'}</p>
                  <p>
                    <a href={`https://www.rcsb.org/structure/${row.pdb_id}`} target="_blank" rel="noopener noreferrer">🔗 PDB Link</a> |{' '}
                    <a href={`https://www.ncbi.nlm.nih.gov/pubmed/?term=${row.pubmed_id}`} target="_blank" rel="noopener noreferrer">📄 PubMed Link</a> |{' '}
                    <a href={`https://www.uniprot.org/uniprotkb/${row.uniprot_id}`} target="_blank" rel="noopener noreferrer">🔗 UniProt Link</a>
                  </p>
                </div>
                <img
                  src={`https://cdn.rcsb.org/images/structures/${row.pdb_id?.toLowerCase()}_assembly-1.jpeg`}
                  alt={`PDB ${row.pdb_id}`}
                  style={{ width: 280, border: '1px solid #ccc' }}
                  onError={(e) => (e.target.style.display = 'none')}
                />
              </div>
            ))}
          </div>
        );
      })}

    {/* Modal lives AFTER the map */}
    {showModal && modalData && (
      <>
        <div
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999
          }}
          onClick={() => setShowModal(false)}
        />
        <div
          style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff', padding: 20, border: '1px solid #ccc',
            zIndex: 10000, width: '90%', maxWidth: 600, boxShadow: '0 0 10px rgba(0,0,0,0.3)',
            fontFamily: 'Arial'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2>📄 Edit Entry Metadata</h2>

          <p><strong>PDB ID:</strong> {modalData.pdb_id}</p>

          <p><strong>Title:</strong><br />
            <textarea
              style={{ width: '100%' }}
              value={editedMetadata.title || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, title: e.target.value })}
            />
          </p>

          <p><strong>Source Organism (Species):</strong><br />
            <input
              style={{ width: '100%' }}
              value={editedMetadata.organism || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, organism: e.target.value })}
            />
          </p>

          <p><strong>Taxonomic Domain:</strong><br />
            <input
              style={{ width: '100%' }}
              value={editedMetadata.taxonomy || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, taxonomy: e.target.value })}
            />
          </p>

          <p><strong>Expressed In Species:</strong><br />
            <input
              style={{ width: '100%' }}
              value={editedMetadata.expressed_in || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, expressed_in: e.target.value })}
            />
          </p>

          <p><strong>Species:</strong><br />
            <input
              style={{ width: '100%' }}
              value={editedMetadata.species || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, species: e.target.value })}
            />
          </p>

          <p><strong>Resolution:</strong><br />
            <input
              style={{ width: '100%' }}
              value={editedMetadata.resolution || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, resolution: e.target.value })}
            />
          </p>

          <p><strong>Description:</strong><br />
            <textarea
              rows={2}
              style={{ width: '100%' }}
              value={editedMetadata.citationtitle || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, citationtitle: e.target.value })}
            />
          </p>

          <p><strong>Family:</strong><br />
            <input
              style={{ width: '100%' }}
              value={editedMetadata.family || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, family: e.target.value })}
            />
          </p>

          <p><strong>Subfamily:</strong><br />
            <input
              style={{ width: '100%' }}
              value={editedMetadata.subfamily || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, subfamily: e.target.value })}
            />
          </p>

          <p><strong>Bibliography:</strong><br />
            <input
              style={{ width: '100%' }}
              value={editedMetadata.bibliography || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, bibliography: e.target.value })}
            />
          </p>

          <p><strong>Family Master:</strong><br />
            <input
              style={{ width: '100%' }}
              value={editedMetadata.familymaster || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, familymaster: e.target.value })}
            />
          </p>

          <div style={{ textAlign: 'right', marginTop: '1rem' }}>
            <button
              onClick={() => {
                console.log('Saved Metadata:', editedMetadata);
                setShowModal(false);
              }}
              style={{ padding: '6px 12px', marginRight: 10 }}
            >
              Save Changes
            </button>
            <button onClick={() => setShowModal(false)} style={{ padding: '6px 12px' }}>
              Cancel
            </button>
          </div>
        </div>
      </>
    )}
  </div>
);

}
export default App;
