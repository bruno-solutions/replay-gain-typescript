// https://github.com/rochars/wavefile
// https://rochars.github.io/wavefile/#add-riff-tags-to-files
// https://exiftool.org/TagNames/RIFF.html
// https://exiftool.org/TagNames/RIFF.html#Info !!!
// https://exiftool.org/TagNames/ID3.html

// https://lostechies.com/derickbailey/2013/09/23/getting-audio-file-information-with-htmls-file-api-and-audio-element/

// https://web.dev/webaudio-intro/
// https://github.com/tsenart/audiojedit/blob/master/public/js/app.js AudioJEdit

// The energy of each 50 ms "phonon" of the signal is the Root Mean Square (RMS) of its filtered samples
const PHONON_DURATION: number = 0.05;

async function test(urls: Array<string>, audios: HTMLAudioElement[]): Promise<void> {
  console.log(`test(${urls[0]},${urls[1]},${urls[2]})`);

  for (let index = urls.length - 1; 0 <= index; index--) {
    const url: string = urls[index];
    const audio: HTMLAudioElement = audios[index];

    audio.onloadedmetadata = (event: Event) => {
      console.log(event);
    };

    audio.onloadeddata = (event: Event) => {
      console.log(event);
    };

    console.info('-------------------------------------------------------------------------');
    const response = await fetch(url);
    console.debug(response);
    const arrayBuffer = await response.arrayBuffer();
    console.debug(arrayBuffer);
    const blob: Blob = new Blob([arrayBuffer]);
    console.debug(blob);
    const objectURL = URL.createObjectURL(blob);
    console.debug(objectURL);
    audio.src = objectURL;
    const context = new AudioContext();
    console.debug(context);
    const decodedAudioData = await context.decodeAudioData(arrayBuffer);
    console.debug(decodedAudioData);
    console.debug(decodedAudioData.getChannelData(0));
    if (1 < decodedAudioData.numberOfChannels) console.debug(decodedAudioData.getChannelData(1));
    const sourceNode = context.createBufferSource();
    sourceNode.buffer = decodedAudioData;
    console.debug(sourceNode);

    // URL.revokeObjectURL(objectURL);

    const x = new Yulewalk(PHONON_DURATION, decodedAudioData.sampleRate, Array.from(decodedAudioData.getChannelData(0))).getFiltered();
    console.debug(x);
    const x1 = new Butterworth(PHONON_DURATION, decodedAudioData.sampleRate, x).getFiltered();
    console.debug(x1);
    if (1 < decodedAudioData.numberOfChannels) {
      const y = new Yulewalk(PHONON_DURATION, decodedAudioData.sampleRate, Array.from(decodedAudioData.getChannelData(1))).getFiltered();
      console.debug(y);
      const y1 = new Butterworth(PHONON_DURATION, decodedAudioData.sampleRate, y).getFiltered();
      console.debug(y, y1);
    }
  }
}

function init() {
  console.debug('init()');/*
  try {
    context = new AudioContext();
  } catch (e) {
    alert('Web Audio API is not supported in this browser');
  }*/

  const testUrls: string[] = [
    'https://s3.amazonaws.com/dev.sttutter.cloud/Content/Clips/27/A16C50626CD3454C6DE206665B11AFA5-Crimson+Silhouettes+(Parts+575-792).wav',
    'https://s3.amazonaws.com/dev.sttutter.cloud/Content/Clips/20/50C9B83949A8424A4BB12F0C1F8640D0-Crystaline+(40-60).wav',
    'https://s3.amazonaws.com/dev.sttutter.cloud/Content/Clips/22/6405CF3C78CF4A1920D40CA15A3B1756-I\'m+not+in+love.+I\'m+not+in+love.wav'
  ];

  const audioElements: HTMLAudioElement[] = [
    document.getElementById('1') as HTMLAudioElement,
    document.getElementById('2') as HTMLAudioElement,
    document.getElementById('3') as HTMLAudioElement
  ];

  test(testUrls, audioElements);
}

window.addEventListener('load', init, false);
