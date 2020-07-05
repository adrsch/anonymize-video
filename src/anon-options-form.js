import React, { useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import TextField from '@material-ui/core/TextField';

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
  },
}));

const AnonOptionsForm = ({ defaultOptions, setParentOptions, setParentErrors }) => {
  const classes = useStyles();
  const [options, setOptions] = useState(defaultOptions);
  const [errors, setErrors] = useState({
    playbackRate: false,
    scaleFactor: false,
  });

  const checkErrors = (errorObject) => (
    Object.values(errorObject).reduce((error, cur) => (error || cur))
  );

  const changeOptionHandler = (option) => (event) => {
    const newOptions = Object.assign({}, options, { [option]: event.target.value }); // eslint-disable-line
    setOptions(newOptions);
    setParentOptions(newOptions);
  };

  const validateChangeOptionHandler = (option, validate) => (event) => {
    const newErrors = Object.assign({}, errors, { [option]: !validate(event.target.value) }); // eslint-disable-line
    setErrors(newErrors);
    setParentErrors(checkErrors(newErrors));
    const newOptions = Object.assign({}, options, { [option]: event.target.value }); // eslint-disable-line
    setOptions(newOptions);
    setParentOptions(newOptions);
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
        <FormControlLabel value="deep" control={<Radio />} label="Slow & accurate (video may be choppy)" />
      </RadioGroup>
      <TextField
        error={errors.playbackRate}
        className={clsx(classes.textField)}
        variant="outlined"
        id="standard-error-helper-text"
        label="Processing playback speed"
        value={options.playbackRate}
        helperText="If set too high, anonymized video will be choppy"
        onChange={validateChangeOptionHandler('playbackRate', (number) => !Number.isNaN(number))}
      />
      <TextField
        error={errors.scaleFactor}
        className={clsx(classes.textField)}
        variant="outlined"
        id="standard-error-helper-text"
        label="Video resolution scale factor"
        value={options.scaleFactor}
        helperText="Setting to anything but 1 increases pre-processing time"
        onChange={validateChangeOptionHandler('scaleFactor', (number) => !Number.isNaN(number))}
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
};

AnonOptionsForm.propTypes = {
  defaultOptions: PropTypes.objectOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number])
  ).isRequired,
  setParentOptions: PropTypes.func.isRequired,
  setParentErrors: PropTypes.func.isRequired,
};

export default AnonOptionsForm;
