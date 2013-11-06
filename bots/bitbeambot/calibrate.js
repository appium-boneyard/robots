
var fs = require('fs')
  , wdSync = require('wd-sync')
  , robot = require('./client').client("127.0.0.1","4242")
  , usleep = require('sleep').usleep
  , ArgumentParser = require('argparse').ArgumentParser;

var client = wdSync.remote("127.0.0.1", 4723)
  , browser = client.browser
  , sync = client.sync;

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp:true,
  description: 'Bitbeambot Calibration Script'
});
parser.addArgument(
  [ '-o', '--output' ],
  {
    help: 'file to save calibration data to'
  }
);

var args = parser.parseArgs();

sync( function() {

  // Reset Robot to Starting Position
  robot.reset();

  console.log("server status:", browser.status());
  browser.init( { browserName: 'iOS', app: 'Appium.RobotCalibration'} );
  console.log("session capabilities:", browser.sessionCapabilities());
  browser.setWaitTimeout(3000);
  console.log(browser.source());

  var data = [];

  var getCoords = function() {
    try {
      // disabled due to bug with appium where the label is not updating
      // var value = browser.elementByTagName('staticText').text();
      // if (value !== undefined) {
      //  return eval(value.replace("(","[").replace(")", "]"));
      //  }
      //  return value;

      // hack to find value since element.text is not updated
      var coordRegex = /label[^\(,]+\((\d+\.*\d*),\s+(\d+\.*\d*)\)/ ;
      var pageSource = browser.source();
      if (coordRegex.test(pageSource)) {
        var match = coordRegex.exec(pageSource);
        return [ parseFloat(match[1]), parseFloat(match[2])];
      }
      else {
        return undefined;
      }
    }
    catch(err) {
      return undefined;
    }
  };

  var findPoint = function(deltaX, deltaY) {

    // reset position
    robot.reset();
    usleep(500000);

    // move above the point
    var newPoint = [contactPoint.position[0] + deltaX, contactPoint.position[1] + deltaY, contactPoint.position[2] *.87];
    robot.setPosition(newPoint[0], newPoint[1], newPoint[2]);

    // touch the device
    while (Math.abs(newPoint[2]) < Math.abs(contactPoint.position[2]*1.05)) {
      newPoint[2] = newPoint[2]*1.025;
      robot.setPosition(newPoint[0], newPoint[1], newPoint[2]);
      var location = getCoords();
      if (location !== undefined && location.length >= 2) {
        var dataPoint = { position: newPoint, coordinates: location};
        console.log(dataPoint);
        data.push(dataPoint);
        break;
      }
    }
  };

  // Find Contact Point
  console.log("Finding Contact Point...");
  var startingPosition = robot.position();
  var currentPosition = [startingPosition[0], startingPosition[1], startingPosition[2]];
  var coords = undefined;
  while (Math.abs(currentPosition[2] - startingPosition[2]) < 50) {
    currentPosition[2] = currentPosition[2]*1.025;
    robot.setPosition(currentPosition[0], currentPosition[1], currentPosition[2]);
    coords = getCoords();
    if (coords !== undefined && coords.length >= 2) {
      break;
    }
  }
  console.log("Contact Point Found!");
  var contactPoint = { position: robot.position(), coordinates: coords };
  console.log(contactPoint);
  data.push(contactPoint);
  robot.reset();
  usleep(500000);

  var newPoint;
  console.log("Determining Directions");

  console.log("+x direction");
  findPoint(50,0);
  console.log("+y direction");
  findPoint(0,50);
  console.log("-x direction");
  findPoint(-50,0);
  console.log("-y direction");
  findPoint(0,-50);
  /*
  console.log("x,y corner");
  findPoint(50,50);
  console.log("x,-y corner");
  findPoint(50,-50);
  console.log("-x,y corner");
  findPoint(-50,50);
  console.log("-x,-y corner");
  findPoint(-50,-50);
  */

  console.log("FINAL DATA");
  console.log(data);

  robot.reset();
  browser.quit();

  fs.writeFile(args.output, JSON.stringify(data, null, 2), function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("Calibration Data Saved!");
    }
  });

});
