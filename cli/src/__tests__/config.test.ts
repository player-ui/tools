import { vi, test, expect } from "vitest";
import path from "path";
import { BaseCommand } from "../utils/base-command";

test("resolves config correctly", async () => {
  vi.setConfig({ testTimeout: 10000 });

  const configCallback = vi.fn();

  class ConfigLoader extends BaseCommand {
    async run() {
      configCallback(await this.getPlayerConfig());
    }
  }

  vi.mock("@test-extension", () => {
    return {
      default: {
        dsl: {
          src: "test-src",
          outDir: "output-directory",
        },
      },
    };
  });

  vi.mock("@test-preset-1", () => {
    return {
      default: {
        presets: ["@test-preset-2"],
        plugins: ["@test-plugin-2"],
      },
    };
  });

  vi.mock("@test-preset-2", () => {
    return {
      default: {
        plugins: ["@test-plugin-3"],
      },
    };
  });

  vi.mock("@test-plugin-1", () => {
    return {
      default: {
        name: "test-plugin-1",
      },
    };
  });

  vi.mock("@test-plugin-2", () => {
    return {
      default: {
        name: "test-plugin-2",
      },
    };
  });

  vi.mock("@test-plugin-3", () => {
    return {
      default: {
        name: "test-plugin-3",
      },
    };
  });

  await ConfigLoader.run([`-c`, `${path.join(__dirname, "config.test.json")}`]);

  expect(configCallback).toBeCalledWith({
    dsl: {
      src: "test-src",
      outDir: "output-directory",
    },
    plugins: [
      {
        name: "test-plugin-3",
      },
      {
        name: "test-plugin-2",
      },
      {
        name: "test-plugin-1",
      },
    ],
  });
});
