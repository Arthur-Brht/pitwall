# Weather, mapping and data terms

Pitwall's MIT licence covers its original application code and documentation. It does not replace the licences or service conditions for dependencies or external data.

The desktop build also bundles Electron and Chromium/Node. Their distributed `ELECTRON_LICENSE.txt` and `CHROMIUM_LICENSES.html` notices are retained in the app bundle alongside web dependency notices. Electron is MIT licensed; bundled runtime components retain their individual licences. Packaging tools are development dependencies, not shipped application dependencies.

## Weather

- **Open-Meteo:** normalized data are provided under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit [Open-Meteo](https://open-meteo.com/) and the named model sources, and identify processing changes. The free service is for non-commercial use within its quotas; see the [current terms](https://open-meteo.com/en/terms). Public code availability does not grant commercial free-API access.
- **MET Norway:** data © Norwegian Meteorological Institute (MET Norway), under its [licensing and data policy](https://docs.api.met.no/doc/License.html), including CC BY 4.0/NLOD 2.0 unless otherwise specified. [Service conditions](https://docs.api.met.no/doc/TermsOfService.html) also apply. Pitwall preserves missing values, converts units and aligns intervals as described in API_SOURCES.md.
- **IPMA pilot observations:** data © Instituto Português do Mar e da Atmosfera, I.P. The frozen observation subset in `docs/validation/pilot-2026-10-27.json` retains its [attributed non-commercial reuse conditions](https://api.ipma.pt/); it is not MIT licensed. It is used for a documented exploratory station comparison, with source URLs and processing/measurement limits retained. Forecast rows in that file retain Open-Meteo/MET Norway data terms. No IPMA observation feed is automatically contacted by the application.

Visible weather attribution is retained in the application footer. Source cards identify the model/provider and transport. CSV exports preserve source identifiers and timestamps; redistributed exports should retain the relevant data attribution.

## Radar and mapping

- **RainViewer:** recent radar tiles and coverage information are used through its [Weather Maps API](https://www.rainviewer.com/api/weather-maps-api.html). RainViewer attribution remains on the map. Its service conditions and availability apply separately; no ownership of its radar imagery is claimed.
- **OpenStreetMap:** base tiles and OSM-derived geometry are © OpenStreetMap contributors, under [ODbL 1.0 and the attribution requirements](https://www.openstreetmap.org/copyright). The [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) applies. Pitwall does not bulk-download or precache public map tiles for offline use.
- **F1 Circuits:** nine bundled outlines are © Tomislav Bacinger, used under the [retained MIT licence](web/public/circuits/LICENSE-f1-circuits.txt), from [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits). Attribution is shown with the outline. Coordinate ordering is converted for Leaflet in the bundled adapter.
- **Nogaro:** geometry from [OSM way 95798633](https://www.openstreetmap.org/way/95798633), © OpenStreetMap contributors, ODbL 1.0. Original geometry/source metadata are retained in `web/public/circuits/nogaro.geojson`; the adapter converts coordinate order for display.

A copy of data from one provider does not acquire the licence of another. Track names are descriptive; Pitwall does not claim affiliation with circuits, championships, weather agencies or map providers.

## Software dependencies

Production dependency licences and copyright notices are retained in [THIRD_PARTY_NOTICES.txt](web/public/THIRD_PARTY_NOTICES.txt), generated from the locked installed dependencies by `npm run notices` and included in the build. Map icons, fonts and charts use bundled assets/system fonts; there is no external font or script CDN requirement.

When redistributing a built application, retain its notices and data attribution. Review provider terms before offering a commercial service or changing request volume/caching behaviour.

The IPMA logo retained under `docs/validation/` is also © IPMA and used unmodified for the source credit required by its reuse notice; it is not MIT licensed.
