# mpstruc Data Browser

A React-based web app for exploring and labeling PDB membrane protein records from the mpstruc database, powered by Supabase and machine learning.

## Preview
<p align="center">
  <img src="assets/preview.gif"
       alt="mpstruc Browser preview"
       width="900" />
</p>

## Features
- Search by PDB ID
- View prediction group and score
- Editable metadata fields
- Export results for downstream analysis
- Refines the model through active learning and expert curator input
- 3D structure viewer usig 3Dmol.
- Third (New) prediction model using article's abstract.

## Installation
```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>
npm install
npm start
