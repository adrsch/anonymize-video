import React, { useState } from 'react';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import { DropzoneArea } from 'material-ui-dropzone';
import AnonOptionsForm from './anon-options-form';
import VideoAnonymizer from './video-anonymizer';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  main: {
    width: '600px',
    maxWidth: '100%',
    padding: theme.spacing(1),
  },
  container: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: theme.spacing(2),
  },
}));

const App = () => {
  const classes = useStyles();
  const [processing, setProcessing] = useState(false);
  const [video, setVideo] = useState(null);
  const [options, setOptions] = useState({
    detection: 'haar',
    scaleFactor: 1.0,
    outputFormat: 'video/mp4',
    playbackRate: 0.5,
  });
  const [errors, setErrors] = useState(false);
  return ((processing)
    ? (
      <div className={clsx(classes.root)}>
        <div className={clsx(classes.main)}>
          <VideoAnonymizer options={options} video={video} />
        </div>
      </div>
    )
    : (
      <div className={clsx(classes.root)}>
        <div className={clsx(classes.main)}>
          <div className={clsx(classes.container)}>
            <DropzoneArea
              id="upload-video"
              name="upload-video"
              type="file"
              clearOnUnMount={false}
              onChange={(files) => {
                setVideo((files.length > 0) ? files[0] : null);
              }}
              acceptedFiles={['video/*']}
              maxFileSize={3000000000}
              filesLimit={1}
              showFileNames
              showPreviewsInPreview
              dropzoneText="Drag and drop a video or click here"
            />
          </div>
          <div className={clsx(classes.container)}>
            <AnonOptionsForm
              defaultOptions={options}
              setParentOptions={setOptions}
              setParentErrors={setErrors}
            />
          </div>
          <div className={clsx(classes.container)}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setProcessing(true)}
              disabled={errors || (video === null)}
            >
              Start
            </Button>
          </div>
        </div>
      </div>
    )
  );
};

export default App;
