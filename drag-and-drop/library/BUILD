load("//:index.bzl", "javascript_pipeline")

javascript_pipeline(
    name = "@player-tools/dnd-lib",
    dependencies = [
      "//xlr/types:@player-tools/xlr",
      "//language/service:@player-tools/language-service",
      "@npm//@player-ui/react",
      "@npm//react-dnd",
      "@npm//react-dnd-html5-backend",
      "@npm//uuid",
      "@npm//@types/uuid",
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