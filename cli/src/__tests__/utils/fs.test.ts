import { vi, test, expect, afterEach } from "vitest";
import path from "path";
import fs from "fs";
import { convertToFileGlob } from "../../utils/fs";

vi.mock("path", async (importOriginal) => {
  const original: Record<string, unknown> = await importOriginal();

  return {
    ...original,
    sep: "/",
    win32: {
      sep: "\\",
    },
    posix: {
      sep: "/",
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

test("glob file on posix system for directory", () => {
  const fsSpy = vi.spyOn(fs, "statSync").mockReturnValue({
    isDirectory: () => true,
  } as any);
  const result = convertToFileGlob(["./src/main/tsx"], "**/*.(tsx|jsx|js|ts)");
  expect(result[0]).toStrictEqual("src/main/tsx/**/*.(tsx|jsx|js|ts)");
  expect(fsSpy).toHaveBeenCalledWith("./src/main/tsx", {
    throwIfNoEntry: false,
  });
});

test("does not add glob if path is not a directory", () => {
  const fsSpy = vi.spyOn(fs, "statSync").mockReturnValue({
    isDirectory: () => false,
  } as any);
  const result = convertToFileGlob(
    ["./src/main/tsx/**/*.tsx"],
    "**/*.(tsx|jsx|js|ts)",
  );
  expect(result[0]).toStrictEqual("./src/main/tsx/**/*.tsx");
  expect(fsSpy).toHaveBeenCalledWith("./src/main/tsx/**/*.tsx", {
    throwIfNoEntry: false,
  });
});

test("directory glob handling on windows", () => {
  const fsSpy = vi.spyOn(fs, "statSync").mockReturnValue({
    isDirectory: () => true,
  } as any);
  (path as any).sep = "\\";
  const result = convertToFileGlob(
    [["src", "main", "tsx"].join("\\")],
    "**/*.(tsx|jsx|js|ts)",
  );
  expect(result[0]).toStrictEqual("src\\main\\tsx/**/*.(tsx|jsx|js|ts)");
  expect(fsSpy).toHaveBeenCalledWith("src\\main\\tsx", {
    throwIfNoEntry: false,
  });
});
