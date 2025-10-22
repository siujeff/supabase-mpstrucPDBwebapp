// src/StructureViewerInline.jsx
import React, { useEffect, useRef, useState } from "react";

let _3dmolReady;
function ensure3Dmol() {
  if (window.$3Dmol) return Promise.resolve(window.$3Dmol);
  if (_3dmolReady) return _3dmolReady;
  _3dmolReady = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://3Dmol.org/build/3Dmol-min.js";
    s.async = true;
    s.onload = () => resolve(window.$3Dmol);
    s.onerror = () => reject(new Error("Failed to load 3Dmol"));
    document.head.appendChild(s);
  });
  return _3dmolReady;
}

export default function StructureViewerInline({
  pdbId,
  thumbUrl,
  canExpand = true,
  onExpand,
}) {
  const [show3D, setShow3D] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const [loading3D, setLoading3D] = useState(false);
  const [error3D, setError3D] = useState("");
  const [colorScheme, setColorScheme] = useState("chain"); // NEW

  const viewerDivRef = useRef(null);
  const viewerRef = useRef(null);

  // Helper to apply styles based on selected color scheme
  function applyStyles(v, scheme) {
    // clear any previous styles
    v.setStyle({}, null);

    switch (scheme) {
      case "spectrum":
        // rainbow along residue index
        v.setStyle({}, { cartoon: { color: "spectrum" }, stick: { radius: 0.15 } });
        break;
      case "secondary":
        // color by secondary structure (PyMOL palette)
        v.setStyle({}, { cartoon: { colorscheme: "ssPyMol" }, stick: { radius: 0.15 } });
        break;
      case "element":
        // white cartoon + element-colored sticks
        v.setStyle({}, { cartoon: { color: "white" }, stick: { radius: 0.15, colorscheme: "element" } });
        break;
      case "chain":
      default:
        // distinct color per chain
        v.setStyle({}, { cartoon: { colorscheme: "chain" }, stick: { radius: 0.15 } });
        break;
    }

    v.zoomTo();
    v.render();
    v.resize();
  }

  async function render3DOnce() {
    setError3D("");
    setLoading3D(true);
    try {
      const $3Dmol = await ensure3Dmol();
      const el = viewerDivRef.current;
      if (!el) return;

      el.style.width = "100%";
      el.style.height = "100%";
      el.innerHTML = "";

      const v = $3Dmol.createViewer
        ? $3Dmol.createViewer(el, { backgroundColor: "white" })
        : new $3Dmol.GLViewer(el, { backgroundColor: "white" });

      const pdb = String(pdbId || "").toUpperCase();

      await new Promise((resolve, reject) => {
        $3Dmol.download(`pdb:${pdb}`, v, { doAssembly: true }, resolve, reject);
      });

      applyStyles(v, colorScheme); // <-- colorize right after load
      viewerRef.current = v;
      setHasRendered(true);
    } catch (e) {
      setError3D("Could not render 3D. Try again.");
    } finally {
      setLoading3D(false);
    }
  }

  async function handleToggle3D() {
    if (show3D) {
      setShow3D(false); // 3D -> image
    } else {
      setShow3D(true);  // image -> 3D
      if (!hasRendered) {
        await render3DOnce();
      } else {
        requestAnimationFrame(() => {
          if (viewerRef.current) {
            applyStyles(viewerRef.current, colorScheme);
          }
        });
      }
    }
  }

  function handleExpand() {
    if (!canExpand) return;
    onExpand?.();
    setTimeout(() => viewerRef.current?.resize(), 250);
  }

  // Recolor live viewer when colorScheme changes
  useEffect(() => {
    if (hasRendered && viewerRef.current) {
      applyStyles(viewerRef.current, colorScheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorScheme]);

  // Reset when pdbId changes
  useEffect(() => {
    setShow3D(false);
    setHasRendered(false);
    setLoading3D(false);
    setError3D("");
    if (viewerDivRef.current) viewerDivRef.current.innerHTML = "";
    viewerRef.current = null;
  }, [pdbId]);

  return (
    <div className="sv-card">
      {/* Canvas / image area */}
      <div className="sv-canvas">
        {!show3D && (
          <img
            className="sv-thumb"
            src={thumbUrl}
            alt={`PDB ${pdbId}`}
            onError={(e) => {
			  e.currentTarget.style.visibility = "hidden"; // keep space so the 3D canvas can still overlay cleanly
			}}

          />
        )}
        <div
          ref={viewerDivRef}
          className="viewer"
          style={{ display: show3D ? "block" : "none" }}
          aria-hidden={!show3D}
        />
      </div>

      {/* Controls under the image */}
      <div className="sv-controls">
        {/* NEW: color scheme chooser */}
        <select
          className="sv-btn"
          value={colorScheme}
          onChange={(e) => setColorScheme(e.target.value)}
          title="Color scheme"
        >
          <option value="chain">Color by chain</option>
          <option value="spectrum">Spectrum (rainbow)</option>
          <option value="secondary">Secondary structure</option>
          <option value="element">Element (sticks)</option>
        </select>

        <button className="sv-btn" onClick={handleToggle3D} disabled={loading3D}>
          {loading3D ? "Loading…" : show3D ? "Show Image" : hasRendered ? "Show 3D" : "Render 3D"}
        </button>

        <button
          className="sv-btn"
          onClick={handleExpand}
          disabled={!canExpand}
          title={canExpand ? "Expand" : "No additional entries"}
        >
          Expand
        </button>
      </div>

      {error3D && (
        <div style={{ color: "#b00020", fontSize: 12, marginTop: 6 }}>{error3D}</div>
      )}
    </div>
  );
}

