#!/usr/bin/nodejs
// Dahua HTTP API Module

var 	net 		= require('net');
var  	events 		= require('events');
var 	util		= require('util');
var 	request 	= require('request');

var	TRACE		= true;
var	BASEURI		= false;

var dahua = function(options) {
	events.EventEmitter.call(this)
	this.client = this.connect(options)
	TRACE = options.log
	BASEURI = 'http://' + options.user + ':' + options.pass + '@' + options.host + ':' + options.port
};

util.inherits(dahua, events.EventEmitter);

dahua.prototype.connect = function(options) {
	var self = this
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

dahua.prototype.ptzCommand = function (cmd,arg1,arg2,arg3,arg4) {
    	var self = this;
	if ((!cmd) || (isNaN(arg1)) || (isNaN(arg2)) || (isNaN(arg3)) || (isNaN(arg4))) {
		handleError(self,'INVALID PTZ COMMAND')
	}
	request(BASEURI + '/cgi-bin/ptz.cgi?action=start&channel=0&code=' + ptzcommand + '&arg1=' + arg1 + '&arg2=' + arg2 + '&arg3=' + arg3 + '&arg4=' + arg4, function (error, response, body) {
		if ((error) || (response.statusCode !== 200)) {
			self.emit("error", 'FAILED TO SEND PTZ COMMAND');
		}
	})
}

dahua.prototype.ptzStatus = function () {
    	var self = this;
	request(BASEURI + '/cgi-bin/ptz.cgi?action=getStatus', function (error, response, body) {
		if ((!error) && (response.statusCode === 200)) {
			body = body.toString().split('\r\n')
			self.emit("ptzStatus", body);
		} else {
			self.emit("error", 'FAILED TO QUERY STATUS');
		}
	})
}

dahua.prototype.dayProfile = function () {
	request(BASEURI + '/cgi-bin/configManager.cgi?action=setConfig&VideoInMode[0].Config[0]=1', function (error, response, body) {
		if ((!error) && (response.statusCode === 200)) {
			if (body === 'Error') {		// Didnt work, lets try another method for older cameras
				request(BASEURI + '/cgi-bin/configManager.cgi?action=setConfig&VideoInOptions[0].NightOptions.SwitchMode=0', function (error, response, body) { 
					if ((error) || (response.statusCode !== 200)) {
						self.emit("error", 'FAILED TO CHANGE TO DAY PROFILE');
					}
				})
			}
		} else {
			self.emit("error", 'FAILED TO CHANGE TO DAY PROFILE');
		}	
	})
}

dahua.prototype.nightProfile = function () {
	request(BASEURI + '/cgi-bin/configManager.cgi?action=setConfig&VideoInMode[0].Config[0]=2', function (error, response, body) {
		if ((!error) && (response.statusCode === 200)) {
			if (body === 'Error') {		// Didnt work, lets try another method for older cameras
				request(BASEURI + '/cgi-bin/configManager.cgi?action=setConfig&VideoInOptions[0].NightOptions.SwitchMode=3', function (error, response, body) { 
					if ((error) || (response.statusCode !== 200)) {
						self.emit("error", 'FAILED TO CHANGE TO NIGHT PROFILE');
					}
				})
			}
		} else {
			self.emit("error", 'FAILED TO CHANGE TO NIGHT PROFILE');
		}	
	})
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
	if (TRACE)	console.log("Connection error: " + err);
	self.emit("error", err);
}

String.prototype.startsWith = function (str){
	return this.slice(0, str.length) == str;
};

exports.dahua = dahua;
