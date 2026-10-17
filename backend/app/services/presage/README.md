# Presage integration (Member 4) - READ FIRST
Goal: real contactless heart-rate + breathing-rate measurement. **No simulated readings.**

TODO checklist
- [ ] Read the official Presage SmartSpectra docs; confirm supported platforms (web / iOS / Android / C++) and licensing/API key.
- [ ] Choose the smallest supported architecture (e.g. in-browser if a web SDK exists, otherwise a companion
      native/desktop client that POSTs results to `/api/health-checkins`).
- [ ] Document the chosen runtime + limitations below and in `docs/architecture.md`.
- [ ] Never persist raw video. Persist only derived metrics + `measurement_source="presage_sdk"`.
- [ ] If unsupported on the demo device: UI must say "unavailable" - or clearly label any demo fallback.

Chosen architecture: _TBD_
Known limitations: _TBD_
