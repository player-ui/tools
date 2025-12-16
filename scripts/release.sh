#!/usr/bin/env bash
# See https://github.com/bazelbuild/rules_nodejs/blob/stable/scripts/publish_release.sh 

set -u -o pipefail

readonly PKG_NPM_LABELS=`bazel query --output=label 'kind("npm_package rule", //...) - attr("tags", "\[.*do-not-publish.*\]", //...)'`
NPM_TAG=canary

# Called by auto -- `release` for normal releases or `snapshot` for canary/next.
readonly RELEASE_TYPE=${1:-snapshot}
readonly CURRENT_BRANCH=`git symbolic-ref --short HEAD`

if [ "$RELEASE_TYPE" == "snapshot" ] && [ "$CURRENT_BRANCH" == "main" ]; then
  NPM_TAG=next
elif [ "$RELEASE_TYPE" == "release" ] && [ "$CURRENT_BRANCH" == "main" ]; then
  # Releases off the main branch are for older majors. 
  # Don't want to bump the latest tag for those

  NPM_TAG=latest
fi

for pkg in $PKG_NPM_LABELS ; do
  bazel run --config=release -- ${pkg}.npm-publish --access public --tag ${NPM_TAG}
done

# Python Publishing

readonly PKG_PYPI_LABELS=`bazel query --output=label 'kind("py_wheel rule", //...) - attr("tags", "\[.*do-not-publish.*\]", //...)'`

for pkg in $PKG_PYPI_LABELS ; do
  TWINE_USERNAME=$PYPI_USER TWINE_PASSWORD=$PYPI_TOKEN bazel run --config=release ${pkg}.publish --
done