import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleGroups, setVisibleGroups] = useState({})
  const [filterStatus, setFilterStatus] = useState('__ALL__')
  const [sortDesc, setSortDesc] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const correctPassword = process.env.REACT_APP_PROTECT_PASS

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data, error } = await supabase
      .from('pdb_membrane_records')
      .select('pdb_id, title, release_date, deposition_date, experimental_method, resolution, pubmed_id, doi, journal_volume, page_first, page_last, journal, year, taxonomy, sequence_length, num_tm_segments, uniprot_id, classification, Status, memo, CitationTitle, SubGroup, SubGroupScore')
	  .order('release_date', { ascending: false })

    if (error) {
      console.error('Fetch error:', error)
    } else {
      // Filter out records without a pubmed_id
      setData(data.filter(record => record.pubmed_id))
    }

    setLoading(false)
  }

  async function updateGroup(pubmedId, newStatus, newMemo) {
    const entriesToUpdate = data.filter(entry => entry.pubmed_id === pubmedId)
    for (let entry of entriesToUpdate) {
      await supabase
        .from('pdb_membrane_records')
        .update({ Status: newStatus, memo: newMemo })
        .eq('pdb_id', entry.pdb_id)
    }
    fetchData()
  }

  function exportToCSV() {
    const header = ["PDB_ID", "Status", "Memo", "Title", "Release Date", "Deposition Date", "Experimental Method", "Resolution", "PubMed ID", "DOI", "Journal", "Journal Volume", "Page First", "Page Last", "Year", "Taxonomy", "Sequence Length", "Num TM Segments", "UniProt ID", "Classification"]
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.release_date)
      const dateB = new Date(b.release_date)
      return sortDesc ? dateB - dateA : dateA - dateB
    })

    const rows = sortedData.map(row => [
      row.pdb_id,
      row.Status || "",
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
    <div style={{ padding: 20, fontFamily: 'Arial', maxWidth: '1200px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🧬 PDB Membrane Labeler</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label>
            Filter by Status:
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="__ALL__">(All)</option>
              <option value="__EMPTY__">(Blank)</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="maybe">Maybe</option>
              <option value="already in">Already In</option>
              <option value="pubmed ready">Pubmed ready</option>
              <option value="ready for yes">Ready for yes</option>
            </select>
          </label>
          <button onClick={() => setSortDesc(prev => !prev)}>
            Sort: {sortDesc ? 'Newest First' : 'Oldest First'}
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
            const status = (row.Status || '').trim().toLowerCase()
            const filter = filterStatus.trim().toLowerCase()
            if (filter === '__all__') return true
            if (filter === '__empty__') return status === ''
            return status === filter
          })
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
				  
				{(first.SubGroup || first.SubGroupScore) && (
				  <p>
					<strong>SubGroup:</strong> {first.SubGroup || 'N/A'}<br />
					<strong>Score:</strong> {isNaN(Number(first.SubGroupScore)) ? 'N/A' : Number(first.SubGroupScore).toFixed(3)}
				  </p>
				)}

                  <br />
                  <label>Status:
                    <select
                      defaultValue={first.Status || ''}
                      onChange={(e) => updateGroup(pubmed, e.target.value, first.memo)}
                    >
                      <option value="">(Blank)</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Maybe">Maybe</option>
                      <option value="Already In">Already In</option>
                      <option value="Pubmed ready">Pubmed ready</option>
                      <option value="Ready for yes">Ready for yes</option>
                    </select>
                  </label>
                  <br />
                  <label>Memo:
                    <input
                      defaultValue={first.memo || ''}
                      onBlur={(e) => updateGroup(pubmed, first.Status, e.target.value)}
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
    </div>
  )
}

export default App
