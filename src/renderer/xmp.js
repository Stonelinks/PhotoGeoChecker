// parts of this code is taken from https://github.com/softbrix/xmp-reader/blob/master/index.js
// MIT license https://github.com/softbrix/xmp-reader/blob/master/LICENSE
// Copyright (c) 2016 Alexander Kuznetsov (<alexander@kuznetsov.by>)

import sax from "sax"

const markerBegin = "<x:xmpmeta"
const markerEnd = "</x:xmpmeta>"

/* The text-content of these tags are ignored in the output */
const envelopeTags = [
  "x:xmpmeta",
  "rdf:RDF",
  "rdf:Description",
  "rdf:Bag",
  "rdf:Alt",
  "rdf:Seq",
  "rdf:li",
  "mwg-rs:RegionList"
]

export function parseXMP(buffer) {
  return new Promise((resolve, reject) => {
    let data = {
      raw: {}
    }
    const xmpString = getXMPString(buffer)
    if (!xmpString) {
      return resolve(data)
    }

    const parser = sax.parser(true)

    let nodeName
    let nodePath = []

    parser.onerror = err => reject(err)
    parser.onend = () => resolve(data)

    parser.onopentag = function(node) {
      nodeName = node.name
      nodePath.push(node.name)
    }

    parser.onclosetag = function(node) {
      nodePath.pop()
    }

    function getLastKeyFromPath(path) {
      return path.filter(p => envelopeTags.indexOf(p) < 0).pop()
    }

    function getKeyFromPath(path) {
      return (
        path
          .filter(p => envelopeTags.indexOf(p) < 0)
          /* .map(p => keyTransform[p] || p)*/
          .map(p => (p.indexOf(":") >= 0 ? p.split(":")[1] : p))
          .map(
            (p, i) =>
              i === 0 ? lowercaseFirstLetter(p) : capitalizeFirstLetter(p)
          )
          .join("")
      )
    }

    function getKeyFromAttributeName(attributeName) {
      return lowercaseFirstLetter(
        attributeName.indexOf(":") >= 0
          ? attributeName.split(":")[1]
          : attributeName
      )
    }

    function updateData(oldData, newData) {
      if (oldData === undefined) {
        return newData
      } else {
        if (!Array.isArray(oldData)) {
          return [oldData, newData]
        }
        oldData.push(newData)
        return oldData
      }
    }

    parser.ontext = function(text) {
      if (text.trim() !== "") {
        var value
        switch (nodeName) {
          case "stArea:x":
          case "stArea:y":
          case "stArea:w":
          case "stArea:h":
            value = parseFloat(text)
            break
          case "xmp:Rating":
            value = parseInt(text)
            break
          case "MicrosoftPhoto:Rating":
            value = Math.floor((parseInt(text) + 12) / 25) + 1
            break
          default:
            value = text
        }
        let rawKey = getLastKeyFromPath(nodePath)
        data.raw[rawKey] = updateData(data.raw[rawKey], value)

        let key = getKeyFromPath(nodePath)
        data[key] = updateData(data[key], value)
      }
    }

    parser.onattribute = function(attr) {
      let value = attr.value
      let rawKey = attr.name
      data.raw[rawKey] = updateData(data.raw[rawKey], value)

      let key = getKeyFromAttributeName(rawKey)
      data[key] = updateData(data[key], value)
    }

    parser.write(xmpString).close()
  })
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

function lowercaseFirstLetter(string) {
  return string.charAt(0).toLowerCase() + string.slice(1)
}

function getXMPString(buffer) {
  const array = new Uint8Array(buffer)
  const beginByte = markerBegin.charCodeAt(0)
  let cursor = -1
  let loopCount = 0
  let xmpString = ""
  do {
    cursor =
      array.slice(cursor + 1, array.length).indexOf(beginByte) + cursor + 1
    const s = String.fromCharCode.apply(
      null,
      array.slice(cursor, cursor + markerBegin.length)
    )
    if (s === markerBegin) {
      xmpString = s
      cursor += markerBegin.length
      break
    }
    loopCount++
  } while (cursor >= 0 && loopCount < 1000)
  if (!xmpString) {
    return null
  }
  loopCount = 0
  let valid = false
  do {
    const s = String.fromCharCode.apply(
      null,
      array.slice(cursor, cursor + 1000)
    )
    cursor += 1000
    const offsetEnd = s.indexOf(markerEnd)
    if (offsetEnd >= 0) {
      xmpString += s.slice(0, offsetEnd + markerEnd.length)
      valid = true
      break
    }
    xmpString += s
    loopCount++
  } while (loopCount < 100)
  if (valid) {
    return xmpString
  }
  return null
}
