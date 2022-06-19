// https://rochars.github.io/wavefile/#add-riff-tags-to-files
// https://lostechies.com/derickbailey/2013/09/23/getting-audio-file-information-with-htmls-file-api-and-audio-element/
// https://web.dev/webaudio-intro/

import {Yulewalk} from './iir.filter/yulewalk';

function test(urls: Array<string>): void {
  for (const url of urls) {
    const source: HTMLAudioElement = new Audio(url);

    const samples: number[] = [];
    const x = new Yulewalk(8000, samples);
    console.log('hi');
  }
}

const testUrls: string[] = [
  'https://s3.amazonaws.com/dev.sttutter.cloud/Content/Clips/27/A16C50626CD3454C6DE206665B11AFA5-Crimson+Silhouettes+(Parts+575-792).wav',
  'https://s3.amazonaws.com/dev.sttutter.cloud/Content/Clips/20/50C9B83949A8424A4BB12F0C1F8640D0-Crystaline+(40-60).wav',
  'https://s3.amazonaws.com/dev.sttutter.cloud/Content/Clips/22/6405CF3C78CF4A1920D40CA15A3B1756-I\'m+not+in+love.+I\'m+not+in+love.wav'
]

test(testUrls);
