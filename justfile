[doc('Build all JS/TS files')]
build-js:
  bazel build -- $(bazel query "kind(npm_package, //...)" --output label 2>/dev/null | tr '\n' ' ')

[doc('Test all JS/TS files')]
test-js:
  bazel test -- $(bazel query "kind(js_test, //...)" --output label 2>/dev/null | tr '\n' ' ')

[doc('Test all PY Files')]
test-py:
    bazel test -- $(bazel query "kind(py_test, //...) intersect attr(name, '_pytest$', //...)" --output label 2>/dev/null | tr '\n' ' ')

[doc('Lint all PY Files')]
lint-py:
    bazel test -- $(bazel query "kind(py_test, //...) intersect attr(name, '_lint$', //...)" --output label 2>/dev/null | tr '\n' ' ')