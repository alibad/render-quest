/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The old tutorial URLs are live and indexed. The rebuild replaced them with
  // /labs, so send visitors to the nearest equivalent rather than a 404.
  async redirects() {
    return [
      {
        source: '/tutorials/getting-started-with-webgl',
        destination: '/labs/transform',
        permanent: true,
      },
      { source: '/tutorials', destination: '/labs', permanent: true },
      { source: '/tutorials/:slug', destination: '/labs', permanent: true },
      { source: '/login', destination: '/labs', permanent: false },
    ];
  },
};

export default nextConfig;
