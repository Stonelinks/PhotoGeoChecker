import React from "react";
import ReactDOM from "react-dom";
import Dropzone from "react-dropzone";
import { Map, TileLayer, Marker, Popup } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import L from "leaflet";

import bbox from "@turf/bbox";

// fix default marker bug
// see https://github.com/PaulLeCam/react-leaflet/issues/255
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png")
});

import { parseFile } from "./parser";

const STATUS = {
  NO_FILES: "no_files",
  HAS_FILES: "has_files"
};

const EXTENSION_TO_MIMETYPE = {
  jpeg: ["image/jpeg"],
  jpg: ["image/jpeg"],
  png: ["image/png"],
  tif: ["image/tiff"],
  tiff: ["image/tiff"]
};

const ALL_EXTENSIONS = [];
let ALL_MIMETYPES = [];
Object.keys(EXTENSION_TO_MIMETYPE).forEach(ext => {
  ALL_EXTENSIONS.push(ext);
  ALL_MIMETYPES = ALL_MIMETYPES.concat(EXTENSION_TO_MIMETYPE[ext]);
});

const DEFAULT_VIEWPORT = {
  center: [0, 0],
  zoom: 13
};
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: STATUS.NO_FILES,
      files: [],
      parsed: null,
      viewport: DEFAULT_VIEWPORT
    };

    this.onAcceptFiles = this.onAcceptFiles.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onMapRef = this.onMapRef.bind(this);
    this.onViewportChanged = this.onViewportChanged.bind(this);
  }

  componentDidMount() {
    this.setState({
      status: STATUS.NO_FILES,
      files: [],
      parsed: null,
      viewport: DEFAULT_VIEWPORT
    });
  }

  async onAcceptFiles(files) {
    if (files && files.length) {
      let parsed = [];
      for (var i = 0; i < files.length; i++) {
        const p = await parseFile(files[i]);
        p.name = files[i].name;
        parsed.push(p);
      }

      this.setState({
        status: STATUS.HAS_FILES,
        files,
        parsed
      });
    }
  }

  onCancel() {
    this.setState({
      status: STATUS.NO_FILES,
      files: [],
      parsed: null,
      viewport: DEFAULT_VIEWPORT
    });
  }

  onViewportChanged(viewport) {
    this.setState({ viewport });
  }

  onMapRef(ref) {
    this.mapRef = ref;

    setTimeout(() => {
      const { parsed } = this.state;

      const turfBounds = bbox({
        type: "FeatureCollection",
        features: parsed.map(p => {
          return { type: "Feature", geometry: p.coordinates };
        })
      });

      const corner1 = L.latLng([turfBounds[1], turfBounds[0]]);
      const corner2 = L.latLng([turfBounds[3], turfBounds[2]]);
      const bounds = L.latLngBounds(corner1, corner2);

      this.mapRef.leafletElement.fitBounds(bounds);
    }, 1000);
  }

  render() {
    const { status, files, parsed, viewport } = this.state;

    let parsedMarkers = [];
    if (status === STATUS.HAS_FILES) {
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        const coords = p.coordinates.coordinates;
        parsedMarkers.push(
          <Marker key={i} position={[coords[1], coords[0]]}>
            <Popup>
              <pre>{JSON.stringify(p, null, 2)}</pre>
            </Popup>
          </Marker>
        );
      }
    }

    return (
      <div>
        <aside>
          {status === STATUS.NO_FILES && <h1>No files</h1>}
          {status === STATUS.HAS_FILES && <h1>Has {files.length} files</h1>}
          {status === STATUS.HAS_FILES && (
            <button onClick={this.onCancel}>Reset</button>
          )}
        </aside>
        {status === STATUS.NO_FILES && (
          <Dropzone
            accept={ALL_MIMETYPES.join(", ")}
            onDrop={this.onAcceptFiles}
            style={{
              borderRadius: "10px",
              border: "1px dashed black",
              padding: "10px"
            }}
          >
            <p>
              Try dropping some files here, or click to select files to upload.
            </p>
            <p>{`${ALL_EXTENSIONS.join(", ")}`} files are accepted</p>
          </Dropzone>
        )}
        {status === STATUS.HAS_FILES && (
          <div>
            <Map
              ref={this.onMapRef}
              style={{ width: "100%", height: "800px" }}
              onViewportChanged={this.onViewportChanged}
              viewport={viewport}
            >
              <TileLayer
                attribution="&amp;copy <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {parsedMarkers}
            </Map>
            <pre>{JSON.stringify(parsed, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
