// This will be replaced during the build stamping
export const BASE_PREFIX = process.env.NODE_ENV === 'production' ? '/DOCS_BASE_PATH' : undefined;

export default {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PREFIX
  },
  basePath: BASE_PREFIX,
  assetPrefix: BASE_PREFIX,
  pageExtensions: ['jsx', 'js', 'ts', 'tsx'],
  webpack: (config) => {
    // eslint-disable-next-line no-param-reassign
    config.resolve.fallback = { fs: false };

    return config;
  },
};