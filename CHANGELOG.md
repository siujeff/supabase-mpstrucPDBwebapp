## [3.0.1] - 2025-10-29
### Added
- `uniprot_classification` table with curated membrane classes (Inner/Outer/Multi/Single/Peripheral/non-membrane).
- `v_pdb_membrane_records_compat` view to preserve legacy columns for the web app.
- 3D viewer for structure model using 3Dmol.

### Changed
- React app now reads from the compat view.
- Predictions: view selects latest `text_%` and `image_%` model_version rows and exposes `[text,image]` arrays.

### Fixed
- 3D viewer robustness: load 3Dmol via `public/index.html` to avoid CDN race/timeouts.
