import _ from "lodash"
import React from "react"
import ReactDOM from "react-dom"
import Dropzone from "react-dropzone"
import { Map, TileLayer, Marker, Popup } from "react-leaflet"

import MDSpinner from "react-md-spinner"

import "leaflet/dist/leaflet.css"

import bbox from "@turf/bbox"

// fix default marker bug
// see https://github.com/PaulLeCam/react-leaflet/issues/255
import L from "leaflet"
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png")
})

import { parseFile } from "./parser"

const STATUS = {
  NO_FILES: "no_files",
  LOADING: "loading",
  HAS_FILES: "has_files"
}

const EXTENSION_TO_MIMETYPE = {
  jpeg: ["image/jpeg"],
  jpg: ["image/jpeg"],
  png: ["image/png"],
  tif: ["image/tiff"],
  tiff: ["image/tiff"]
}

const ALL_EXTENSIONS = []
let ALL_MIMETYPES = []
Object.keys(EXTENSION_TO_MIMETYPE).forEach(ext => {
  ALL_EXTENSIONS.push(ext)
  ALL_MIMETYPES = ALL_MIMETYPES.concat(EXTENSION_TO_MIMETYPE[ext])
})

const DEFAULT_VIEWPORT = {
  center: [0, 0],
  zoom: 2
}

const DEFAULT_STATE = {
  status: STATUS.NO_FILES,
  parsed: [],
  viewport: DEFAULT_VIEWPORT
}
class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = DEFAULT_STATE

    this.onAcceptFiles = this.onAcceptFiles.bind(this)
    this.onCancel = this.onCancel.bind(this)
    this.onMapRef = this.onMapRef.bind(this)
    this.onViewportChanged = this.onViewportChanged.bind(this)
    this.fitMapToBounds = _.debounce(this.fitMapToBounds.bind(this), 1000)
  }

  onAcceptFiles(files) {
    let { parsed } = this.state
    if (files && files.length) {
      this.setState(
        {
          status: STATUS.LOADING
        },
        async () => {
          for (var i = 0; i < files.length; i++) {
            const p = await parseFile(files[i])
            p.name = files[i].name
            parsed.push(p)
          }

          this.setState({
            status: STATUS.HAS_FILES,
            parsed
          })

          this.fitMapToBounds()
        }
      )
    }
  }

  fitMapToBounds() {
    if (this.mapRef) {
      const { parsed } = this.state

      const turfBounds = bbox({
        type: "FeatureCollection",
        features: parsed.map(p => {
          return { type: "Feature", geometry: p.coordinates }
        })
      })

      const corner1 = L.latLng([turfBounds[1], turfBounds[0]])
      const corner2 = L.latLng([turfBounds[3], turfBounds[2]])
      const bounds = L.latLngBounds(corner1, corner2)

      this.mapRef.leafletElement.fitBounds(bounds)
    }
  }

  onCancel() {
    this.setState(DEFAULT_STATE)
  }

  onViewportChanged(viewport) {
    this.setState({ viewport })
  }

  onMapRef(ref) {
    this.mapRef = ref
  }

  render() {
    const { status, parsed, viewport } = this.state

    let parsedMarkers = []
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i]
      const coords = p.coordinates.coordinates
      parsedMarkers.push(
        <Marker key={i} position={[coords[1], coords[0]]}>
          <Popup>
            <div>
              <b>{p.name}</b>
              <p>{p.coordinates.coordinates}</p>
            </div>
          </Popup>
        </Marker>
      )
    }

    return (
      <div>
        <h1>
          {status === STATUS.NO_FILES && "No files"}
          {status === STATUS.LOADING && `Loading`}
          {status === STATUS.HAS_FILES && `Displaying ${parsed.length} files`}
          {status === STATUS.LOADING && (
            <div style={{ display: "inline-block", marginLeft: "10px" }}>
              <MDSpinner />
            </div>
          )}
          {status === STATUS.HAS_FILES && (
            <button
              onClick={this.onCancel}
              style={{ display: "inline-block", marginLeft: "10px" }}
            >
              Reset
            </button>
          )}
        </h1>
        <Dropzone
          disableClick
          accept={ALL_MIMETYPES.join(", ")}
          onDrop={this.onAcceptFiles}
          style={{
            borderRadius: "10px",
            border: "1px dashed black",
            padding: "10px"
          }}
        >
          <p>Try dragging some files here.</p>
          <p>{`${ALL_EXTENSIONS.join(", ")}`} files are accepted</p>
          <Map
            ref={this.onMapRef}
            style={{ width: "100%", height: "calc(100vh - 195px)" }}
            onViewportChanged={this.onViewportChanged}
            viewport={viewport}
          >
            <TileLayer
              attribution="&amp;copy <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {parsedMarkers}
          </Map>
        </Dropzone>
      </div>
    )
  }
}

ReactDOM.render(<App />, document.getElementById("app"))
