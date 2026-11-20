// ZIP files in the browser: made from data already in the page (e.g. the pivoted trials table: makeZip, stored), and
// downloads of the server read and written again (readZip, makeDeflatedZip: e.g. a column added to an export).

// CRC-32 (IEEE) of bytes
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

const crc32 = bytes => {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// The date and time of now in the format of ZIP (MS-DOS)
const dosDateTime = () => {
  const d = new Date()
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, date }
}

// The parts of a ZIP of entries already made: [{ name (bytes), data (bytes as stored), method (0 stored, 8 deflated),
// crc, size (the bytes before compression) }]; a Blob (application/zip)
const buildZip = entries => {
  const { time, date } = dosDateTime()
  const parts = []
  const central = []
  let offset = 0
  entries.forEach(({ name, data, method, crc, size }) => {
    // Local file header
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034B50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint16(8, method, true)
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, size, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    parts.push(local.buffer, name, data)
    // Its entry in the central directory
    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014B50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(10, method, true)
    entry.setUint16(12, time, true)
    entry.setUint16(14, date, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true)
    entry.setUint32(24, size, true)
    entry.setUint16(28, name.length, true)
    entry.setUint32(42, offset, true)
    central.push(entry.buffer, name)
    offset += 30 + name.length + data.length
  })
  const centralSize = central.reduce((sum, part) => sum + (part.byteLength !== undefined ? part.byteLength : part.length), 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054B50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)
  return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' })
}

// files: [{ name, content (string, written as UTF-8) }]; the files stored, not compressed
const makeZip = files => {
  const encoder = new TextEncoder()
  return buildZip(files.map(file => {
    const data = encoder.encode(file.content)
    return { name: encoder.encode(file.name), data, method: 0, crc: crc32(data), size: data.length }
  }))
}

// Bytes through a stream of the browser (compression or decompression)
const throughStream = (bytes, stream) => new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(buffer => new Uint8Array(buffer))

// Whether the browser can read and write compressed ZIP files (CompressionStream, DecompressionStream)
const canDeflate = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

// files: [{ name, data (bytes, kept as they are) }]; the files compressed (deflate), as the downloads of the server.
// A Promise of a Blob
const makeDeflatedZip = files => {
  const encoder = new TextEncoder()
  return Promise.all(files.map(file => throughStream(file.data, new CompressionStream('deflate-raw')).then(data => ({
    name: encoder.encode(file.name),
    data,
    method: 8,
    crc: crc32(file.data),
    size: file.data.length
  })))).then(buildZip)
}

// The files of a ZIP (a Blob, e.g. a download of the server; stored or deflated, read from its central directory): a
// Promise of [{ name, data (bytes) }]
const readZip = blob => blob.arrayBuffer().then(buffer => {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  // The end of the central directory: its signature, from the end (a comment may follow it)
  let end = bytes.length - 22
  while (end >= 0 && view.getUint32(end, true) !== 0x06054B50) {
    end--
  }
  if (end < 0) {
    throw new Error('Not a ZIP file')
  }
  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const files = []
  for (let i = 0; i < count; i++) {
    const method = view.getUint16(at + 10, true)
    const compressedSize = view.getUint32(at + 20, true)
    const nameLength = view.getUint16(at + 28, true)
    const extraLength = view.getUint16(at + 30, true)
    const commentLength = view.getUint16(at + 32, true)
    const localOffset = view.getUint32(at + 42, true)
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength))
    // The data: after the local header (its own name and extra fields)
    const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true)
    files.push({ name, method, data: bytes.subarray(start, start + compressedSize) })
    at += 46 + nameLength + extraLength + commentLength
  }
  return Promise.all(files.map(f => {
    if (f.method === 0) {
      return { name: f.name, data: f.data }
    }
    if (f.method !== 8) {
      throw new Error(`ZIP method ${f.method}`)
    }
    return throughStream(f.data, new DecompressionStream('deflate-raw')).then(data => ({ name: f.name, data }))
  }))
})

export {
  makeZip,
  makeDeflatedZip,
  readZip,
  canDeflate
}
