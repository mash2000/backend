import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import jwtService from '../services/jwtService';
import encryptionService from '../services/encryptionService';

export class AuthController {
    async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, name } = req.body;

            // Check if user exists
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                res.status(400).json({ error: 'User already exists' });
                return;
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Generate master key for user
            const masterKey = encryptionService.generateKey();
            const salt = encryptionService.generateSalt();
            const encryptedMasterKey = encryptionService.encryptKey(
                masterKey,
                encryptionService.deriveKeyFromPassword(password, salt)
            );

            // Create user
            const user = await User.create({
                id: uuidv4(),
                email,
                passwordHash,
                name,
                encryptedMasterKey,
                keySalt: salt.toString('hex')
            });

            // Generate tokens
            const tokens = jwtService.generateTokens({
                userId: user.id,
                email: user.email,
                role: user.role
            });

            res.status(201).json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                ...tokens
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            // Find user
            const user = await User.findOne({ where: { email } });
            if (!user || !user.isActive) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Verify password
            const isValid = await user.validatePassword(password);
            if (!isValid) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Update last login
            await user.update({ lastLogin: new Date() });

            // Generate tokens
            const tokens = jwtService.generateTokens({
                userId: user.id,
                email: user.email,
                role: user.role
            });

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    storageUsed: user.storageUsed,
                    storageLimit: user.storageLimit
                },
                ...tokens
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }

    async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                res.status(401).json({ error: 'No refresh token provided' });
                return;
            }

            const payload = jwtService.verifyRefreshToken(refreshToken);
            if (!payload) {
                res.status(401).json({ error: 'Invalid refresh token' });
                return;
            }

            const user = await User.findByPk(payload.userId);
            if (!user || !user.isActive) {
                res.status(401).json({ error: 'User not found' });
                return;
            }

            const tokens = jwtService.generateTokens({
                userId: user.id,
                email: user.email,
                role: user.role
            });

            res.json(tokens);
        } catch (error) {
            res.status(500).json({ error: 'Token refresh failed' });
        }
    }

    async logout(req: Request, res: Response): Promise<void> {
        res.json({ message: 'Logged out successfully' });
    }

    async changePassword(req: Request, res: Response): Promise<void> {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = (req as any).user.id;

            const user = await User.findByPk(userId);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const isValid = await user.validatePassword(currentPassword);
            if (!isValid) {
                res.status(401).json({ error: 'Current password is incorrect' });
                return;
            }

            const newPasswordHash = await bcrypt.hash(newPassword, 10);
            await user.update({ passwordHash: newPasswordHash });

            // Re-encrypt master key with new password
            const masterKey = encryptionService.decryptKey(
                user.encryptedMasterKey!,
                encryptionService.deriveKeyFromPassword(currentPassword, Buffer.from(user.keySalt!, 'hex'))
            );

            const newSalt = encryptionService.generateSalt();
            const newEncryptedMasterKey = encryptionService.encryptKey(
                masterKey,
                encryptionService.deriveKeyFromPassword(newPassword, newSalt)
            );

            await user.update({
                encryptedMasterKey: newEncryptedMasterKey,
                keySalt: newSalt.toString('hex')
            });

            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({ error: 'Password change failed' });
        }
    }
}