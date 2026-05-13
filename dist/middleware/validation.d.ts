import { Request, Response, NextFunction } from 'express';
export declare const validate: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateEmail: import("express-validator").ValidationChain;
export declare const validatePassword: import("express-validator").ValidationChain;
export declare const validateName: import("express-validator").ValidationChain;
export declare const registerValidation: (((req: Request, res: Response, next: NextFunction) => void) | import("express-validator").ValidationChain)[];
export declare const loginValidation: (((req: Request, res: Response, next: NextFunction) => void) | import("express-validator").ValidationChain)[];
export declare const fileUploadValidation: (((req: Request, res: Response, next: NextFunction) => void) | import("express-validator").ValidationChain)[];
export declare const changePasswordValidation: (((req: Request, res: Response, next: NextFunction) => void) | import("express-validator").ValidationChain)[];
//# sourceMappingURL=validation.d.ts.map