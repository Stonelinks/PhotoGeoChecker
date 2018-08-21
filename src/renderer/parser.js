import mime from "mime"
import utif, { _readIFD } from "utif"
import exifParser from "exif-parser"

import { decodeTIFF } from "./tiff"
import { parseXMP } from "./xmp"

export const FileCategory = {
  RGB_IMAGE: "rgb_image",
  RGB_45MM_IMAGE: "rgb_45mm_image",
  RGB_OBLIQUE_IMAGE: "rgb_oblique_image",
  THERMAL_IMAGE: "thermal_image",
  LAYER: "layer",
}

const MAX_FILE_READ_SIZE = 1000000

export async function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file.slice(0, MAX_FILE_READ_SIZE))
    reader.onload = async () => {
      const data = await parseBuffer(reader.result, mime.getType(file.name))
      resolve(data)
    }
  })
}

async function parseBuffer(buffer, mimetype) {
  const data = {
    category: null,
    isGeoTIFF: false,
  }

  try {
    switch (mimetype) {
      case "image/jpeg":
        await parseJPEG(buffer, data)
        break
      case "image/tiff":
        await parseTIFF(buffer, data)
        break
    }
  } catch (err) {
    data.category = null
    data.err = err
  }

  return data
}

async function parseJPEG(buffer, data) {
  const exifResult = exifParser.create(buffer, window).parse()
  const xmpResult = await parseXMP(buffer)
  if (exifResult.tags.FocalLength === 45) {
    data.category = FileCategory.RGB_45MM_IMAGE
  } else if (Math.abs(parseFloat(xmpResult.gimbalPitchDegree) + 90) > 15) {
    data.category = FileCategory.RGB_OBLIQUE_IMAGE
  } else {
    data.category = FileCategory.RGB_IMAGE
  }
  data.coordinates = exifCoordinates(exifResult)
}

async function parseTIFF(buffer, data) {
  const ifds = await decodeTIFF(buffer)
  if (!ifds || ifds.length < 1 || Object.keys(ifds[0]).length === 0) {
    return
  }
  data.category = FileCategory.RGB_IMAGE
  const ifd = ifds[0]
  // check make
  if (ifd.t272 && ifd.t272[0] === "FLIR") {
    data.category = FileCategory.THERMAL_IMAGE
  }
  // check presence of GeoAsciiParamsTag
  if (ifd.t34737) {
    data.isGeoTIFF = true
    data.category = FileCategory.LAYER
  }

  // parse coordinates
  const gpsIFD = ifd.t34853 && ifd.t34853[0]
  if (gpsIFD) {
    const gpsTagsList = []
    _readIFD(utif._binLE, new Uint8Array(buffer), gpsIFD, gpsTagsList)
    const gpsTags = gpsTagsList && gpsTagsList[0]
    data.coordinates = tiffCoordinates(gpsTags)
  }
}

function exifCoordinates(exifResult) {
  if (!exifResult) {
    return null
  }
  const tags = exifResult.tags
  if (tags.GPSLatitude && tags.GPSLongitude) {
    return {
      type: "Point",
      coordinates: [tags.GPSLongitude, tags.GPSLatitude],
    }
  }
  return null
}

function tiffCoordinates(gpsTags) {
  const lat = getCoordinatesFromTiffTag(gpsTags.t1, gpsTags.t2, "S")
  const long = getCoordinatesFromTiffTag(gpsTags.t3, gpsTags.t4, "W")
  if (lat !== undefined && long !== undefined) {
    return {
      type: "Point",
      coordinates: [long, lat],
    }
  }
  return null
}

function getCoordinatesFromTiffTag(tag1, tag2, negativeDirection) {
  if (!tag1 || tag1.length !== 1 || !tag2 || tag2.length !== 3) {
    return undefined
  }
  const sign = tag1[0] === negativeDirection ? -1 : 1
  return sign * (tag2[0] + tag2[1] / 60 + tag2[2] / 3600)
}
