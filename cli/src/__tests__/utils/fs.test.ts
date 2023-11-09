import path from 'path';
import fs from 'fs';
import { convertToFileGlob } from '../../utils/fs';

const winPathSep = '\\';
const posixPathSep = '/';

jest.mock('path', () => {
  const original = jest.requireActual('path');
  return {
    ...original,
    sep: posixPathSep,
    win32: {
      sep: winPathSep,
    },
    posix: {
      sep: posixPathSep,
    },
  };
});

afterAll(() => {
  jest.restoreAllMocks();
});

test('glob file on posix system for directory', () => {
  const fsSpy = jest.spyOn(fs, 'statSync').mockReturnValue({
    isDirectory: () => true,
  } as any);
  const result = convertToFileGlob(['./src/main/tsx'], '**/*.(tsx|jsx|js|ts)');
  expect(result[0]).toStrictEqual('src/main/tsx/**/*.(tsx|jsx|js|ts)');
  expect(fsSpy).toHaveBeenCalledWith('./src/main/tsx');
});

test('does not add glob if path is not a directory', () => {
  const fsSpy = jest.spyOn(fs, 'statSync').mockReturnValue({
    isDirectory: () => false,
  } as any);
  const result = convertToFileGlob(
    ['./src/main/tsx/**/*.tsx'],
    '**/*.(tsx|jsx|js|ts)'
  );
  expect(result[0]).toStrictEqual('./src/main/tsx/**/*.tsx');
  expect(fsSpy).toHaveBeenCalledWith('./src/main/tsx/**/*.tsx');
});

test('directory glob handling on windows', () => {
  const fsSpy = jest.spyOn(fs, 'statSync').mockReturnValue({
    isDirectory: () => true,
  } as any);
  (path as any).sep = winPathSep;
  const result = convertToFileGlob(
    [['src', 'main', 'tsx'].join('\\')],
    '**/*.(tsx|jsx|js|ts)'
  );
  expect(result[0]).toStrictEqual('src/main/tsx/**/*.(tsx|jsx|js|ts)');
  expect(fsSpy).toHaveBeenCalledWith('src\\main\\tsx');
});
