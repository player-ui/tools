load("@npm//next:index.bzl", "next")
load("@rules_player//javascript/next:next_build.bzl", "next_export")

package(default_visibility = ["//visibility:public"])

srcs = glob([
  "public/**/*",
  "pages/**/*",
  "styles/*",
  "components/**/*",
  "plugins/*",
  "utils/*",
  "config/*",
]) + [
  "next.config.mjs",
  "next-env.d.ts",
  "tsconfig.json"
]

data = [
  "//drag-and-drop/library:@player-tools/dnd-lib",
  "@npm//@player-ui/types",
  "@npm//typescript",
  "@npm//@chakra-ui/react",
  "@npm//@player-ui/reference-assets-plugin-react",
  "@npm//@types/react",
  "@npm//@types/node",
  "@npm//timm",
  "@npm//react-syntax-highlighter",
  "@npm//react-docgen-typescript"
]

next_export(
  name = "site",
  data = data,
  srcs = srcs,
  env = {
    "NODE_ENV": "production",
    # Need this b/c next will pull from env directly 
    # This just maps to a value we can stamp w/ later on
    "NEXT_PUBLIC_GA_MEASUREMENT_ID": "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  },
)

next(
  name = "start",
  args = [
    "dev", './drag-and-drop/app'
  ],
  data = data + srcs,
)