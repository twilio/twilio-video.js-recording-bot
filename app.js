'use strict';

const { connect } = require('twilio-video');

const trackClassName = {
  audio: 'RemoteAudioTrack',
  video: 'RemoteVideoTrack'
};

let room = null;
let shouldClose = false;
let isClosing = false;

function indent(str, n) {
  return str.split('\n').map(line => `  ${line}`).join('\n');
}

window.addEventListener('error', event => {
  error(`\n\n${indent(event.error.stack)}\n`);
});

window.onunhandledrejection = event => {
  error(`\n\n${indent(event.reason.stack)}\n`);
};

async function main(token, roomSid) {
  debug('Connecting to Room...');
  room = await connect(token, {
    name: roomSid,
    tracks: []
  });
  info(`Connected to Room ${room.sid} as LocalParticipant ${room.localParticipant.sid}.`);
  if (shouldClose) {
    close();
    return;
  }

  const participants = [...room.participants.values()];
  if (!participants.length) {
    info('There are no RemoteParticipants in the Room.');
  } else {
    let message = `There ${participants.length > 1 ? 'are' : 'is'} \
${participants.length} RemoteParticipant${participants.length > 1 ? 's' : ''} \
in the Room:\n\n`;
    participants.forEach(participant => {
      message += `- RemoteParticipant ${participant.sid}\n`;
      participant.tracks.forEach(track => {
        if (track.kind === 'data') {
          return;
        }
        message += `  - ${trackClassName[track.kind]} ${track.sid}\n`;
      });
    });
    info(message);
    participants.forEach(participant => {
      participant.tracks.forEach(track => trackSubscribed(track, participant));
    });
  }

  room.on('trackSubscribed', (track, participant) => {
    if (track.kind === 'data') {
      return;
    }
    info(`Subscribed to ${trackClassName[track.kind]} ${track.sid} published \
by RemoteParticipant ${participant.sid}`);
    trackSubscribed(track, participant);
  });

  room.on('trackUnsubscribed', (track, participant) => {
    if (track.kind === 'data') {
      return;
    }
    info(`Unsubscribed from ${trackClassName[track.kind]} ${track.sid} \
published by RemoteParticipant ${participant.sid}`);
    trackUnsubscribed(track, participant);
  });

  room.once('disconnected', (room, error) => {
    info(`Disconnected from Room.`);
    close(error);
  });

  return {
    roomSid: room.sid,
    localParticipantSid: room.localParticipant.sid
  };
}

window.main = main;

function close(error) {
  if (isClosing) {
    return;
  }
  isClosing = true;

  if (room && room.state !== 'disconnected') {
    debug('Disconnecting from Room...');
    room.disconnect();
  }
}

window.close;

function trackSubscribed(track, participant) {
  if (track.kind === 'data') {
    return;
  }
  let subscriptionCount = subscriptionCounts.get(track) || 0;
  subscriptionCount++;
  subscriptionCounts.set(track, subscriptionCount);
  const filepath = [
    room.sid,
    room.localParticipant.sid,
    participant.sid,
    track.sid,
    `${subscriptionCount}.webm`
  ];
  record(track.mediaStreamTrack, filepath);
}

function trackUnsubscribed(track) {
  const recorder = recorders.get(track);
  recorders.delete(track);
  if (recorder) {
    info(`Stop recording ${filename}.`);
    recorder.stop();
  }
}

const recorders = new Map();
const subscriptionCounts = new Map();

function record(track, filepath) {
  const filename = filepath.join('/');
  info(`Begin recording ${filename}.`);
  createRecording(filepath);

  const stream = new MediaStream([track]);

  if (track.kind === 'video') {
    // NOTE(mroberts): This is a hack to workaround the following bug:
    //
    //   https://bugs.chromium.org/p/chromium/issues/detail?id=760760
    //
    const audioContext = new AudioContext();
    const destinationNode = audioContext.createMediaStreamDestination();
    const oscillatorNode = audioContext.createOscillator();
    oscillatorNode.frequency.setValueAtTime(0, audioContext.currentTime);
    oscillatorNode.connect(destinationNode);
    const [audioTrack] = destinationNode.stream.getAudioTracks();
    stream.addTrack(audioTrack);
  }

  const mimeType = `${track.kind}/webm`;
  const recorder = new MediaRecorder(stream, { mimeType });

  recorders.set(track, recorder);

  recorder.ondataavailable = event => {
    if (!event.data.size) {
      return;
    }
    const fileReader = new FileReader();
    fileReader.onload = event => {
      const buffer = event.target.result;
      appendRecording(filepath, arrayBufferToString(buffer));
    };
    fileReader.readAsArrayBuffer(event.data);
  };

  recorder.start(100);
}

function arrayBufferToString(buffer) {
  const bufView = new Uint8Array(buffer);
  const length = bufView.length;

  let result = '';
  let addition = Math.pow(2, 8) - 1;

  for (let i = 0; i < length; i += addition) {
    if (i + addition > length){
        addition = length - i;
    }
    result += String.fromCharCode.apply(null, bufView.subarray(i, i + addition));
  }

  return result;
}
