load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/dnd-lib",
    dependencies = [
      "//xlr/types:@player-tools/xlr",
      "@npm//@player-ui/react",
      "@npm//react-dnd",
      "@npm//react-dnd-html5-backend",
    ],
    peer_dependencies = [
      "@npm//react",
      "@npm//react-dom"
    ],
    esm_only = True,
    test_data = [
      "//common:@player-tools/static-xlrs",
    ]
)