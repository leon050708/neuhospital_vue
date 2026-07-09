import { ungzip } from 'pako'

const IS_LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1

const TYPE_INFO = {
  int8: { bytes: 1, ctor: Int8Array, getter: 'getInt8' },
  uint8: { bytes: 1, ctor: Uint8Array, getter: 'getUint8' },
  int16: { bytes: 2, ctor: Int16Array, getter: 'getInt16' },
  uint16: { bytes: 2, ctor: Uint16Array, getter: 'getUint16' },
  int32: { bytes: 4, ctor: Int32Array, getter: 'getInt32' },
  uint32: { bytes: 4, ctor: Uint32Array, getter: 'getUint32' },
  float: { bytes: 4, ctor: Float32Array, getter: 'getFloat32' },
  double: { bytes: 8, ctor: Float64Array, getter: 'getFloat64' }
}

function getVoxelCount(sizes) {
  return sizes.reduce((acc, value) => acc * value, 1)
}

function decodeRawData(buffer, type, endian, expectedCount) {
  const info = TYPE_INFO[type]
  if (!info) {
    throw new Error(`暂不支持的 NRRD 数据类型：${type}`)
  }

  const expectedBytes = expectedCount * info.bytes
  if (buffer.byteLength < expectedBytes) {
    throw new Error('NRRD 二进制数据长度不足')
  }

  if (info.bytes === 1) {
    return new info.ctor(buffer.slice(0, expectedBytes))
  }

  const dataIsLittleEndian = endian === 'little'
  if (dataIsLittleEndian === IS_LITTLE_ENDIAN) {
    return new info.ctor(buffer.slice(0, expectedBytes))
  }

  const output = new info.ctor(expectedCount)
  const view = new DataView(buffer, 0, expectedBytes)
  for (let index = 0; index < expectedCount; index += 1) {
    output[index] = view[info.getter](index * info.bytes, dataIsLittleEndian)
  }
  return output
}

function ensureDataPayload(parsed) {
  if (parsed?.data?.length) {
    return parsed
  }

  if (parsed.dataFile) {
    throw new Error('该 NRRD 使用外部 data file，当前前端无法直接读取')
  }

  if (!parsed.buffer) {
    throw new Error('NRRD 数据为空，无法渲染')
  }

  const totalCount = getVoxelCount(parsed.sizes ?? [])
  const encoding = parsed.encoding?.toLowerCase()

  if (encoding === 'gzip' || encoding === 'gz') {
    const compressed = new Uint8Array(parsed.buffer)
    const inflated = ungzip(compressed)
    parsed.data = decodeRawData(
      inflated.buffer.slice(inflated.byteOffset, inflated.byteOffset + inflated.byteLength),
      parsed.type,
      parsed.endian ?? 'little',
      totalCount
    )
    return parsed
  }

  throw new Error(`当前前端暂不支持该 NRRD 编码：${parsed.encoding}`)
}

function getDataRange(values) {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (let index = 0; index < values.length; index += 1) {
    const value = Number(values[index])
    if (value < min) min = value
    if (value > max) max = value
  }

  return {
    min: Number.isFinite(min) ? min : 0,
    max: Number.isFinite(max) ? max : 0
  }
}

async function loadNrrdLibrary() {
  const module = await import('nrrd-js')
  return module.default || module
}

export async function parseNrrdArrayBuffer(arrayBuffer) {
  const nrrd = await loadNrrdLibrary()
  const parsed = ensureDataPayload(nrrd.parse(arrayBuffer))
  const dimensions = parsed.sizes?.slice(0, 3)

  if (!Array.isArray(dimensions) || dimensions.length < 3) {
    throw new Error('仅支持 3D NRRD 体数据')
  }

  const [x, y, z] = dimensions
  const scalars = parsed.data
  const { min, max } = getDataRange(scalars)

  return {
    scalars,
    dimensions: [x, y, z],
    min,
    max
  }
}

export function windowToUint8(sliceArray, windowCenter, windowWidth) {
  const width = Math.max(windowWidth, 1)
  const lower = windowCenter - width / 2
  const upper = windowCenter + width / 2
  const output = new Uint8ClampedArray(sliceArray.length)

  for (let index = 0; index < sliceArray.length; index += 1) {
    const value = Number.isFinite(sliceArray[index]) ? sliceArray[index] : 0
    const mapped = ((value - lower) / (upper - lower)) * 255
    output[index] = Math.max(0, Math.min(255, mapped))
  }

  return output
}

export function extractAxialSlice(volume, sliceIndex) {
  const { scalars, dimensions } = volume
  const [xDim, yDim, zDim] = dimensions
  const z = Math.max(0, Math.min(zDim - 1, sliceIndex))
  const sliceLength = xDim * yDim
  const output = new Float32Array(sliceLength)
  const zOffset = z * sliceLength

  for (let index = 0; index < sliceLength; index += 1) {
    output[index] = scalars[zOffset + index]
  }

  return { data: output, width: xDim, height: yDim }
}

export function extractCoronalSlice(volume, yIndex) {
  const { scalars, dimensions } = volume
  const [xDim, yDim, zDim] = dimensions
  const y = Math.max(0, Math.min(yDim - 1, yIndex))
  const output = new Float32Array(xDim * zDim)

  for (let z = 0; z < zDim; z += 1) {
    for (let x = 0; x < xDim; x += 1) {
      output[(zDim - 1 - z) * xDim + x] = scalars[z * xDim * yDim + y * xDim + x]
    }
  }

  return { data: output, width: xDim, height: zDim }
}

export function extractSagittalSlice(volume, xIndex) {
  const { scalars, dimensions } = volume
  const [xDim, yDim, zDim] = dimensions
  const x = Math.max(0, Math.min(xDim - 1, xIndex))
  const output = new Float32Array(yDim * zDim)

  for (let z = 0; z < zDim; z += 1) {
    for (let y = 0; y < yDim; y += 1) {
      output[(zDim - 1 - z) * yDim + y] = scalars[z * xDim * yDim + y * xDim + x]
    }
  }

  return { data: output, width: yDim, height: zDim }
}
