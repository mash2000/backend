import fs from 'fs';
import path from 'path';

export type FileType = 'audio' | 'score' | 'lyrics' | 'midi' | 'other';

class MetadataService {
    async detectFileType(filePath: string): Promise<FileType> {
        const ext = path.extname(filePath).toLowerCase();
        
        const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'];
        const scoreExtensions = ['.pdf', '.mscz', '.mscx', '.musicxml', '.mxl'];
        const lyricsExtensions = ['.txt', '.lyrics'];
        const midiExtensions = ['.mid', '.midi'];
        
        if (audioExtensions.includes(ext)) return 'audio';
        if (scoreExtensions.includes(ext)) return 'score';
        if (lyricsExtensions.includes(ext)) return 'lyrics';
        if (midiExtensions.includes(ext)) return 'midi';
        
        return 'other';
    }

    async extractMetadata(filePath: string, fileType: FileType): Promise<any> {
        const metadata: any = {};

        try {
            const stats = fs.statSync(filePath);
            const fileName = path.basename(filePath, path.extname(filePath));
            
            switch (fileType) {
                case 'audio':
                    metadata.title = fileName;
                    // Оценочная длительность (примерно 1 МБ = 1 минута для MP3 128kbps)
                    const sizeInMB = stats.size / (1024 * 1024);
                    metadata.duration = Math.floor(sizeInMB * 60);
                    
                    // Пытаемся извлечь исполнителя из имени файла
                    const parts = fileName.split(/[-_]/);
                    if (parts.length >= 2) {
                        metadata.artist = parts[0].trim();
                        metadata.title = parts[1].trim();
                    }
                    break;

                case 'lyrics':
                    try {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        metadata.lyrics = content;
                        metadata.lines = content.split('\n').length;
                        metadata.words = content.split(/\s+/).length;
                    } catch (err) {
                        console.warn('Failed to read lyrics:', err);
                    }
                    break;

                case 'score':
                    metadata.pages = 1;
                    break;
            }
            
            metadata.size = stats.size;
            metadata.createdAt = stats.birthtime;
            
        } catch (error) {
            console.error('Metadata extraction error:', error);
        }

        return metadata;
    }

    async generateThumbnail(filePath: string, fileType: FileType): Promise<string | null> {
        return null;
    }
}

export default new MetadataService();