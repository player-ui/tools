"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@auto-it/core");
/**
 * Auto plugin that posts a PR comment with version information when a release is created
 */
class ReleaseInfo {
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
    const currentDate = new Date().toUTCString();
    let versionMessage = `### ${this.context}\n\n`;
    // Customize message based on release context
    switch (releaseContext) {
      case "canary":
        versionMessage += `Your PR was successfully deployed on \`${currentDate}\` with this canary version:\n\n`;
        break;
      case "next":
        versionMessage += `A new pre-release (next) version was published on \`${currentDate}\`:\n\n`;
        break;
      case "latest":
        versionMessage += `A new stable version was released on \`${currentDate}\`:\n\n`;
        break;
      default:
        versionMessage += `A new version was released on \`${currentDate}\`:\n\n`;
        break;
    }
    versionMessage += "```\n";
    versionMessage += `${version}\n`;
    versionMessage += "```";
    // Add the context-specific note if provided
    const note = this.notes[releaseContext] || this.notes.default;
    if (note) {
      versionMessage += "\n\n";
      versionMessage += note;
    }
    return versionMessage;
  }
  /** Apply the plugin to the Auto instance */
  apply(auto) {
    // Handle all releases through afterShipIt hook
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
      // Get the appropriate message for this release context
      const message = this.getVersionMessage(newVersion, releaseContext);
      // Check if we're in a PR context before attempting to comment
      const prNumber = (0, core_1.getPrNumberFromEnv)();
      if (!prNumber) {
        auto.logger.verbose.info(
          "Auto shipit was triggered outside of a PR context, skipping comment",
        );
        return;
      }
      // We have auto.comment, so we're in a PR context
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
}
exports.default = ReleaseInfo;
