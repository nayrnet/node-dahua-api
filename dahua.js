#!/usr/bin/nodejs
// Dahua HTTP API Module

var 	net 		= require('net');
var  	events 		= require('events');
var 	util		= require('util');

var	TRACE		= true;
var	authHeader;

var dahua = function(options) {
	events.EventEmitter.call(this); // inherit from EventEmitter
	this.client = this.connect(options);
	TRACE = options.log;
};

util.inherits(dahua, events.EventEmitter);

dahua.prototype.connect = function(options) {
	var self = this;
	var authHeader = 'Basic ' + new Buffer(options.user + ':' + options.pass).toString('base64');
	// Connect
	var client = net.connect(options, function () {
		client.write(	'GET /cgi-bin/eventManager.cgi?action=attach&codes=[AlarmLocal,VideoMotion,VideoLoss] HTTP/1.0\r\n' +
				'Host: ' + options.host + ':' + options.port + '\r\n' +
				authHeader + '\r\n' + 
				'Accept: multipart/x-mixed-replace\r\n' + 
				'Connection: Keep-Alive\r\n\r\n');
        	handleConnection(self);
	});

	client.on('data', function(data) {
       		handleData(self, data)
	});

	client.on('close', function() {
		handleEnd(self)
	});

	client.on('error', function(err) {
		handleError(self, err)
	});
}

function handleData(self, data) {
	if (TRACE)	console.log('Data: ' + data.toString());
	data = data.toString().split('\r\n')
	var i = Object.keys(data);
	i.forEach(function(id){
		if (data[id].startsWith('Code=')) {
			alarm = data[id].split(';')
			self.emit("alarm", alarm);
		}
	});
}

function handleConnection(self) {
	if (TRACE)	console.log('Connected to ' + options.host + ':' + options.port)
    	//self.socket = socket;
	self.emit("connect");
}

function handleEnd(self) {
	if (TRACE)	console.log("Connection closed!");
        setTimeout(function() { receiver.connect(options) }, 30000 );
	self.emit("end");
}

function handleError(self, err) {
	if (TRACE)	console.log("Connection error: " + err.message);
	self.emit("error", err);
}

String.prototype.startsWith = function (str){
	return this.slice(0, str.length) == str;
};

exports.dahua = dahua;
