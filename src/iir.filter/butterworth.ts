// import {frequencyFilterIndex} from './frequencies';

class Butterworth {
  private static frequencyFilters: number[][] = [
    /* 8 kHz      */ [0.94597685600279, -1.88903307939452, -1.89195371200558, 0.89487434461664, 0.94597685600279],
    /* 11.025 kHz */ [0.95856916599601, -1.91542108074780, -1.91713833199203, 0.91885558323625, 0.95856916599601],
    /* 12 kHz     */ [0.96009142950541, -1.91858953033784, -1.92018285901082, 0.92177618768381, 0.96009142950541],
    /* 16 kHz     */ [0.96454515552826, -1.92783286977036, -1.92909031105652, 0.93034775234268, 0.96454515552826],
    /* 22.05 kHz  */ [0.97316523498161, -1.94561023566527, -1.94633046996323, 0.94705070426118, 0.97316523498161],
    /* 24 kHz     */ [0.97531843204928, -1.95002759149878, -1.95063686409857, 0.95124613669835, 0.97531843204928],
    /* 32 kHz     */ [0.97938932735214, -1.95835380975398, -1.95877865470428, 0.95920349965459, 0.97938932735214],
    /* 44.1 kHz   */ [0.98500175787242, -1.96977855582618, -1.97000351574484, 0.97022847566350, 0.98500175787242],
    /* 48 kHz     */ [0.98621192462708, -1.97223372919527, -1.97242384925416, 0.97261396931306, 0.98621192462708]
  ];

  private readonly filtered: number[];

  public constructor(phononDuration: number, frequency: number, unfiltered: number[]) {
    this.filtered = Butterworth.filter(phononDuration, frequency, unfiltered);
  }

  public getFiltered(): number[] {
    return this.filtered;
  }

  private static filter(phononDuration: number, frequency: number, unfiltered: number[]): number[] {
    const phononHeaderLength: number = Math.floor(this.frequencyFilters[0].length / 2);
    const coefficient = this.frequencyFilters[frequencyFilterIndex(frequency)];
    const phononLength = Math.ceil(frequency * phononDuration);

    let index: number = 0;
    let remaining: number = unfiltered.length;
    const filtered = new Array<number>(unfiltered.length);

    while (remaining) {
      let phononRemaining = Math.min(phononLength, remaining);
      let phononHeaderRemaining = Math.min(phononRemaining, phononHeaderLength);

      while (phononHeaderRemaining) {
        header: {
          filtered[index] = unfiltered[index] * coefficient[0];
          if (0 === index) break header;
          filtered[index] += filtered[index - 1] * -coefficient[1] + unfiltered[index - 1] * coefficient[2];
        }

        phononHeaderRemaining--;
        phononRemaining--;
        remaining--;
        index++;
      }

      while (phononRemaining) {
        filtered[index] = unfiltered[index] * coefficient[0] - filtered[index - 1] * coefficient[1] + unfiltered[index - 1] * coefficient[2] - filtered[index - 2] * coefficient[3] + unfiltered[index - 2] * coefficient[4];

        phononRemaining--;
        remaining--;
        index++;
      }
    }

    return filtered;
  }
}
