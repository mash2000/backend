import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Увеличиваем таймауты и настраиваем пул соединений
const sequelize = new Sequelize(
    process.env.DB_NAME || 'archimus',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 10,           // Максимум соединений
            min: 0,            // Минимум соединений
            acquire: 60000,    // Таймаут получения соединения (60 сек)
            idle: 10000,       // Таймаут простоя (10 сек)
            evict: 1000        // Проверка каждую секунду
        },
        retry: {
            max: 5,            // Максимум попыток переподключения
            timeout: 60000     // Таймаут между попытками
        },
        keepAlive: true,       // Поддержание соединения
        keepAliveInitialDelayMillis: 1000  // Начальная задержка keep-alive
    }
);

// Обработка потери соединения
const handleConnectionLoss = () => {
    console.log('⚠️ Database connection lost, attempting to reconnect...');
};

const handleConnectionReconnect = () => {
    console.log('✅ Database reconnected successfully');
};

sequelize.connectionManager.on('disconnect', handleConnectionLoss);
sequelize.connectionManager.on('reconnect', handleConnectionReconnect);

export default sequelize;