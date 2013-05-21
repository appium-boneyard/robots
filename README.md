Appium Robots
======

Robots are an add-on for appium that will send all touch actions through a robot instead of to the automation framework.

1.) To launch a robot server choose a robot in the bots folder, for this example we will use bitbeambot.
    
`cd bots/bitbeambot`

`node server.js`

2.) Calibrate the robot   

`appium --udid [udid here] --app RobotCalibration.app --pre-launch`

`node calibrate.js -o /path/to/calibration.json`

3.) Launch the Robot Server With Calibration

`node server.js -c /path/to/calibration.json`

4.) Launch Appium Server in Robot Mode

`appium --udid [udid here] --robot-address 0.0.0.0 --robot-port:4242`
