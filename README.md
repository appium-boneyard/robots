Appium Robots
======
To launch the bitbeambot RC Server:
`node server.js`

To launch the Robot Calibration App:
`appium --udid [udid here] --app Appium.RobotCalibration --pre-launch`

To calibrate a bitbeambot:
`node calibrate.js -o /path/to/save/calibration.json`

To launch a calibrated bitbeambot:
`node server.js -c /path/to/calibration.json`
