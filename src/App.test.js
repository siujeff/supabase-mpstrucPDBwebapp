import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data, error } = await supabase
      .from('pdb_USC_backup')
      .select('ID, Status, memo, structureid, PubMed, PDB, UniProt')

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
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1>🧬 PDB Entry Labeler</h1>
      {data.map(row => (
        <div key={row.ID} style={{ border: '1px solid #ccc', padding: 15, marginBottom: 20 }}>
          #<p><strong>ID:</strong> {row.ID}</p>
          <p><strong>Structure ID:</strong> {row.structureid}</p>
          <p>
            <a href={row.PDB} target="_blank" rel="noopener noreferrer">🔗 PDB Link</a> |{' '}
            <a href={row.PubMed} target="_blank" rel="noopener noreferrer">📄 PubMed Link</a>
			<a href={row.UniProt} target="_blank" rel="noopener noreferrer">🔗 UniProt Link</a>
          </p>

          <label>
            Status (Label):{' '}
            <input
              defaultValue={row.Status}
              onBlur={(e) => updateRow(row.ID, e.target.value, row.memo)}
            />
          </label>
          <br /><br />
          <label>
            Memo (Comment):{' '}
            <input
              defaultValue={row.memo || ''}
              onBlur={(e) => updateRow(row.ID, row.Status, e.target.value)}
              style={{ width: '80%' }}
            />
          </label>
        </div>
      ))}
    </div>
  )
}

export default App
