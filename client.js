var request = require('request')
  , XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

exports.client = function(address, port) {

  return {
    address : address,
    port : port,
    url : function(uri) {
      return 'http://' + address + ":" + port + uri;
    },
    angles : function() {
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open( "GET", this.url('/angles'), false );
      xmlHttp.send( null );
      return eval(xmlHttp.responseText);
    },
    setAngles : function(theta1, theta2, theta3) {
      request.post(this.url('/setAngles'), {form:{theta1:theta1, theta2:theta2, theta3:theta3}});
    },
    position : function() {
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open( "GET", this.url('/position'), false );
      xmlHttp.send( null );
      return eval(xmlHttp.responseText);
    },
    setPosition : function(x, y, z) {
      request.post(this.url('/setPosition'), {form:{x:x, y:y, z:z}});
    },
    reset : function() {
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open( "GET", this.url('/reset'), false );
      xmlHttp.send( null );
      return eval(xmlHttp.responseText);
    }
  };

};