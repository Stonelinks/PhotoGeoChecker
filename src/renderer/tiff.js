import utif, { _binBE, _binLE } from "utif"

_binBE.readUlong = function(buff, p) {
  const i1 = _binBE.readUint(buff, p)
  const i2 = _binBE.readUint(buff, p + 4)
  return i1 * 2 ** 32 + i2
}

_binLE.readUlong = function(buff, p) {
  const i1 = _binLE.readUint(buff, p)
  const i2 = _binLE.readUint(buff, p + 4)
  return i1 + i2 * 2 ** 32
}

export async function decodeTIFF(buffer) {
  // first check the version from the header
  const header = new Uint8Array(buffer.slice(0, 4))
  let offset = 0

  const id = _binBE.readASCII(header, offset, 2)
  offset += 2

  const bin = id === "II" ? _binLE : _binBE
  const version = bin.readUshort(header, offset)

  if (version === 43) {
    // then it's a bigtiff
    return decodeBigTIFF(buffer, bin)
  } else {
    return utif.decode(buffer)
  }
}

async function decodeBigTIFF(buffer, bin) {
  const data = new Uint8Array(buffer)
  const offset = 8

  let ifdo = bin.readUlong(data, offset)

  const ifds = []
  while (true) {
    let noff = _readBigTiffIFD(bin, data, ifdo, ifds)
    ifdo = bin.readUint(data, noff)
    if (ifdo === 0) break
  }
  return ifds
}

function _readBigTiffIFD(bin, data, offset, ifds) {
  const cnt = bin.readUlong(data, offset)
  offset += 8
  const ifd = {}
  ifds.push(ifd)

  for (let i = 0; i < cnt; i++) {
    let tag = bin.readUshort(data, offset)
    offset += 2
    let type = bin.readUshort(data, offset)
    offset += 2
    let num = bin.readUlong(data, offset)
    offset += 8
    let voff = bin.readUlong(data, offset)
    offset += 8

    let arr = []
    ifd["t" + tag] = arr
    //ifd["t"+tag+"-"+UTIF.tags[tag]] = arr;
    if (type === 1 || type === 7) {
      for (let j = 0; j < num; j++) {
        arr.push(data[(num < 9 ? offset - 8 : voff) + j])
      }
    }
    if (type === 2) {
      arr.push(bin.readASCII(data, num < 9 ? offset - 8 : voff, num - 1))
    }
    if (type === 3) {
      for (let j = 0; j < num; j++) {
        arr.push(bin.readUshort(data, (num < 5 ? offset - 8 : voff) + 2 * j))
      }
    }
    if (type === 4) {
      for (let j = 0; j < num; j++) {
        arr.push(bin.readUint(data, (num < 3 ? offset - 8 : voff) + 4 * j))
      }
    }
    if (type === 5) {
      for (let j = 0; j < num; j++) {
        arr.push(
          bin.readUint(data, voff + j * 8) /
            bin.readUint(data, voff + j * 8 + 4)
        )
      }
    }
    if (type === 8) {
      for (let j = 0; j < num; j++) {
        arr.push(bin.readShort(data, (num < 5 ? offset - 8 : voff) + 2 * j))
      }
    }
    if (type === 9) {
      for (let j = 0; j < num; j++) {
        arr.push(bin.readInt(data, (num < 3 ? offset - 8 : voff) + 4 * j))
      }
    }
    if (type === 10) {
      for (let j = 0; j < num; j++) {
        arr.push(
          bin.readInt(data, voff + j * 8) / bin.readInt(data, voff + j * 8 + 8)
        )
      }
    }
    if (type === 11) {
      for (let j = 0; j < num; j++) arr.push(bin.readFloat(data, voff + j * 4))
    }
    if (type === 12) {
      for (let j = 0; j < num; j++) arr.push(bin.readDouble(data, voff + j * 8))
    }
    if (type === 16) {
      for (let j = 0; j < num; j++) {
        arr.push(bin.readUlong(data, (num < 2 ? offset - 8 : voff) + 8 * j))
      }
    }
    if (num !== 0 && arr.length === 0) {
      // console.log("unknown TIFF tag type: ", type, "num:", num)
    }
    //log(tag, type, UTIF.tags[tag], arr);
    if (tag === 330) {
      for (let j = 0; j < num; j++) _readBigTiffIFD(bin, data, arr[j], ifds)
    }
    //if(tag==34665) UTIF._readIFD(bin, data, arr[0], ifds);
  }
  return offset
}
