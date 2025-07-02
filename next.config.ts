
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Resolve Node.js core modules to false for the client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback, // Preserve existing fallbacks if any
        child_process: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        http2: false, 
        '@opentelemetry/exporter-jaeger': false, // Added fallback for Jaeger exporter
        // You can add other Node.js core modules here if they cause issues
      };
    }

    // Ignore the dataconnect-generated directory to prevent file-watching loops
    // that cause the server to restart constantly.
    // The `ignored` property is read-only, so we must push to the array instead of re-assigning it.
    if (Array.isArray(config.watchOptions.ignored)) {
      config.watchOptions.ignored.push('**/dataconnect-generated/**');
    }
    
    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
