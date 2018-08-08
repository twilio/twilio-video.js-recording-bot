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
Room SID or name. For example, replace `$ROOM_SID_OR_NAME` below with your
actual Room SID or name and run the command:

```
npm start -- $ROOM_SID_OR_NAME
```

### Stopping recording-bot

Send the process `SIGUSR2` to complete any recordings and cause the
recording-bot to disconnect.

```
kill -s USR2 $PID
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

Example
-------

Here is example log output from running recording-bot in a Peer-to-Peer Room
named "testing". After letting recording-bot run for a few moments, I executed
`kill` from a separate terminal to shut it down.

```
$ npm start -- testing

> twilio-video.js-recording-bot@0.1.0 start /Users/mroberts/src/work/twilio-video.js-recording-bot
> node index.js "testing"

2018-08-07 22:30:56 info:

  recording-bot's PID is 19928.

  You can send SIGUSR2 to this PID to cause recording-bot to stop recording and to
  disconnect from the Room. For example,

    kill -s USR2 19928

  Happy recording!

2018-08-07 22:30:56 info: Started HTTP server. Listening on 3000.
2018-08-07 22:30:57 info: Launched browser.
2018-08-07 22:30:58 info: Opened new page.
2018-08-07 22:31:03 info: Navigated to http://localhost:3000.
2018-08-07 22:31:03 info: Registered callback(s).
2018-08-07 22:31:04 info: Connected to Room RM04c95e51fbfeca134d3fbd5cb306e492 as LocalParticipant PAb09f2e107594cef48f03cbc362711e86.
2018-08-07 22:31:04 info: There are 2 RemoteParticipants in the Room:

  - RemoteParticipant PA671b11487857398312172c9c07a16501
  - RemoteParticipant PA9b4ba93a0e8313552bc786ace2d47b75

2018-08-07 22:31:04 info: Subscribed to RemoteAudioTrack MT65e9ba4dbd5eb7805048e5e17ebeb82f published by RemoteParticipant PA671b11487857398312172c9c07a16501
2018-08-07 22:31:04 info: Begin recording RM04c95e51fbfeca134d3fbd5cb306e492/PAb09f2e107594cef48f03cbc362711e86/PA671b11487857398312172c9c07a16501/MT65e9ba4dbd5eb7805048e5e17ebeb82f/1.webm.
2018-08-07 22:31:04 info: Subscribed to RemoteVideoTrack MTbfff81d090ff74508cf7ccb9aa6c495b published by RemoteParticipant PA671b11487857398312172c9c07a16501
2018-08-07 22:31:04 info: Begin recording RM04c95e51fbfeca134d3fbd5cb306e492/PAb09f2e107594cef48f03cbc362711e86/PA671b11487857398312172c9c07a16501/MTbfff81d090ff74508cf7ccb9aa6c495b/1.webm.
2018-08-07 22:31:05 info: Subscribed to RemoteAudioTrack MT7483929787983934428c4e24224497a5 published by RemoteParticipant PA9b4ba93a0e8313552bc786ace2d47b75
2018-08-07 22:31:05 info: Begin recording RM04c95e51fbfeca134d3fbd5cb306e492/PAb09f2e107594cef48f03cbc362711e86/PA9b4ba93a0e8313552bc786ace2d47b75/MT7483929787983934428c4e24224497a5/1.webm.
2018-08-07 22:31:05 info: Subscribed to RemoteVideoTrack MT568339b394e147c428857e56e3419ad5 published by RemoteParticipant PA9b4ba93a0e8313552bc786ace2d47b75
2018-08-07 22:31:05 info: Begin recording RM04c95e51fbfeca134d3fbd5cb306e492/PAb09f2e107594cef48f03cbc362711e86/PA9b4ba93a0e8313552bc786ace2d47b75/MT568339b394e147c428857e56e3419ad5/1.webm.
2018-08-07 22:31:17 info: Closed HTTP server.
2018-08-07 22:31:17 info: Stop recording RM04c95e51fbfeca134d3fbd5cb306e492/PAb09f2e107594cef48f03cbc362711e86/PA671b11487857398312172c9c07a16501/MT65e9ba4dbd5eb7805048e5e17ebeb82f/1.webm.
2018-08-07 22:31:17 info: Stop recording RM04c95e51fbfeca134d3fbd5cb306e492/PAb09f2e107594cef48f03cbc362711e86/PA671b11487857398312172c9c07a16501/MTbfff81d090ff74508cf7ccb9aa6c495b/1.webm.
2018-08-07 22:31:17 info: Stop recording RM04c95e51fbfeca134d3fbd5cb306e492/PAb09f2e107594cef48f03cbc362711e86/PA9b4ba93a0e8313552bc786ace2d47b75/MT7483929787983934428c4e24224497a5/1.webm.
2018-08-07 22:31:17 info: Stop recording RM04c95e51fbfeca134d3fbd5cb306e492/PAb09f2e107594cef48f03cbc362711e86/PA9b4ba93a0e8313552bc786ace2d47b75/MT568339b394e147c428857e56e3419ad5/1.webm.
2018-08-07 22:31:17 info: Disconnecting from Room...
2018-08-07 22:31:17 info: Unsubscribed from RemoteVideoTrack MTbfff81d090ff74508cf7ccb9aa6c495b published by RemoteParticipant PA671b11487857398312172c9c07a16501
2018-08-07 22:31:17 info: Unsubscribed from RemoteAudioTrack MT65e9ba4dbd5eb7805048e5e17ebeb82f published by RemoteParticipant PA671b11487857398312172c9c07a16501
2018-08-07 22:31:17 info: Unsubscribed from RemoteAudioTrack MT7483929787983934428c4e24224497a5 published by RemoteParticipant PA9b4ba93a0e8313552bc786ace2d47b75
2018-08-07 22:31:17 info: Unsubscribed from RemoteVideoTrack MT568339b394e147c428857e56e3419ad5 published by RemoteParticipant PA9b4ba93a0e8313552bc786ace2d47b75
2018-08-07 22:31:17 info: Disconnected from Room.
2018-08-07 22:31:17 info: Closed browser.
```

Next, I used `tree` to show the resulting files:

```
$ tree RM04c95e51fbfeca134d3fbd5cb306e492
RM04c95e51fbfeca134d3fbd5cb306e492
└── PAb09f2e107594cef48f03cbc362711e86
    ├── PA671b11487857398312172c9c07a16501
    │   ├── MT65e9ba4dbd5eb7805048e5e17ebeb82f
    │   │   └── 1.webm
    │   └── MTbfff81d090ff74508cf7ccb9aa6c495b
    │       └── 1.webm
    └── PA9b4ba93a0e8313552bc786ace2d47b75
        ├── MT568339b394e147c428857e56e3419ad5
        │   └── 1.webm
        └── MT7483929787983934428c4e24224497a5
            └── 1.webm

7 directories, 4 files
```

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
