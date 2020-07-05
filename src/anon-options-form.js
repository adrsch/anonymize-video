import React, { useState, useRef } from 'react';
import clsx from 'clsx';
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


import InputAdornment from '@material-ui/core/InputAdornment';
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
  textField: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
  }
}));





const AnonOptionsForm = (props) => {
  const classes = useStyles();
  const [options, setOptions] = useState(props.defaultOptions);
  const [errors, setErrors] = useState({
    playbackRate: false,
    scaleFactor: false,
  });
  const changeOptionHandler = (option) => (event) => {
    setOptions(Object.assign({}, options, { [option]: event.target.value }));
    props.setOptions(options);
  };

  const validateChangeOptionHandler = (option, validate) => (event) => {
    setErrors(Object.assign({}, errors, { [option]: !validate(event.target.value) }));
    setOptions(Object.assign({}, options, { [option]: event.target.value }));
    props.setOptions(options);
  };
  
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">Detection</FormLabel>
      <RadioGroup 
        aria-label="detection"
        name="detection"
        value={options.detection}
        onChange={changeOptionHandler('detection')}
      >
        <FormControlLabel value="haar" control={<Radio />} label="Fast & inaccurate" />
        <FormControlLabel value="deep" control={<Radio />} label="Slow & accurate (experimental, video may be choppy)" />
      </RadioGroup>
      <TextField
        error={errors.playbackRate}
        className={clsx(classes.textField)}
        variant="outlined"
        id="standard-error-helper-text"
        label="Processing playback speed"
        value={options.playbackRate}
        helperText="If set too high, anonymized video will be choppy"
        onChange={validateChangeOptionHandler('playbackRate', (number) => !isNaN(number))}
      />
      <TextField
        error={errors.scaleFactor}
        className={clsx(classes.textField)}
        variant="outlined"
        id="standard-error-helper-text"
        label="Video resolution scale factor"
        value={options.scaleFactor}
        helperText="Shrinking the video by putting a value < 1 may help make output less choppy"
        onChange={validateChangeOptionHandler('scaleFactor', (number) => !isNaN(number))}
      />
      <FormLabel component="legend">Output format</FormLabel>
      <RadioGroup 
        aria-label="format"
        name="format"
        value={options.outputFormat}
        onChange={changeOptionHandler('outputFormat')}
      >
        <FormControlLabel value="video/mp4" control={<Radio />} label="mp4" />
        <FormControlLabel value="video/webm" control={<Radio />} label="webm" />
      </RadioGroup>
    </FormControl>
  );
}

export default AnonOptionsForm;
