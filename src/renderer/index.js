import React from "react";
import ReactDOM from "react-dom";
import Dropzone from "react-dropzone"

const STATUS = {
  NO_FILES: "no_files",
  HAS_FILES: "has_files",
}

const EXTENSION_TO_MIMETYPE = {
  jpeg: ["image/jpeg"],
  jpg: ["image/jpeg"],
  png: ["image/png"],
}

const ALL_EXTENSIONS = []
let ALL_MIMETYPES = []
Object.keys(EXTENSION_TO_MIMETYPE).forEach(ext => {
  ALL_EXTENSIONS.push(ext)
  ALL_MIMETYPES = ALL_MIMETYPES.concat(EXTENSION_TO_MIMETYPE[ext])
})

class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      status: STATUS.NO_FILES,
      files: [],
    }

    this.onAcceptFiles = this.onAcceptFiles.bind(this)
    this.onCancel = this.onCancel.bind(this)
  }

  componentDidMount() {
    this.setState({
      status: STATUS.NO_FILES,
      files: [],
    })
  }

  onAcceptFiles(files) {
    if (files && files.length) {
      this.setState({
        status: STATUS.HAS_FILES,
        files
      })
    }
  }

  onCancel() {
    this.setState({
      status: STATUS.NO_FILES,
      files: []
    })
  }

  render() {
    const { status, files } = this.state
    return (
      <div>
        <aside>
          {status === STATUS.NO_FILES && (
            <h1>No files</h1>
          )}
          {status === STATUS.HAS_FILES && (
            <h1>Has {files.length} files</h1>
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
            <p>
              {`${ALL_EXTENSIONS.join(", ")}`} files are accepted
            </p>
          </Dropzone>
        )}
      </div>
    )
  }
}

ReactDOM.render(<App />, document.getElementById("app"));



