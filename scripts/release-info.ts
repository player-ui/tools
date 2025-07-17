import { Auto, IPlugin } from "@auto-it/core";

/**
 * Auto plugin that posts a PR comment with version information when a release is created
 */
export default class ReleaseInfo implements IPlugin {
  /** The name of the plugin */
  name = "release-info";

  /** Comment context */
  private context: string;

  /** Optional note to include in the comment */
  private note?: string;

  constructor(options: { context?: string; note?: string } = {}) {
    this.context = options.context || "Release Info";
    this.note = options.note;
  }

  /**
   * Format the build info message with version information
   * @param version The version string
   * @returns Formatted markdown message
   */
  private formatVersionMessage(version: string): string {
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
   * @param auto The Auto instance
   * @param version The version string
   */
  private async postVersionComment(auto: Auto, version: string): Promise<void> {
    // Post the comment
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

  /** Apply the plugin to the Auto instance */
  apply(auto: Auto): void {
    // Handle all releases through afterRelease hook
    auto.hooks.afterRelease.tap(this.name, async (release) => {
      try {
        // Handle both string version and release object
        let newVersion: string | undefined;

        if (typeof release === "string") {
          newVersion = release;
        } else if (release && release.newVersion) {
          newVersion = release.newVersion;
        }

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
          await this.postVersionComment(auto, newVersion);
        }
      } catch (error) {
        auto.logger.log.error("Failed to post comment");
      }
    });
  }
}
