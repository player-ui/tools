"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => ReleaseInfo,
});
module.exports = __toCommonJS(index_exports);
var import_core = require("@auto-it/core");

// src/ci-utils.ts
function detectPRContext() {
  return (
    detectCircleCI() ||
    detectGitHubActions() ||
    detectJenkins() ||
    detectTravisCI() ||
    detectGeneric()
  );
}
function detectCircleCI() {
  const prNumber = process.env.CIRCLE_PR_NUMBER;
  if (prNumber) {
    return {
      number: prNumber,
      url: process.env.CIRCLE_PULL_REQUEST,
      source: "CIRCLE_PR_NUMBER",
    };
  }
  const pullRequestUrl = process.env.CIRCLE_PULL_REQUEST;
  if (pullRequestUrl) {
    const prMatch = pullRequestUrl.match(/\/pull\/(\d+)(?:\/|$)/);
    if (prMatch) {
      return {
        number: prMatch[1],
        url: pullRequestUrl,
        source: "CIRCLE_PULL_REQUEST",
      };
    }
  }
  const branch = process.env.CIRCLE_BRANCH;
  if (branch == null ? void 0 : branch.startsWith("pull/")) {
    const prMatch = branch.match(/pull\/(\d+)/);
    if (prMatch) {
      return {
        number: prMatch[1],
        source: "CIRCLE_BRANCH",
      };
    }
  }
  return null;
}
function detectGitHubActions() {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const headRef = process.env.GITHUB_HEAD_REF;
  if (eventName === "pull_request" && headRef) {
    const githubRef = process.env.GITHUB_REF;
    if (githubRef == null ? void 0 : githubRef.startsWith("refs/pull/")) {
      const prMatch = githubRef.match(/refs\/pull\/(\d+)\//);
      if (prMatch) {
        return {
          number: prMatch[1],
          source: "GITHUB_REF",
        };
      }
    }
  }
  return null;
}
function detectJenkins() {
  const ghprbPullId = process.env.ghprbPullId;
  if (ghprbPullId) {
    return {
      number: ghprbPullId,
      url: process.env.ghprbPullLink,
      source: "ghprbPullId",
    };
  }
  const prNumber = process.env.PULL_REQUEST_NUMBER;
  if (prNumber) {
    return {
      number: prNumber,
      source: "PULL_REQUEST_NUMBER",
    };
  }
  const changeId = process.env.CHANGE_ID;
  if (changeId) {
    return {
      number: changeId,
      source: "CHANGE_ID",
    };
  }
  return null;
}
function detectTravisCI() {
  const prNumber = process.env.TRAVIS_PULL_REQUEST;
  if (prNumber && prNumber !== "false") {
    return {
      number: prNumber,
      source: "TRAVIS_PULL_REQUEST",
    };
  }
  return null;
}
function detectGeneric() {
  const pullRequest = process.env.PULL_REQUEST;
  if (pullRequest) {
    if (/^\d+$/.test(pullRequest)) {
      return {
        number: pullRequest,
        source: "PULL_REQUEST",
      };
    } else {
      const prMatch = pullRequest.match(/\/pull\/(\d+)(?:\/|$)/);
      if (prMatch) {
        return {
          number: prMatch[1],
          url: pullRequest,
          source: "PULL_REQUEST",
        };
      }
    }
  }
  const ciPullRequest = process.env.CI_PULL_REQUEST;
  if (ciPullRequest) {
    if (/^\d+$/.test(ciPullRequest)) {
      return {
        number: ciPullRequest,
        source: "CI_PULL_REQUEST",
      };
    } else {
      const prMatch = ciPullRequest.match(/\/pull\/(\d+)(?:\/|$)/);
      if (prMatch) {
        return {
          number: prMatch[1],
          url: ciPullRequest,
          source: "CI_PULL_REQUEST",
        };
      }
    }
  }
  return null;
}

// src/index.ts
var ReleaseInfo = class {
  constructor(options = {}) {
    /** The name of the plugin */
    this.name = "release-info";
    this.context = options.context || "Release Info";
    this.notes = options.notes || {};
  }
  /**
   * Get the appropriate message based on the release context
   * @param version The version string
   * @param releaseContext The Auto release context (canary, next, latest, etc.)
   * @returns Formatted markdown message for comments
   */
  getVersionMessage(version, releaseContext) {
    const currentDate = /* @__PURE__ */ new Date().toUTCString();
    let versionMessage = `### ${this.context}

`;
    switch (releaseContext) {
      case "canary":
        versionMessage += `Your PR was successfully deployed on \`${currentDate}\` with this canary version:

`;
        break;
      case "next":
        versionMessage += `A new pre-release (next) version was published on \`${currentDate}\`:

`;
        break;
      case "latest":
        versionMessage += `A new stable version was released on \`${currentDate}\`:

`;
        break;
      default:
        versionMessage += `A new version was released on \`${currentDate}\`:

`;
        break;
    }
    versionMessage += "```\n";
    versionMessage += `${version}
`;
    versionMessage += "```";
    const note = this.notes[releaseContext] || this.notes.default;
    if (note) {
      versionMessage += "\n\n";
      versionMessage += note;
    }
    return versionMessage;
  }
  /** Apply the plugin to the Auto instance */
  apply(auto) {
    auto.hooks.afterShipIt.tap(this.name, async (release) => {
      const { newVersion, context: releaseContext } = release;
      if (!newVersion) {
        auto.logger.verbose.info(
          "No release version produced, skipping comment",
        );
        return;
      }
      auto.logger.verbose.info(
        `Processing ${releaseContext} release with version ${newVersion}`,
      );
      const message = this.getVersionMessage(newVersion, releaseContext);
      const autoPrNumber = (0, import_core.getPrNumberFromEnv)();
      const prContext = detectPRContext();
      const prNumber =
        autoPrNumber || (prContext == null ? void 0 : prContext.number);
      auto.logger.verbose.info(
        `Debug: Auto's getPrNumberFromEnv() = ${autoPrNumber}`,
      );
      auto.logger.verbose.info(
        `Debug: CI detection found = ${prContext ? `${prContext.number} (via ${prContext.source})` : "none"}`,
      );
      auto.logger.verbose.info(`Debug: Release context = ${releaseContext}`);
      if (!prNumber) {
        auto.logger.verbose.info(
          `Auto shipit was triggered outside of a PR context (context: ${releaseContext}), skipping comment`,
        );
        return;
      }
      try {
        await auto.comment({
          message,
          context: this.context,
        });
        auto.logger.verbose.info("Successfully posted version comment");
      } catch (error) {
        auto.logger.verbose.info("Error posting comment to PR:");
        if (error instanceof Error) {
          auto.logger.verbose.info(error.message);
        } else {
          auto.logger.verbose.info(String(error));
        }
      }
    });
  }
};
