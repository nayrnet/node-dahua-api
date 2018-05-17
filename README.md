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
var options = {
	host	: '192.168.1.100',
	port 	: '80',
	user 	: 'admin',
	pass 	: 'password123',
	log 	: false
};

var dahua 	= new ipcamera.dahua(options);

// Switch to Day Profile
dahua.nightProfile()

// PTZ Go to preset 10
dahua.ptzPreset(10)

// Monitor Camera Alarms
dahua.on('alarm', function(code,action,index) {
	if (code === 'VideoMotion' && action === 'Start')	console.log('Video Motion Detected')
	if (code === 'VideoMotion' && action === 'Stop')	console.log('Video Motion Ended')
	if (code === 'AlarmLocal' && action === 'Start')	console.log('Local Alarm Triggered: ' + index)
	if (code === 'AlarmLocal' && action === 'Stop')		console.log('Local Alarm Ended: ' + index)
	if (code === 'VideoLoss' && action === 'Start')		console.log('Video Lost!')
	if (code === 'VideoLoss' && action === 'Stop')		console.log('Video Found!')
	if (code === 'VideoBlind' && action === 'Start')	console.log('Video Blind!')
	if (code === 'VideoBlind' && action === 'Stop')		console.log('Video Unblind!')
});

// Find Files
var query = {
  'channel': '0',
  'startTime': '2018-5-9 09:00:00',
  'endTime': '2018-5-9 12:00:00',
  'types': ['jpg','dav'], // [ “dav”, “jpg”, “mp4” ]
  'count': 10 // max. 100
};

dahua.findFiles(query);
dahua.on('filesFound',function(data){
  console.log('filesFound:', data);
});

// Save File
dahua.saveFile('/mnt/sd/2018-05-07/001/dav/12/12.23.16-12.23.33[M][0@0][0].dav');
dahua.on('saveFile',function( msg ){
  console.log('File saved!');
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

// Find files
var query = {
  'channel': '0',
  'startTime': '2018-5-9 09:00:00',
  'endTime': '2018-5-9 12:00:00',
  'types': ['jpg','dav'], // [ “dav”, “jpg”, “mp4” ] - optional
  'count': 10 // max. 100 - optional
};
dahua.findFiles(query)

// Callback for file search results
dahua.on('filesFound',function(data){
  console.log('filesFound:', data);
});

// Load and save file
// remotename = filepath and name on camera
// localname = filepath and name on client (optional)
dahua.saveFile(remotename,localname);

// Callback for file saved
dahua.on('saveFile',function( msg ){
  console.log('File saved!');
});

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
* cameraAlarms - boolean to listen to camera alarms, defaults to true

## More Info:
* Support & Discussion: https://www.ipcamtalk.com/showthread.php/9004-NodeJS-Module-node-dahua-api?p=80111
* Dahua API Documentation: https://www.telecamera.ru/bitrix/components/bitrix/forum.interface/show_file.php?fid=1022477&action=download
## About:
By: Ryan Hunt
