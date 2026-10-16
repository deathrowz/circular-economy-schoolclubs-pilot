const fs = require('fs');

function mapError(e) {
  if (e && (e.code === 'ENOTSUP' || e.code === 'UNKNOWN' || e.code === 'EBUSY' || e.code === 'EPERM')) {
    const err = new Error(`EINVAL: invalid argument, readlink '${e.path}'`);
    err.code = 'EINVAL';
    err.errno = -4071;
    err.syscall = 'readlink';
    err.path = e.path;
    return err;
  }
  return e;
}

const origReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (p, opts) {
  try {
    return origReadlinkSync.call(fs, p, opts);
  } catch (e) {
    throw mapError(e);
  }
};

const origReadlink = fs.readlink;
fs.readlink = function (p, ...args) {
  const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
  if (!cb) return origReadlink.call(fs, p, ...args);
  const newCb = (err, result) => {
    cb(mapError(err), result);
  };
  args[args.length - 1] = newCb;
  return origReadlink.call(fs, p, ...args);
};

if (fs.promises && fs.promises.readlink) {
  const origPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = async function (p, opts) {
    try {
      return await origPromisesReadlink.call(fs.promises, p, opts);
    } catch (e) {
      throw mapError(e);
    }
  };
}

const origReadFileSync = fs.readFileSync;
fs.readFileSync = function (p, opts) {
  let attempts = 0;
  while (true) {
    try {
      return origReadFileSync.call(fs, p, opts);
    } catch (e) {
      if (e && e.code === 'EBUSY' && attempts < 10) {
        attempts++;
        try {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
        } catch (_) {}
        continue;
      }
      throw e;
    }
  }
};
