// ==================== DATABASE.JS ====================
// SQLite database implementation using better-sqlite3 (built-in alternative)

const fs = require('fs');
const crypto = require('crypto');

class Database {
    constructor(filename) {
        this.filename = filename;
        this.db = null;
    }
    
    init() {
        // Using synchronous SQLite (bundled with Node.js in many distributions)
        // If not available, you can use a simple JSON-based storage
        try {
            const sqlite3 = require('better-sqlite3');
            this.db = new sqlite3(this.filename);
        } catch (e) {
            console.log('SQLite not available, using JSON storage');
            this.useJsonStorage();
            return;
        }
        
        this.createTables();
        this.createDefaultAdmin();
    }
    
    useJsonStorage() {
        // Fallback to JSON file storage
        this.jsonMode = true;
        this.data = {
            users: [],
            assets: [],
            transactions: [],
            projects: [],
            installments: [],
            notifications: [],
            market_assets: [],
            settings: {},
            portfolio_targets: []
        };
        
        if (fs.existsSync(this.filename + '.json')) {
            this.data = JSON.parse(fs.readFileSync(this.filename + '.json', 'utf8'));
        } else {
            this.createDefaultAdminJson();
            this.saveJson();
        }
    }
    
    saveJson() {
        if (this.jsonMode) {
            fs.writeFileSync(this.filename + '.json', JSON.stringify(this.data, null, 2));
        }
    }
    
    createTables() {
        if (this.jsonMode) return;
        
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                fullname TEXT,
                password TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                buy_price REAL NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                date DATE NOT NULL,
                direction TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                total_amount REAL NOT NULL,
                paid_amount REAL DEFAULT 0,
                start_date DATE,
                end_date DATE,
                status TEXT DEFAULT 'active',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS installments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                total_amount REAL NOT NULL,
                monthly_amount REAL NOT NULL,
                paid_count INTEGER DEFAULT 0,
                total_count INTEGER NOT NULL,
                due_day INTEGER NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                next_due_date DATE,
                status TEXT DEFAULT 'active',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS installment_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                installment_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                due_date DATE NOT NULL,
                paid_date DATE,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (installment_id) REFERENCES installments(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT NOT NULL,
                is_global INTEGER DEFAULT 0,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS market_assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                api_key TEXT,
                api_source TEXT,
                enabled INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS portfolio_targets (
                user_id INTEGER PRIMARY KEY,
                crypto REAL DEFAULT 0,
                currency REAL DEFAULT 0,
                gold REAL DEFAULT 0,
                stock REAL DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
    }
    
    createDefaultAdmin() {
        if (this.jsonMode) return;
        
        const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
        const admin = stmt.get('esyadmin');
        
        if (!admin) {
            const insertStmt = this.db.prepare(`
                INSERT INTO users (username, email, fullname, password, is_admin) 
                VALUES (?, ?, ?, ?, 1)
            `);
            
            const hash = crypto.createHash('sha256').update('godMSD1382').digest('hex');
            insertStmt.run('esyadmin', 'admin@finance.local', 'Administrator', hash);
            
            console.log('Default admin created: esyadmin / godMSD1382');
        }
    }
    
    createDefaultAdminJson() {
        const hash = crypto.createHash('sha256').update('godMSD1382').digest('hex');
        this.data.users.push({
            id: 1,
            username: 'esyadmin',
            email: 'admin@finance.local',
            fullname: 'Administrator',
            password: hash,
            is_admin: 1,
            created_at: new Date().toISOString()
        });
    }
    
    // ==================== USER METHODS ====================
    getUserByUsername(username) {
        if (this.jsonMode) {
            return this.data.users.find(u => u.username === username);
        }
        const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
        return stmt.get(username);
    }
    
    getUserByEmail(email) {
        if (this.jsonMode) {
            return this.data.users.find(u => u.email === email);
        }
        const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email);
    }
    
    getUserById(id) {
        if (this.jsonMode) {
            return this.data.users.find(u => u.id === id);
        }
        const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id);
    }
    
    createUser(user) {
        if (this.jsonMode) {
            const id = this.data.users.length > 0 ? Math.max(...this.data.users.map(u => u.id)) + 1 : 1;
            this.data.users.push({
                id,
                ...user,
                is_admin: 0,
                created_at: new Date().toISOString()
            });
            this.saveJson();
            return id;
        }
        
        const stmt = this.db.prepare(`
            INSERT INTO users (username, email, fullname, password) 
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(user.username, user.email, user.fullname, user.password);
        return result.lastInsertRowid;
    }
    
    getAllUsers() {
        if (this.jsonMode) {
            return this.data.users.map(u => ({ ...u, password: undefined }));
        }
        const stmt = this.db.prepare('SELECT id, username, email, fullname, is_admin, created_at FROM users');
        return stmt.all();
    }
    
    updateUser(id, updates) {
        if (this.jsonMode) {
            const user = this.data.users.find(u => u.id === parseInt(id));
            if (user) {
                Object.assign(user, updates);
                this.saveJson();
            }
            return;
        }
        
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);
        const stmt = this.db.prepare(`UPDATE users SET ${fields} WHERE id = ?`);
        stmt.run(...values, id);
    }
    
    deleteUser(id) {
        if (this.jsonMode) {
            this.data.users = this.data.users.filter(u => u.id !== parseInt(id));
            this.saveJson();
            return;
        }
        const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
        stmt.run(id);
    }
    
    updateAdminCredentials({ username, password }) {
        if (this.jsonMode) {
            const admin = this.data.users.find(u => u.is_admin === 1);
            if (admin) {
                admin.username = username;
                admin.password = password;
                this.saveJson();
            }
            return;
        }
        
        const stmt = this.db.prepare('UPDATE users SET username = ?, password = ? WHERE is_admin = 1');
        stmt.run(username, password);
    }
    
    // ==================== ASSET METHODS ====================
    getAssetsByUser(userId) {
        if (this.jsonMode) {
            return this.data.assets.filter(a => a.user_id === userId);
        }
        const stmt = this.db.prepare('SELECT * FROM assets WHERE user_id = ?');
        return stmt.all(userId);
    }
    
    createAsset(asset) {
        if (this.jsonMode) {
            const id = this.data.assets.length > 0 ? Math.max(...this.data.assets.map(a => a.id)) + 1 : 1;
            this.data.assets.push({
                id,
                ...asset,
                created_at: new Date().toISOString()
            });
            this.saveJson();
            return id;
        }
        
        const stmt = this.db.prepare(`
            INSERT INTO assets (user_id, symbol, name, type, amount, buy_price, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            asset.user_id, asset.symbol, asset.name, asset.type,
            asset.amount, asset.buy_price, asset.notes || null
        );
        return result.lastInsertRowid;
    }
    
    updateAsset(id, asset, userId) {
        if (this.jsonMode) {
            const a = this.data.assets.find(a => a.id === parseInt(id) && a.user_id === userId);
            if (a) {
                Object.assign(a, asset);
                this.saveJson();
            }
            return;
        }
        
        const stmt = this.db.prepare(`
            UPDATE assets SET amount = ?, buy_price = ?, notes = ? 
            WHERE id = ? AND user_id = ?
        `);
        stmt.run(asset.amount, asset.buy_price, asset.notes, id, userId);
    }
    
    deleteAsset(id, userId) {
        if (this.jsonMode) {
            this.data.assets = this.data.assets.filter(a => !(a.id === parseInt(id) && a.user_id === userId));
            this.saveJson();
            return;
        }
        const stmt = this.db.prepare('DELETE FROM assets WHERE id = ? AND user_id = ?');
        stmt.run(id, userId);
    }
    
    // ==================== TRANSACTION METHODS ====================
    getTransactionsByUser(userId) {
        if (this.jsonMode) {
            return this.data.transactions.filter(t => t.user_id === userId);
        }
        const stmt = this.db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC');
        return stmt.all(userId);
    }
    
    createTransaction(transaction) {
        if (this.jsonMode) {
            const id = this.data.transactions.length > 0 ? Math.max(...this.data.transactions.map(t => t.id)) + 1 : 1;
            this.data.transactions.push({
                id,
                ...transaction,
                created_at: new Date().toISOString()
            });
            this.saveJson();
            return id;
        }
        
        const stmt = this.db.prepare(`
            INSERT INTO transactions (user_id, type, title, amount, category, date, direction, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            transaction.user_id, transaction.type, transaction.title,
            transaction.amount, transaction.category, transaction.date,
            transaction.direction || null, transaction.notes || null
        );
        return result.lastInsertRowid;
    }
    
    updateTransaction(id, transaction, userId) {
        if (this.jsonMode) {
            const t = this.data.transactions.find(t => t.id === parseInt(id) && t.user_id === userId);
            if (t) {
                Object.assign(t, transaction);
                this.saveJson();
            }
            return;
        }
        
        const stmt = this.db.prepare(`
            UPDATE transactions SET title = ?, amount = ?, category = ?, notes = ? 
            WHERE id = ? AND user_id = ?
        `);
        stmt.run(transaction.title, transaction.amount, transaction.category, transaction.notes, id, userId);
    }
    
    deleteTransaction(id, userId) {
        if (this.jsonMode) {
            this.data.transactions = this.data.transactions.filter(t => !(t.id === parseInt(id) && t.user_id === userId));
            this.saveJson();
            return;
        }
        const stmt = this.db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?');
        stmt.run(id, userId);
    }
    
    // ==================== PROJECT METHODS ====================
    getProjectsByUser(userId) {
        if (this.jsonMode) {
            return this.data.projects.filter(p => p.user_id === userId);
        }
        const stmt = this.db.prepare('SELECT * FROM projects WHERE user_id = ?');
        return stmt.all(userId);
    }
    
    createProject(project) {
        if (this.jsonMode) {
            const id = this.data.projects.length > 0 ? Math.max(...this.data.projects.map(p => p.id)) + 1 : 1;
            this.data.projects.push({
                id,
                ...project,
                created_at: new Date().toISOString()
            });
            this.saveJson();
            return id;
        }
        
        const stmt = this.db.prepare(`
            INSERT INTO projects (user_id, title, total_amount, paid_amount, start_date, end_date, status, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            project.user_id, project.title, project.total_amount,
            project.paid_amount || 0, project.start_date, project.end_date,
            project.status || 'active', project.notes || null
        );
        return result.lastInsertRowid;
    }
    
    updateProject(id, project, userId) {
        if (this.jsonMode) {
            const p = this.data.projects.find(p => p.id === parseInt(id) && p.user_id === userId);
            if (p) {
                Object.assign(p, project);
                this.saveJson();
            }
            return;
        }
        
        const fields = Object.keys(project).map(k => `${k} = ?`).join(', ');
        const values = Object.values(project);
        const stmt = this.db.prepare(`UPDATE projects SET ${fields} WHERE id = ? AND user_id = ?`);
        stmt.run(...values, id, userId);
    }
    
    deleteProject(id, userId) {
        if (this.jsonMode) {
            this.data.projects = this.data.projects.filter(p => !(p.id === parseInt(id) && p.user_id === userId));
            this.saveJson();
            return;
        }
        const stmt = this.db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?');
        stmt.run(id, userId);
    }
    
    // ==================== INSTALLMENT METHODS ====================
    getInstallmentsByUser(userId) {
        if (this.jsonMode) {
            return this.data.installments.filter(i => i.user_id === userId);
        }
        const stmt = this.db.prepare('SELECT * FROM installments WHERE user_id = ?');
        return stmt.all(userId);
    }
    
    createInstallment(installment) {
        if (this.jsonMode) {
            const id = this.data.installments.length > 0 ? Math.max(...this.data.installments.map(i => i.id)) + 1 : 1;
            this.data.installments.push({
                id,
                ...installment,
                created_at: new Date().toISOString()
            });
            this.saveJson();
            return id;
        }
        
        const stmt = this.db.prepare(`
            INSERT INTO installments (user_id, title, total_amount, monthly_amount, total_count, due_day, start_date, end_date, next_due_date, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            installment.user_id, installment.title, installment.total_amount,
            installment.monthly_amount, installment.total_count, installment.due_day,
            installment.start_date, installment.end_date, installment.next_due_date,
            installment.notes || null
        );
        return result.lastInsertRowid;
    }
    
    updateInstallment(id, installment, userId) {
        if (this.jsonMode) {
            const i = this.data.installments.find(i => i.id === parseInt(id) && i.user_id === userId);
            if (i) {
                Object.assign(i, installment);
                this.saveJson();
            }
            return;
        }
        
        const fields = Object.keys(installment).map(k => `${k} = ?`).join(', ');
        const values = Object.values(installment);
        const stmt = this.db.prepare(`UPDATE installments SET ${fields} WHERE id = ? AND user_id = ?`);
        stmt.run(...values, id, userId);
    }
    
    deleteInstallment(id, userId) {
        if (this.jsonMode) {
            this.data.installments = this.data.installments.filter(i => !(i.id === parseInt(id) && i.user_id === userId));
            this.saveJson();
            return;
        }
        const stmt = this.db.prepare('DELETE FROM installments WHERE id = ? AND user_id = ?');
        stmt.run(id, userId);
    }
    
    payInstallment(id, userId) {
        if (this.jsonMode) {
            const i = this.data.installments.find(i => i.id === parseInt(id) && i.user_id === userId);
            if (i) {
                i.paid_count += 1;
                if (i.paid_count >= i.total_count) {
                    i.status = 'completed';
                } else {
                    // Calculate next due date
                    const nextDate = new Date(i.next_due_date);
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    i.next_due_date = nextDate.toISOString().split('T')[0];
                }
                this.saveJson();
            }
            return;
        }
        
        const stmt = this.db.prepare(`
            UPDATE installments 
            SET paid_count = paid_count + 1, 
                status = CASE WHEN paid_count + 1 >= total_count THEN 'completed' ELSE 'active' END,
                next_due_date = DATE(next_due_date, '+1 month')
            WHERE id = ? AND user_id = ?
        `);
        stmt.run(id, userId);
    }
    
    getUpcomingInstallments(userId) {
        if (this.jsonMode) {
            const now = new Date();
            const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            return this.data.installments.filter(i => {
                if (i.user_id !== userId || i.status !== 'active') return false;
                const dueDate = new Date(i.next_due_date);
                return dueDate >= now && dueDate <= threeDaysLater;
            });
        }
        
        const stmt = this.db.prepare(`
            SELECT * FROM installments 
            WHERE user_id = ? AND status = 'active' 
            AND next_due_date BETWEEN DATE('now') AND DATE('now', '+3 days')
        `);
        return stmt.all(userId);
    }
    
    // ==================== NOTIFICATION METHODS ====================
    getNotifications(userId) {
        if (this.jsonMode) {
            return this.data.notifications.filter(n => n.user_id === userId || n.is_global === 1);
        }
        const stmt = this.db.prepare('SELECT * FROM notifications WHERE user_id = ? OR is_global = 1 ORDER BY created_at DESC LIMIT 50');
        return stmt.all(userId);
    }
    
    createNotification(notification) {
        if (this.jsonMode) {
            const id = this.data.notifications.length > 0 ? Math.max(...this.data.notifications.map(n => n.id)) + 1 : 1;
            this.data.notifications.push({
                id,
                ...notification,
                is_read: 0,
                created_at: new Date().toISOString()
            });
            this.saveJson();
            return id;
        }
        
        const stmt = this.db.prepare(`
            INSERT INTO notifications (user_id, title, message, type, is_global) 
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            notification.user_id || null, notification.title, notification.message,
            notification.type, notification.is_global || 0
        );
        return result.lastInsertRowid;
    }
    
    markNotificationRead(id, userId) {
        if (this.jsonMode) {
            const n = this.data.notifications.find(n => n.id === parseInt(id) && (n.user_id === userId || n.is_global === 1));
            if (n) {
                n.is_read = 1;
                this.saveJson();
            }
            return;
        }
        const stmt = this.db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR is_global = 1)');
        stmt.run(id, userId);
    }
    
    // ==================== MARKET ASSET METHODS ====================
    getMarketAssets() {
        if (this.jsonMode) {
            return this.data.market_assets;
        }
        const stmt = this.db.prepare('SELECT * FROM market_assets');
        return stmt.all();
    }
    
    createMarketAsset(asset) {
        if (this.jsonMode) {
            const id = this.data.market_assets.length > 0 ? Math.max(...this.data.market_assets.map(a => a.id)) + 1 : 1;
            this.data.market_assets.push({
                id,
                ...asset,
                created_at: new Date().toISOString()
            });
            this.saveJson();
            return id;
        }
        
        const stmt = this.db.prepare(`
            INSERT INTO market_assets (symbol, name, type, api_key, api_source, enabled) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            asset.symbol, asset.name, asset.type,
            asset.api_key || null, asset.api_source || null, asset.enabled !== undefined ? asset.enabled : 1
        );
        return result.lastInsertRowid;
    }
    
    updateMarketAsset(id, asset) {
        if (this.jsonMode) {
            const a = this.data.market_assets.find(a => a.id === parseInt(id));
            if (a) {
                Object.assign(a, asset);
                this.saveJson();
            }
            return;
        }
        
        const fields = Object.keys(asset).map(k => `${k} = ?`).join(', ');
        const values = Object.values(asset);
        const stmt = this.db.prepare(`UPDATE market_assets SET ${fields} WHERE id = ?`);
        stmt.run(...values, id);
    }
    
    deleteMarketAsset(id) {
        if (this.jsonMode) {
            this.data.market_assets = this.data.market_assets.filter(a => a.id !== parseInt(id));
            this.saveJson();
            return;
        }
        const stmt = this.db.prepare('DELETE FROM market_assets WHERE id = ?');
        stmt.run(id);
    }
    
    // ==================== SETTINGS ====================
    getSettings() {
        if (this.jsonMode) {
            return this.data.settings;
        }
        const stmt = this.db.prepare('SELECT * FROM settings');
        const rows = stmt.all();
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = JSON.parse(row.value);
        });
        return settings;
    }
    
    updateSettings(settings) {
        if (this.jsonMode) {
            this.data.settings = { ...this.data.settings, ...settings };
            this.saveJson();
            return;
        }
        
        Object.entries(settings).forEach(([key, value]) => {
            const stmt = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
            stmt.run(key, JSON.stringify(value));
        });
    }
    
    // ==================== PORTFOLIO TARGET ====================
    getPortfolioTarget(userId) {
        if (this.jsonMode) {
            return this.data.portfolio_targets.find(t => t.user_id === userId);
        }
        const stmt = this.db.prepare('SELECT * FROM portfolio_targets WHERE user_id = ?');
        return stmt.get(userId);
    }
    
    setPortfolioTarget(userId, target) {
        if (this.jsonMode) {
            const existing = this.data.portfolio_targets.findIndex(t => t.user_id === userId);
            if (existing >= 0) {
                this.data.portfolio_targets[existing] = { user_id: userId, ...target };
            } else {
                this.data.portfolio_targets.push({ user_id: userId, ...target });
            }
            this.saveJson();
            return;
        }
        
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO portfolio_targets (user_id, crypto, currency, gold, stock) 
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(userId, target.crypto || 0, target.currency || 0, target.gold || 0, target.stock || 0);
    }
}

module.exports = Database;
