import React from "react";
import ReactDOM from "react-dom";
import Dropzone from "react-dropzone";

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

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: STATUS.NO_FILES,
      files: [],
      parsed: null
    };

    this.onAcceptFiles = this.onAcceptFiles.bind(this);
    this.onCancel = this.onCancel.bind(this);
  }

  componentDidMount() {
    this.setState({
      status: STATUS.NO_FILES,
      files: [],
      parsed: null
    });
  }

  async onAcceptFiles(files) {
    if (files && files.length) {
      let parsed = [];
      for (var i = 0; i < files.length; i++) {
        const p = await parseFile(files[i]);
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
      parsed
    });
  }

  render() {
    const { status, files } = this.state;
    return (
      <div>
        <aside>
          {status === STATUS.NO_FILES && <h1>No files</h1>}
          {status === STATUS.HAS_FILES && <h1>Has {files.length} files</h1>}
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
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));
