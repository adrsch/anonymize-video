import React, { useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import Checkbox from '@material-ui/core/Checkbox';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  backButton: {
    marginRight: theme.spacing(1),
  },
  formLabel: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  textField: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
}));

const AnonOptionsForm = ({ initialOptions, setParentOptions, setParentErrors }) => {
  const classes = useStyles();
  const [options, setOptions] = useState(initialOptions);
  const [errors, setErrors] = useState({
    playbackRate: false,
    scaleFactor: false,
  });

  const checkErrors = (errorObject) => (
    Object.values(errorObject).reduce((error, cur) => (error || cur))
  );

  const changeHandler = (option, field = 'value') => (event) => {
    const newOptions = Object.assign({}, options, { [option]: event.target[field] }); // eslint-disable-line
    setOptions(newOptions);
    setParentOptions(newOptions);
  };

  const validateChangeHandler = (option, validate) => (event) => {
    const newErrors = Object.assign({}, errors, { [option]: !validate(event.target.value) }); // eslint-disable-line
    setErrors(newErrors);
    setParentErrors(checkErrors(newErrors));
    const newOptions = Object.assign({}, options, { [option]: event.target.value }); // eslint-disable-line
    setOptions(newOptions);
    setParentOptions(newOptions);
  };
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend" className={clsx(classes.formLabel)}>Detection</FormLabel>
      <FormGroup
        aria-label="detection"
        name="detection"
      >
        <FormControlLabel
          control={(
            <Checkbox
              checked={options.haarFace}
              onChange={changeHandler('haarFace', 'checked')}
            />
)}
          label="Minimal Facial detection"
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={options.multiFace}
              onChange={changeHandler('multiFace', 'checked')}
            />
)}
          label="Standard Facial detection"
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={options.haarProf}
              onChange={changeHandler('haarProf', 'checked')}
            />
)}
          label="Face profile detection"
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={options.haarUpper}
              onChange={changeHandler('haarUpper', 'checked')}
            />
)}
          label="Upper body detection"
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={options.haarFull}
              onChange={changeHandler('haarFull', 'checked')}
            />
)}
          label="Full body detection"
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={options.multiEye}
              onChange={changeHandler('multiEye', 'checked')}
            />
)}
          label="Eye detection"
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={options.deepFace}
              onChange={changeHandler('deepFace', 'checked')}
            />
)}
          label="Slow & accurate deep facial detection (experimental)"
        />
        <Typography variant="subtitle2">
          NOTE: Deep facial detection may not work on slower machines. Chrome is recommended.
        </Typography>
      </FormGroup>
      <TextField
        error={errors.threshold}
        className={clsx(classes.textField)}
        variant="outlined"
        id="standard-error-helper-text"
        label="Detection threshold"
        value={options.threshold}
        onChange={validateChangeHandler('threshold', (number) => !Number.isNaN(number))}
      />
      <FormLabel component="legend" className={clsx(classes.formLabel)}>Anonymization</FormLabel>
      <RadioGroup
        aria-label="anonymization"
        name="anonymization"
        value={options.draw}
        onChange={changeHandler('draw')}
      >
        <FormControlLabel value="blackRect" control={<Radio />} label="Black rectangle" />
        <FormControlLabel value="blackCirc" control={<Radio />} label="Black circle" />
      </RadioGroup>
      <TextField
        error={errors.playbackRate}
        className={clsx(classes.textField)}
        variant="outlined"
        id="standard-error-helper-text"
        label="Processing playback speed"
        value={options.playbackRate}
        helperText="If set too high, anonymized video will be choppy"
        onChange={validateChangeHandler('playbackRate', (number) => !Number.isNaN(number))}
      />
      <TextField
        error={errors.scaleFactor}
        className={clsx(classes.textField)}
        variant="outlined"
        id="standard-error-helper-text"
        label="Video resolution scale factor"
        value={options.scaleFactor}
        helperText="Setting to anything but 1 increases pre-processing time"
        onChange={validateChangeHandler('scaleFactor', (number) => !Number.isNaN(number))}
      />
    </FormControl>
  );
};

AnonOptionsForm.propTypes = {
  initialOptions: PropTypes.oneOfType([
    PropTypes.objectOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.bool,
      ]),
    ),
    PropTypes.bool,
  ]).isRequired,
  setParentOptions: PropTypes.func.isRequired,
  setParentErrors: PropTypes.func.isRequired,
};

export default AnonOptionsForm;
