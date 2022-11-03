load(":build.bzl", "flipper_pkg")

flipper_pkg(
    name = "flipper-plugin",
    dependencies = [
        "//devtools/common",
        "//devtools/ui",
        "@npm//react-redux",
        "@npm//@reduxjs/toolkit",
    ],
    plugin_description = "A Flipper plugin able to interact with an active Player instance",
    plugin_icon = "play",
    plugin_name = "player-ui-devtools",
    plugin_title = "Player UI Devtools",
    scope = "player-tools"
)
