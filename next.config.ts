import type { NextConfig } from "next";
import fs from "node:fs";

// Fix for Windows drive returning EISDIR instead of EINVAL on non-symlink paths
const fixReadlink = (path: any, err: any) => {
  if (err && (err.code === "EISDIR" || err.code === "UNKNOWN")) {
    try {
      const stat = fs.lstatSync(path);
      if (!stat.isSymbolicLink()) {
        const einval: any = new Error(`EINVAL: invalid argument, readlink '${path}'`);
        einval.code = "EINVAL";
        return einval;
      }
    } catch {}
  }
  return err;
};

const origReadlink = fs.readlink;
(fs as any).readlink = function (path: any, ...args: any[]) {
  const cb = typeof args[args.length - 1] === "function" ? args[args.length - 1] : null;
  if (!cb) return (origReadlink as any).apply(this, [path, ...args]);
  const newCb = (err: any, linkString: any) => cb(fixReadlink(path, err), linkString);
  args[args.length - 1] = newCb;
  return (origReadlink as any).apply(this, [path, ...args]);
};

const origReadlinkSync = fs.readlinkSync;
(fs as any).readlinkSync = function (path: any, options: any) {
  try {
    return origReadlinkSync(path, options);
  } catch (err: any) {
    throw fixReadlink(path, err);
  }
};

if (fs.promises && fs.promises.readlink) {
  const origReadlinkPromise = fs.promises.readlink;
  (fs.promises as any).readlink = async function (path: any, options?: any) {
    try {
      return await origReadlinkPromise(path, options);
    } catch (err: any) {
      throw fixReadlink(path, err);
    }
  };
}

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Local Windows secondary-drive workaround only; Vercel (Linux) keeps default behaviour.
    if (process.platform === "win32") {
      config.resolve.symlinks = false;
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
