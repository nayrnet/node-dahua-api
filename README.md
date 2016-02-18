# node-dahua-api

[![GPL-3.0](https://img.shields.io/badge/license-GPL-blue.svg)]()
[![npm](https://img.shields.io/npm/v/npm.svg)]()
[![node](https://img.shields.io/node/v/gh-badges.svg)]()

NodeJS Module for communication with Dahua IP Cameras..

## Status: Work in Progress

## Example:
```javascript
#!/usr/bin/nodejs
var     ipcamera	= require('node-dahua-api');

// Options:
var westPTZoptions = {
	host	: 'west-ptz',
	port 	: '80',
	user 	: 'admin',
	pass 	: 'password123',
	log 	: false,
};

var westPTZ 	= new ipcamera.dahua(westPTZoptions);

westPTZ.on('alarm', function(data) {
	console.log(data.toString())
});
```

## Functions:
```javascript
// Switch Camera to Night Profile
dahua.dayProfile()

// Switch Camera to Night Profile
dahua.nightProfile()

// Issue Dahua RAW PTZ Command (See API Manual in GitHub Wiki)
dahua.ptzCommand(cmd,arg1,arg2,arg3,arg4)

// Go To Preset
dahua.ptzPreset(int)

// PTZ Zoom, input level: positive = zoom in / negative = zoom out
dahua.ptzZoom(float)

// PTZ Move
// Directions = Up/Down/Left/Right/LeftUp/RightUp/LeftDown/RightDown
// Actions = start/stop
// Speed = 1-8
dahua.ptzMove(direction,action,speed)

// Request current PTZ Status
dahua.ptzStatus()

// Callback for any Alarm (Motion Detection/Video Loss & Blank/Alarm Inputs)
dahua.on('alarm', function(code,action,index){  });

// Callback for PTZ Status
dahua.on('ptzStatus', function(data){  });

// Callback on connect
dahua.on('connect', function(){  });

// Callback on error
dahua.on('error', function(error){  });

```

## Options
* host - hostname of your Dahua camera
* port - port for your Dahua camera (80 by default)
* user - username for camera
* pass - password for camera
* log - boolean to show detailed logs, defaults to false.

## More Info:
* Support & Discussion: https://www.ipcamtalk.com/showthread.php/9004-NodeJS-Module-node-dahua-api?p=80111

## About:
By: Ryan Hunt
