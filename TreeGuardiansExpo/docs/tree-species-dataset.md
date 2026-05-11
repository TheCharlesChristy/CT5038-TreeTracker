# Tree Species Dataset

The Add Tree species selector reads `assets/data/treeSpeciesDataset.json`.

## Generate

Run from `TreeGuardiansExpo/`:

```bash
npm run species:update
```

The script fetches OpenTreeMap species for `apidemo` from `https://www.opentreemap.org`, sorts them by label, and appends `Other / Unknown`.

## Options

```bash
node ./scripts/updateTreeSpeciesFromOtm.mjs --output ./assets/data/treeSpeciesDataset.json
node ./scripts/updateTreeSpeciesFromOtm.mjs --base-url https://example.org --instance apidemo
node ./scripts/updateTreeSpeciesFromOtm.mjs --input-csv ./species.csv
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `--output` | path | `assets/data/treeSpeciesDataset.json` | Writes the generated JSON file. |
| `--base-url` | URL | `OTM_BASE_URL` or `https://www.opentreemap.org` | Selects the OpenTreeMap host. |
| `--instance` | string | `OTM_INSTANCE` or `apidemo` | Selects the OpenTreeMap instance. |
| `--input-csv` | path | none | Uses a CSV fallback when API fetch fails. |

`OTM_BASE_URL` and `OTM_INSTANCE` are read only when the matching CLI option is omitted.

## Output

Each species item contains `key`, `label`, `commonName`, `scientificName`, `otmCode`, `usdaCode`, `iTreeCode`, and `searchText`.

`usdaCode` and `iTreeCode` are currently `null` because the generator does not source those mappings.
