interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}
declare class JWTService {
    private accessSecret;
    private refreshSecret;
    private accessExpires;
    private refreshExpires;
    constructor();
    generateAccessToken(payload: TokenPayload): string;
    generateRefreshToken(payload: TokenPayload): string;
    verifyAccessToken(token: string): TokenPayload | null;
    verifyRefreshToken(token: string): TokenPayload | null;
    generateTokens(payload: TokenPayload): {
        accessToken: string;
        refreshToken: string;
    };
}
declare const _default: JWTService;
export default _default;
//# sourceMappingURL=jwtService.d.ts.map