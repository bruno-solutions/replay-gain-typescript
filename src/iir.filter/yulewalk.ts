// import {frequencyFilterIndex} from './frequencies';

class Yulewalk {
  private static frequencyFilters: number[][] = [
    /* 8 kHz      */ [0.53648789255105, -0.25049871956020, -0.42163034350696, -0.43193942311114, -0.00275953611929, -0.03424681017675, 0.04267842219415, -0.04678328784242, -0.10214864179676, 0.26408300200955, 0.14590772289388, 0.15113130533216, -0.02459864859345, -0.17556493366449, -0.11202315195388, -0.18823009262115, -0.04060034127000, 0.05477720428674, 0.04788665548180, 0.04704409688120, -0.02217936801134],
    /* 11.025 kHz */ [0.58100494960553, -0.51035327095184, -0.53174909058578, -0.31863563325245, -0.14289799034253, -0.20256413484477, 0.17520704835522, 0.14728154134330, 0.02377945217615, 0.38952639978999, 0.15558449135573, -0.23313271880868, -0.25344790059353, -0.05246019024463, 0.01628462406333, -0.02505961724053, 0.06920467763959, 0.02442357316099, -0.03721611395801, 0.01818801111503, -0.00749618797172],
    /* 12 kHz     */ [0.56619470757641, -1.04800335126349, -0.75464456939302, 0.29156311971249, 0.16242137742230, -0.26806001042947, 0.16744243493672, 0.00819999645858, -0.18901604199609, 0.45054734505008, 0.30931782841830, -0.33032403314006, -0.27562961986224, 0.06739368333110, 0.00647310677246, -0.04784254229033, 0.08647503780351, 0.01639907836189, -0.03788984554840, 0.01807364323573, -0.00588215443421],
    /* 16 kHz     */ [0.44915256608450, -0.62820619233671, -0.14351757464547, 0.29661783706366, -0.22784394429749, -0.37256372942400, -0.01419140100551, 0.00213767857124, 0.04078262797139, -0.42029820170918, -0.12398163381748, 0.22199650564824, 0.04097565135648, 0.00613424350682, 0.10478503600251, 0.06747620744683, -0.01863887810927, 0.05784820375801, -0.03193428438915, 0.03222754072173, 0.00541907748707],
    /* 22.05 kHz  */ [0.33642304856132, -1.49858979367799, -0.25572241425570, 0.87350271418188, -0.11828570177555, 0.12205022308084, 0.11921148675203, -0.80774944671438, -0.07834489609479, 0.47854794562326, -0.00469977914380, -0.12453458140019, -0.00589500224440, -0.04067510197014, 0.05724228140351, 0.08333755284107, 0.00832043980773, -0.04237348025746, -0.01635381384540, 0.02977207319925, -0.01760176568150],
    /* 24 kHz     */ [0.30296907319327, -1.61273165137247, -0.22613988682123, 1.07977492259970, -0.08587323730772, -0.25656257754070, 0.03282930172664, -0.16276719120440, -0.00915702933434, -0.22638893773906, -0.02364141202522, 0.39120800788284, -0.00584456039913, -0.22138138954925, 0.06276101321749, 0.04500235387352, -0.00000828086748, 0.02005851806501, 0.00205861885564, 0.00302439095741, -0.02950134983287],
    /* 32 kHz     */ [0.15457299681924, -2.37898834973084, -0.09331049056315, 2.84868151156327, -0.06247880153653, -2.64577170229825, 0.02163541888798, 2.23697657451713, -0.05588393329856, -1.67148153367602, 0.04781476674921, 1.00595954808547, 0.00222312597743, -0.45953458054983, 0.03174092540049, 0.16378164858596, -0.01390589421898, -0.05032077717131, 0.00651420667831, 0.02347897407020, -0.00881362733839],
    /* 44.1 kHz   */ [0.05418656406430, -3.47845948550071, -0.02911007808948, 6.36317777566148, -0.00848709379851, -8.54751527471874, -0.00851165645469, 9.47693607801280, -0.00834990904936, -8.81498681370155, 0.02245293253339, 6.85401540936998, -0.02596338512915, -4.39470996079559, 0.01624864962975, 2.19611684890774, -0.00240879051584, -0.75104302451432, 0.00674613682247, 0.13149317958808, -0.00187763777362],
    /* 48 kHz     */ [0.03857599435200, -3.84664617118067, -0.02160367184185, 7.81501653005538, -0.00123395316851, -11.34170355132042, -0.00009291677959, 13.05504219327545, -0.01655260341619, -12.28759895145294, 0.02161526843274, 9.48293806319790, -0.02074045215285, -5.87257861775999, 0.00594298065125, 2.75465861874613, 0.00306428023191, -0.86984376593551, 0.00012025322027, 0.13919314567432, 0.00288463683916]
  ];

  private readonly filtered: number[];

  public constructor(phononDuration: number, frequency: number, unfiltered: number[]) {
    this.filtered = Yulewalk.filter(phononDuration, frequency, unfiltered);
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
          if (1 === index) break header;
          filtered[index] += filtered[index - 2] * -coefficient[3] + unfiltered[index - 2] * coefficient[4];
          if (2 === index) break header;
          filtered[index] += filtered[index - 3] * -coefficient[5] + unfiltered[index - 3] * coefficient[6];
          if (3 === index) break header;
          filtered[index] += filtered[index - 4] * -coefficient[7] + unfiltered[index - 4] * coefficient[8];
          if (4 === index) break header;
          filtered[index] += filtered[index - 5] * -coefficient[9] + unfiltered[index - 5] * coefficient[10];
          if (5 === index) break header;
          filtered[index] += filtered[index - 6] * -coefficient[11] + unfiltered[index - 6] * coefficient[12];
          if (6 === index) break header;
          filtered[index] += filtered[index - 7] * -coefficient[13] + unfiltered[index - 7] * coefficient[14];
          if (7 === index) break header;
          filtered[index] += filtered[index - 8] * -coefficient[15] + unfiltered[index - 8] * coefficient[16];
          if (8 === index) break header;
          filtered[index] += filtered[index - 9] * -coefficient[17] + unfiltered[index - 9] * coefficient[18];
        }

        phononHeaderRemaining--;
        phononRemaining--;
        remaining--;
        index++;
      }

      while (phononRemaining) {
        filtered[index] = unfiltered[index] * coefficient[0] - filtered[index - 1] * coefficient[1] + unfiltered[index - 1] * coefficient[2] - filtered[index - 2] * coefficient[3] + unfiltered[index - 2] * coefficient[4] - filtered[index - 3] * coefficient[5] + unfiltered[index - 3] * coefficient[6] - filtered[index - 4] * coefficient[7] + unfiltered[index - 4] * coefficient[8] - filtered[index - 5] * coefficient[9] + unfiltered[index - 5] * coefficient[10] - filtered[index - 6] * coefficient[11] + unfiltered[index - 6] * coefficient[12] - filtered[index - 7] * coefficient[13] + unfiltered[index - 7] * coefficient[14] - filtered[index - 8] * coefficient[15] + unfiltered[index - 8] * coefficient[16] - filtered[index - 9] * coefficient[17] + unfiltered[index - 9] * coefficient[18] - filtered[index - 10] * coefficient[19] + unfiltered[index - 10] * coefficient[20];

        phononRemaining--;
        remaining--;
        index++;
      }
    }

    return filtered;
  }
}
