# Manual installation

The [button in the README](../README.md#installation) does all of this in one
click. These steps are for when that button does not work, or when you would
rather not use HACS at all.

## Adding the repository to HACS by hand

1. Open HACS
2. Click the three dots menu (top right) → Custom repositories
3. Add repository URL: `https://github.com/josa42/homeassistant-dashboards`
4. Category: `Dashboard`
5. Click "Add", then "Download" on Josa Dashboards
6. Reload your browser with a hard refresh

HACS registers the dashboard resource for you, so there is nothing to add under
Resources.

## Without HACS

1. Download `josa-dashboards.js` from the [latest release](https://github.com/josa42/homeassistant-dashboards/releases)
2. Copy it to `config/www/`
3. Add the resource under Settings → Dashboards → ⋮ → Resources:
   - URL: `/local/josa-dashboards.js?v=1`
   - Type: `JavaScript module`
4. Reload your browser with a hard refresh

Bump the `?v=` query every time you replace the file. Browsers cache dashboard
resources aggressively, and without a new query they keep serving the old copy,
which looks exactly like the update having no effect.

## Updating

With HACS, use the Update button on the HACS page for this repository.

Without HACS, replace the file in `config/www/` and bump the `?v=` query as
above.
