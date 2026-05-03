"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Token gerekli' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ error: 'Geçersiz token' });
    }
}
function adminMiddleware(req, res, next) {
    authMiddleware(req, res, () => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin yetkisi gerekli' });
        }
        next();
    });
}
