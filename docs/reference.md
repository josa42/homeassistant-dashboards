# Reference

## The two levels

A strategy is a custom element with a static `generate` method. Which level it
serves is decided entirely by the name it registers under:

| Level | Where the config sits | Custom element | `generate` returns |
|-------|-----------------------|----------------|--------------------|
| Dashboard | top-level `strategy:` | `ll-strategy-dashboard-<type>` | the whole dashboard, `views` included |
| View | `views: - strategy:` | `ll-strategy-view-<type>` | a single view config |

The two are separate registries, so one name can exist at both levels without
clashing. That also means a dashboard strategy cannot be used inside a view:
Home Assistant only ever looks for `ll-strategy-view-<type>` there, and a
strategy registered at the other level simply fails to resolve.

This file ships `custom:josa-home` at dashboard level and
`custom:josa-beschattung` at view level.

## Nesting

A view that a dashboard strategy generates may carry a `strategy` key of its
own, and Home Assistant resolves it when that view is opened. `josa-home` uses
this: it decides what the views are, and hands the contents of each one to
`josa-beschattung`.

The benefit is laziness. A dashboard strategy runs on every page load, so the
less it does the better. Work that only matters once a view is on screen belongs
in the view strategy, where it runs at most once per view actually visited.

## What `generate` receives

```js
static async generate(config, hass)
```

`config` is the strategy config as written, minus nothing: every key beside
`type` is yours to define. `hass` is the full object, so `hass.states`,
`hass.areas`, `hass.devices` and `hass.entities` are all available, as is
`hass.callWS` for the registries:

```js
const [areas, devices, entities] = await Promise.all([
  hass.callWS({ type: "config/area_registry/list" }),
  hass.callWS({ type: "config/device_registry/list" }),
  hass.callWS({ type: "config/entity_registry/list" }),
]);
```

`generate` is async and may be slow, but the dashboard shows nothing until it
resolves. Keep it to registry reads and plain object building.

## Panel views

A view strategy returns a complete view config, which includes its `type`. So a
strategy can produce a panel view by returning one:

```js
return { type: "panel", cards: [{ type: "map", entities: [...] }] };
```

That is exactly what the built-in `map` strategy does. There is no card-level or
section-level strategy, so a panel view holding one generated card is the way to
put strategy output into a single full-width slot.

## How the Beschattung presets apply

A dashboard `tap_action` performs exactly one action, but a preset has to set a
position and a slat angle across covers that do not all have slats. One
`scene.apply` call covers it, with the target state of every cover inline:

```yaml
tap_action:
  action: perform-action
  perform_action: scene.apply
  data:
    entities:
      cover.kuche_kuche_raffstore:
        state: closed
        current_position: 0
        current_tilt_position: 50
      cover.schlafzimmer_rolladen:
        state: open
        current_position: 25
```

Nothing has to exist in Home Assistant for this: `scene.apply` takes the states
as data rather than reading a stored scene.

Two details of the cover reproducer decide what is safe to write here:

- **An axis left out is closed or opened wholesale.** The reproducer sets the
  position, then the tilt, and only then falls back to `close_cover` or
  `open_cover` for an axis no position was given for. So a Rolladen must be
  given no `current_tilt_position` at all, rather than one it would ignore.
- **`state` has to agree with the position.** It must be one of `open`,
  `opening`, `closed` or `closing`, or the reproducer logs a warning and does
  nothing at all. A cover reports `open` at every position above nought, so a
  preset parking a Rolladen at 25 says `open`, not `closed`. It happens to
  survive `closed` too, because the close step is skipped for an axis a
  position already set, but only by accident.

The reproducer also returns early when a cover already matches the target, so
tapping a preset twice sends no second command.

## Taking control

A strategy dashboard has no stored card config, so the UI editor cannot edit it.
The three-dots menu offers **Take control**, which replaces the strategy with
the config it last generated.

This is one way. After taking control the dashboard is a static card list and
stops following the strategy, so new areas and entities never appear. Edit the
strategy, or its options, instead.

## Development

The file ships unbundled, so there is no build step. Point a dashboard resource
at a local copy, edit, hard refresh.

```sh
npm run check   # node --check, the only gate against a syntax error
```

A syntax error reaches users as a dashboard that silently fails to load, which
is why CI runs the same check on every push.
