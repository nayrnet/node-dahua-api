#!/usr/bin/nodejs
// Example App for Dahua Event Attach

var 	net 		= require('net');
var  	events 		= require('events');
var 	util		= require('util');

var options = {
	host: 'west-ptz',
	port: '80',
}

var auth = {
	user: 'ptz',
	pass: 'ptz',
}

var authHeader = 'Basic ' + new Buffer(auth.user + ':' + auth.pass).toString('base64');
var client = net.connect(options, function () {
	console.log('Connected to ' + options.host + ':' + options.port)
	client.write(	'GET /cgi-bin/eventManager.cgi?action=attach&codes=[AlarmLocal,VideoMotion,VideoLoss] HTTP/1.0\r\n' +
			'Host: ' + options.host + ':' + options.port + '\r\n' +
			authHeader + '\r\n' + 
			'Accept: multipart/x-mixed-replace\r\n' + 
			'Connection: Keep-Alive\r\n\r\n');
});

client.on('data', function(data) {
	data = data.toString().split('\r\n')
	//console.log(data)
	var i = Object.keys(data);
	i.forEach(function(id){
		if (data[id].startsWith('Code=')) {
			console.log(data[id])
		}
	});

});

client.on('close', function() {
	console.log('Connection closed');
});

client.on('error', function(err) {
	console.log('ERROR: ' + err);
});

String.prototype.startsWith = function (str){
	return this.slice(0, str.length) == str;
};

