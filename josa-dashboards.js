const STRATEGY_VERSION = "0.2.2";

// Which build is loaded is the first question on any bug report, and a
// dashboard resource has nowhere else to say so. scripts/release.sh keeps this
// in step with the tag.
console.info(
  `%c JOSA-DASHBOARDS %c ${STRATEGY_VERSION} `,
  "color:#fff;background:#03a9f4;font-weight:700",
  "color:#03a9f4;background:#fff;font-weight:700"
);

// CoverEntityFeature.SET_TILT_POSITION. A cover that supports it has slats,
// which is the only thing separating a Raffstore from a Rolladen here: both
// report device_class "shutter", and both are named by hand, so neither the
// device class nor the name can be trusted to tell them apart.
const SUPPORT_SET_TILT_POSITION = 128;

const DEFAULT_FLOORS = ["eg", "dg"];

const PRESETS = [
  { id: "closed", name: "Alles zu", icon: "mdi:window-shutter" },
  { id: "shade", name: "Beschattung", icon: "mdi:blinds-horizontal" },
  { id: "open", name: "Alles auf", icon: "mdi:window-shutter-open" },
];

const collator = new Intl.Collator("de");

// A cover sits at "open" for every position above nought, so a preset that
// parks a Rolladen part way down has to say so. Claiming "closed" there would
// still work by accident, because the reproducer skips the close step for an
// axis a position already set, but only by accident.
function positionState(position) {
  return position <= 0
    ? { state: "closed", current_position: 0 }
    : { state: "open", current_position: position };
}

// The target state one cover should reach for one preset. scene.apply hands
// these to the cover reproducer, which sets position and tilt in a single pass
// and only falls back to close/open for an axis the target state leaves out.
// Tilt is therefore omitted for a Rolladen rather than set to some default.
function presetState(preset, hasTilt, options) {
  if (preset === "closed") {
    return hasTilt
      ? { state: "closed", current_position: 0, current_tilt_position: 0 }
      : { state: "closed", current_position: 0 };
  }
  if (preset === "open") {
    return hasTilt
      ? { state: "open", current_position: 100, current_tilt_position: 100 }
      : { state: "open", current_position: 100 };
  }
  // Beschattung: a Raffstore closes and turns its slats, a Rolladen has no
  // slats to turn and goes part way down instead.
  return hasTilt
    ? {
        state: "closed",
        current_position: 0,
        current_tilt_position: options.tiltShade,
      }
    : positionState(options.rollerShade);
}

function floorIcon(floor) {
  if (floor?.icon) return floor.icon;
  const level = floor?.level;
  if (level === null || level === undefined) return "mdi:home-floor-g";
  if (level < 0) return "mdi:home-floor-b";
  return ["mdi:home-floor-g", "mdi:home-floor-1", "mdi:home-floor-2", "mdi:home-floor-3"][level] || "mdi:home-floor-3";
}

async function loadRegistries(hass) {
  const [floors, areas, devices, entities] = await Promise.all([
    hass.callWS({ type: "config/floor_registry/list" }),
    hass.callWS({ type: "config/area_registry/list" }),
    hass.callWS({ type: "config/device_registry/list" }),
    hass.callWS({ type: "config/entity_registry/list" }),
  ]);
  return { floors, areas, devices, entities };
}

// Every cover on one of the requested floors, with the two facts the cards
// need: where it lives, and whether it has slats. An entity carries its own
// area only when it has been overridden, so fall back to its device's.
function collectCovers(hass, registries, options) {
  const areaById = new Map(registries.areas.map((a) => [a.area_id, a]));
  const deviceById = new Map(registries.devices.map((d) => [d.id, d]));
  const covers = [];

  for (const entry of registries.entities) {
    if (!entry.entity_id.startsWith("cover.")) continue;
    if (entry.disabled_by || entry.hidden_by) continue;
    if (options.exclude.has(entry.entity_id)) continue;

    const state = hass.states[entry.entity_id];
    if (!state) continue;

    const areaId = entry.area_id ?? deviceById.get(entry.device_id)?.area_id ?? null;
    const area = areaId ? areaById.get(areaId) : null;
    if (!area || !options.floors.includes(area.floor_id)) continue;

    covers.push({
      entityId: entry.entity_id,
      name: state.attributes.friendly_name || entry.entity_id,
      area,
      floorId: area.floor_id,
      hasTilt: Boolean(state.attributes.supported_features & SUPPORT_SET_TILT_POSITION),
    });
  }

  return covers.sort((a, b) => collator.compare(a.name, b.name));
}

function presetSection(floor, floorId, covers, options) {
  return {
    type: "grid",
    cards: [
      {
        type: "heading",
        heading: floor?.name || floorId,
        heading_style: "title",
        icon: floorIcon(floor),
      },
      // A button card puts a large icon above its name and cannot be turned
      // round. The shortcut card builds on the same ha-tile-container as the
      // tile card, so it reads as a compact row: small icon, label beside it.
      // Three at four columns fill one row of the section's twelve.
      ...PRESETS.map((preset) => ({
        type: "shortcut",
        label: preset.name,
        icon: preset.icon,
        grid_options: { columns: 4 },
        tap_action: {
          action: "perform-action",
          perform_action: "scene.apply",
          data: {
            entities: Object.fromEntries(
              covers.map((cover) => [
                cover.entityId,
                presetState(preset.id, cover.hasTilt, options),
              ])
            ),
          },
        },
      })),
    ],
  };
}

// The cover_control integration puts a cover's automation entities on their
// own device rather than the cover's, so the registries alone cannot pair them
// up. Two things make it work anyway: every entity for one cover shares that
// cover's config subentry, and the decision sensor names its cover in a
// `cover_entity` attribute. An instance without the integration yields an empty
// map, and the cover tiles are then the whole section.
const CONTROL_PLATFORM = "cover_control";

function collectControls(hass, registries) {
  const bySubentry = new Map();
  for (const entry of registries.entities) {
    if (entry.platform !== CONTROL_PLATFORM) continue;
    // Hub entities carry no subentry, which is what separates them here.
    if (!entry.config_subentry_id || !entry.translation_key) continue;
    const group = bySubentry.get(entry.config_subentry_id) ?? {};
    group[entry.translation_key] = entry.entity_id;
    bySubentry.set(entry.config_subentry_id, group);
  }

  const byCover = new Map();
  for (const group of bySubentry.values()) {
    if (!group.decision) continue;
    const coverEntity = hass.states[group.decision]?.attributes.cover_entity;
    if (coverEntity) byCover.set(coverEntity, group);
  }
  return byCover;
}

function controlCards(control) {
  const cards = [];
  if (!control) return cards;

  if (control.decision) {
    cards.push({
      type: "tile",
      entity: control.decision,
      name: "Automatik",
    });
  }

  if (control.resume) {
    cards.push({
      type: "tile",
      entity: control.resume,
      name: "Fortsetzen",
      icon: "mdi:play",
      // A tile opens more-info by default, which is not what a button is for.
      tap_action: {
        action: "perform-action",
        perform_action: "button.press",
        target: { entity_id: control.resume },
      },
      // The integration already decides when resuming means anything: the
      // button reports unavailable unless the cover is paused or overridden.
      // Mirroring that beats a second guess at the same question.
      visibility: [
        { condition: "state", entity: control.resume, state_not: "unavailable" },
      ],
    });
  }

  return cards;
}

// One cover: its card, and everything else that controls it beside it.
//
// The controls go in a single stack rather than as grid items of their own.
// Two cards of four columns would fill the row beside the cover only while
// both are showing; the moment Fortsetzen hides, the second slot empties and
// the next cover cannot move up into it, which is the ragged edge this layout
// had before. One stack always occupies exactly one slot.
//
// A cover the integration does not manage has nothing to put beside it, so its
// card takes the full width instead of leaving a third of the row empty.
function coverCards(cover, control) {
  const tile = {
    type: "tile",
    entity: cover.entityId,
    state_content: cover.hasTilt
      ? ["state", "current_position", "current_tilt_position"]
      : ["state", "current_position"],
    features_position: "bottom",
    // Favourite buttons rather than sliders. Their values are not ours to
    // set: the feature reads options.cover.favorite_positions off the
    // entity registry, falling back to [0, 25, 75, 100]. A Rolladen gets
    // no tilt row, because the feature renders nothing without slats.
    features: cover.hasTilt
      ? [{ type: "cover-position-favorite" }, { type: "cover-tilt-favorite" }]
      : [{ type: "cover-position-favorite" }],
  };

  const controls = controlCards(control);
  if (!controls.length) return [tile];

  return [
    { ...tile, grid_options: { columns: 8 } },
    { type: "vertical-stack", cards: controls, grid_options: { columns: 4 } },
  ];
}

function coverSection(covers, controls) {
  const area = covers[0].area;
  return {
    type: "grid",
    cards: [
      {
        type: "heading",
        heading: area.name,
        heading_style: "subtitle",
        icon: area.icon || "mdi:window-shutter",
      },
      ...covers.flatMap((cover) => coverCards(cover, controls.get(cover.entityId))),
    ],
  };
}

function groupByArea(covers) {
  const byArea = new Map();
  for (const cover of covers) {
    const group = byArea.get(cover.area.area_id);
    if (group) group.push(cover);
    else byArea.set(cover.area.area_id, [cover]);
  }
  return [...byArea.values()].sort((a, b) => collator.compare(a[0].area.name, b[0].area.name));
}

// A view strategy generates a single view. It is resolved as
// `ll-strategy-view-<type>`, a registry separate from the dashboard one, so the
// same name may exist at both levels without clashing.
class JosaBeschattungViewStrategy extends HTMLElement {
  static async generate(config, hass) {
    const options = {
      floors: config.floors || DEFAULT_FLOORS,
      tiltShade: config.tilt_shade ?? 50,
      rollerShade: config.roller_shade ?? 25,
      exclude: new Set(config.exclude || []),
    };

    const registries = await loadRegistries(hass);
    const covers = collectCovers(hass, registries, options);
    const controls = collectControls(hass, registries);

    if (!covers.length) {
      return {
        type: "sections",
        sections: [
          {
            type: "grid",
            cards: [
              {
                type: "markdown",
                content: `Keine Cover auf ${options.floors.join(", ")} gefunden. Prüfe, ob die Rollos und Raffstores einem Raum auf diesen Etagen zugeordnet sind.`,
              },
            ],
          },
        ],
      };
    }

    const floorById = new Map(registries.floors.map((f) => [f.floor_id, f]));
    const sections = [];

    // Presets first, one block per floor, in the order the floors were given.
    for (const floorId of options.floors) {
      const floorCovers = covers.filter((cover) => cover.floorId === floorId);
      if (!floorCovers.length) continue;
      sections.push(presetSection(floorById.get(floorId), floorId, floorCovers, options));
    }

    // Then every cover on its own, grouped by room.
    for (const floorId of options.floors) {
      const floorCovers = covers.filter((cover) => cover.floorId === floorId);
      for (const areaCovers of groupByArea(floorCovers)) {
        sections.push(coverSection(areaCovers, controls));
      }
    }

    return {
      type: "sections",
      max_columns: config.max_columns ?? 2,
      sections,
    };
  }
}

// A dashboard strategy generates a whole dashboard: `views`, and whatever else
// belongs beside them. Home Assistant resolves it as
// `ll-strategy-dashboard-<type>` when a dashboard config carries
// `strategy: { type: "custom:josa-home" }`.
//
// The views it returns may carry a `strategy` key of their own, which is how
// the work of filling a view is deferred until that view is opened.
class JosaHomeDashboardStrategy extends HTMLElement {
  // Offers the strategy when a user creates a new dashboard from the UI.
  static getCreateSuggestions(_hass) {
    return {
      title: "Josa Home",
      icon: "mdi:view-dashboard",
    };
  }

  static async generate(config, _hass) {
    return {
      title: config.title || "Josa Home",
      views: [
        {
          title: "Beschattung",
          path: "beschattung",
          icon: "mdi:window-shutter",
          strategy: { type: "custom:josa-beschattung" },
        },
      ],
    };
  }
}

customElements.define("ll-strategy-dashboard-josa-home", JosaHomeDashboardStrategy);
customElements.define("ll-strategy-view-josa-beschattung", JosaBeschattungViewStrategy);

window.customStrategies = window.customStrategies || [];
window.customStrategies.push({
  type: "josa-home",
  strategyType: "dashboard",
  name: "Josa Home",
  description: "A dashboard generated from JavaScript",
  documentationURL: "https://github.com/josa42/homeassistant-dashboards",
});
