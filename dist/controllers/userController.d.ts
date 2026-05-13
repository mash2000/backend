import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class UserController {
    getProfile(req: AuthRequest, res: Response): Promise<void>;
    updateProfile(req: AuthRequest, res: Response): Promise<void>;
    getStats(req: AuthRequest, res: Response): Promise<void>;
    changePassword(req: AuthRequest, res: Response): Promise<void>;
    updateAvatar(req: AuthRequest, res: Response): Promise<void>;
    deleteAvatar(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=userController.d.ts.map