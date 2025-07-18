/**
 * Auto plugin that posts a PR comment with version information when a release is created
 */
class ReleaseInfo {
  /**
   * @param {Object} options - Plugin options
   * @param {string} [options.context] - Comment context
   * @param {string} [options.note] - Optional note to include in the comment
   */
  constructor(options = {}) {
    /** The name of the plugin */
    this.name = "release-info";

    /** Comment context */
    this.context = options.context || "Release Info";

    /** Optional note to include in the comment */
    this.note = options.note;

    console.log("ReleaseInfo plugin initialized with context:", this.context);
  }

  /**
   * Format the build info message with version information
   * @param {string} version The version string
   * @returns {string} Formatted markdown message
   */
  formatVersionMessage(version) {
    const currentDate = new Date().toUTCString();

    let versionMessage = `### ${this.context}\n\n`;
    versionMessage += `Your PR was successfully deployed on \`${currentDate}\` with this version:\n\n`;
    versionMessage += "```\n";
    versionMessage += `${version}\n`;
    versionMessage += "```";

    // Add the optional note if provided
    if (this.note) {
      versionMessage += "\n\n";
      versionMessage += this.note;
    }

    return versionMessage;
  }

  /**
   * Post a comment with version information
   * @param {Object} auto The Auto instance
   * @param {string} version The version string
   * @returns {Promise<void>}
   */
  async postVersionComment(auto, version) {
    // Post the comment
    console.log(
      `ReleaseInfo: Attempting to post comment with version: ${version}`,
    );
    auto.logger.verbose.info(`Posting comment with version ${version}`);

    try {
      // Auto will determine where to post the comment based on the current PR context
      await auto.comment({
        message: this.formatVersionMessage(version),
        context: this.context,
      });

      auto.logger.log.info(`Successfully posted version comment`);
    } catch (error) {
      auto.logger.log.error("Failed to post comment");
      auto.logger.log.error(error);
      throw error; // Re-throw to be caught by the caller
    }
  }

  /**
   * Apply the plugin to the Auto instance
   * @param {Object} auto The Auto instance
   */
  apply(auto) {
    console.log("ReleaseInfo plugin applied to Auto instance");

    // Handle all releases through afterRelease hook
    auto.hooks.afterShipit.tap(this.name, async (releaseInfo) => {
      console.log("ReleaseInfo: afterRelease hook triggered", releaseInfo);
      try {
        // The releaseInfo object contains the newVersion property
        const { newVersion } = releaseInfo;

        if (!newVersion) {
          auto.logger.verbose.info(
            "No release version produced, skipping comment",
          );
          return;
        }

        // Check if this is a canary release by looking at the version string
        const isCanary = newVersion.includes("canary");

        auto.logger.log.info(
          `Processing ${
            isCanary ? "canary" : "regular"
          } release: ${newVersion}`,
        );

        // Only post comments for canary releases
        if (isCanary) {
          console.log(
            "ReleaseInfo: Posting version comment for canary release...",
          );
          await this.postVersionComment(auto, newVersion);
        } else {
          console.log("ReleaseInfo: Skipping non-canary release.");
        }
      } catch (error) {
        auto.logger.log.error("Failed to post comment");
        auto.logger.log.error(error);
      }
    });
  }
}

// Export the plugin as default
module.exports = ReleaseInfo;
