// Copyright 2012
// Chris Williams, Jason Huggins
// MIT License
var application_root = __dirname
  , express = require("express")
  , path = require("path")
  , five = require("johnny-five")
  , kinematics = require("./kinematics");

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

  var max = 48;
  var min = 28;
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

  getPositionForAngles = function(t1,t2,t3) {
    var points = kinematics.delta_calcForward(t1,t2,t3);
    return [points[1], points[2], points[3]];
  };

  getAnglesForPosition = function(x,y,z) {
    var angles = kinematics.delta_calcInverse(x,y,z);
    return [angles[1], angles[2], angles[3]];
  };

  setAngles = function(t1,t2,t3) {
    servo1.move(t1);
    servo2.move(t2);
    servo3.move(t3);
    servo1Angle = t1;
    servo2Angle = t2;
    servo3Angle = t3;
    console.log([t1,t2,t3]);
  };

  currentAngles = function() {
    return [servo1Angle, servo2Angle, servo3Angle];
  };

  setPosition = function(x,y,z) {
    var angles = kinematics.delta_calcInverse(x,y,z);
    setAngles(angles[1], angles[2], angles[3]);
  };

  currentPosition = function() {
    return getPositionForAngles(servo1Angle,servo2Angle,servo3Angle);
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
    res.send('OK');
  });

  app.get('/reset', function (req, res) {
    console.log("GET " + req.url + ": ");
    setAngles(min, min, min);
    res.send(currentAngles());
  });

  app.post('/setAngles', function (req, res){
    var product;
    console.log("POST " + req.url + ": ");
    console.log(req.body);
    var theta1 = parseFloat(req.body.theta1);
    var theta2 = parseFloat(req.body.theta2);
    var theta3 = parseFloat(req.body.theta3);
    setAngles(theta1, theta2, theta3);
    return res.send("OK");
  });

  app.post('/setPosition', function (req, res){
    var product;
    console.log("POST " + req.url + ": ");
    console.log(req.body);
    var x = parseFloat(req.body.x);
    var y = parseFloat(req.body.y);
    var z = parseFloat(req.body.z);
    setPosition(x, y, z);
    return res.send("OK");
  });

  app.get('/angles', function (req, res){
    var product;
    console.log("GET " + req.url + ": ");
    return res.send(currentAngles());
  });

  app.get('/position', function (req, res){
    var product;
    console.log("GET " + req.url + ": ");
    return res.send(currentPosition());
  });

  app.listen(4242);

});
