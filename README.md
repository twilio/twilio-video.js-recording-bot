recording-bot
=============

recording-bot is a [puppeteer](https://github.com/GoogleChrome/puppeteer)-based
twilio-video.js application that

1. Connects to a Room
2. Records RemoteTracks to disk.

Installation
------------

```
npm install
```

Usage
-----

recording-bot requires an Access Token and accepts an optional Room SID to
start.

```
npm start -- $ACCESS_TOKEN [$ROOM_SID]
```

Send the process SIGUSR2 to complete any recordings and cause the recording-bot
to disconnect.

```
kill -SIGUSR2 $PID
```

Finally, all recordings will be available in the directory from which you ran
recording-bot. The recordings will be in the following format,

```
$PARTICIPANT_SID-$TRACK_SID-$N.webm
```

where `$PARTICIPANT_SID` and `$TRACK_SID` are RemoteParticipant and RemoteTrack
SIDs. `$N` is an increasing integer for distinguishing distinct recordings as
RemoteTracks are subscribed to/unsubscribed from.

How it Works
------------

First, recording-bot starts an [Express](https://expressjs.com/) server that
loads [twilio-video.js](http://github.com/twilio/twilio-video.js). Next,
recording-bot starts puppeteer and navigates to the Express server. Finally,
recording-bot passes the Access Token and Room SID provided via the command-line
to the page served by Express using puppeteer. If successful, recording-bot will
be able to connect to the Room.

While connected to the Room, recording-bot listens for "trackSubscribed" and
"trackUnsubscribed" events. These events are used to drive
[MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)s
that are used for actually recording the RemoteTracks.

Finally, when SIGUSR2 is received, recording-bot stops recording and disconnects
from the Room.
