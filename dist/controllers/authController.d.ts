import { Request, Response } from 'express';
declare class AuthController {
    /**
     * Регистрация пользователя
     */
    register(req: Request, res: Response): Promise<void>;
    /**
     * Вход пользователя - ИСПРАВЛЕННАЯ ВЕРСИЯ
     */
    login(req: Request, res: Response): Promise<void>;
    /**
     * Получение текущего пользователя
     */
    getMe(req: Request, res: Response): Promise<void>;
}
declare const _default: AuthController;
export default _default;
//# sourceMappingURL=authController.d.ts.map