"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const schema_1 = require("./db/schema");
const auth_1 = __importDefault(require("./routes/auth"));
const jobs_1 = __importDefault(require("./routes/jobs"));
const disputes_1 = __importDefault(require("./routes/disputes"));
const admin_1 = __importDefault(require("./routes/admin"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'], credentials: true }));
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/jobs', jobs_1.default);
app.use('/api/disputes', disputes_1.default);
app.use('/api/admin', admin_1.default);
app.get('/api/health', (_, res) => res.json({ status: 'ok', network: 'Stellar Testnet', time: new Date().toISOString() }));
async function start() {
    await (0, schema_1.initDB)();
    app.listen(PORT, () => {
        console.log(`\n🚀 FreelanceChain API — http://localhost:${PORT}`);
        console.log(`🌐 Stellar Testnet aktif`);
        console.log(`\n💡 Demo hesaplar:`);
        console.log(`   🧑‍💼 Müşteri:    musteri@demo.com / demo123`);
        console.log(`   👨‍💻 Freelancer: freelancer@demo.com / demo123`);
        console.log(`   🔑 Admin:      admin@escrow.com / admin123\n`);
    });
}
start();
