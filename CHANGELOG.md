# Changelog

## Unreleased

### Fixed

- **The automation row no longer leaves a hole beside every cover.** Automatik
  and Fortsetzen sit in one full-width row instead of two half-width tiles, and
  Automatik widens to fill it whenever there is nothing to resume. Half-width
  tiles could not share a row with the next cover, so each one left a ragged
  gap, which showed up as soon as a room had more than one cover.

## 0.2.0 - 2026-09-21

### Added

- **Automation state beside every cover.** Where Cover Control manages a cover,
  its tile is followed by the automation's current intent and, while the cover
  is paused or overridden, a button to hand control back. Covers it does not
  manage are unchanged, and an instance without the integration sees nothing
  new.

### Changed

- **Preset buttons read as compact rows.** They are shortcut cards now rather
  than button cards, so each is a small icon with its label beside it instead of
  a large icon stacked above it. Three still fill one row.
- **Cover tiles use favourite buttons instead of sliders.** Each cover now
  shows its favourite positions, and a Raffstore its favourite slat angles, as
  buttons that highlight the current one. The values live in the entity
  registry per cover, so they are set under the cover's settings rather than in
  the dashboard.

## 0.1.0 - 2026-09-21

### Added

- **`josa-beschattung` view strategy.** One view for every Rolladen and
  Raffstore, grouped by floor. Each floor leads with three presets (alles zu,
  Beschattung, alles auf), and every cover gets its own tile below with its
  position, its slat angle, and a slider for each.
- **Raffstore and Rolladen are told apart by capability.** A cover that can set
  a tilt position has slats and gets the slat preset; one that cannot goes part
  way down instead. Both report `device_class: shutter`, so neither the device
  class nor the name is usable for this.
- **Presets apply in a single tap.** Each button is one `scene.apply` call with
  the target state of every cover on that floor inline, so no scripts or scenes
  have to exist in Home Assistant for the view to work.
- **`josa-home` dashboard strategy.** Generates a dashboard, currently the
  Beschattung view.
