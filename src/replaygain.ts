/*
* ReplayGain - analyze input samples and return recommended volume changes
* For an explanation of the concepts and the basic algorithms,go to: http://www.replaygain.org/
* specification: https://wiki.hydrogenaud.io/index.php?title=ReplayGain_1.0_specification
* derived from https://github.com/cpuimage/ReplayGainAnalysis
*
* The energy of each (monaural or stereo) 50ms block of the filtered signal is calculated using the the Root Mean Square (RMS) method as follows:
*
* For each block:
*  - every sample value from the right and left channels is squared
*  - the mean average of the sample values is taken
*  - the square root of the mean average (RMS value) is calculated
*
* The RMS value is then converted into decibels with the following equation:
*  - 20 * log10((2 * RMS) / (high squared sample value - low squared sample value))
*
* The Infinite Impulse Response (IIR) Butterworth and Yulewalk filters applied to the samples consider:
*     up to <filter order> number of previous samples
*     AND
*     up to <filter order> number of previously filtered samples
*/
/*
import {filter as butterworthFilter} from './iir.filter/butterworth';
import {Yulewalk} from './iir.filter/yulewalk';

const DECIBEL_LIMIT: number = 80;
const STEPS_PER_DECIBEL: number = 100;
const STEPS_LIMIT: number = STEPS_PER_DECIBEL * DECIBEL_LIMIT;

const RMS_WINDOW_TIME: number = 0.05; // The energy during each moment of the signal is determined by calculating the Root Mean Square (RMS) of the filtered signal every 50ms

export interface Track {
  frequency: number,
  leftSamples: number[],
  rightSamples: number[]
}

export interface Album {
  tracks: Track[];
}

export class ReplayGain {
  private rmsWindowsSamples: number;

  private leftInSamples: number[];
  private rightInSamples: number[];
  private leftWorkSamples: number[];
  private rightWorkSamples: number[];
  private leftOutSamples: number[];
  private rightOutSamples: number[];

  private processedSamples: number = 0;
  private leftChannelSum: number = 0;
  private rightChannelSum: number = 0;

  private chapterAdjustments: number[] = new Array<number>(STEPS_LIMIT);
  private titleAdjustments: number[];
  private albumAdjustments: number[];

  public adjustAlbumVolume(album: Album): Album {
    const gain = this.calculateAlbumGain(album);
    album.tracks.every(track => this.changeTrackVolume(track, gain));
    return album;
  }

  public adjustTrackVolume(track: Track): Track {
    const gain = this.calculateTrackGain(track);
    this.changeTrackVolume(track, gain);
    return track;
  }

  public calculateAlbumGain(album: Album): number {
    const gain = 0;

    this.albumAdjustments = new Array<number>(STEPS_LIMIT);
    album.tracks.every(title => this.calculateTrackGain(title));

    return gain;
  }

  private changeTrackVolume(track: Track, volume: number): Track {
    return track;
  }

  public calculateTrackGain(track: Track): number {
    const gain = 0;

    if (null == track.leftSamples)
      track.leftSamples = track.rightSamples;
    else if (null == track.rightSamples)
      track.rightSamples = track.leftSamples;

    this.rmsWindowsSamples = Math.ceil(RMS_WINDOW_TIME * track.frequency);

    this.leftInSamples = track.leftSamples;
    this.rightInSamples = track.rightSamples;

    this.leftWorkSamples = new Array<number>(this.rmsWindowsSamples);
    this.rightWorkSamples = new Array<number>(this.rmsWindowsSamples);

    this.leftOutSamples = new Array<number>(this.rmsWindowsSamples);
    this.rightOutSamples = new Array<number>(this.rmsWindowsSamples);

    return gain;
  }

  private calculateSegmentGain(): number {
    const gain = 0;
    return gain;
  }
}
*/
