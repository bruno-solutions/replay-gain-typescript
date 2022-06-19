//     // https://github.com/Borewit/music-metadata
//     // https://github.com/Borewit/music-metadata
//     // https://github.com/Borewit/music-metadata
//     // https://github.com/Borewit/music-metadata
//     // https://github.com/Borewit/music-metadata
//
//
//
//
//
//     
//
//
//
//
//
//     import {Injectable} from '@angular/core';
//
//     import {EndOfStreamError, fromBuffer, IGetToken, IToken, ITokenizer} from 'strtok3/lib/core';
//
//     import {ID3v2Parser} from '../id3v2/ID3v2Parser';
//     import {ITokenParser} from '../ParserFactory';
//     import {IFooter} from './apev2/APEv2Token';
//
//     import {
//       FormatId,
//       IAudioMetadata,
//       ICommonTagsResult,
//       IFormat,
//       INativeTags,
//       IOptions,
//       IPicture,
//       IPrivateOptions,
//       IQualityInformation,
//       IRatio,
//       ITag,
//       ITrackInfo,
//       TrackType
//     } from '../type';
//
//     import {FrameParser} from './FrameParser';
//     import {ExtendedHeader, ID3v2Header, ID3v2MajorVersion, IID3v2header, UINT32SYNCSAFE} from './ID3v2Token';
//     import {INativeMetadataCollector, IWarningCollector} from '../common/MetadataCollector';
//
//     import {GenericTagId, IGenericTag, isSingleton, isUnique, TagType} from './GenericTagTypes';
//     import {CombinedTagMapper} from './CombinedTagMapper';
//     import {CommonTagMapper} from './GenericTagMapper';
//     import * as FileType from 'file-type/core';
//
//     import * as Token from 'token-types';
//
//     export abstract class BasicParser implements ITokenParser {
//       protected metadata: INativeMetadataCollector;
//       protected tokenizer: ITokenizer;
//       protected options: IPrivateOptions;
//
//       /**
//        * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
//        * @param {INativeMetadataCollector} metadata Output
//        * @param {ITokenizer} tokenizer Input
//        * @param {IOptions} options Parsing options
//        */
//
//       public init(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): ITokenParser {
//         this.metadata = metadata;
//         this.tokenizer = tokenizer;
//         this.options = options;
//         return this;
//       }
//
//       public abstract parse(): Promise<void>;
//     }
//
//     @Injectable({
//       providedIn: 'root'
//     })
//     export class ClipMetadataService extends BasicParser {
//       private fact: IFactChunk = {dwSampleLength: 0};
//
//       private blockAlign: number = 0;
//       private header: IChunkHeader;
//
//       public async parse(): Promise<void> {
//         const riffHeader = await this.tokenizer.readToken<IChunkHeader>(Header);
//
//         console.debug(`pos=${this.tokenizer.position}, parse: chunkID=${riffHeader.chunkID}`);
//
//         if (riffHeader.chunkID !== 'RIFF') {
//           return;
//         }
//
//         return this.parseRiffChunk(riffHeader.chunkSize).catch(err => {
//           if (!(err instanceof EndOfStreamError)) {
//             throw err;
//           }
//         });
//       }
//
//       public async parseRiffChunk(chunkSize: number): Promise<void> {
//         const type = await this.tokenizer.readToken<string>(FourCcToken);
//
//         this.metadata.setFormat('container', type);
//
//         switch (type) {
//           case 'WAVE':
//             return this.readWaveChunk(chunkSize - FourCcToken.len);
//           default:
//             throw new Error(`Unsupported RIFF format: RIFF/${type}`);
//         }
//       }
//
//       public async readWaveChunk(remaining: number): Promise<void> {
//         while (remaining >= Header.len) {
//           const header = await this.tokenizer.readToken<IChunkHeader>(Header);
//
//           remaining -= Header.len + header.chunkSize;
//
//           if (header.chunkSize > remaining) {
//             this.metadata.addWarning('Data chunk size exceeds file size');
//           }
//
//           this.header = header;
//
//           console.debug(`pos=${this.tokenizer.position}, readChunk: chunkID=RIFF/WAVE/${header.chunkID}`);
//
//           switch (header.chunkID) {
//             case 'LIST':
//               await this.parseListTag(header);
//               break;
//
//             case 'fact': // extended Format chunk,
//               this.metadata.setFormat('lossless', false);
//               this.fact = await this.tokenizer.readToken(new FactChunk(header));
//               break;
//
//             case 'fmt ': // The Util Chunk, non-PCM Formats
//               const fmt = await this.tokenizer.readToken<IWaveFormat>(new Format(header));
//
//               let subFormat = WaveFormat[fmt.wFormatTag];
//               if (!subFormat) {
//                 console.debug('WAVE/non-PCM format=' + fmt.wFormatTag);
//                 subFormat = 'non-PCM (' + fmt.wFormatTag + ')';
//               }
//               this.metadata.setFormat('codec', subFormat);
//               this.metadata.setFormat('bitsPerSample', fmt.wBitsPerSample);
//               this.metadata.setFormat('sampleRate', fmt.nSamplesPerSec);
//               this.metadata.setFormat('numberOfChannels', fmt.nChannels);
//               this.metadata.setFormat('bitrate', fmt.nBlockAlign * fmt.nSamplesPerSec * 8);
//               this.blockAlign = fmt.nBlockAlign;
//               break;
//
//             case 'id3 ': // The way Picard, FooBar currently stores, ID3 meta-data
//             case 'ID3 ': // The way Mp3Tags stores ID3 meta-data
//               const id3_data = await this.tokenizer.readToken<Uint8Array>(new Token.Uint8ArrayType(header.chunkSize));
//               const rst = fromBuffer(id3_data);
//               await new ID3v2Parser().parse(this.metadata, rst, this.options);
//               break;
//
//             case 'data': // PCM-data
//               if (this.metadata.format.lossless !== false) {
//                 this.metadata.setFormat('lossless', true);
//               }
//
//               let chunkSize = header.chunkSize;
//               if (this.tokenizer.fileInfo.size) {
//                 const calcRemaining = this.tokenizer.fileInfo.size - this.tokenizer.position;
//                 if (calcRemaining < chunkSize) {
//                   this.metadata.addWarning('data chunk length exceeding file length');
//                   chunkSize = calcRemaining;
//                 }
//               }
//
//               const numberOfSamples = this.fact ? this.fact.dwSampleLength : (chunkSize === 0xffffffff ? undefined : chunkSize / this.blockAlign);
//               if (numberOfSamples) {
//                 this.metadata.setFormat('numberOfSamples', numberOfSamples);
//                 this.metadata.setFormat('duration', numberOfSamples / this.metadata.format.sampleRate);
//               }
//
//               this.metadata.setFormat('bitrate', this.metadata.format.numberOfChannels * this.blockAlign * this.metadata.format.sampleRate); // TODO: check me
//               await this.tokenizer.ignore(header.chunkSize);
//               break;
//
//             default:
//               console.debug(`Ignore chunk: RIFF/${header.chunkID} of ${header.chunkSize} bytes`);
//               this.metadata.addWarning('Ignore chunk: RIFF/' + header.chunkID);
//               await this.tokenizer.ignore(header.chunkSize);
//           }
//
//           if (this.header.chunkSize % 2 === 1) {
//             console.debug('Read odd padding byte'); // https://wiki.multimedia.cx/index.php/RIFF
//             await this.tokenizer.ignore(1);
//           }
//         }
//       }
//
//       public async parseListTag(listHeader: IChunkHeader): Promise<void> {
//         const listType = await this.tokenizer.readToken(new Token.StringType(4, 'binary'));
//         console.debug('pos=%s, parseListTag: chunkID=RIFF/WAVE/LIST/%s', this.tokenizer.position, listType);
//         switch (listType) {
//           case 'INFO':
//             return this.parseRiffInfoTags(listHeader.chunkSize - 4);
//
//           case 'adtl':
//           default:
//             this.metadata.addWarning('Ignore chunk: RIFF/WAVE/LIST/' + listType);
//             console.debug('Ignoring chunkID=RIFF/WAVE/LIST/' + listType);
//             return this.tokenizer.ignore(listHeader.chunkSize - 4).then();
//         }
//       }
//
//       private async parseRiffInfoTags(chunkSize: number): Promise<void> {
//         while (8 <= chunkSize) {
//           const header = await this.tokenizer.readToken<IChunkHeader>(Header);
//           const valueToken = new ListInfoTagValue(header);
//           const value = await this.tokenizer.readToken(valueToken);
//           this.addTag(header.chunkID, stripNulls(value));
//           chunkSize -= (8 + valueToken.len);
//         }
//
//         if (chunkSize) {
//           throw Error('Illegal remaining size: ' + chunkSize);
//         }
//       }
//
//       private addTag(id: string, value: any) {
//         this.metadata.addTag('exif', id, value);
//       }
//     }
//
//     /**
//      * https://msdn.microsoft.com/en-us/library/windows/desktop/dd317599(v=vs.85).aspx
//      */
//
//     export enum WaveFormat {
//       PCM = 0x0001,
//       // MPEG-4 and AAC Audio Types
//       ADPCM = 0x0002,
//       IEEE_FLOAT = 0x0003,
//       MPEG_ADTS_AAC = 0x1600,
//       MPEG_LOAS = 0x1602,
//       RAW_AAC1 = 0x00FF,
//       // Dolby Audio Types
//       DOLBY_AC3_SPDIF = 0x0092,
//       DVM = 0x2000,
//       RAW_SPORT = 0x0240,
//       ESST_AC3 = 0x0241,
//       DRM = 0x0009,
//       DTS2 = 0x2001,
//       MPEG = 0x0050
//     }
//
//     /**
//      * "fmt" sub-chunk describes the sound data's format
//      * http://soundfile.sapp.org/doc/WaveFormat
//      */
//
//     export interface IWaveFormat {
//       wFormatTag: WaveFormat, // PCM = 1 (i.e. Linear quantization). Values other than 1 indicate some form of compression.
//       nChannels: number, // Mono = 1, Stereo = 2, etc
//       nSamplesPerSec: number, // 8000, 44100, etc
//       nAvgBytesPerSec: number,
//       nBlockAlign: number,
//       wBitsPerSample: number
//     }
//
//     /**
//      * format chunk; chunk-id is "fmt "
//      * http://soundfile.sapp.org/doc/WaveFormat/
//      */
//
//     export class Format implements IGetToken<IWaveFormat> {
//       public len: number;
//
//       public constructor(header: IChunkHeader) {
//         if (16 > header.chunkSize) {
//           throw new Error('Invalid chunk size');
//         }
//         this.len = header.chunkSize;
//       }
//
//       public get(buffer: Buffer, offset: number): IWaveFormat {
//         return {
//           wFormatTag: buffer.readUInt16LE(offset),
//           nChannels: buffer.readUInt16LE(offset + 2),
//           nSamplesPerSec: buffer.readUInt32LE(offset + 4),
//           nAvgBytesPerSec: buffer.readUInt32LE(offset + 8),
//           nBlockAlign: buffer.readUInt16LE(offset + 12),
//           wBitsPerSample: buffer.readUInt16LE(offset + 14)
//         };
//       }
//     }
//
//     export interface IFactChunk {
//       dwSampleLength: number;
//     }
//
//     /**
//      * Fact chunk; chunk-id is "fact"
//      * http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/WAVE.html
//      * http://www.recordingblogs.com/wiki/fact-chunk-of-a-wave-file
//      */
//
//     export class FactChunk implements IGetToken<IFactChunk> {
//       public len: number;
//
//       public constructor(header: IChunkHeader) {
//         if (4 > header.chunkSize) {
//           throw new Error('Invalid fact chunk size');
//         }
//         this.len = header.chunkSize;
//       }
//
//       public get(buffer: Buffer, offset: number): IFactChunk {
//         return {
//           dwSampleLength: buffer.readUInt32LE(offset)
//         };
//       }
//     }
//
//     const TagPriority: TagType[] = ['matroska', 'APEv2', 'vorbis', 'ID3v2.4', 'ID3v2.3', 'ID3v2.2', 'exif', 'asf', 'iTunes', 'ID3v1'];
//
//     /**
//      * Combines all generic-tag-mappers for each tag type
//      */
//
//     export interface IWarningCollector {
//
//       /**
//        * Register parser warning
//        * @param warning
//        */
//       addWarning(warning: string): void;
//     }
//
//     export interface INativeMetadataCollector extends IWarningCollector {
//       readonly format: IFormat;
//       readonly native: INativeTags;
//       readonly quality: IQualityInformation;
//
//       /**
//        * @returns {boolean} true if one or more tags have been found
//        */
//       hasAny(): boolean;
//
//       setFormat(key: FormatId, value: any): void;
//
//       addTag(tagType: TagType, tagId: string, value: any): void;
//
//       addStreamInfo(streamInfo: ITrackInfo): void;
//     }
//
//     /**
//      * Provided to the parser to update the metadata result.
//      * Responsible for triggering async updates
//      */
//     export class MetadataCollector implements INativeMetadataCollector {
//       public readonly format: IFormat = {
//         tagTypes: [],
//         trackInfo: []
//       };
//
//       public readonly native: INativeTags = {};
//
//       public readonly common: ICommonTagsResult = {
//         track: {no: null, of: null},
//         disk: {no: null, of: null},
//         movementIndex: {}
//       };
//
//       public readonly quality: IQualityInformation = {
//         warnings: []
//       };
//
//       private readonly commonOrigin: { // Keeps track of origin priority for each mapped id
//         [id: string]: number;
//       } = {};
//
//       private readonly originPriority: { // Maps a tag type to a priority
//         [tagType: string]: number;
//       } = {};
//
//       private tagMapper = new CombinedTagMapper();
//
//       public constructor(private opts: IOptions) {
//         let priority: number = 1;
//         for (const tagType of TagPriority) {
//           this.originPriority[tagType] = priority++;
//         }
//         this.originPriority.artificial = 500; // Filled using alternative tags
//         this.originPriority.id3v1 = 600; // Consider worst due to field length limit
//       }
//
//       /**
//        * @returns {boolean} true if one or more tags have been found
//        */
//       public hasAny() {
//         return Object.keys(this.native).length > 0;
//       }
//
//       public addStreamInfo(streamInfo: ITrackInfo): void {
//         console.debug(`streamInfo: type=${TrackType[streamInfo.type]}, codec=${streamInfo.codecName}`);
//         this.format.trackInfo.push(streamInfo);
//       }
//
//       public setFormat(key: FormatId, value: any): void {
//         console.debug(`format: ${key} = ${value}`);
//         (this.format as any)[key] = value; // as any to override readonly
//
//         if (this.opts.observer) {
//           this.opts.observer({metadata: this, tag: {type: 'format', id: key, value}});
//         }
//       }
//
//       public addTag(tagType: TagType, tagId: string, value: any): void {
//         console.debug(`tag ${tagType}.${tagId} = ${value}`);
//         if (!this.native[tagType]) {
//           this.format.tagTypes.push(tagType);
//           this.native[tagType] = [];
//         }
//         this.native[tagType].push({id: tagId, value});
//
//         this.toCommon(tagType, tagId, value);
//       }
//
//       public addWarning(warning: string) {
//         this.quality.warnings.push({message: warning});
//       }
//
//       public postMap(tagType: TagType | 'artificial', tag: IGenericTag): void {
//         // Common tag (alias) found
//         // check if we need to do something special with common tag
//         // if the event has been aliased then we need to clean it before
//         // it is emitted to the user. e.g. genre (20) -> Electronic
//         switch (tag.id) {
//           case 'artist':
//             if (this.commonOrigin.artist === this.originPriority[tagType]) {
//               // Assume the artist field is used as artists
//               return this.postMap('artificial', {id: 'artists', value: tag.value});
//             }
//
//             if (!this.common.artists) {
//               // Fill artists using artist source
//               this.setGenericTag('artificial', {id: 'artists', value: tag.value});
//             }
//             break;
//
//           case 'artists':
//             if (!this.common.artist || this.commonOrigin.artist === this.originPriority.artificial) {
//               if (!this.common.artists || this.common.artists.indexOf(tag.value) === -1) {
//                 // Fill artist using artists source
//                 const artists = (this.common.artists || []).concat([tag.value]);
//                 const value = joinArtists(artists);
//                 const artistTag: IGenericTag = {id: 'artist', value};
//                 this.setGenericTag('artificial', artistTag);
//               }
//             }
//             break;
//
//           case 'picture':
//             this.postFixPicture(tag.value as IPicture).then(picture => {
//               if (picture !== null) {
//                 tag.value = picture;
//                 this.setGenericTag(tagType, tag);
//               }
//             });
//             return;
//
//           case 'totaltracks':
//             this.common.track.of = CommonTagMapper.toIntOrNull(tag.value);
//             return;
//
//           case 'totaldiscs':
//             this.common.disk.of = CommonTagMapper.toIntOrNull(tag.value);
//             return;
//
//           case 'movementTotal':
//             this.common.movementIndex.of = CommonTagMapper.toIntOrNull(tag.value);
//             return;
//
//           case 'track':
//           case 'disk':
//           case 'movementIndex':
//             const of = this.common[tag.id].of; // store of value, maybe maybe overwritten
//             this.common[tag.id] = CommonTagMapper.normalizeTrack(tag.value);
//             this.common[tag.id].of = of != null ? of : this.common[tag.id].of;
//             return;
//
//           case 'year':
//           case 'originalyear':
//             tag.value = parseInt(tag.value, 10);
//             break;
//
//           case 'date':
//             // ToDo: be more strict on 'YYYY...'
//             const year = parseInt(tag.value.substr(0, 4), 10);
//             if (!isNaN(year)) {
//               this.common.year = year;
//             }
//             break;
//
//           case 'discogs_label_id':
//           case 'discogs_release_id':
//           case 'discogs_master_release_id':
//           case 'discogs_artist_id':
//           case 'discogs_votes':
//             tag.value = typeof tag.value === 'string' ? parseInt(tag.value, 10) : tag.value;
//             break;
//
//           case 'replaygain_track_gain':
//           case 'replaygain_track_peak':
//           case 'replaygain_album_gain':
//           case 'replaygain_album_peak':
//             tag.value = toRatio(tag.value);
//             break;
//
//           case 'replaygain_track_minmax':
//             tag.value = tag.value.split(',').map((v: string) => parseInt(v, 10));
//             break;
//
//           case 'replaygain_undo':
//             const minMix = tag.value.split(',').map((v: string) => parseInt(v, 10));
//             tag.value = {
//               leftChannel: minMix[0],
//               rightChannel: minMix[1]
//             };
//             break;
//
//           case 'gapless': // iTunes gap-less flag
//           case 'compilation':
//           case 'podcast':
//           case 'showMovement':
//             tag.value = tag.value === '1' || tag.value === 1; // boolean
//             break;
//
//           case 'isrc': // Only keep unique values
//             if (this.common[tag.id] && this.common[tag.id].indexOf(tag.value) !== -1) {
//               return;
//             }
//             break;
//
//           default:
//         }
//
//         if (tag.value !== null) {
//           this.setGenericTag(tagType, tag);
//         }
//       }
//
//       /**
//        * Convert native tags to common tags
//        * @returns {IAudioMetadata} Native + common tags
//        */
//       public toCommonMetadata(): IAudioMetadata {
//         return {
//           format: this.format,
//           native: this.native,
//           quality: this.quality,
//           common: this.common
//         };
//       }
//
//       /**
//        * Fix some common issues with picture object
//        * @param picture
//        */
//       private async postFixPicture(picture: IPicture): Promise<IPicture | null> {
//         if (picture.data && picture.data.length) {
//           if (picture.format) {
//             picture.format = picture.format.toLocaleLowerCase();
//           } else {
//             const fileType = await FileType.fromBuffer(picture.data);
//             if (!fileType) {
//               return null;
//             }
//             picture.format = fileType.mime;
//           }
//           switch (picture.format) {
//             case 'image/jpg':
//               picture.format = 'image/jpeg';  // ToDo: register warning
//           }
//           return picture;
//         }
//         this.addWarning(`Empty picture tag found`);
//         return null;
//       }
//
//       /**
//        * Convert native tag to common tags
//        */
//       private toCommon(tagType: TagType, tagId: string, value: any) {
//         const tag = {id: tagId, value};
//         const genericTag = this.tagMapper.mapTag(tagType, tag, this);
//
//         if (genericTag) {
//           this.postMap(tagType, genericTag);
//         }
//       }
//
//       /**
//        * Set generic tag
//        */
//       private setGenericTag(tagType: TagType | 'artificial', tag: IGenericTag) {
//         console.debug(`common.${tag.id} = ${tag.value}`);
//
//         const prio0 = this.commonOrigin[tag.id] || 1000;
//         const prio1 = this.originPriority[tagType];
//
//         if (isSingleton(tag.id)) {
//           if (prio1 <= prio0) {
//             this.common[tag.id] = tag.value;
//             this.commonOrigin[tag.id] = prio1;
//           } else {
//             return console.debug(`Ignore native tag (singleton): ${tagType}.${tag.id} = ${tag.value}`);
//           }
//         } else {
//           if (prio1 === prio0) {
//             if (!isUnique(tag.id) || this.common[tag.id].indexOf(tag.value) === -1) {
//               this.common[tag.id].push(tag.value);
//             } else {
//               console.debug(`Ignore duplicate value: ${tagType}.${tag.id} = ${tag.value}`);
//             }
//             // no effect? this.commonOrigin[tag.id] = prio1;
//           } else if (prio1 < prio0) {
//             this.common[tag.id] = [tag.value];
//             this.commonOrigin[tag.id] = prio1;
//           } else {
//             return console.debug(`Ignore native tag (list): ${tagType}.${tag.id} = ${tag.value}`);
//           }
//         }
//         if (this.opts.observer) {
//           this.opts.observer({metadata: this, tag: {type: 'common', id: tag.id, value: tag.value}});
//         }
//         // ToDo: trigger metadata event
//       }
//     }
//
//     function joinArtists(artists: string[]): string {
//       if (artists.length > 2) {
//         return artists.slice(0, artists.length - 1).join(', ') + ' & ' + artists[artists.length - 1];
//       }
//       return artists.join(' & ');
//     }
//
//     /**
//      * Common RIFF chunk header
//      */
//     const Header: IGetToken<IChunkHeader> = {
//       len: 8,
//
//       get: (buf: Buffer, off): IChunkHeader => {
//         return {
//           // Group-ID
//           chunkID: buf.toString('binary', off, off + 4),
//           // Size
//           chunkSize: Token.UINT32_LE.get(buf, 4)
//         };
//       }
//     };
//
//
//     /**
//      * Common AIFF chunk header
//      */
//     const Header: IGetToken<IChunkHeader> = {
//       len: 8,
//
//       get: (buf, off): IChunkHeader => {
//         return {
//           // Chunk type ID
//           chunkID: FourCcToken.get(buf, off),
//           // Chunk size
//           chunkSize: Number(BigInt(Token.UINT32_BE.get(buf, off + 4)))
//         };
//       }
//     };
//
//     /**
//      * Token to parse RIFF-INFO tag value
//      */
//     export class ListInfoTagValue implements IGetToken<string> {
//       public len: number;
//
//       public constructor(private tagHeader: IChunkHeader) {
//         this.len = tagHeader.chunkSize;
//         this.len += this.len & 1; // if it is an odd length, round up to even
//       }
//
//       public get(buf, off): string {
//         return new Token.StringType(this.tagHeader.chunkSize, 'ascii').get(buf, off);
//       }
//     }
//
//     /**
//      * "EA IFF 85" Standard for Interchange Format Files
//      * Ref: http://www.martinreddy.net/gfx/2d/IFF.txt
//      */
//     export interface IChunkHeader {
//       chunkID: string,  // chunk ID (4 ASCII bytes)
//       chunkSize: number // Number of data bytes after the chunk header
//     }
//
//     /**
//      * "EA IFF 85" Standard for Interchange Format Files
//      * Ref: http://www.martinreddy.net/gfx/2d/IFF.txt
//      */
//     export interface IChunkHeader64 {
//       chunkID: string,  // chunk ID (4 ASCII bytes)
//       chunkSize: bigint // Number of data bytes after the chunk header
//     }
//
//     const validFourCC = /^[\x21-\x7e©][\x20-\x7e\x00()]{3}/;
//
//     /**
//      * Token for read FourCC
//      * Ref: https://en.wikipedia.org/wiki/FourCC
//      */
//     const FourCcToken: IToken<string> = {
//       len: 4,
//
//       get: (buf: Buffer, off: number): string => {
//         const id = buf.toString('binary', off, off + FourCcToken.len);
//         switch (id) {
//           default:
//             if (!id.match(validFourCC)) {
//               throw new Error(`FourCC contains invalid characters: ${a2hex(id)} "${id}"`);
//             }
//         }
//         return id;
//       },
//
//       put: (buffer: Buffer, offset: number, id: string) => {
//         const str = Buffer.from(id, 'binary');
//         if (str.length !== 4) {
//           throw new Error('Invalid length');
//         }
//         return str.copy(buffer, offset);
//       }
//     };
//
//     interface IFrameFlags {
//       status: {
//         tag_alter_preservation: boolean,
//         file_alter_preservation: boolean,
//         read_only: boolean
//       },
//       format: {
//         grouping_identity: boolean,
//         compression: boolean,
//         encryption: boolean,
//         unsynchronisation: boolean,
//         data_length_indicator: boolean
//       };
//     }
//
//     interface IFrameHeader {
//       id: string,
//       length?: number;
//       flags?: IFrameFlags;
//     }
//
//     class ID3v2Parser {
//       public static removeUnsyncBytes(buffer: Buffer): Buffer {
//         let readI = 0;
//         let writeI = 0;
//         while (readI < buffer.length - 1) {
//           if (readI !== writeI) {
//             buffer[writeI] = buffer[readI];
//           }
//           readI += (buffer[readI] === 0xFF && buffer[readI + 1] === 0) ? 2 : 1;
//           writeI++;
//         }
//         if (readI < buffer.length) {
//           buffer[writeI++] = buffer[readI];
//         }
//         return buffer.slice(0, writeI);
//       }
//
//       private static getFrameHeaderLength(majorVer: number): number {
//         switch (majorVer) {
//           case 2:
//             return 6;
//           case 3:
//           case 4:
//             return 10;
//           default:
//             throw new Error('header versionIndex is incorrect');
//         }
//       }
//
//       private static readFrameFlags(b: Buffer): IFrameFlags {
//         return {
//           status: {
//             tag_alter_preservation: getBit(b, 0, 6),
//             file_alter_preservation: getBit(b, 0, 5),
//             read_only: getBit(b, 0, 4)
//           },
//           format: {
//             grouping_identity: getBit(b, 1, 7),
//             compression: getBit(b, 1, 3),
//             encryption: getBit(b, 1, 2),
//             unsynchronisation: getBit(b, 1, 1),
//             data_length_indicator: getBit(b, 1, 0)
//           }
//         };
//       }
//
//       private static readFrameData(buf: Buffer, frameHeader: IFrameHeader, majorVer: ID3v2MajorVersion, includeCovers: boolean, warningCollector: IWarningCollector) {
//         const frameParser = new FrameParser(majorVer, warningCollector);
//         switch (majorVer) {
//           case 2:
//             return frameParser.readData(buf, frameHeader.id, includeCovers);
//           case 3:
//           case 4:
//             if (frameHeader.flags.format.unsynchronisation) {
//               buf = ID3v2Parser.removeUnsyncBytes(buf);
//             }
//             if (frameHeader.flags.format.data_length_indicator) {
//               buf = buf.slice(4, buf.length);
//             }
//             return frameParser.readData(buf, frameHeader.id, includeCovers);
//           default:
//             throw new Error('Unexpected majorVer: ' + majorVer);
//         }
//       }
//
//       /**
//        * Create a combined tag key, of tag & description
//        * @param {string} tag e.g.: COM
//        * @param {string} description e.g. iTunPGAP
//        * @returns {string} e.g. COM:iTunPGAP
//        */
//       private static makeDescriptionTagName(tag: string, description: string): string {
//         return tag + (description ? ':' + description : '');
//       }
//
//       private tokenizer: ITokenizer;
//       private id3Header: IID3v2header;
//       private metadata: INativeMetadataCollector;
//
//       private headerType: TagType;
//       private options: IOptions;
//
//       public async parse(metadata: INativeMetadataCollector, tokenizer: ITokenizer, options: IOptions): Promise<void> {
//         this.tokenizer = tokenizer;
//         this.metadata = metadata;
//         this.options = options;
//
//         const id3Header = await this.tokenizer.readToken(ID3v2Header);
//
//         if (id3Header.fileIdentifier !== 'ID3') {
//           throw new Error('expected ID3-header file-identifier \'ID3\' was not found');
//         }
//
//         this.id3Header = id3Header;
//
//         this.headerType = ('ID3v2.' + id3Header.version.major) as TagType;
//
//         if (id3Header.flags.isExtendedHeader) {
//           return this.parseExtendedHeader();
//         } else {
//           return this.parseId3Data(id3Header.size);
//         }
//       }
//
//       public async parseExtendedHeader(): Promise<void> {
//         const extendedHeader = await this.tokenizer.readToken(ExtendedHeader);
//         const dataRemaining = extendedHeader.size - ExtendedHeader.len;
//         if (dataRemaining > 0) {
//           return this.parseExtendedHeaderData(dataRemaining, extendedHeader.size);
//         } else {
//           return this.parseId3Data(this.id3Header.size - extendedHeader.size);
//         }
//       }
//
//       public async parseExtendedHeaderData(dataRemaining: number, extendedHeaderSize: number): Promise<void> {
//         const buffer = Buffer.alloc(dataRemaining);
//         await this.tokenizer.readBuffer(buffer, {length: dataRemaining});
//         return this.parseId3Data(this.id3Header.size - extendedHeaderSize);
//       }
//
//       public async parseId3Data(dataLen: number): Promise<void> {
//         const buffer = Buffer.alloc(dataLen);
//         await this.tokenizer.readBuffer(buffer, {length: dataLen});
//         for (const tag of this.parseMetadata(buffer)) {
//           if (tag.id === 'TXXX') {
//             if (tag.value) {
//               for (const text of tag.value.text) {
//                 this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, tag.value.description), text);
//               }
//             }
//           } else if (tag.id === 'COM') {
//             for (const value of tag.value) {
//               this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, value.description), value.text);
//             }
//           } else if (tag.id === 'COMM') {
//             for (const value of tag.value) {
//               this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, value.description), value);
//             }
//           } else if (Array.isArray(tag.value)) {
//             for (const value of tag.value) {
//               this.addTag(tag.id, value);
//             }
//           } else {
//             this.addTag(tag.id, tag.value);
//           }
//         }
//       }
//
//       private addTag(id: string, value: any) {
//         this.metadata.addTag(this.headerType, id, value);
//       }
//
//       private parseMetadata(data: Buffer): ITag[] {
//         let offset = 0;
//         const tags: { id: string, value: any }[] = [];
//
//         while (true) {
//           if (offset === data.length) {
//             break;
//           }
//
//           const frameHeaderLength = ID3v2Parser.getFrameHeaderLength(this.id3Header.version.major);
//
//           if (offset + frameHeaderLength > data.length) {
//             this.metadata.addWarning('Illegal ID3v2 tag length');
//             break;
//           }
//
//           const frameHeaderBytes = data.slice(offset, offset += frameHeaderLength);
//           const frameHeader = this.readFrameHeader(frameHeaderBytes, this.id3Header.version.major);
//           const frameDataBytes = data.slice(offset, offset += frameHeader.length);
//           const values = ID3v2Parser.readFrameData(frameDataBytes, frameHeader, this.id3Header.version.major, !this.options.skipCovers, this.metadata);
//
//           if (values) {
//             tags.push({id: frameHeader.id, value: values});
//           }
//         }
//
//         return tags;
//       }
//
//       private readFrameHeader(v: Buffer, majorVer: number): IFrameHeader {
//         let header: IFrameHeader;
//         switch (majorVer) {
//           case 2:
//             header = {
//               id: v.toString('ascii', 0, 3),
//               length: Token.UINT24_BE.get(v, 3)
//             };
//             if (!header.id.match(/[A-Z0-9]{3}/g)) {
//               this.metadata.addWarning(`Invalid ID3v2.${this.id3Header.version.major} frame-header-ID: ${header.id}`);
//             }
//             break;
//           case 3:
//           case 4:
//             header = {
//               id: v.toString('ascii', 0, 4),
//               length: (majorVer === 4 ? UINT32SYNCSAFE : Token.UINT32_BE).get(v, 4),
//               flags: ID3v2Parser.readFrameFlags(v.slice(8, 10))
//             };
//             if (!header.id.match(/[A-Z0-9]{4}/g)) {
//               this.metadata.addWarning(`Invalid ID3v2.${this.id3Header.version.major} frame-header-ID: ${header.id}`);
//             }
//             break;
//           default:
//             throw new Error('Unexpected majorVer: ' + majorVer);
//         }
//
//         return header;
//       }
//     }
//
//     export type StringEncoding =
//       'ascii' // Use  'utf-8' or latin1 instead
//       | 'utf8' // alias: 'utf-8'
//       | 'utf16le' // alias: 'ucs2', 'ucs-2'
//       | 'ucs2' //  'utf16le'
//       | 'base64url'
//       | 'latin1' // Same as ISO-8859-1 (alias: 'binary')
//       | 'hex';
//
//     function getBit(buf: Uint8Array, off: number, bit: number): boolean {
//       return (buf[off] & (1 << bit)) !== 0;
//     }
//
//     /**
//      * Found delimiting zero in uint8Array
//      * @param uint8Array Uint8Array to find the zero delimiter in
//      * @param start Offset in uint8Array
//      * @param end Last position to parse in uint8Array
//      * @param encoding The string encoding used
//      * @return Absolute position on uint8Array where zero found
//      */
//     function findZero(uint8Array: Uint8Array, start: number, end: number, encoding?: StringEncoding): number {
//       let i = start;
//       if (encoding === 'utf16le') {
//         while (uint8Array[i] !== 0 || uint8Array[i + 1] !== 0) {
//           if (i >= end) {
//             return end;
//           }
//           i += 2;
//         }
//         return i;
//       } else {
//         while (uint8Array[i] !== 0) {
//           if (i >= end) {
//             return end;
//           }
//           i++;
//         }
//         return i;
//       }
//     }
//
//     function trimRightNull(x: string): string {
//       const pos0 = x.indexOf('\0');
//       return pos0 === -1 ? x : x.substr(0, pos0);
//     }
//
//     function swapBytes<T extends Uint8Array>(uint8Array: T): T {
//       const l = uint8Array.length;
//       if ((l & 1) !== 0) {
//         throw new Error('Buffer length must be even');
//       }
//       for (let i = 0; i < l; i += 2) {
//         const a = uint8Array[i];
//         uint8Array[i] = uint8Array[i + 1];
//         uint8Array[i + 1] = a;
//       }
//       return uint8Array;
//     }
//
//
//     /**
//      *
//      * @param buffer Decoder input data
//      * @param encoding 'utf16le' | 'utf16' | 'utf8' | 'iso-8859-1'
//      * @return {string}
//      */
//     function decodeString(buffer: Buffer, encoding: StringEncoding): string {
//       // annoying workaround for a double BOM issue
//       // https://github.com/leetreveil/musicmetadata/issues/84
//       let offset = 0;
//       if (buffer[0] === 0xFF && buffer[1] === 0xFE) { // little endian
//         if (encoding === 'utf16le') {
//           offset = 2;
//         } else if (buffer[2] === 0xFE && buffer[3] === 0xFF) {
//           offset = 2; // Clear double BOM
//         }
//       } else if (encoding === 'utf16le' && buffer[0] === 0xFE && buffer[1] === 0xFF) {
//         // BOM, indicating big endian decoding
//         return decodeString(swapBytes(buffer), encoding);
//       }
//       return buffer.toString(encoding, offset);
//     }
//
//     function stripNulls(str: string): string {
//       str = str.replace(/^\x00+/g, '');
//       str = str.replace(/\x00+$/g, '');
//       return str;
//     }
//
//     /**
//      * Read bit-aligned number start from buffer
//      * Total offset in bits = byteOffset * 8 + bitOffset
//      * @param buf Byte buffer
//      * @param byteOffset Starting offset in bytes
//      * @param bitOffset Starting offset in bits: 0 = lsb
//      * @param len Length of number in bits
//      * @return {number} decoded bit aligned number
//      */
//     function getBitAllignedNumber(buf: Uint8Array, byteOffset: number, bitOffset: number, len: number): number {
//       const byteOff = byteOffset + ~~(bitOffset / 8);
//       const bitOff = bitOffset % 8;
//       let value = buf[byteOff];
//       value &= 0xff >> bitOff;
//       const bitsRead = 8 - bitOff;
//       const bitsLeft = len - bitsRead;
//       if (bitsLeft < 0) {
//         value >>= (8 - bitOff - len);
//       } else if (bitsLeft > 0) {
//         value <<= bitsLeft;
//         value |= getBitAllignedNumber(buf, byteOffset, bitOffset + bitsRead, bitsLeft);
//       }
//       return value;
//     }
//
//     /**
//      * Read bit-aligned number start from buffer
//      * Total offset in bits = byteOffset * 8 + bitOffset
//      * @param buf Byte buffer
//      * @param byteOffset Starting offset in bytes
//      * @param bitOffset Starting offset in bits: 0 = most significant bit, 7 is least significant bit
//      * @return {number} decoded bit aligned number
//      */
//     function isBitSet(buf: Uint8Array, byteOffset: number, bitOffset: number): boolean {
//       return getBitAllignedNumber(buf, byteOffset, bitOffset, 1) === 1;
//     }
//
//     function a2hex(str: string) {
//       const arr = [];
//       for (let i = 0, l = str.length; i < l; i++) {
//         const hex = Number(str.charCodeAt(i)).toString(16);
//         arr.push(hex.length === 1 ? '0' + hex : hex);
//       }
//       return arr.join(' ');
//     }
//
//     /**
//      * Convert power ratio to DB
//      * ratio: [0..1]
//      */
//     function ratioToDb(ratio: number): number {
//       return 10 * Math.log10(ratio);
//     }
//
//     /**
//      * Convert dB to ratio
//      * db Decibels
//      */
//     function dbToRatio(dB: number): number {
//       return Math.pow(10, dB / 10);
//     }
//
//     /**
//      * Convert replay gain to ratio and Decibel
//      * @param value string holding a ratio like '0.034' or '-7.54 dB'
//      */
//     function toRatio(value: string): IRatio {
//       const ps = value.split(' ').map(p => p.trim().toLowerCase());
//       // @ts-ignore
//       if (ps.length >= 1) {
//         const v = parseFloat(ps[0]);
//         if (ps.length === 2 && ps[1] === 'db') {
//           return {
//             dB: v,
//             ratio: dbToRatio(v)
//           };
//         } else {
//           return {
//             dB: ratioToDb(v),
//             ratio: v
//           };
//         }
//       }
//     }
//
//     type TagType = 'vorbis' | 'ID3v1' | 'ID3v2.2' | 'ID3v2.3' | 'ID3v2.4' | 'APEv2' | 'asf' | 'iTunes' | 'exif' | 'matroska';
//
//     interface IGenericTag {
//       id: GenericTagId,
//       value: any
//     }
//
//     type GenericTagId =
//       'track'
//       | 'disk'
//       | 'year'
//       | 'title'
//       | 'artist'
//       | 'artists'
//       | 'albumartist'
//       | 'album'
//       | 'date'
//       | 'originaldate'
//       | 'originalyear'
//       | 'comment'
//       | 'genre'
//       | 'picture'
//       | 'composer'
//       | 'lyrics'
//       | 'albumsort'
//       | 'titlesort'
//       | 'work'
//       | 'artistsort'
//       | 'albumartistsort'
//       | 'composersort'
//       | 'lyricist'
//       | 'writer'
//       | 'conductor'
//       | 'remixer'
//       | 'arranger'
//       | 'engineer'
//       | 'technician'
//       | 'producer'
//       | 'djmixer'
//       | 'mixer'
//       | 'publisher'
//       | 'label'
//       | 'grouping'
//       | 'subtitle'
//       | 'discsubtitle'
//       | 'totaltracks'
//       | 'totaldiscs'
//       | 'compilation'
//       | 'rating'
//       | 'bpm'
//       | 'mood'
//       | 'media'
//       | 'catalognumber'
//       | 'tvShow'
//       | 'tvShowSort'
//       | 'tvEpisode'
//       | 'tvEpisodeId'
//       | 'tvNetwork'
//       | 'tvSeason'
//       | 'podcast'
//       | 'podcasturl'
//       | 'releasestatus'
//       | 'releasetype'
//       | 'releasecountry'
//       | 'script'
//       | 'language'
//       | 'copyright'
//       | 'license'
//       | 'encodedby'
//       | 'encodersettings'
//       | 'gapless'
//       | 'barcode'
//       | 'isrc'
//       | 'asin'
//       | 'musicbrainz_recordingid'
//       | 'musicbrainz_trackid'
//       | 'musicbrainz_albumid'
//       | 'musicbrainz_artistid'
//       | 'musicbrainz_albumartistid'
//       | 'musicbrainz_releasegroupid'
//       | 'musicbrainz_workid'
//       | 'musicbrainz_trmid'
//       | 'musicbrainz_discid'
//       | 'acoustid_id'
//       | 'acoustid_fingerprint'
//       | 'musicip_puid'
//       | 'musicip_fingerprint'
//       | 'website'
//       | 'performer:instrument'
//       | 'peakLevel'
//       | 'averageLevel'
//       | 'notes'
//       | 'key'
//       | 'originalalbum'
//       | 'originalartist'
//       | 'discogs_artist_id'
//       | 'discogs_label_id'
//       | 'discogs_master_release_id'
//       | 'discogs_rating'
//       | 'discogs_release_id'
//       | 'discogs_votes'
//       | 'replaygain_track_gain'
//       | 'replaygain_track_peak'
//       | 'replaygain_album_gain'
//       | 'replaygain_album_peak'
//       | 'replaygain_track_minmax'
//       | 'replaygain_album_minmax'
//       | 'replaygain_undo'
//       | 'description'
//       | 'longDescription'
//       | 'category'
//       | 'hdVideo'
//       | 'keywords'
//       | 'movement'
//       | 'movementIndex'
//       | 'movementTotal'
//       | 'podcastId'
//       | 'showMovement'
//       | 'stik';
//
//     interface INativeTagMap {
//       [index: string]: GenericTagId;
//     }
//
//     interface ITagInfo {
//       /**
//        * True if result is an array
//        */
//       multiple: boolean,
//       /**
//        * True if the result is an array and each value in the array should be unique
//        */
//       unique?: boolean
//     }
//
//     interface ITagInfoMap {
//       [index: string]: ITagInfo;
//     }
//
//     const commonTags: ITagInfoMap = {
//       year: {multiple: false},
//       track: {multiple: false},
//       disk: {multiple: false},
//       title: {multiple: false},
//       artist: {multiple: false},
//       artists: {multiple: true, unique: true},
//       albumartist: {multiple: false},
//       album: {multiple: false},
//       date: {multiple: false},
//       originaldate: {multiple: false},
//       originalyear: {multiple: false},
//       comment: {multiple: true, unique: false},
//       genre: {multiple: true, unique: true},
//       picture: {multiple: true, unique: true},
//       composer: {multiple: true, unique: true},
//       lyrics: {multiple: true, unique: false},
//       albumsort: {multiple: false, unique: true},
//       titlesort: {multiple: false, unique: true},
//       work: {multiple: false, unique: true},
//       artistsort: {multiple: false, unique: true},
//       albumartistsort: {multiple: false, unique: true},
//       composersort: {multiple: false, unique: true},
//       lyricist: {multiple: true, unique: true},
//       writer: {multiple: true, unique: true},
//       conductor: {multiple: true, unique: true},
//       remixer: {multiple: true, unique: true},
//       arranger: {multiple: true, unique: true},
//       engineer: {multiple: true, unique: true},
//       producer: {multiple: true, unique: true},
//       technician: {multiple: true, unique: true},
//       djmixer: {multiple: true, unique: true},
//       mixer: {multiple: true, unique: true},
//       label: {multiple: true, unique: true},
//       grouping: {multiple: false},
//       subtitle: {multiple: true},
//       discsubtitle: {multiple: false},
//       totaltracks: {multiple: false},
//       totaldiscs: {multiple: false},
//       compilation: {multiple: false},
//       rating: {multiple: true},
//       bpm: {multiple: false},
//       mood: {multiple: false},
//       media: {multiple: false},
//       catalognumber: {multiple: true, unique: true},
//       tvShow: {multiple: false},
//       tvShowSort: {multiple: false},
//       tvSeason: {multiple: false},
//       tvEpisode: {multiple: false},
//       tvEpisodeId: {multiple: false},
//       tvNetwork: {multiple: false},
//       podcast: {multiple: false},
//       podcasturl: {multiple: false},
//       releasestatus: {multiple: false},
//       releasetype: {multiple: true},
//       releasecountry: {multiple: false},
//       script: {multiple: false},
//       language: {multiple: false},
//       copyright: {multiple: false},
//       license: {multiple: false},
//       encodedby: {multiple: false},
//       encodersettings: {multiple: false},
//       gapless: {multiple: false},
//       barcode: {multiple: false},
//       isrc: {multiple: true},
//       asin: {multiple: false},
//       musicbrainz_recordingid: {multiple: false},
//       musicbrainz_trackid: {multiple: false},
//       musicbrainz_albumid: {multiple: false},
//       musicbrainz_artistid: {multiple: true},
//       musicbrainz_albumartistid: {multiple: true},
//       musicbrainz_releasegroupid: {multiple: false},
//       musicbrainz_workid: {multiple: false},
//       musicbrainz_trmid: {multiple: false},
//       musicbrainz_discid: {multiple: false},
//       acoustid_id: {multiple: false},
//       acoustid_fingerprint: {multiple: false},
//       musicip_puid: {multiple: false},
//       musicip_fingerprint: {multiple: false},
//       website: {multiple: false},
//       'performer:instrument': {multiple: true, unique: true},
//       averageLevel: {multiple: false},
//       peakLevel: {multiple: false},
//       notes: {multiple: true, unique: false},
//
//       key: {multiple: false},
//       originalalbum: {multiple: false},
//       originalartist: {multiple: false},
//
//       discogs_artist_id: {multiple: true, unique: true},
//       discogs_release_id: {multiple: false},
//       discogs_label_id: {multiple: false},
//       discogs_master_release_id: {multiple: false},
//       discogs_votes: {multiple: false},
//       discogs_rating: {multiple: false},
//
//       replaygain_track_peak: {multiple: false},
//       replaygain_track_gain: {multiple: false},
//       replaygain_album_peak: {multiple: false},
//       replaygain_album_gain: {multiple: false},
//       replaygain_track_minmax: {multiple: false},
//       replaygain_album_minmax: {multiple: false},
//       replaygain_undo: {multiple: false},
//
//       description: {multiple: true},
//       longDescription: {multiple: false},
//
//       category: {multiple: true},
//       hdVideo: {multiple: false},
//       keywords: {multiple: true},
//       movement: {multiple: false},
//       movementIndex: {multiple: false},
//       movementTotal: {multiple: false},
//       podcastId: {multiple: false},
//       showMovement: {multiple: false},
//       stik: {multiple: false}
//     };
//
//     /**
//      * @param alias Name of common tag
//      * @returns {boolean|*} true if given alias is mapped as a singleton', otherwise false
//      */
//     function isSingleton(alias: GenericTagId): boolean {
//       return commonTags.hasOwnProperty(alias) && !commonTags[alias].multiple;
//     }
//
//     /**
//      * @param alias Common (generic) tag
//      * @returns {boolean|*} true if given alias is a singleton or explicitly marked as unique
//      */
//     function isUnique(alias: GenericTagId): boolean {
//       return !commonTags[alias].multiple || commonTags[alias].unique;
//     }
//
//     /**
//      * Attached picture, typically used for cover art
//      */
//     interface IPicture {
//       /**
//        * Image mime type
//        */
//       format: string;
//       /**
//        * Image data
//        */
//       data: Buffer;
//       /**
//        * Optional description
//        */
//       description?: string;
//       /**
//        * Picture type
//        */
//       type?: string;
//       /**
//        * File name
//        */
//       name?: string;
//     }
//
//     /**
//      * Abstract interface to access rating information
//      */
//     interface IRating {
//       /**
//        * Rating source, could be an e-mail address
//        */
//       source?: string;
//       /**
//        * Rating [0..1]
//        */
//       rating: number;
//     }
//
//     interface ICommonTagsResult {
//       track: { no: number | null, of: number | null };
//       disk: { no: number | null, of: number | null };
//       /**
//        * Release year
//        */
//       year?: number;
//       /**
//        * Track title
//        */
//       title?: string;
//       /**
//        * Track, maybe several artists written in a single string.
//        */
//       artist?: string;
//       /**
//        * Track artists, aims to capture every artist in a different string.
//        */
//       artists?: string[];
//       /**
//        * Track album artists
//        */
//       albumartist?: string;
//       /**
//        * Album title
//        */
//       album?: string;
//       /**
//        * Release data
//        */
//       date?: string;
//       /**
//        * Original release date
//        */
//       originaldate?: string;
//       /**
//        * Original release yeat
//        */
//       originalyear?: number;
//       /**
//        * List of comments
//        */
//       comment?: string[];
//       /**
//        * Genre
//        */
//       genre?: string[];
//       /**
//        * Embedded album art
//        */
//       picture?: IPicture[];
//       /**
//        * Track composer
//        */
//       composer?: string[];
//       /**
//        * Lyrics
//        */
//       lyrics?: string[];
//       /**
//        * Album title, formatted for alphabetic ordering
//        */
//       albumsort?: string;
//       /**
//        * Track title, formatted for alphabetic ordering
//        */
//       titlesort?: string;
//       /**
//        * The canonical title of the work
//        */
//       work?: string;
//       /**
//        * Track artist, formatted for alphabetic ordering
//        */
//       artistsort?: string;
//       /**
//        * Album artist, formatted for alphabetic ordering
//        */
//       albumartistsort?: string;
//       /**
//        * Composer, formatted for alphabetic ordering
//        */
//       composersort?: string;
//       /**
//        * Lyricist(s)
//        */
//       lyricist?: string[];
//       /**
//        * Writer(s)
//        */
//       writer?: string[];
//       /**
//        * Conductor(s)
//        */
//       conductor?: string[];
//       /**
//        * Remixer(s)
//        */
//       remixer?: string[];
//       /**
//        * Arranger(s)
//        */
//       arranger?: string[];
//       /**
//        * Engineer(s)
//        */
//       engineer?: string[];
//       /**
//        * Producer(s)
//        */
//       producer?: string[];
//       /**
//        * Mix-DJ(s)
//        */
//       djmixer?: string[];
//       /**
//        * Mixed by
//        */
//       mixer?: string[];
//       technician?: string[];
//       label?: string[];
//       grouping?: string;
//       subtitle?: string[];
//       description?: string[];
//       longDescription?: string;
//       discsubtitle?: string[];
//       totaltracks?: string;
//       totaldiscs?: string;
//       movementTotal?: number;
//       compilation?: boolean;
//       rating?: IRating[];
//       bpm?: number;
//       /**
//        * Keywords to reflect the mood of the audio, e.g. 'Romantic' or 'Sad'
//        */
//       mood?: string;
//       /**
//        * Release format, e.g. 'CD'
//        */
//       media?: string;
//       /**
//        * Release catalog number(s)
//        */
//       catalognumber?: string[];
//       /**
//        * TV show title
//        */
//       tvShow?: string;
//       /**
//        * TV show title, formatted for alphabetic ordering
//        */
//       tvShowSort?: string;
//       /**
//        * TV season title sequence number
//        */
//       tvSeason?: number;
//       /**
//        * TV Episode sequence number
//        */
//       tvEpisode?: number;
//       /**
//        * TV episode ID
//        */
//       tvEpisodeId?: string,
//       /**
//        * TV network
//        */
//       tvNetwork?: string,
//       podcast?: boolean;
//       podcasturl?: string;
//       releasestatus?: string;
//       releasetype?: string[];
//       releasecountry?: string;
//       script?: string;
//       language?: string;
//       copyright?: string;
//       license?: string;
//       encodedby?: string;
//       encodersettings?: string;
//       gapless?: boolean;
//       barcode?: string; // ToDo: multiple??
//       // International Standard Recording Code
//       isrc?: string[];
//       asin?: string;
//       musicbrainz_recordingid?: string;
//       musicbrainz_trackid?: string;
//       musicbrainz_albumid?: string;
//       musicbrainz_artistid?: string[];
//       musicbrainz_albumartistid?: string[];
//       musicbrainz_releasegroupid?: string;
//       musicbrainz_workid?: string;
//       musicbrainz_trmid?: string;
//       musicbrainz_discid?: string;
//       acoustid_id?: string;
//       acoustid_fingerprint?: string;
//       musicip_puid?: string;
//       musicip_fingerprint?: string;
//       website?: string;
//       'performer:instrument'?: string[];
//       averageLevel?: number;
//       peakLevel?: number;
//       notes?: string[];
//       originalalbum?: string;
//       originalartist?: string;
//       // Discogs:
//       discogs_artist_id?: number[];
//       discogs_release_id?: number;
//       discogs_label_id?: number;
//       discogs_master_release_id?: number;
//       discogs_votes?: number;
//       discogs_rating?: number;
//
//       /**
//        * Track gain ratio [0..1]
//        */
//       replaygain_track_gain_ratio?: number;
//       /**
//        * Track peak ratio [0..1]
//        */
//       replaygain_track_peak_ratio?: number;
//
//       /**
//        * Track gain ratio
//        */
//       replaygain_track_gain?: IRatio;
//
//       /**
//        * Track peak ratio
//        */
//       replaygain_track_peak?: IRatio;
//
//       /**
//        * Album gain ratio
//        */
//       replaygain_album_gain?: IRatio;
//
//       /**
//        * Album peak ratio
//        */
//       replaygain_album_peak?: IRatio;
//
//       /**
//        * minimum & maximum global gain values across a set of files scanned as an album
//        */
//       replaygain_undo?: {
//         leftChannel: number,
//         rightChannel: number
//       };
//
//       /**
//        * minimum & maximum global gain values across a set of files scanned as an album
//        */
//       replaygain_track_minmax?: number[];
//
//       /**
//        * The initial key of the music in the file, e.g. "A Minor".
//        * Ref: https://docs.microsoft.com/en-us/windows/win32/wmformat/wm-initialkey
//        */
//       key?: string;
//
//       /**
//        * Podcast Category
//        */
//       category?: string[];
//       /**
//        * iTunes Video Quality
//        *
//        * 2: Full HD
//        * 1: HD
//        * 0: SD
//        */
//       hdVideo?: number;
//       /**
//        * Podcast Keywords
//        */
//       keywords?: string[];
//       /**
//        * Movement
//        */
//       movement?: string;
//       /**
//        * Movement Index/Total
//        */
//       movementIndex: { no?: number, of?: number };
//       /**
//        * Podcast Identifier
//        */
//       podcastId?: string;
//       /**
//        * Show Movement
//        */
//       showMovement?: boolean;
//       /**
//        * iTunes Media Type
//        *
//        * 1: Normal
//        * 2: Audiobook
//        * 6: Music Video
//        * 9: Movie
//        * 10: TV Show
//        * 11: Booklet
//        * 14: Ringtone
//        *
//        * https://github.com/sergiomb2/libmp4v2/wiki/iTunesMetadata#user-content-media-type-stik
//        */
//       stik?: number;
//     }
//
//     interface IRatio {
//       /**
//        * [0..1]
//        */
//       ratio: number;
//
//       /**
//        * Decibel
//        */
//       dB: number;
//     }
//
//     type FormatId =
//       'container'
//       | 'duration'
//       | 'bitrate'
//       | 'sampleRate'
//       | 'bitsPerSample'
//       | 'codec'
//       | 'tool'
//       | 'codecProfile'
//       | 'lossless'
//       | 'numberOfChannels'
//       | 'numberOfSamples'
//       | 'audioMD5'
//       | 'chapters'
//       | 'modificationTime'
//       | 'creationTime'
//       | 'trackPeakLevel'
//       | 'trackGain'
//       | 'albumGain';
//
//     interface IAudioTrack {
//       samplingFrequency?: number;
//       outputSamplingFrequency?: number;
//       channels?: number;
//       channelPositions?: Buffer;
//       bitDepth?: number;
//     }
//
//     interface IVideoTrack {
//       flagInterlaced?: boolean;
//       stereoMode?: number;
//       pixelWidth?: number;
//       pixelHeight?: number;
//       displayWidth?: number;
//       displayHeight?: number;
//       displayUnit?: number;
//       aspectRatioType?: number;
//       colourSpace?: Buffer;
//       gammaValue?: number;
//     }
//
//     enum TrackType {
//       video = 0x01,
//       audio = 0x02,
//       complex = 0x03,
//       logo = 0x04,
//       subtitle = 0x11,
//       button = 0x12,
//       control = 0x20
//     }
//
//     interface ITrackInfo {
//       type?: TrackType;
//       codecName?: string;
//       codecSettings?: string;
//       flagEnabled?: boolean;
//       flagDefault?: boolean;
//       flagLacing?: boolean;
//       name?: string;
//       language?: string;
//       audio?: IAudioTrack;
//       video?: IVideoTrack;
//     }
//
//     interface IFormat {
//
//       readonly trackInfo: ITrackInfo[]
//
//       /**
//        * E.g.: 'flac'
//        */
//       readonly container?: string, // ToDo: make mandatory
//
//       /**
//        * List of tags found in parsed audio file
//        */
//       readonly tagTypes?: TagType[],
//
//       /**
//        * Duration in seconds
//        */
//       readonly duration?: number,
//
//       /**
//        * Number bits per second of encoded audio file
//        */
//       readonly bitrate?: number,
//
//       /**
//        * Sampling rate in Samples per second (S/s)
//        */
//       readonly sampleRate?: number,
//
//       /**
//        * Audio bit depth
//        */
//       readonly bitsPerSample?: number,
//
//       /**
//        * Encoder brand, e.g.: LAME3.99r
//        */
//       readonly tool?: string,
//
//       /**
//        * Encoder name / compressionType, e.g.: 'PCM', 'ITU-T G.711 mu-law'
//        */
//       readonly codec?: string,
//
//       /**
//        * Codec profile
//        */
//       readonly codecProfile?: string,
//
//       readonly lossless?: boolean,
//
//       /**
//        * Number of audio channels
//        */
//       readonly numberOfChannels?: number,
//
//       /**
//        * Number of samples frames.
//        * One sample contains all channels
//        * The duration is: numberOfSamples / sampleRate
//        */
//       readonly numberOfSamples?: number
//
//       /**
//        * 16-byte MD5 of raw audio
//        */
//       readonly audioMD5?: Buffer;
//
//       /**
//        * Chapters in audio stream
//        */
//       readonly chapters?: IChapter[]
//
//       /**
//        * Time file was created
//        */
//       readonly creationTime?: Date;
//
//       /**
//        * Time file was modified
//        */
//       readonly modificationTime?: Date;
//
//       readonly trackGain?: number;
//       readonly trackPeakLevel?: number;
//       readonly albumGain?: number;
//     }
//
//     interface ITag {
//       id: string,
//       value: any
//     }
//
//     interface IChapter {
//       /**
//        * Chapter title
//        */
//       title: string;
//       /**
//        * Audio offset in sample number, 0 is the first sample.
//        * Duration offset is sampleOffset / format.sampleRate
//        */
//       sampleOffset: number;
//     }
//
//     /**
//      * Flat list of tags
//      */
//     interface INativeTags {
//       [tagType: string]: ITag[];
//     }
//
//     /**
//      * Tags ordered by tag-ID
//      */
//     interface INativeTagDict {
//       [tagId: string]: any[];
//     }
//
//     interface INativeAudioMetadata {
//       format: IFormat,
//       native: INativeTags
//       quality: IQualityInformation;
//     }
//
//     interface IQualityInformation {
//       /**
//        * Warnings
//        */
//       warnings: IParserWarning[];
//
//     }
//
//     interface IParserWarning {
//       message: string;
//     }
//
//     interface IAudioMetadata extends INativeAudioMetadata {
//       /**
//        * Metadata, form independent interface
//        */
//       common: ICommonTagsResult;
//
//     }
//
//     /**
//      * Corresponds with parser module name
//      */
//     type ParserType =
//       'mpeg'
//       | 'apev2'
//       | 'mp4'
//       | 'asf'
//       | 'flac'
//       | 'ogg'
//       | 'aiff'
//       | 'wavpack'
//       | 'riff'
//       | 'musepack'
//       | 'dsf'
//       | 'dsdiff'
//       | 'adts'
//       | 'matroska';
//
//     interface IOptions {
//
//       /**
//        * default: `false`, if set to `true`, it will parse the whole media file if required to determine the duration.
//        */
//       duration?: boolean;
//
//       /**
//        * default: `false`, if set to `true`, it will skip parsing covers.
//        */
//       skipCovers?: boolean;
//
//       /**
//        * default: `false`, if set to `true`, it will not search all the entire track for additional headers.
//        * Only recommenced to use in combination with streams.
//        */
//       skipPostHeaders?: boolean;
//
//       /**
//        * default: `false`, if set to `true`, it will include MP4 chapters
//        */
//       includeChapters?: boolean;
//
//       /**
//        * Set observer for async callbacks to common or format.
//        */
//       observer?: Observer;
//     }
//
//     interface IApeHeader extends IOptions {
//
//       /**
//        * Offset of APE-header
//        */
//       offset: number;
//
//       /**
//        * APEv1 / APEv2 header offset
//        */
//       footer: IFooter;
//
//     }
//
//     interface IPrivateOptions extends IOptions {
//
//       apeHeader?: IApeHeader;
//     }
//
//     /**
//      * Event definition send after each change to common/format metadata change to observer.
//      */
//     interface IMetadataEvent {
//
//       /**
//        * Tag which has been updated.
//        */
//       tag: {
//
//         /**
//          * Either 'common' if it a generic tag event, or 'format' for format related updates
//          */
//         type: 'common' | 'format'
//
//         /**
//          * Tag id
//          */
//         id: GenericTagId | FormatId
//
//         /**
//          * Tag value
//          */
//         value: any
//       };
//
//       /**
//        * Metadata model including the attached tag
//        */
//       metadata: IAudioMetadata;
//     }
//
//     type Observer = (update: IMetadataEvent) => void;
//
//     /**
//      * Provides random data read access
//      * Used read operations on file of buffers
//      */
//     interface IRandomReader {
//
//       /**
//        * Total length of file or buffer
//        */
//       fileSize: number;
//
//       /**
//        * Read from a given position of an abstracted file or buffer.
//        * @param buffer {Buffer} is the buffer that the data will be written to.
//        * @param offset {number} is the offset in the buffer to start writing at.
//        * @param length {number}is an integer specifying the number of bytes to read.
//        * @param position {number} is an argument specifying where to begin reading from in the file.
//        * @return {Promise<number>} bytes read
//        */
//       randomRead(buffer: Buffer, offset: number, length: number, position: number): Promise<number>;
//     }
