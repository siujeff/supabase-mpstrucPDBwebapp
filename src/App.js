import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

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

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data, error } = await supabase
      .from('pdb_membrane_records')
      .select('pdb_id, title, release_date, deposition_date, experimental_method, resolution, pubmed_id, doi, journal_volume, page_first, page_last, journal, year, taxonomy, sequence_length, num_tm_segments, uniprot_id, classification, status, memo, citationtitle, subgroup, subgroupscore')
	  .order('release_date', { ascending: false })

    if (error) {
      console.error('Fetch error:', error)
    } else {
      // Filter out records without a pubmed_id
      setData(data.filter(record => record.pubmed_id))
    }

    setLoading(false)
  }

  async function updateGroup(pubmedId, newstatus, newMemo) {
    const entriesToUpdate = data.filter(entry => entry.pubmed_id === pubmedId)
    for (let entry of entriesToUpdate) {
      await supabase
        .from('pdb_membrane_records')
        .update({ status: newstatus, memo: newMemo })
        .eq('pdb_id', entry.pdb_id)
    }
    fetchData()
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
	
	// --- Helpers for new array-based predictions ---
	function toPct(val) {
	  const n = Number(val);
	  if (!isFinite(n)) return "N/A";
	  return `${(n * 100).toFixed(2)}%`;
	}

	function splitPredictions(subgroup, subgroupscore) {
	  // Normalize into two "channels": text (0) and image (1)
	  const sg = Array.isArray(subgroup) ? subgroup : [subgroup, null];
	  const sc = Array.isArray(subgroupscore) ? subgroupscore : [subgroupscore, null];
	  return {
		text: { label: sg[0] ?? null, score: sc[0] ?? null },
		image: { label: sg[1] ?? null, score: sc[1] ?? null },
	  };
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
    <div style={{ padding: 20, fontFamily: 'Arial', maxWidth: '1200px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🧬 mpstruc Data Browser</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label>
            Filter by Status:
            <select value={filterstatus} onChange={(e) => setFilterstatus(e.target.value)}>
              <option value="__ALL__">(All)</option>
              <option value="__EMPTY__">(Blank)</option>
			  <option value="Yes">Yes</option>
			  <option value="No">No</option>
			  <option value="Maybe">Maybe</option>
			  <option value="Already in">Already in</option>
			  <option value="Pubmed ready">Pubmed ready</option>
			  <option value="Ready for yes">Ready for yes</option>
            </select>

<button
  style={{ marginLeft: '10px' }}
  onClick={() => {
    console.log('Clicked metadata button');
  }}
>
  🧾 Metadata
</button>
          </label>
          <button onClick={() => setSortDesc(prev => !prev)}>
            Sort: {sortDesc ? 'Newest First' : 'Oldest First'}
          </button>

          
<input
  type="text"
  placeholder="Search PDB ID"
  value={searchPdb}
  onChange={(e) => setSearchPdb(e.target.value)}
  style={{ padding: '6px', fontSize: '1rem' }}
/>
<button onClick={() => setFilterPdb(searchPdb)} style={{ padding: '6px 12px' }}>
  🔍 Search
</button>

          <button onClick={exportToCSV}>🟩 Export to CSV</button>
        </div>
      </div>

      {Object.entries(grouped)
        .sort((a, b) => {
          const dateA = new Date(a[1][0]?.release_date)
          const dateB = new Date(b[1][0]?.release_date)
          return sortDesc ? dateB - dateA : dateA - dateB
        })
        .map(([pubmed, group]) => {
          const first = group[0]
          const filtered = group.filter(row => {
            const status = (row.status || '').trim().toLowerCase()
            const filter = filterstatus.trim().toLowerCase()
            if (filter === '__all__') return true
            if (filter === '__empty__') return status === ''
            return status === filter
          })
          
          if (filterPdb && !group.some(row => row.pdb_id.toLowerCase().includes(filterPdb.toLowerCase()))) return null

          if (filtered.length === 0) return null

          const releaseDates = [...new Set(group.map(e => e.release_date).filter(Boolean))].join(', ')
          const classifications = [...new Set(group.map(e => e.classification).filter(Boolean))]
            .sort((a, b) => {
              const order = ['Multi-Pass', 'Single-Pass', 'Peripheral', 'non-membrane']
              return order.indexOf(a) - order.indexOf(b)
            })
            .join(', ')
          const expanded = visibleGroups[pubmed]

          return (
            <div key={pubmed} style={{ border: '1px solid #ccc', marginBottom: 20, padding: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <p><strong>PubMed Group:</strong>{' '}
                    <a href={`https://www.ncbi.nlm.nih.gov/pubmed/?term=${first.pubmed_id}`} target="_blank" rel="noopener noreferrer">
                      {first.pubmed_id}
                    </a>
                  </p>
                  <p>
					  <strong>Journal:</strong><br />
					  {`(${first.year || 'N/A'}) ${first.journal || 'N/A'} ${first.journal_volume || ' '}: ${first.page_first || ' '}${first.page_first === first.page_last ? '' : ` - ${first.page_last || ' '}`}`}
					  <br />
					  	{first.CitationTitle && (
							  <div><em style={{ color: '#555' }}>{first.CitationTitle}</em></div>
						)}
						{first.doi && (
						  <>
							<a href={`https://doi.org/${first.doi}`} target="_blank" rel="noopener noreferrer">
							  https://doi.org/{first.doi}
							</a>
						  </>
						)}
					)}
                  </p>
                  <p><strong>Title:</strong> {first.title || 'N/A'}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <strong style={{ marginRight: '6px' }}>PDB IDs:</strong>
                    {[...new Set(group.map(e => e.pdb_id))].map(pdb => (
                      <a key={pdb} href={`https://www.rcsb.org/structure/${pdb}`} target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>
                        {pdb}
                      </a>
                    ))}
                  </div>

                  <p><strong>Release Date(s):</strong> {releaseDates}</p>
                  <p><strong>Taxonomy:</strong> {first.taxonomy || 'N/A'}</p>
                  <p><strong>Resolution:</strong> {first.resolution || 'N/A'}</p>

                  <p><strong>UniProt ID(s):</strong>{' '}
                    {[...new Set(group.map(e => e.uniprot_id))].map((id, i, arr) => (
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
				  
				{(first.subgroup || first.subgroupscore) && (() => {
				  const { text, image } = splitPredictions(first.subgroup, first.subgroupscore);
				  const hasAny = (text.label || text.score || image.label || image.score);
				  if (!hasAny) return null;
				  return (
					<div style={{ marginTop: '8px' }}>
					  <strong>Predictions</strong>
					  <div style={{ marginTop: '4px' }}>
						<div>
						  <em>Text model:</em>{" "}
						  {(text.label ?? "N/A")}{" "}
						  {text.score != null ? `— ${toPct(text.score)}` : ""}
						</div>
						<div>
						  <em>Image model:</em>{" "}
						  {(image.label ?? "N/A")}{" "}
						  {image.score != null ? `— ${toPct(image.score)}` : ""}
						</div>
					  </div>
					</div>
				  );
				})()}


                  <br />
                  <label>Status:
                    <select
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
  style={{ marginLeft: '10px' }}
	onClick={() => {
	  setModalData(first);

	  const family = first.subgroup_family?.toLowerCase().includes("alpha")
		? "ALPHA-HELICAL"
		: first.subgroup_family?.toLowerCase().includes("beta")
		? "BETA-BARREL"
		: first.subgroup_family?.toLowerCase().includes("monotopic")
		? "MONOTOPIC"
		: "";

	  const subfamily = Array.isArray(first.subgroup) ? first.subgroup[0] : "";

	  const organism = first.rcsb_entity_source_organism?.[0]?.scientific_name
		|| first.organism
		|| "";

	  const expressed_in = first.pdbx_host_org_scientific_name || first.expressed_in || "";

	  const species = first.ncbi_scientific_name || first.species || "";
	  const taxonomy = first.ncbi_parent_scientific_name || first.taxonomy || "";

	  setEditedMetadata({
		...first,
		family,
		subfamily,
		organism,
		expressed_in,
		species,
		taxonomy,
	  });

	  setShowModal(true);
	}}
>
  🧾 Metadata
</button>
                  </label>
                  <br />
                  <label>Memo:
                    <input
                      defaultValue={first.memo || ''}
                      onBlur={(e) => updateGroup(pubmed, first.status, e.target.value)}
                      style={{ width: '50%' }}
                    />
                  </label>
                </div>
                <img
                  src={`https://cdn.rcsb.org/images/structures/${first.pdb_id?.toLowerCase()}_assembly-1.jpeg`}
                  alt={`PDB ${first.pdb_id}`}
                  style={{
                    maxWidth: '220px',
                    width: '100%',
                    height: 'auto',
                    border: '1px solid #ccc',
                    objectFit: 'contain',
                    marginLeft: 'auto'
                  }}
                  onError={(e) => (e.target.style.display = 'none')}
                />
                {group.length > 1 && (
                  <button onClick={() => setVisibleGroups(prev => ({ ...prev, [pubmed]: !expanded }))}>
                    {expanded ? '▼ Collapse' : '▶ Expand'}
                  </button>
                )}
              </div>
              {expanded && group.map(row => (
                <div key={row.pdb_id} style={{ marginTop: 15, borderTop: '1px solid #ddd', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
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
					{(row.subgroup || row.subgroupscore) && (() => {
					const { text, image } = splitPredictions(row.subgroup, row.subgroupscore);
					const hasAny = (text.label || text.score || image.label || image.score);
					if (!hasAny) return null;
					return (
					  <div style={{ marginTop: '8px' }}>
						<strong>Predictions</strong>
						<div style={{ marginTop: '4px' }}>
						  <div>
							<em>Text model:</em>{" "}
							{text.label ?? "N/A"}{" "}
							{text.score != null ? `— ${toPct(text.score)}` : ""}
						  </div>
						  <div>
							<em>Image model:</em>{" "}
							{image.label ?? "N/A"}{" "}
							{image.score != null ? `— ${toPct(image.score)}` : ""}
						  </div>
						</div>
					  </div>
					);
				  })()}
                  </div>
                  <img
                    src={`https://cdn.rcsb.org/images/structures/${row.pdb_id?.toLowerCase()}_assembly-1.jpeg`}
                    alt={`PDB ${row.pdb_id}`}
                    style={{ width: '280px', border: '1px solid #ccc' }}
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                </div>
              ))}
            </div>
          )
        })}

      {showModal && modalData && (
		  <>
			{/* Backdrop */}
			<div style={{
			  position: 'fixed', top: 0, left: 0,
			  width: '100%', height: '100%',
			  backgroundColor: 'rgba(0, 0, 0, 0.5)',
			  zIndex: 9999
			}} onClick={() => setShowModal(false)} />

			{/* Modal */}
			<div style={{
			  position: 'fixed',
			  top: '50%',
			  left: '50%',
			  transform: 'translate(-50%, -50%)',
			  backgroundColor: '#fff',
			  padding: '20px',
			  border: '1px solid #ccc',
			  zIndex: 10000,
			  width: '90%',
			  maxWidth: '600px',
			  boxShadow: '0 0 10px rgba(0,0,0,0.3)',
			  fontFamily: 'Arial'
			}} onClick={(e) => e.stopPropagation()}>
			  <h2>📄 Edit Entry Metadata</h2>

			  <p><strong>PDB ID:</strong> {modalData.pdb_id}</p>

			  <p><strong>Title:</strong><br />
				<textarea style={{ width: '100%' }}
				  value={editedMetadata.title || ''}
				  onChange={(e) => setEditedMetadata({ ...editedMetadata, title: e.target.value })}
				/>
			  </p>

			  <p><strong>Source Organism (Species):</strong><br />
				<input style={{ width: '100%' }}
				  value={editedMetadata.organism || ''}
				  onChange={(e) => setEditedMetadata({ ...editedMetadata, organism: e.target.value })}
				/>
			  </p>

			  <p><strong>Taxonomic Domain:</strong><br />
				<input style={{ width: '100%' }}
				  value={editedMetadata.taxonomy || ''}
				  onChange={(e) => setEditedMetadata({ ...editedMetadata, taxonomy: e.target.value })}
				/>
			  </p>

			  <p><strong>Expressed In Species:</strong><br />
				<input style={{ width: '100%' }}
				  value={editedMetadata.expressed_in || ''}
				  onChange={(e) => setEditedMetadata({ ...editedMetadata, expressed_in: e.target.value })}
				/>
			  </p>
			  
			  <p><strong>Species:</strong><br />
				  <input style={{ width: '100%' }}
					value={editedMetadata.species || ''}
					onChange={(e) => setEditedMetadata({ ...editedMetadata, species: e.target.value })}
				  />
				</p>


			  <p><strong>Resolution:</strong><br />
				<input style={{ width: '100%' }}
				  value={editedMetadata.resolution || ''}
				  onChange={(e) => setEditedMetadata({ ...editedMetadata, resolution: e.target.value })}
				/>
			  </p>

			  <p><strong>Description:</strong><br />
				<textarea rows="2" style={{ width: '100%' }}
				  value={editedMetadata.citationtitle || ''}
				  onChange={(e) => setEditedMetadata({ ...editedMetadata, citationtitle: e.target.value })}
				/>
			  </p>

			  <p><strong>Family:</strong><br />
				<input style={{ width: '100%' }}
				  value={editedMetadata.family || ''}
				  onChange={(e) => setEditedMetadata({ ...editedMetadata, family: e.target.value })}
				/>
			  </p>

			  <p><strong>Subfamily:</strong><br />
				<input style={{ width: '100%' }}
				  value={editedMetadata.subfamily || ''}
				  onChange={(e) => setEditedMetadata({ ...editedMetadata, subfamily: e.target.value })}
				/>
			  </p>

			  <p><strong>Bibliography:</strong><br />
				<input style={{ width: '100%' }}
				  value={editedMetadata.bibliography || ''}
				  onChange={(e) => setEditedMetadata({ ...editedMetadata, bibliography: e.target.value })}
				/>
			  </p>

			  <p><strong>Family Master:</strong><br />
				<input style={{ width: '100%' }}
				  value={editedMetadata.familymaster || ''}
				  onChange={(e) => setEditedMetadata({ ...editedMetadata, familymaster: e.target.value })}
				/>
			  </p>

			  <div style={{ textAlign: 'right', marginTop: '1rem' }}>
				<button onClick={() => {
				  console.log('Saved Metadata:', editedMetadata);
				  setShowModal(false);
				}} style={{ padding: '6px 12px', marginRight: '10px' }}>
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
  )
}

export default App
