import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class FileController {
    uploadFile(req: AuthRequest, res: Response): Promise<void>;
    getFiles(req: AuthRequest, res: Response): Promise<void>;
    getFileById(req: AuthRequest, res: Response): Promise<void>;
    deleteFile(req: AuthRequest, res: Response): Promise<void>;
    updateFileMetadata(req: AuthRequest, res: Response): Promise<void>;
    downloadFile(req: AuthRequest, res: Response): Promise<void>;
}
declare const _default: FileController;
export default _default;
//# sourceMappingURL=fileController.d.ts.map