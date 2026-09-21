# Changelog

## Unreleased

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
