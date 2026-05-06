# Tree Species Dataset Maintenance

This project bundles a local species dataset used by the Add Tree species selector.

## Source

- Primary source: OpenTreeMap species API (`/instance/{instance}/species`)
- Fallback source: OpenTreeMap `species.csv` export format

The generated file is:

- `assets/data/treeSpeciesDataset.json`

Each species entry includes:

- `label` (display value)
- `commonName`
- `scientificName`
- `otmCode`
- `usdaCode` (nullable placeholder)
- `iTreeCode` (nullable placeholder)

`Other / Unknown` is always appended as a fallback option.

## Updating the dataset

From `TreeGuardiansExpo`:

```bash
npm run species:update
```

If your chosen OpenTreeMap instance API is not reachable, run with a CSV fallback:

```bash
node ./scripts/updateTreeSpeciesFromOtm.mjs --input-csv ./path/to/species.csv --output ./assets/data/treeSpeciesDataset.json
```

Optional API overrides:

- `--base-url <url>`
- `--instance <instance-url-name>`

Example:

```bash
node ./scripts/updateTreeSpeciesFromOtm.mjs --base-url https://example.org --instance apidemo
```

## Notes for OTM mapping

- The dataset stores OTM-facing fields needed for later mapping work.
- `usdaCode` and `iTreeCode` are currently nullable and intended to be populated when upstream source data is available.
