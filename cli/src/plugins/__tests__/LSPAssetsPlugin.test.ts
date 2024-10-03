import { PlayerLanguageService } from "@player-tools/json-language-service";
import { vi, test, expect, describe, beforeEach } from "vitest";
import { LSPAssetsPlugin } from "../LSPAssetsPlugin";

describe("LSPAssetPlugin tests", () => {
  const mockSetAssetTypes = vi.fn();
  const mockSetAssetTypesFromModule = vi.fn();

  const mockLSP: PlayerLanguageService = {
    setAssetTypes: mockSetAssetTypes,
    setAssetTypesFromModule: mockSetAssetTypesFromModule,
  } as unknown as PlayerLanguageService;

  beforeEach(() => {
    mockSetAssetTypes.mockClear();
    mockSetAssetTypesFromModule.mockClear();
  });

  test("It should load assets from the filesystem by default (legacy)", async () => {
    const testPlugin = new LSPAssetsPlugin({ path: "some/path" });
    await testPlugin.onCreateLanguageService(mockLSP, false);

    expect(mockSetAssetTypes).toHaveBeenCalledWith(["some/path"]);
    expect(mockSetAssetTypesFromModule).not.toHaveBeenCalled();
  });

  test("It should load assets from the filesystem ", async () => {
    const testPlugin = new LSPAssetsPlugin({
      path: "some/path",
      type: "manifest",
    });
    await testPlugin.onCreateLanguageService(mockLSP, false);

    expect(mockSetAssetTypes).toHaveBeenCalledWith(["some/path"]);
    expect(mockSetAssetTypesFromModule).not.toHaveBeenCalled();
  });

  test("It should load assets from a module", async () => {
    const testPlugin = new LSPAssetsPlugin({
      manifest: { pluginName: "test", capabilities: {} },
      type: "module",
    });
    await testPlugin.onCreateLanguageService(mockLSP, false);

    expect(mockSetAssetTypesFromModule).toHaveBeenCalledWith([
      {
        pluginName: "test",
        capabilities: {},
      },
    ]);
    expect(mockSetAssetTypes).not.toHaveBeenCalled();
  });

  test("It should load assets from a mixed config", async () => {
    const testPlugin = new LSPAssetsPlugin([
      { manifest: { pluginName: "test", capabilities: {} }, type: "module" },
      { path: "some/path", type: "manifest" },
    ]);
    await testPlugin.onCreateLanguageService(mockLSP, false);

    expect(mockSetAssetTypesFromModule).toHaveBeenCalledWith([
      {
        pluginName: "test",
        capabilities: {},
      },
    ]);
    expect(mockSetAssetTypes).toHaveBeenCalledWith(["some/path"]);
  });
});
