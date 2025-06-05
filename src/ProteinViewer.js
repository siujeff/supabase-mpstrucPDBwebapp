import { useEffect, useRef } from 'react'
import * as NGL from 'ngl'
import React from 'react'

export default function ProteinViewer({ pdbUrl }) {
  const stageRef = useRef(null)

  useEffect(() => {
    const stage = new NGL.Stage(stageRef.current, { backgroundColor: 'white' })
    stage.loadFile(pdbUrl, { defaultRepresentation: true })

    return () => stage.dispose()
  }, [pdbUrl])

  return (
    <div
      ref={stageRef}
      style={{ width: '500px', height: '400px', border: '1px solid #ccc', marginTop: '10px' }}
    />
  )
}
