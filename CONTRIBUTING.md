# How to Contribute

If you find something interesting you want contribute to the repo, feel free to raise a PR, or open an issue for features you'd like to see added.

## Proposing a Change

For small bug-fixes, documentation updates, or other trivial changes, feel free to jump straight to submitting a pull request.

If the changes are larger (API design, architecture, etc), [opening an issue](https://github.com/player-ui/player/tools/new/choose) can be helpful to reduce implementation churn as we hash out the design.

## Requirements

- [npm >= 8.19.2](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm >= 8.9.2](https://pnpm.io/)

## Building and Testing Locally

### Player Tools

For speed and consistency, this repo leverages `bazel` as it's main build tool. Check out the [bazel](https://bazel.build/) docs for more info.

After forking the repo, link npm dependencies:

```bash
pnpm i
```

And then run builds with:

```bash
bazel build //...
```

Tests can also be ran using:

```bash
bazel test //...
```

## Submitting a Pull Request

Prior to submitting a pull request, ensure that your fork and branch are up to date with the lastest changes on `main`.

Any new features should have corresponding tests that exercise all code paths, and public symbols should have docstrings at a minimum. For more complex features, adding new documentation pages to the site to help guide users to consume the feature would be preferred.

When you're ready, submit a new pull request to the `main` branch and the team will be notified of the new requested changes. We'll do our best to respond as soon as we can.

---

Inspired by react's [How to Contribute](https://reactjs.org/docs/how-to-contribute.html)
