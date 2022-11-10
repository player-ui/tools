# Player UI Devtools Flipper Plugin

### Usage

1. Install `Flipper`: https://fbflipper.com/docs/getting-started/#installation
2. Install `flipper-plugin-player-ui-devtools` plugin:

![flipper-plugin-player-ui-devtools](https://user-images.githubusercontent.com/9255651/200911914-376134d1-247b-4a9d-bada-593a3ebfb0f5.png)

3. Enable plugin
4. Connect to app, open plugin, and start debugging!

### Local Development

1. Install `Flipper` (Pick one)
   1. From source: Clone [`flipper`](https://github.com/facebook/flipper) source and [follow instructions to start locally](https://fbflipper.com/docs/extending/dev-setup/#running-flipper-from-source-recommended): `cd desktop && yarn && yarn start --plugin-marketplace`
   2. Or as application: https://fbflipper.com/docs/getting-started/#installation
2. (Only if running from source) Configure `flipper` to only load this plugin: `cd flipper/desktop && echo "FLIPPER_ENABLED_PLUGINS=player-ui-devtools\nFLIPPER_OPEN_DEV_TOOLS=true" > .env`
3. Build and install this plugin (and rebuild for additional changes): `bazel run //devtools/flipper-plugin:install`

### Troubleshooting

#### Player UI Devtools plugin doesn't show up

If loaded correctly, the plugin should show up as `Unavailable` if there is no application connected that has required this plugin, and as `Disabled` or `Enabled` if there is an application connected that has required this plugin. If the plugin doesn't show up at all, it is either not installed correctly, or Flipper is not configured properly to load installed plugins. Ensure the following:

- `~/.flipper/installed-plugins` contains this plugin (can be remedied with `bazel run //devtools/flipper-plugin:install`)
- that you've started Flipper with `--plugin-marketplace` (only applies if running Flipper from source, if running as an installed app, this should be enabled automatically, but you can verify in the settings if the plugin marketplace is enabled)
- that this plugin is listed in the `FLIPPER_ENABLED_PLUGINS` `.env` var
- there are no errors in the console trying to load the plugin
