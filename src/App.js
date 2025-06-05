
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
      .from('pdb_USC_backup')
      .select('ID, Status, memo, structureid, PubMed, PDB, UniProt, releaseDate, protein_type')
      .order('releaseDate', { ascending: false })

    if (error) {
      console.error('Fetch error:', error)
    } else {
      setData(data)
    }

    setLoading(false)
  }

  async function updateGroup(pubmedId, newStatus, newMemo) {
    const entriesToUpdate = data.filter(entry => entry.PubMed === pubmedId)
    for (let entry of entriesToUpdate) {
      await supabase
        .from('pdb_USC_backup')
        .update({ Status: newStatus, memo: newMemo })
        .eq('ID', entry.ID)
    }
    fetchData()
  }

  function exportToCSV() {
    const header = ["ID", "Status", "Memo", "StructureID", "PubMed", "PDB", "UniProt", "ReleaseDate", "Protein Type"];
    const sortedData = [...data].sort((a, b) => {
	  if (!a.PubMed) return 1
	  if (!b.PubMed) return -1
	  return a.PubMed.localeCompare(b.PubMed)
	})

	const rows = sortedData.map(row => [
      row.ID,
      row.Status || "",
      row.memo || "",
      row.structureid,
      row.PubMed,
      row.PDB,
      row.UniProt,
      row.releaseDate || "",
      row.protein_type || ""
    ]);

    const csvContent = [header, ...rows]
      .map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "pdb_records_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    if (!acc[item.PubMed]) acc[item.PubMed] = []
    acc[item.PubMed].push(item)
    return acc
  }, {})

  return (
    <div style={{ padding: 20, fontFamily: 'Arial', maxWidth: '1200px', margin: '0 auto', fontSize: '1.1rem', lineHeight: '1.5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🧬 PDB Entry Labeler</h1>
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

      {Object.entries(grouped).map(([pubmed, group]) => {
        const first = group[0]
        const filtered = group.filter(row => {
          const status = (row.Status || '').trim().toLowerCase()
          const filter = filterStatus.trim().toLowerCase()
          if (filter === '__all__') return true
          if (filter === '__empty__') return status === ''
          return status === filter
        })
        if (filtered.length === 0) return null

        const releaseDates = [...new Set(group.map(e => e.releaseDate).filter(Boolean))].join(', ')
        const proteinTypes = [...new Set(group.map(e => e.protein_type).filter(Boolean))].join(', ')
        const expanded = visibleGroups[pubmed]

        return (
          <div key={pubmed} style={{ border: '1px solid #ccc', marginBottom: 20, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <strong>PubMed Group:</strong>{' '}
                <a href={first.PubMed} target="_blank" rel="noopener noreferrer">{pubmed}</a><br />
                <strong>Structure IDs:</strong>{' '}
                {group.map(e => (
                  <a key={e.structureid} href={e.PDB} target="_blank" rel="noopener noreferrer" style={{ marginRight: 4 }}>
                    {e.structureid}
                  </a>
                ))}<br />
                <strong>ID:</strong> {first.ID}<br />
                <strong>Release Date(s):</strong> {releaseDates}<br />
                <strong>Uniprot Protein Type(s):</strong> {proteinTypes}<br />
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
                src={`https://cdn.rcsb.org/images/structures/${first.structureid?.toLowerCase()}_assembly-1.jpeg`}
                alt={`PDB ${first.structureid}`}
                style={{ width: '220px', border: '1px solid #ccc' }}
                onError={(e) => (e.target.style.display = 'none')}
              />
              {group.length > 1 && (
                <button onClick={() => setVisibleGroups(prev => ({ ...prev, [pubmed]: !expanded }))}>
                  {expanded ? '▼ Collapse' : '▶ Expand'}
                </button>
              )}
            </div>
            {expanded && group.map(row => (
              <div key={row.ID} style={{ marginTop: 15, borderTop: '1px solid #ddd', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <p><strong>ID:</strong> {row.ID}</p>
                  <p><strong>Structure ID:</strong> {row.structureid}</p>
                  <p><strong>Release Date:</strong> {row.releaseDate?.split(' ')[0] || 'N/A'}</p>
                  <p><strong>Uniprot protein type:</strong> <em>{row.protein_type || 'N/A'}</em></p>
                  <p>
                    <a href={row.PDB} target="_blank" rel="noopener noreferrer">🔗 PDB Link</a> |{' '}
                    <a href={row.PubMed} target="_blank" rel="noopener noreferrer">📄 PubMed Link</a> |{' '}
                    <a href={row.UniProt} target="_blank" rel="noopener noreferrer">🔗 UniProt Link</a>
                  </p>
                </div>
                <img
                  src={`https://cdn.rcsb.org/images/structures/${row.structureid?.toLowerCase()}_assembly-1.jpeg`}
                  alt={`PDB ${row.structureid}`}
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
