import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import ProteinViewer from './ProteinViewer'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleViewers, setVisibleViewers] = useState({})
  const [filterStatus, setFilterStatus] = useState('__ALL__')
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data, error } = await supabase
      .from('pdb_USC_backup')
      .select('ID, Status, memo, structureid, PubMed, PDB, UniProt, LastUpdated')
      .order('LastUpdated', { ascending: false })

    if (error) {
      console.error('Fetch error:', error)
    } else {
      setData(data)
    }

    setLoading(false)
  }

  async function updateRow(id, newStatus, newMemo) {
    const { error } = await supabase
      .from('pdb_USC_backup')
      .update({ Status: newStatus, memo: newMemo })
      .eq('ID', id)

    if (error) {
      console.error('Update error:', error)
    } else {
      fetchData()
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Loading data...</p>

  return (
    <div style={{ padding: 20, fontFamily: 'Arial', maxWidth: '1200px', margin: '0 auto' }}>
      {/* HEADER + FILTER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🧬 PDB Entry Labeler</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label>
            Filter by Status:{' '}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="__ALL__">(All)</option>
			  <option value="__EMPTY__">(Blank)</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Maybe">Maybe</option>
              <option value="Already In">Already In</option>
              <option value="Pubmed ready">Pubmed ready</option>
              <option value="Ready for yes">Ready for yes</option>
            </select>
          </label>
          <button onClick={() => setSortDesc(prev => !prev)}>
            Sort: {sortDesc ? 'Newest First' : 'Oldest First'}
          </button>
        </div>
      </div>

      {/* DATA RECORDS */}
      {data
.filter(row => {
  const status = row.Status

  if (filterStatus === '__ALL__') return true
	if (filterStatus === '__EMPTY__') return typeof status === 'string' && status.trim() === ''
  return status === filterStatus
})

        .sort((a, b) => {
          const dateA = new Date(a.LastUpdated)
          const dateB = new Date(b.LastUpdated)
          return sortDesc ? dateB - dateA : dateA - dateB
        })
        .map(row => (
          <div
            key={row.ID}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              border: '1px solid #ccc',
              padding: 15,
              marginBottom: 20
            }}
          >
            {/* LEFT COLUMN */}
            <div style={{ flex: 1, marginRight: 20 }}>
              <p><strong>ID:</strong> {row.ID}</p>
              <p><strong>Structure ID:</strong> {row.structureid}</p>
              <p><strong>Last Updated:</strong> {row.LastUpdated?.split(' ')[0]}</p>

              <label>
                <input
                  type="checkbox"
                  checked={!!visibleViewers[row.ID]}
                  onChange={(e) =>
                    setVisibleViewers(prev => ({
                      ...prev,
                      [row.ID]: e.target.checked
                    }))
                  }
                />{' '}
                Show 3D structure
              </label>

              <p>
                <a href={row.PDB} target="_blank" rel="noopener noreferrer">🔗 PDB Link</a> |{' '}
                <a href={row.PubMed} target="_blank" rel="noopener noreferrer">📄 PubMed Link</a> |{' '}
                <a href={row.UniProt} target="_blank" rel="noopener noreferrer">🔗 UniProt Link</a>
              </p>

              <label>
                Status:{' '}
                <select
                  defaultValue={row.Status || ''}
                  onChange={(e) => updateRow(row.ID, e.target.value, row.memo)}
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

              <br /><br />
              <label>
                Memo:{' '}
                <input
                  defaultValue={row.memo || ''}
                  onBlur={(e) => updateRow(row.ID, row.Status, e.target.value)}
                  style={{ width: '80%' }}
                />
              </label>
            </div>

            {/* RIGHT COLUMN: Static image */}
            <div>
              <img
                src={`https://cdn.rcsb.org/images/structures/${row.structureid?.toLowerCase()}_assembly-1.jpeg`}
                alt={`PDB ${row.structureid}`}
                style={{ width: '300px', border: '1px solid #eee' }}
                onError={(e) => (e.target.style.display = 'none')}
              />

              {/* Optional 3D viewer toggle */}
              {visibleViewers[row.ID] && row.structureid && (
                <ProteinViewer
                  pdbUrl={`https://opm-assets.storage.googleapis.com/assembly/${row.structureid}Apath.pdb`}
                />
              )}
            </div>
          </div>
        ))}
    </div>
  )
}

export default App
