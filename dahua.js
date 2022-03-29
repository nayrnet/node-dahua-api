// #!/usr/bin/nodejs
// Dahua HTTP API Module

var events    = require('events');
var util      = require('util');
var request   = require('request');
var progress = require('request-progress');
var NetKeepAlive = require('net-keepalive')

var setKeypath = require('keypather/set');
var fs = require('fs');
var path = require('path');
var moment = require('moment');

var TRACE   = true;
var BASEURI   = false;

var dahua = function(options) {

  events.EventEmitter.call(this);

  TRACE = options.log;

  BASEURI = 'http://'+ options.host + ':' + options.port;
  USER = options.user;
  PASS = options.pass;
  HOST = options.host;

  if( options.cameraAlarms === undefined ) {
    options.cameraAlarms = true;
  }

  if( options.cameraAlarms ) { this.client = this.connect(options) };

  this.on('error',function(err){
    console.log("Error: " + err);
  });

};

util.inherits(dahua, events.EventEmitter);

// set up persistent connection to recieve alarm events from camera
dahua.prototype.connect = function(options) {

    var self = this;

    var eventNames = [
        'VideoMotion',
        'VideoLoss',
        'VideoBlind',
        'AlarmLocal',
        'CrossLineDetection',
        'CrossRegionDetection',
        'LeftDetection',
        'TakenAwayDetection',
        'VideoAbnormalDetection',
        'FaceDetection',
        'AudioMutation',
        'AudioAnomaly',
        'VideoUnFocus',
        'WanderDetection',
        'RioterDetection',
        'ParkingDetection',
        'MoveDetection',
        'MDResult',
        'HeatImagingTemper',
        'SmartMotionHuman',
        'SmartMotionVehicle'
    ];

    var opts = {
      'url' : BASEURI + '/cgi-bin/eventManager.cgi?action=attach&codes=[' + eventNames.join(',') + ']',
      'forever' : true,
      'headers': {'Accept':'multipart/x-mixed-replace'}
    };

    console.log("Connecting...");
    var client = request(opts).auth(USER,PASS,false);

    client.on('socket', function(socket) {
      // Set keep-alive probes - throws ESOCKETTIMEDOUT error after ~16min if connection broken
      socket.setKeepAlive(true, 1000);
      NetKeepAlive.setKeepAliveInterval(socket, 1000);
      if (TRACE) console.log('TCP_KEEPINTVL:',NetKeepAlive.getKeepAliveInterval(socket));

      NetKeepAlive.setKeepAliveProbes(socket, 1);
      if (TRACE) console.log('TCP_KEEPCNT:',NetKeepAlive.getKeepAliveProbes(socket));

    });

    client.on('response', function() {
      handleDahuaEventConnection(self,options);
    });

    client.on('error', function(err) {
      handleDahuaEventError(self, err);
    });

    client.on('data', function(data) {
       handleDahuaEventData(self, data);
    });

    client.on('close', function() {   // Try to reconnect after 30s
      console.error("Connection closed- reconnecting in 30 seconds...");
      setTimeout(function() { self.connect(options); }, 30000 );
      handleDahuaEventEnd(self);
    });

    client.on('error', function(err) {
      handleDahuaEventError(self, err);
    });

};

function handleDahuaEventData(self, data) {
  if (TRACE)  console.log('Data: ' + data.toString());
  data = data.toString().split('\r\n');
  var i = Object.keys(data);
  i.forEach(function(id){
    if (data[id].startsWith('Code=')) {
      var alarm = data[id].split(';');
      var code = alarm[0].substr(5);
      var action = alarm[1].substr(7);
      var index = alarm[2].substr(6);

    // an alarm can have also a data object
    // which is multiline in the body
    var metadata = {};
    if (alarm[3].startsWith('data={')) {
        var metadataArray = alarm[3].split('\n');
        metadataArray[0] = '{'; // we don't want "data={"

        var metadata = metadataArray.join('');
        try {
            metadata = JSON.parse(metadata);
            if (TRACE) console.dir(metadata, 'Got JSON parsed metadata');
        }
        catch (e) {
            console.error(e, 'Error during JSON.parse of alarm extra data');
        }
    }

      self.emit("alarm", code,action,index, metadata);
    }
  });
}

function handleDahuaEventConnection(self,options) {
  if (TRACE)  console.log('Connected to ' + options.host + ':' + options.port);
  //self.socket = socket;
  self.emit("connect");
}

function handleDahuaEventEnd(self) {
  if (TRACE)  console.log("Connection closed!");
  self.emit("end");
}

function handleDahuaEventError(self, err) {
  if (TRACE)  console.log("Connection error: " + err);
  self.emit("error", err);
}



dahua.prototype.ptzCommand = function (cmd,arg1,arg2,arg3,arg4) {
  var self = this;
  if ((!cmd) || (isNaN(arg1)) || (isNaN(arg2)) || (isNaN(arg3)) || (isNaN(arg4))) {
    self.emit("error",'INVALID PTZ COMMAND');
    return 0;
  }
  request(BASEURI + '/cgi-bin/ptz.cgi?action=start&channel=0&code=' + ptzcommand + '&arg1=' + arg1 + '&arg2=' + arg2 + '&arg3=' + arg3 + '&arg4=' + arg4, function (error, response, body) {
    if ((error) || (response.statusCode !== 200) || (body.trim() !== "OK")) {
      self.emit("error", 'FAILED TO ISSUE PTZ COMMAND');
    }
  }).auth(USER,PASS,false);
};

dahua.prototype.ptzPreset = function (preset) {
  var self = this;
  if (isNaN(preset))  self.emit("error",'INVALID PTZ PRESET');
  request(BASEURI + '/cgi-bin/ptz.cgi?action=start&channel=0&code=GotoPreset&arg1=0&arg2=' + preset + '&arg3=0', function (error, response, body) {
    if ((error) || (response.statusCode !== 200) || (body.trim() !== "OK")) {
      self.emit("error", 'FAILED TO ISSUE PTZ PRESET');
    }
  }).auth(USER,PASS,false);
};

dahua.prototype.ptzZoom = function (multiple) {
  var self = this;
  if (isNaN(multiple))  self.emit("error",'INVALID PTZ ZOOM');
  if (multiple > 0) cmd = 'ZoomTele';
  if (multiple < 0) cmd = 'ZoomWide';
  if (multiple === 0) return 0;

  request(BASEURI + '/cgi-bin/ptz.cgi?action=start&channel=0&code=' + cmd + '&arg1=0&arg2=' + multiple + '&arg3=0', function (error, response, body) {
    if ((error) || (response.statusCode !== 200) || (body.trim() !== "OK")) {
      self.emit("error", 'FAILED TO ISSUE PTZ ZOOM');
    }
  }).auth(USER,PASS,false);
};

dahua.prototype.ptzMove = function (direction,action,speed) {
  var self = this;
  if (isNaN(speed)) self.emit("error",'INVALID PTZ SPEED');
  if ((action !== 'start') || (action !== 'stop')) {
    self.emit("error",'INVALID PTZ COMMAND');
    return 0;
  }
  if ((direction !== 'Up') || (direction !== 'Down') || (direction !== 'Left') || (direction !== 'Right') ||
      (direction !== 'LeftUp') || (direction !== 'RightUp') || (direction !== 'LeftDown') || (direction !== 'RightDown')) {
    self.emit("error",'INVALID PTZ DIRECTION');
    return 0;
  }
  request(BASEURI + '/cgi-bin/ptz.cgi?action=' + action + '&channel=0&code=' + direction + '&arg1=' + speed +'&arg2=' + speed + '&arg3=0', function (error, response, body) {
    if ((error) || (response.statusCode !== 200) || (body.trim() !== "OK")) {
      self.emit("error", 'FAILED TO ISSUE PTZ UP COMMAND');
    }
  }).auth(USER,PASS,false);
};

dahua.prototype.ptzStatus = function () {
  var self = this;
  request(BASEURI + '/cgi-bin/ptz.cgi?action=getStatus', function (error, response, body) {
    if ((!error) && (response.statusCode === 200)) {
      body = body.toString().split('\r\n');
      self.emit("ptzStatus", body);
    } else {
      self.emit("error", 'FAILED TO QUERY STATUS');
    }
  }).auth(USER,PASS,false);
};

dahua.prototype.dayProfile = function () {
  var self = this;
  request(BASEURI + '/cgi-bin/configManager.cgi?action=setConfig&VideoInMode[0].Config[0]=1', function (error, response, body) {
    if ((!error) && (response.statusCode === 200)) {
      if (body === 'Error') {   // Didnt work, lets try another method for older cameras
        request(BASEURI + '/cgi-bin/configManager.cgi?action=setConfig&VideoInOptions[0].NightOptions.SwitchMode=0', function (error, response, body) {
          if ((error) || (response.statusCode !== 200)) {
            self.emit("error", 'FAILED TO CHANGE TO DAY PROFILE');
          }
        }).auth(USER,PASS,false);
      }
    } else {
      self.emit("error", 'FAILED TO CHANGE TO DAY PROFILE');
    }
  }).auth(USER,PASS,false);
};

dahua.prototype.nightProfile = function () {
  var self = this;
  request(BASEURI + '/cgi-bin/configManager.cgi?action=setConfig&VideoInMode[0].Config[0]=2', function (error, response, body) {
    if ((!error) && (response.statusCode === 200)) {
      if (body === 'Error') {   // Didnt work, lets try another method for older cameras
        request(BASEURI + '/cgi-bin/configManager.cgi?action=setConfig&VideoInOptions[0].NightOptions.SwitchMode=3', function (error, response, body) {
          if ((error) || (response.statusCode !== 200)) {
            self.emit("error", 'FAILED TO CHANGE TO NIGHT PROFILE');
          }
        }).auth(USER,PASS,false);
      }
    } else {
      self.emit("error", 'FAILED TO CHANGE TO NIGHT PROFILE');
    }
  }).auth(USER,PASS,false);
};


/*====================================
=            File Finding            =
====================================*/

dahua.prototype.findFiles = function(query){

    var self = this;

    if ((!query.channel) || (!query.startTime) || (!query.endTime)) {
      self.emit("error",'FILE FIND MISSING ARGUMENTS');
      return 0;
    }

    // create a finder
    this.createFileFind();

    // start search
    this.on('fileFinderCreated',function(objectId){
      if (TRACE) console.log('fileFinderId:',objectId);
      self.startFileFind(objectId,query.channel,query.startTime,query.endTime,query.types);
    });

    // fetch results
    this.on('startFileFindDone',function(objectId,body){
      if (TRACE) console.log('startFileFindDone:',objectId,body);
      self.nextFileFind(objectId,query.count);
    });

    // handle the results
    this.on('nextFileFindDone',function(objectId,items){

      if (TRACE) console.log('nextFileFindDone:',objectId);
      items.query = query;
      self.emit('filesFound',items);
      self.closeFileFind(objectId);

    });

    // close and destroy the finder
    this.on('closeFileFindDone',function(objectId,body){
      if (TRACE) console.log('closeFileFindDone:',objectId,body);
      self.destroyFileFind(objectId);
    });

    this.on('destroyFileFindDone',function(objectId,body){
      if (TRACE) console.log('destroyFileFindDone:',objectId,body);
    });

};

// 10.1.1 Create
// URL Syntax
// http://<ip>/cgi-bin/mediaFileFind.cgi?action=factory.create

// Comment
// Create a media file finder
// Response
// result=08137

dahua.prototype.createFileFind = function () {
  var self = this;
  request(BASEURI + '/cgi-bin/mediaFileFind.cgi?action=factory.create', function (error, response, body) {
    if ((error)) {
      self.emit("error", 'ERROR ON CREATE FILE FIND COMMAND');
    }
    // stripping 'result=' and returning the object ID
    var oid = body.trim().substr(7);
    self.emit("fileFinderCreated",oid);

  }).auth(USER,PASS,false);

};


// 10.1.2 StartFind

// URL Syntax
// http://<ip>/cgi-bin/mediaFileFind.cgi?action=findFile&object=<objectId>&condition.Channel=<channel>&condition.StartTime= <start>&condition.EndT ime=<end>&condition.Dirs[0]=<dir>&condition.Types[0]=<type>&condition.Flag[0]=<flag>&condition.E vents[0]=<event>

// Comment
// Start to find file wth the above condition. If start successfully, return true, else return false.
// object : The object Id is got from interface in 10.1.1 Create
// condition.Channel: in which channel you want to find the file .
// condition.StartTime/condition.EndTime: the start/end time when recording.
// condition.Dirs: in which directories you want to find the file. It is an array. The index starts from 0. The range of dir is {“/mnt/dvr/sda0”, “/mnt/dvr/sda1”}. This condition can be omitted. If omitted, find files in all the directories.
// condition.Types: which types of the file you want to find. It is an array. The index starts from 0. The range of type is {“dav”,
// “jpg”, “mp4”}. If omitted, find files with all the types.
// condition.Flags: which flags of the file you want to find. It is an array. The index starts from 0. The range of flag is {“Timing”, “Manual”, “Marker”, “Event”, “Mosaic”, “Cutout”}. If omitted, find files with all the flags.
// condition.Event: by which event the record file is triggered. It is an array. The index starts from 0. The range of event is {“AlarmLocal”, “VideoMotion”, “VideoLoss”, “VideoBlind”, “Traffic*”}. This condition can be omitted. If omitted, find files of all the events.
// Example:
// Find file in channel 1, in directory “/mnt/dvr/sda0",event type is "AlarmLocal" or "VideoMotion", file type is “dav”, and time between 2011-1-1 12:00:00 and 2011-1-10 12:00:00 , URL is: http://<ip>/cgi-bin/mediaFileFind.cgi?action=findFile&object=08137&condition.Channel=1&conditon.Dir[0]=”/mnt/dvr/sda0”& conditon.Event[0]=AlarmLocal&conditon.Event[1]=V ideoMotion&condition.StartT ime=2011-1-1%2012:00:00&condition.EndT i me=2011-1-10%2012:00:00

// Response
// OK or Error
//

// To be Done: Implement Dirs, Types, Flags, Event Args

dahua.prototype.startFileFind = function (objectId,channel,startTime,endTime,types) { // Dirs,Types,Flags,Event) {
  var self = this;
  if ((!objectId) || (!channel) || (!startTime) || (!endTime) ) {
    self.emit("error",'INVALID FINDFILE COMMAND - MISSING ARGS');
    return 0;
  }

  types = types || [];
  var typesQueryString = "";

  types.forEach(function(el,idx){
    typesQueryString += '&condition.Types[' + idx + ']=' + el;
  });

  var url = BASEURI + '/cgi-bin/mediaFileFind.cgi?action=findFile&object=' + objectId + '&condition.Channel=' + channel + '&condition.StartTime=' + startTime + '&condition.EndTime=' + endTime + typesQueryString;
  // console.log(url);

  request(url, function (error, response, body) {
    if ((error)) {
      if (TRACE) console.log('startFileFind Error:',error);
      self.emit("error", 'FAILED TO ISSUE FIND FILE COMMAND');
    } else {
      if (TRACE) console.log('startFileFind Response:',body.trim());

      // no results = http code 400 ?
      //if(response.statusCode == 400 ) {
      //  self.emit("error", 'FAILED TO ISSUE FIND FILE COMMAND - NO RESULTS ?');
      //} else {
      //
        self.emit('startFileFindDone',objectId,body.trim());
      //}
    }
  }).auth(USER,PASS,false);

};


// 10.1.3 FindNextFile
// URL Syntax

// http://<ip>/cgi-bin/mediaFileFind.cgi?action=findNextFile&object=<objectId>&count=<fileCount>

// Comment
// Find the next fileCount files.
// The maximum value of fileCount is 100.

// Response
// found=1
// items[0]. Channel =1
// items[0]. StartTime =2011-1-1 12:00:00
// items[0]. EndTime =2011-1-1 13:00:00
// items[0]. Type =dav
// items[0]. Events[0]=AlarmLocal
// items[0]. FilePath =/mnt/dvr/sda0/2010/8/11/dav/15:40:50.jpg items[0]. Length =790
// items[0]. Duration = 3600
// items[0].SummaryOffset=2354
// tems[0].Repeat=0
// items[0].WorkDir=”/mnt/dvr/sda0”
// items[0]. Overwrites=5
// items[0]. WorkDirSN=0


// Response
// found - Count of found file, found is 0 if no file is found.
// Channel - Channel
// StartTime - Start Time
// EndTime - End time
// Type - File type
// Events - Event type.
// FilePath - filepath.
// Length - File length
// Duration - Duration time
// SummaryOffset - Summary offset
// Repeat - Repeat file number
// WorkDir - The file’s directory
// Overwrites - Overwrite times of the work directory
// WorkDirSN - Workdir No
//
//

dahua.prototype.nextFileFind = function (objectId,count) {

  var self = this;
  count = count || 100;

  if ((!objectId)) {
    self.emit("error",'INVALID NEXT FILE COMMAND');
    return 0;
  }

  request(BASEURI + '/cgi-bin/mediaFileFind.cgi?action=findNextFile&object=' + objectId + '&count=' + count, function (error, response, body) {
    if ((error) || (response.statusCode !== 200)) {
      if (TRACE) console.log('nextFileFind Error:',error);
      self.emit("error", 'FAILED NEXT FILE COMMAND');
    }

    // if (TRACE) console.log('nextFileFind Response:',body.trim());

    var items = {};
    var data = body.split('\r\n');

    // getting found count
    items.found = data[0].split("=")[1];

    // parsing items
    data.forEach(function(item){
      if(item.startsWith('items[')) {
        var propertyAndValue = item.split("=");
        setKeypath(items, propertyAndValue[0], propertyAndValue[1]);
      }
    });

    self.emit('nextFileFindDone',objectId,items);

  }).auth(USER,PASS,false);
};




// 10.1.4 Close
// URL Syntax
// http://<ip>/cgi-bin/mediaFileFind.cgi?action=close&object=<objectId>

// Comment
// Stop find.

// Response
// OK or ERROR

dahua.prototype.closeFileFind = function (objectId) {
  var self = this;
  if ((!objectId)) {
    self.emit("error",'OBJECT ID MISSING');
    return 0;
  }
  request(BASEURI + '/cgi-bin/mediaFileFind.cgi?action=close&object=' + objectId, function (error, response, body) {
    if ((error) || (response.statusCode !== 200) || (body.trim() !== "OK")) {
      self.emit("error", 'ERROR ON CLOSE FILE FIND COMMAND');
    }

    self.emit('closeFileFindDone',objectId,body.trim());

  }).auth(USER,PASS,false);

};

// 10.1.5 Destroy
// URL Syntax
// http://<ip>/cgi-bin/mediaFileFind.cgi?action=destroy&object=<objectId>

// Comment
// Close the media file finder.

// Response
// OK or ERROR

dahua.prototype.destroyFileFind = function (objectId) {
  var self = this;
  if ((!objectId)) {
    self.emit("error",'OBJECT ID MISSING');
    return 0;
  }
  request(BASEURI + '/cgi-bin/mediaFileFind.cgi?action=destroy&object=' + objectId, function (error, response, body) {
    if ((error) || (response.statusCode !== 200) || (body.trim() !== "OK")) {
      self.emit("error", 'ERROR ON DESTROY FILE FIND COMMAND');
    }

    self.emit('destroyFileFindDone',objectId,body.trim());

  }).auth(USER,PASS,false);
};

/*=====  End of File Finding  ======*/


/*================================
=            Load File           =
================================*/

// API Description
//
// URL Syntax
// http://<ip>/cgi-bin/RPC_Loadfile/<filename>

// Response
// HTTP Code: 200 OK
// Content-Type: Application/octet-stream
// Content-Length:<fileLength>
// Body:
// <data>
// <data>
// For example: http://10.61.5.117/cgi-bin/RPC_Loadfile/mnt/sd/2012-07-13/001/dav/09/09.30.37-09.30.47[R][0@0][0].dav

dahua.prototype.saveFile = function (file,filename) {
  var self = this;

  if ((!file)) {
    self.emit("error",'FILE OBJECT MISSING');
    return 0;
  }

  if ((!file.FilePath)) {
    self.emit("error",'FILEPATH in FILE OBJECT MISSING');
    return 0;
  }

  if(!filename) {

    if( !file.Channel || !file.StartTime || !file.EndTime || !file.Type ) {
     self.emit("error",'FILE OBJECT ATTRIBUTES MISSING');
     return 0;
    }

     // the fileFind response obejct
     // { Channel: '0',
     // Cluster: '0',
     // Compressed: 'false',
     // CutLength: '634359892',
     // Disk: '0',
     // Duration: '495',
     // EndTime: '2018-05-19 10:45:00',
     // FilePath: '/mnt/sd/2018-05-19/001/dav/10/10.36.45-10.45.00[R][0@0][0].dav',
     // Flags: [Object],
     // Length: '634359892',
     // Overwrites: '0',
     // Partition: '0',
     // Redundant: 'false',
     // Repeat: '0',
     // StartTime: '2018-05-19 10:36:45',
     // Summary: [Object],
     // SummaryOffset: '0',
     // Type: 'dav',
     // WorkDir: '/mnt/sd',
     // WorkDirSN: '0' };

     filename = this.generateFilename(HOST,file.Channel,file.StartTime,file.EndTime,file.Type);

  }

  progress(request(BASEURI + '/cgi-bin/RPC_Loadfile/' + file.FilePath))
  .auth(USER,PASS,false)
  .on('progress', function (state) {
      if(TRACE) {
        console.log('Downloaded', Math.floor(state.percent * 100) + '%','@ '+Math.floor(state.speed / 1000), 'KByte/s' );
      }
  })
  .on('response',function(response){
      if (response.statusCode !== 200) {
        self.emit("error", 'ERROR ON LOAD FILE COMMAND');
      }
  })
  .on('error',function (error){
      if(error.code == "ECONNRESET") {
        self.emit("error", 'ERROR ON LOAD FILE COMMAND - FILE NOT FOUND?');
      } else {
        self.emit("error", 'ERROR ON LOAD FILE COMMAND');
      }
  })
  .on('end',function() {
    self.emit("saveFile", {
      'status':'DONE',
    });
  })
  .pipe(fs.createWriteStream(filename));
  // TBD: file writing error handling

};




/*=====  End of Load File  ======*/


/*====================================
=            Get Snapshot            =
====================================*/

// API Description
//
// URL Syntax
// http://<ip>/cgi-bin/snapshot.cgi? [channel=<channelNo>]

// Response
// A picture encoded by jpg

// Comment
// The channel number is default 0 if the request is not carried the param.

dahua.prototype.getSnapshot = function (options) {
  var self = this;

  if(options === undefined) {
    var options = {};
  }

  if ((!options.channel)) {
    options.channel = 0;
  }

  if ((!options.path)) {
    options.path = '';
  }

  if (!options.filename) {
    options.filename = this.generateFilename(HOST,options.channel,moment(),'','jpg');
  }

  request(BASEURI + '/cgi-bin/snapshot.cgi?' + options.channel , function (error, response, body) {
    if ((error) || (response.statusCode !== 200)) {
      self.emit("error", 'ERROR ON SNAPSHOT');
    }
  })
  .on('end',function(){
    if(TRACE) console.log('SNAPSHOT SAVED');
    self.emit("getSnapshot", {
    'status':'DONE',});
  })
  .auth(USER,PASS,false).pipe(fs.createWriteStream(path.join(options.path,options.filename)));
  // TBD: file writing error handling

};

/*=====  End of Get Snapshot  ======*/

dahua.prototype.generateFilename = function( device, channel, start, end, filetype ) {

  filename = device + '_ch' + channel + '_';

  // to be done: LOCALIZATION ?
  startDate = moment(start);

  filename += startDate.format('YYYYMMDDhhmmss');
  if(end) {
    endDate = moment(end);
    filename += '_' + endDate.format('YYYYMMDDhhmmss');
  }
  filename += '.' + filetype;

  return filename;

};


String.prototype.startsWith = function (str){
  return this.slice(0, str.length) == str;
};

exports.dahua = dahua;
