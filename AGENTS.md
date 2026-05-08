# Plugin Marketplace Management

## Overview
The marketplace for Wave plugins is managed through a central registry file.

## Key Files
- **Marketplace Registry**: `.wave-plugin/marketplace.json`
- **Individual Plugin Config**: `plugins/<plugin-name>/.wave-plugin/plugin.json`

## Adding a New Plugin to Marketplace
To make a plugin visible in the marketplace, it must be explicitly registered in the root `.wave-plugin/marketplace.json` file.

1.  Ensure the plugin directory exists in `plugins/`.
2.  Verify the plugin has a valid `.wave-plugin/plugin.json` file.
3.  Add an entry to the `plugins` array in `.wave-plugin/marketplace.json`:

```json
{
  "name": "plugin-name",
  "description": "Brief description of the plugin",
  "source": "./plugins/plugin-name"
}
```

## Removing a Plugin from Marketplace
To remove a plugin from the marketplace:

1. Remove the corresponding entry from `.wave-plugin/marketplace.json`.
2. Optionally delete the plugin directory under `plugins/`.

## Sync README
Whenever a plugin is added or removed, update `README.md` to reflect the change:
- Add/remove the plugin entry in the **插件列表** table.
- Update the **目录结构** section if a directory was added or deleted.
