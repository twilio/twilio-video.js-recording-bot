twilio-video.js-recording-bot
=============================

twilio-video.js-recording-bot, or just "recording-bot", is a
[puppeteer](https://github.com/GoogleChrome/puppeteer)-based twilio-video.js
application that

1. Connects to a Room, and
2. Records RemoteTracks to disk.

recording-bot is a "bot" in the sense that it appears like any other Participant
in the Room you ask it to connect to. That being said, if you intend to use it
with your application, you may want to filter it from your UI with code like the
following:

```js
if (participant.identity === 'recording-bot') {
  // Don't show this Participant in the UI.
  return;
}
// Otherwise, show the Participant in the UI.
```

Caveats
-------

In almost all cases, you'll get better performance and quality using Twilio's
own [recording solution for Group Rooms](https://www.twilio.com/docs/video/api/recordings-resource).
That being said, if regulations restrict you from using Twilio's recording
solution or if you are using Peer-to-Peer Rooms, you may be interested in this
approach. **Just don't expect great performance or quality!**

Installation
------------

First, you should have a recent version of [Node](https://nodejs.org/en)
installed. Then run

```
npm install
```

Usage
-----

### Configuring recording-bot (`.env`)

recording-bot requires an Access Token to connect to a Room. In order to
generate the Access Token, you need to provide a `.env` file. An example is
included in this project under `.env.template`. Copy this file, and provide your
own `ACCOUNT_SID`, `API_KEY_SID`, and `API_KEY_SECRET` values.

### Starting recording-bot

Once configured, you can tell recording-bot to connect to a Room by passing the
Room SID. For example, replace `$ROOM_SID` below with your actual Room SID and
run the command:

```
npm start -- $ROOM_SID
```

### Stopping recording-bot

Send the process `SIGUSR2` to complete any recordings and cause the
recording-bot to disconnect.

```
kill -SIGUSR2 $PID
```

### Accessing Recordings

Recordings are saved in a directory structure relative to the directory where
you started recording-bot. Recordings are saved such that subsequent runs of
recording-bot for the same Room or re-subscriptions will never cause recordings
to be overwritten. The directory structure looks like the following:

```
$ROOM_SID
└── $LOCAL_PARTICIPANT_SID
    └── $REMOTE_PARTICIPANT_SID
        └── $REMOTE_TRACK_SID
            └── $N.webm
```

For example, assume recording-bot connects to a Room "RM123" with
LocalParticipant SID "PA456". Next, assume RemoteParticipant "PA789" publishes
RemoteAudioTrack and RemoteVideoTrack "MT123" and "MT456", respectively. Then
the directory structure will look like the following:

```
RM123
└── PA456
    └── PA789
        ├── MT123
        │   └── 1.webm
        └── MT456
            └── 1.webm
```

`N` is incremented any time a RemoteTrack is unsubscribed from and re-subscribed
to, as these represent distinct recordings.

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

Finally, when `SIGUSR2` is received, recording-bot stops recording and
disconnects from the Room.
