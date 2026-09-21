# Josa Dashboards

[![GitHub Release](https://img.shields.io/github/v/release/josa42/homeassistant-dashboards?style=flat-square)](https://github.com/josa42/homeassistant-dashboards/releases)
[![License](https://img.shields.io/github/license/josa42/homeassistant-dashboards?style=flat-square)](LICENSE)
[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=flat-square)](https://hacs.xyz/)

Dashboard and view strategies I use in my own Home Assistant setup. A strategy
builds a dashboard, or a single view, from JavaScript at render time instead of
from a card list someone has to maintain by hand.

Install the repository with the button below, then add a strategy with its own
button, or by pasting its YAML into the raw config editor.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=josa42&repository=homeassistant-dashboards&category=plugin)

<br><br>

## Strategies

<!-- strategies:start -->

### Beschattung

A **view strategy**. One view for every Rolladen and Raffstore, per floor.

Each floor leads with three presets, and every cover then gets its own tile
below with its position, its slat angle, and a row of favourite buttons for
each. Tapping the tile itself still opens the more-info dialog.

The favourite buttons come from the `cover-position-favorite` and
`cover-tilt-favorite` features, so their values are per entity rather than per
dashboard: Home Assistant reads them from `options.cover.favorite_positions`
and `favorite_tilt_positions` in the entity registry, and falls back to
`0, 25, 75, 100` for a cover that has none. Set them under the cover's settings,
not here. A cover without slats gets no tilt row.

| Preset | Raffstore | Rolladen |
|--------|-----------|----------|
| Alles zu | zu, Lamellen geschlossen | zu |
| Beschattung | zu, Lamellen 50% | 75% zu |
| Alles auf | ganz auf | ganz auf |

Raffstore or Rolladen is decided per cover by whether it can set a tilt
position, not by its name or device class, so a new cover lands in the right
group on its own.

```yaml
views:
  - title: Beschattung
    path: beschattung
    icon: mdi:window-shutter
    strategy:
      type: custom:josa-beschattung
```

[![Open your Home Assistant instance and show your dashboards.](https://my.home-assistant.io/badges/lovelace_dashboards.svg)](https://my.home-assistant.io/redirect/lovelace_dashboards/)

| Option | Default | |
|--------|---------|---|
| `floors` | `[eg, dg]` | Floor IDs, in the order the presets appear |
| `tilt_shade` | `50` | Slat angle for the Beschattung preset |
| `roller_shade` | `25` | Position for a cover without slats, 25 being 75% closed |
| `exclude` | `[]` | Entity IDs to leave out |
| `max_columns` | `2` | Section columns |

### Josa Home

A **dashboard strategy**. It generates every view of a dashboard, so it replaces
the entire config:

```yaml
strategy:
  type: custom:josa-home
views: []
```

It also shows up under Settings → Dashboards → Add dashboard, so a new dashboard
can pick it without anyone editing YAML.

[![Open your Home Assistant instance and show your dashboards.](https://my.home-assistant.io/badges/lovelace_dashboards.svg)](https://my.home-assistant.io/redirect/lovelace_dashboards/)

<!-- strategies:end -->

<br><br>

## Requirements

- Home Assistant **2026.9.0** or newer

<br><br>

## Installation

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=josa42&repository=homeassistant-dashboards&category=plugin)

[Manual installation](docs/manual_installation.md) covers adding the repository
by hand and installing without HACS.

<br><br>

## Documentation

- [Reference](docs/reference.md): how the two strategy levels differ, what
  `generate` receives, and the traps
- [Changelog](CHANGELOG.md)

<br><br>

## License

[MIT](LICENSE)
