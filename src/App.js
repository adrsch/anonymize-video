/* eslint-disable */
import React, { useEffect, useState, useRef } from 'react';
import logo from './logo.svg';
import './App.css';
import Script from 'react-inline-script';
//import cv from './opencv-wasm'; 
import cv from './opencv-4.3.0';
import Utils from './utils';
import { createWorker } from '@ffmpeg/ffmpeg';
import { makeStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import Checkbox from '@material-ui/core/Checkbox';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import {DropzoneArea} from 'material-ui-dropzone'
import TextField from '@material-ui/core/TextField';
import AnonOptionsForm from './anon-options-form';
import VideoAnonymizer from './video-anonymizer';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  backButton: {
    marginRight: theme.spacing(1),
  },
  instructions: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
}));

function App() {
  const classes = useStyles();
  const [processing, setProcessing] = useState(false);
  const [video, setVideo] = useState(null);
  const [options, setOptions] = useState({
    detection: 'haar',
    scaleFactor: 1.0,
    outputFormat: 'video/mp4',
    playbackRate: 0.1,
  });
  return ((processing)
    ? <VideoAnonymizer options={options} video={video}/>
    : <div className="App">
      <DropzoneArea
        id="upload-video"
        name="upload-video"
        type="file"
        id="file"
        clearOnUnMount={false}
        onChange={(files) => {
          if (files.length > 0) {
            setVideo(files[0]);
          }
        }}
        acceptedFiles={["video/*"]}
        maxFileSize={3000000000}
        filesLimit={1}
        showFileNames={true}
        showPreviewsInPreview={true}
        dropzoneText={"Drag and drop a video here or click"}
      />

      <AnonOptionsForm
        defaultOptions={options}
        setOptions={setOptions}
      />
      <Button variant="contained" color="primary" onClick={() => setProcessing(true)}>
        Start
      </Button>
    </div>
  );
}
export default App;



