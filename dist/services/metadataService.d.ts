export type FileType = 'audio' | 'score' | 'lyrics' | 'midi' | 'other';
declare class MetadataService {
    detectFileType(filePath: string): Promise<FileType>;
    extractMetadata(filePath: string, fileType: FileType): Promise<any>;
    generateThumbnail(filePath: string, fileType: FileType): Promise<string | null>;
}
declare const _default: MetadataService;
export default _default;
//# sourceMappingURL=metadataService.d.ts.map