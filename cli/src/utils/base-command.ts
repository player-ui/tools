import { Command, Flags } from "@oclif/core";
import path from "path";
import { cosmiconfig } from "cosmiconfig";
import { PlayerLanguageService } from "@player-tools/json-language-service";
import { DSLCompiler } from "@player-tools/dsl";
import type { ExportTypes } from "@player-tools/xlr-sdk";
import type { TransformFunction } from "@player-tools/xlr";
import type {
  PlayerConfigFileShape,
  PlayerConfigResolvedShape,
} from "../config";
import { CompilationContext } from "./compilation-context";
import { LogLevels } from "./log-levels";

const configLoader = cosmiconfig("player");

/** The common configs for all  */
export abstract class BaseCommand extends Command {
  static flags = {
    config: Flags.string({
      description:
        "Path to a specific config file to load.\nBy default, will automatically search for an rc or config file to load",
      char: "c",
    }),
    loglevel: Flags.string({
      char: "v",
      description: "How verbose logs should be",
      options: LogLevels,
      default: "warn",
    }),
  };

  static strict = false;

  private resolvedConfig: PlayerConfigResolvedShape | undefined;

  private async loadConfig(configFilePath?: string) {
    if (configFilePath) {
      try {
        return await configLoader.load(configFilePath);
      } catch (e: unknown) {
        this.warn(`Error loading config file: ${configFilePath}`);
      }
    }

    return configLoader.search();
  }

  private async resolveConfig(
    conf?: PlayerConfigFileShape,
    relativePath?: string,
  ): Promise<PlayerConfigResolvedShape> {
    let config: PlayerConfigResolvedShape = {
      ...(conf ?? {}),
      plugins: [],
    };

    // If there's an extension load it

    if (conf?.extends) {
      let normalizedExtension: PlayerConfigFileShape;

      if (typeof conf.extends === "string") {
        const requiredExtendedConfig = await import(conf.extends);
        normalizedExtension =
          requiredExtendedConfig.default ?? requiredExtendedConfig;
      } else {
        normalizedExtension = conf.extends;
      }

      config = {
        ...(await this.resolveConfig(normalizedExtension, relativePath)),
      };
    }

    await Promise.all(
      conf?.presets?.map(async (preset) => {
        if (typeof preset === "string") {
          const requiredExtendedConfig = await import(preset);
          const normalizedExtension =
            requiredExtendedConfig.default ?? requiredExtendedConfig;

          const extendedConfig = await this.resolveConfig(normalizedExtension);

          config.plugins = [...extendedConfig.plugins, ...config.plugins];

          return;
        }

        const presetConfig = await this.resolveConfig(preset);
        config.plugins = [...presetConfig.plugins, ...config.plugins];
      }) ?? [],
    );

    // Go through each plugin and load/create it

    if (conf?.plugins) {
      await Promise.all(
        conf?.plugins?.map(async (pluginInfo) => {
          if (typeof pluginInfo === "object" && !Array.isArray(pluginInfo)) {
            config.plugins.push(pluginInfo);
            return;
          }

          const pluginName =
            typeof pluginInfo === "string" ? pluginInfo : pluginInfo[0];
          const pluginArgs =
            typeof pluginInfo === "string" ? undefined : pluginInfo[1];

          let pluginLoadPath = pluginName;

          if (pluginName.startsWith(".")) {
            pluginLoadPath = path.resolve(relativePath ?? "", pluginName);
          }

          this.debug("loading plugin from %s", pluginLoadPath);
          // Get the instance for the plugin
          const required = await import(pluginLoadPath);

          const PluginExport = required.default ?? required;

          if (!PluginExport) {
            return;
          }

          const pluginInstance =
            typeof PluginExport === "object"
              ? PluginExport
              : new PluginExport(pluginArgs);
          config.plugins.push(pluginInstance);
        }),
      );
    }

    return config;
  }

  private async readConfig(): Promise<PlayerConfigResolvedShape> {
    const { flags } = await this.parse(BaseCommand);
    const configFile = await this.loadConfig(flags.config);
    return this.resolveConfig(configFile?.config);
  }

  protected async getPlayerConfig(): Promise<PlayerConfigResolvedShape> {
    if (this.resolvedConfig) {
      return this.resolvedConfig;
    }

    const c = await this.readConfig();
    this.resolvedConfig = c;
    return c;
  }

  async createLanguageService(exp: boolean): Promise<PlayerLanguageService> {
    const lsp = new PlayerLanguageService();

    const { plugins } = await this.getPlayerConfig();
    for (let i = 0; i < plugins.length; i++) {
      await plugins[i].onCreateLanguageService?.(lsp as any, exp);
    }

    return lsp;
  }

  async createDSLCompiler(): Promise<DSLCompiler> {
    const compiler = new DSLCompiler({
      error: this.error.bind(this),
      warn: this.warn.bind(this),
      log: this.log.bind(this),
    });
    const { plugins } = await this.getPlayerConfig();
    for (let i = 0; i < plugins.length; i++) {
      await plugins[i].onCreateDSLCompiler?.(compiler);
    }

    return compiler;
  }

  async getXLRTransforms(
    format: ExportTypes,
  ): Promise<Array<TransformFunction>> {
    const transforms: Array<TransformFunction> = [];
    const { plugins } = await this.getPlayerConfig();
    for (let i = 0; i < plugins.length; i++) {
      await plugins[i].onConvertXLR?.(format, transforms);
    }

    return transforms;
  }

  async createCompilerContext(): Promise<CompilationContext> {
    const compilerContext = new CompilationContext(
      await this.createDSLCompiler(),
    );
    const { plugins } = await this.getPlayerConfig();

    for (let i = 0; i < plugins.length; i++) {
      await plugins[i].createCompilerContext?.(compilerContext);
    }

    return compilerContext;
  }

  exit(code?: number): void {
    if (process.env.NODE_ENV !== "test") {
      super.exit(code);
    }
  }
}
