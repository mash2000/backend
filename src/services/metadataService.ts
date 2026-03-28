import fs from 'fs';
import path from 'path';
import { FileType } from '../types';

// Заменяем music-metadata на более простую реализацию или делаем опциональным
let musicMetadata: any = null;

try {
    // Динамический импорт для избежания ошибок
    musicMetadata = require('music-metadata');
} catch (error) {
    console.warn('music-metadata not available, using fallback metadata extraction');
}

class MetadataService {
    async detectFileType(filePath: string): Promise<FileType> {
        const ext = path.extname(filePath).toLowerCase();
        
        const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'];
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
            switch (fileType) {
                case 'audio':
                    if (musicMetadata) {
                        try {
                            const audioData = await musicMetadata.parseFile(filePath);
                            metadata.artist = audioData.common.artist;
                            metadata.album = audioData.common.album;
                            metadata.title = audioData.common.title;
                            metadata.genre = audioData.common.genre?.[0];
                            metadata.year = audioData.common.year;
                            metadata.track = audioData.common.track?.no;
                            metadata.duration = audioData.format.duration;
                            metadata.bitrate = audioData.format.bitrate;
                            metadata.sampleRate = audioData.format.sampleRate;
                        } catch (err) {
                            console.warn('Failed to parse audio metadata:', err);
                        }
                    } else {
                        // Fallback: просто определяем длительность из имени файла или оставляем пустым
                        metadata.duration = this.estimateDurationFromFileName(filePath);
                    }
                    break;

                case 'score':
                    // Для PDF просто получаем имя файла
                    metadata.pages = 1;
                    metadata.info = { title: path.basename(filePath, path.extname(filePath)) };
                    break;

                case 'lyrics':
                    try {
                        const lyricsContent = fs.readFileSync(filePath, 'utf-8');
                        metadata.lyrics = lyricsContent.substring(0, 1000);
                        metadata.lines = lyricsContent.split('\n').length;
                        metadata.words = lyricsContent.split(/\s+/).length;
                    } catch (err) {
                        console.warn('Failed to read lyrics file:', err);
                    }
                    break;
            }
        } catch (error) {
            console.error('Metadata extraction error:', error);
        }

        return metadata;
    }

    private estimateDurationFromFileName(filePath: string): number {
        // Простая эвристика: по размеру файла
        try {
            const stats = fs.statSync(filePath);
            const sizeInMB = stats.size / (1024 * 1024);
            // Примерно 1 МБ = 1 минута для MP3
            return Math.floor(sizeInMB * 60);
        } catch {
            return 180; // default 3 minutes
        }
    }

    async generateThumbnail(filePath: string, fileType: FileType): Promise<string | null> {
        // Для простоты возвращаем null
        return null;
    }
}

export default new MetadataService();