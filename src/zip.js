// A small zip writer: files stored as they are, not compressed, with UTF-8 names and no dates.
// With several cameras, Save gives one download with a folder per camera, each holding its settings.lcse, so the
// browser never renames a file to settings-2.lcse. Runs in the browser (window.Zip) and in Node (module.exports).
(function (root) {
  'use strict';
  var TABLE = null;
  function crc32(b) {
    if (!TABLE) { TABLE = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TABLE[n] = c >>> 0; } }
    var x = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) x = TABLE[(x ^ b[i]) & 255] ^ (x >>> 8);
    return (x ^ 0xFFFFFFFF) >>> 0;
  }
  // files: [{ name: 'M11-P/settings.lcse', text }]. Returns the zip's bytes.
  function bytes(files) {
    var enc = new TextEncoder(), parts = [], cd = [], off = 0, cdSize = 0;
    var u16 = function (v) { return [v & 255, (v >>> 8) & 255]; }, u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      // version 2.0, UTF-8 names (0x0800), stored, no time or date (0x21 is the earliest DOS date)
      var common = [].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      var local = new Uint8Array([].concat(u32(0x04034b50), common));
      var central = new Uint8Array([].concat(u32(0x02014b50), u16(20), common, u16(0), u16(0), u16(0), u32(0), u32(off)));
      parts.push(local, name, data); cd.push(central, name);
      off += local.length + name.length + data.length; cdSize += central.length + name.length;
    });
    parts = parts.concat(cd, [new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(off), u16(0)))]);
    var out = new Uint8Array(parts.reduce(function (n, p) { return n + p.length; }, 0)), at = 0;
    parts.forEach(function (p) { out.set(p, at); at += p.length; });
    return out;
  }

  var Zip = { crc32: crc32, bytes: bytes };
  if (typeof module !== 'undefined' && module.exports) module.exports = Zip;
  else root.Zip = Zip;
})(typeof window !== 'undefined' ? window : globalThis);
