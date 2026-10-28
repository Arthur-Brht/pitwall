# Circuit catalogue and outlines

The sidebar lists every catalogue circuit, including when an existing profile has only a few saved circuits. Saved circuits stay first; choosing another catalogue circuit saves it without changing existing plans or settings. The 2.4.1 update retains the 2.4 application identity, profile and address. It does not change the dashboard or weather calculations.

All 18 catalogue circuits have bundled outlines. The seven circuits originally requested are directly selectable: Magny-Cours, Le Mans, Spa, Portimão, Dijon-Prenois, Paul Ricard and Jarama. Le Mans offers two explicitly named choices: the long La Sarthe circuit and the permanent Bugatti circuit. Nürburgring GP and Nordschleife also keep separate outlines.

## Sources

Nine existing outlines retain the F1 Circuits source and MIT licence described in [API sources](API_SOURCES.md#radar-and-circuit-maps). The following outlines are © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). The selected source coordinates and available OSM versions/timestamps are retained as downloadable GeoJSON under `web/public/circuits/` and in the built app's `circuits/` directory.

| Circuit                  | Primary geometry source                                                                                           | Selected layout                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Nogaro                   | [Way 95798633](https://www.openstreetmap.org/way/95798633)                                                        | Existing Paul Armagnac main lap.                                                               |
| Dijon-Prenois            | [Relation 14474019](https://www.openstreetmap.org/relation/14474019)                                              | Ten main-lap ways, including the Parabolique extension; no karting or pit lane.                |
| Jarama                   | [Relation 21391190](https://www.openstreetmap.org/relation/21391190)                                              | Two main-lap ways; pit lane 414118822 excluded.                                                |
| Le Mans · La Sarthe      | [Relation 2126739](https://www.openstreetmap.org/relation/2126739)                                                | The 44 main-lap ways; start/finish node and all pit-lane members excluded.                     |
| Le Mans · Bugatti        | [Relation 2725877](https://www.openstreetmap.org/relation/2725877)                                                | The 18 main-lap ways; a separate loop from La Sarthe.                                          |
| Nürburgring Nordschleife | [Relation 38566](https://www.openstreetmap.org/relation/38566)                                                    | The 53 main-lap ways; no GP circuit or access roads.                                           |
| Estoril                  | [Relation 11266675](https://www.openstreetmap.org/relation/11266675)                                              | The 18 main-lap ways; pit lane 363050271 excluded.                                             |
| Jerez                    | [Way 80804175](https://www.openstreetmap.org/way/80804175), plus 21 adjoining ways identified in the GeoJSON      | Car layout through Senna chicane; the parallel Crivillé curve, karting and pit lanes excluded. |
| MotorLand Aragón         | [Way 230261828](https://www.openstreetmap.org/way/230261828), plus seven adjoining ways identified in the GeoJSON | Car layout through the mapped FIA variants; FIM shortcuts, karting and pit lanes excluded.     |

The eight new OSM outlines were downloaded on 2026-10-28. Each forms a closed lap using only exact shared source endpoints. Missing sections are never repaired with invented straight lines. Source longitude/latitude coordinates are converted to Leaflet latitude/longitude in the bundled adapter. These are approximate map traces, not surveyed track boundaries or official lap-length measurements; published circuit lengths and map centreline distances can differ.

## Verification

The catalogue geometry test requests every named circuit with external fetches blocked, checks coordinate order/location and attribution, and rejects substitution for an unknown layout. Separate regression checks distinguish Le Mans La Sarthe/Bugatti and Nürburgring GP/Nordschleife by their geographic extents. Browser coverage selects every requested circuit from the main selector, verifies the highlighted outline is rendered, then reloads to check saved selection and complete catalogue availability.
