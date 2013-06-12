// Copyright 2012
// Chris Williams, Jason Huggins
// MIT License
var application_root = __dirname
  , express = require("express")
  , path = require("path")
  , five = require("johnny-five")
  , kinematics = require("./kinematics")
  , fs = require("fs")
  , ArgumentParser = require('argparse').ArgumentParser
  , sleep = require('sleep').sleep
  , calibration = { isSet: false };

// install sylvester
eval(fs.readFileSync(path.resolve(__dirname, "../../lib/sylvester.js"), "utf8"));

// parse arguments
var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp:true,
  description: 'Robot Calibration Script'
});
parser.addArgument(
  [ '-c', '--calibration'], {
    help: 'file to load calibration data from'
  });
parser.addArgument(
  ['-p', '--port'] , {
    defaultValue: 4242
    , required: false
    , type: 'int'
    , example: "4242"
    , help: 'port to listen on'
  });
/*
 parser.addArgument(
 ['-a', '--address'], {
 defaultValue: '127.0.0.1'
 , required: false
 , example: "127.0.0.1"
 , help: 'IP Address to listen on'
 });
 */
var args = parser.parseArgs();

// fire up the robot
var board = new five.Board({ debug: false});
board.on("ready", function() {
  var servo1 = five.Servo({pin: 9});
  var servo2 = five.Servo({pin: 10});
  var servo3 = five.Servo({pin: 11});

  board.repl.inject({
    servo1: servo1, s1: servo1,
    servo2: servo2, s2: servo2,
    servo3: servo3, s3: servo3
  });

  var max = 45;
  var min = 0;
  var range = max - min;

  servo1.move(min);
  servo2.move(min);
  servo3.move(min);
  servo1Angle = min;
  servo2Angle = min;
  servo3Angle = min;
  servo1.on("error", function () { console.log(arguments); });
  servo2.on("error", function () { console.log(arguments); });
  servo3.on("error", function () { console.log(arguments); });

  // Load Calibration Data
  if (fs.existsSync(args.calibration)) {
    var data = eval(fs.readFileSync(args.calibration, "utf8"));
    var b0x = data[1].position[0],
      b0y = data[1].position[1],
      b1x = data[2].position[0],
      b1y = data[2].position[1];
    var d0x = data[1].coordinates[0],
      d0y = data[1].coordinates[1],
      d1x = data[2].coordinates[0],
      d1y = data[2].coordinates[1];

    var M = $M([
      [d0x, d0y, 1, 0],
      [-d0y, d0x, 0, 1],
      [d1x, d1y, 1, 0],
      [-d1y, d1x, 0, 1]
    ]);
    var u = $M([
      [b0x],
      [b0y],
      [b1x],
      [b1y]
    ]);
    var MI = M.inverse();
    translationMatrix = MI.multiply(u);
    offZ = data[3];
    onZ = data[4];

  }

  getPositionForAngles = function(t1,t2,t3) {
    var points = kinematics.delta_calcForward(t1,t2,t3);
    return [points[1], points[2], points[3]];
  };

  getAnglesForPosition = function(x,y,z) {
    var angles = kinematics.delta_calcInverse(x,y,z);
    return [angles[1], angles[2], angles[3]];
  };

  setAngles = function(t1,t2,t3) {
    console.log("Setting Angles:" + [t1,t2,t3]);
    servo1.move(t1);
    servo2.move(t2);
    servo3.move(t3);
    servo1Angle = t1;
    servo2Angle = t2;
    servo3Angle = t3;
  };

  currentAngles = function() {
    return [servo1Angle, servo2Angle, servo3Angle];
  };

  setPosition = function(x,y,z) {
    console.log("Setting Position:" + [x,y,z]);
    var angles = kinematics.delta_calcInverse(x,y,z);
    setAngles(angles[1], angles[2], angles[3]);
  };

  currentPosition = function() {
    return getPositionForAngles(servo1Angle,servo2Angle,servo3Angle);
  };

  convertCoordinatesToPosition = function(x,y) {
    var a = translationMatrix.elements[0][0],
      b = translationMatrix.elements[1][0],
      c = translationMatrix.elements[2][0],
      d = translationMatrix.elements[3][0];

    yprime = a * x + b * y + c;
    xprime = b * x - a * y + d;
    return [xprime, yprime]
  };

  // launch rest server
  var app = express();

  app.configure(function () {
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(application_root, "public")));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  app.get('/status', function (req, res) {
    console.log("GET " + req.url + ": ");
    res.send('\"OK\"');
  });

  app.get('/reset', function (req, res) {
    console.log("GET " + req.url + ": ");
    setAngles(min, min, min);
    res.send(currentAngles());
  });

  app.post('/setAngles', function (req, res){
    console.log("POST " + req.url + ": ");
    console.log(req.body);
    var theta1 = parseFloat(req.body.theta1);
    var theta2 = parseFloat(req.body.theta2);
    var theta3 = parseFloat(req.body.theta3);
    setAngles(theta1, theta2, theta3);
    return res.send("\"OK\"");
  });

  app.post('/setPosition', function (req, res){
    console.log("POST " + req.url + ": ");
    console.log(req.body);
    var x = parseFloat(req.body.x);
    var y = parseFloat(req.body.y);
    var z = parseFloat(req.body.z);
    setPosition(x, y, z);
    return res.send("\"OK\"");
  });

  app.get('/angles', function (req, res){
    console.log("GET " + req.url + ": ");
    return res.send(currentAngles());
  });

  app.get('/position', function (req, res){
    console.log("GET " + req.url + ": ");
    return res.send(currentPosition());
  });

  app.get('/positionForCoordinates/x/:x/y/:y', function (req, res){
    console.log("GET " + req.url + ": ");
    var x = parseFloat(req.params.x);
    var y = parseFloat(req.params.y);
    return res.send(convertCoordinatesToPosition(x,y));
  });

  app.get('/tap/x/:x/y/:y', function (req, res){
    console.log("GET " + req.url + ": ");
    var x = parseFloat(req.params.x);
    var y = parseFloat(req.params.y);
    var pos = convertCoordinatesToPosition(x,y);
    setTimeout(function(res) {
      setPosition(pos[0], pos[1], offZ);
      setTimeout(function(res) {
        setPosition(pos[0], pos[1], onZ);
        setTimeout(function(res) {
          setPosition(pos[0], pos[1], offZ);
          setTimeout(function(res) {
            setAngles(min, min, min);
            res.send("\"OK\"");
          }, 500, res);
        }, 500, res);
      }, 500, res);
    }, 500, res);
  });

  app.listen(args.port);
  console.log("Robot listening on port " + args.port);

});
