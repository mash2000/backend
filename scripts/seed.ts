import sequelize from './../src/config/database';
import User from '../src/models/User';
import File from '../src/models/File';
import { Tag, FileTag } from '../src/models/Tag';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const seedDatabase = async () => {
    try {
        await sequelize.sync({ force: true });
        console.log('Database synchronized');

        // Create test user
        const user = await User.create({
            id: uuidv4(),
            email: 'test@example.com',
            passwordHash: await bcrypt.hash('password123', 10),
            name: 'Test User',
            role: 'user',
            storageLimit: 1073741824 // 1 GB
        });

        console.log('✅ Test user created:', user.email);

        // Create tags
        const tags = ['classical', 'jazz', 'rock', 'demo', 'final'];
        const createdTags = await Promise.all(
            tags.map(name => Tag.create({ id: uuidv4(), name }))
        );

        console.log('✅ Tags created:', tags.length);

        // Create sample files
        const sampleFiles = [
            {
                name: 'Symphony No. 1 - Movement 1',
                type: 'audio',
                format: 'MP3',
                size: 15400000,
                duration: 245
            },
            {
                name: 'Piano Sonata - Moonlight',
                type: 'score',
                format: 'PDF',
                size: 2450000
            },
            {
                name: 'Jazz Improvisation',
                type: 'midi',
                format: 'MID',
                size: 450000,
                duration: 180
            }
        ];

        for (const fileData of sampleFiles) {
            const file = await File.create({
                id: uuidv4(),
                userId: user.id,
                name: fileData.name,
                originalName: `${fileData.name}.${fileData.format.toLowerCase()}`,
                type: fileData.type as any,
                format: fileData.format,
                size: fileData.size,
                duration: fileData.duration,
                path: `/uploads/temp/${fileData.name}.${fileData.format.toLowerCase()}`,
                encryptedPath: `/uploads/encrypted/${fileData.name}.enc`,
                encryptionMetadata: {
                    iv: 'test',
                    authTag: 'test',
                    encryptedKey: 'test'
                },
                metadata: fileData.type === 'audio' ? {
                    artist: 'Test Artist',
                    album: 'Test Album',
                    bpm: 120,
                    key: 'C major'
                } : {}
            });

            // Add random tags
            const randomTags = createdTags.slice(0, Math.floor(Math.random() * 3) + 1);
            for (const tag of randomTags) {
                await FileTag.create({
                    fileId: file.id,
                    tagId: tag.id
                });
            }
        }

        console.log('✅ Sample files created');

        console.log('\n🎉 Database seeded successfully!');
        console.log('\nTest credentials:');
        console.log('  Email: test@example.com');
        console.log('  Password: password123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedDatabase();