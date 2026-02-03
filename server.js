// ==================== SERVER.JS ====================
// نیازی به npm نیست - فقط Node.js نصب باشد

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// Simple SQLite implementation (no npm needed)
const Database = require('./database.js');
const db = new Database('./finance.db');

// Initialize database
db.init();

const PORT = 8080;

// Session storage (in production use Redis)
const sessions = new Map();

// Helper functions
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function getSession(token) {
    return sessions.get(token);
}

function createSession(user) {
    const token = generateToken();
    sessions.set(token, {
        userId: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin === 1,
        createdAt: Date.now()
    });
    return token;
}

function requireAuth(req, res, callback) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = getSession(token);
    
    if (!session) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
    }
    
    callback(session);
}

function requireAdmin(req, res, callback) {
    requireAuth(req, res, (session) => {
        if (!session.isAdmin) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Admin access required' }));
            return;
        }
        callback(session);
    });
}

// API Routes
const apiRoutes = {
    // ==================== AUTH ====================
    'POST /api/register': async (req, res, body) => {
        const { username, email, fullname, password } = JSON.parse(body);
        
        if (!username || !email || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields' }));
            return;
        }
        
        if (!validateEmail(email)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid email format' }));
            return;
        }
        
        // Check if user exists
        const existing = db.getUserByUsername(username) || db.getUserByEmail(email);
        if (existing) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'User already exists' }));
            return;
        }
        
        // Create user
        const userId = db.createUser({
            username,
            email,
            fullname: fullname || username,
            password: hashPassword(password)
        });
        
        const user = db.getUserById(userId);
        const token = createSession(user);
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email,
                fullname: user.fullname 
            } 
        }));
    },
    
    'POST /api/login': async (req, res, body) => {
        const { username, password } = JSON.parse(body);
        
        const user = db.getUserByUsername(username);
        if (!user || user.password !== hashPassword(password)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid credentials' }));
            return;
        }
        
        const token = createSession(user);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            token,
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email,
                fullname: user.fullname,
                isAdmin: user.is_admin === 1
            } 
        }));
    },
    
    'POST /api/logout': async (req, res, body) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        sessions.delete(token);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
    },
    
    'GET /api/me': async (req, res) => {
        requireAuth(req, res, (session) => {
            const user = db.getUserById(session.userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                id: user.id, 
                username: user.username, 
                email: user.email,
                fullname: user.fullname,
                isAdmin: user.is_admin === 1
            }));
        });
    },
    
    // ==================== ASSETS ====================
    'GET /api/assets': async (req, res) => {
        requireAuth(req, res, (session) => {
            const assets = db.getAssetsByUser(session.userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(assets));
        });
    },
    
    'POST /api/assets': async (req, res, body) => {
        requireAuth(req, res, (session) => {
            const asset = JSON.parse(body);
            const id = db.createAsset({
                ...asset,
                user_id: session.userId
            });
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id, ...asset }));
        });
    },
    
    'PUT /api/assets/:id': async (req, res, body, params) => {
        requireAuth(req, res, (session) => {
            const asset = JSON.parse(body);
            db.updateAsset(params.id, asset, session.userId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    'DELETE /api/assets/:id': async (req, res, body, params) => {
        requireAuth(req, res, (session) => {
            db.deleteAsset(params.id, session.userId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    // ==================== TRANSACTIONS ====================
    'GET /api/transactions': async (req, res) => {
        requireAuth(req, res, (session) => {
            const transactions = db.getTransactionsByUser(session.userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(transactions));
        });
    },
    
    'POST /api/transactions': async (req, res, body) => {
        requireAuth(req, res, (session) => {
            const transaction = JSON.parse(body);
            const id = db.createTransaction({
                ...transaction,
                user_id: session.userId
            });
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id, ...transaction }));
        });
    },
    
    'PUT /api/transactions/:id': async (req, res, body, params) => {
        requireAuth(req, res, (session) => {
            const transaction = JSON.parse(body);
            db.updateTransaction(params.id, transaction, session.userId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    'DELETE /api/transactions/:id': async (req, res, body, params) => {
        requireAuth(req, res, (session) => {
            db.deleteTransaction(params.id, session.userId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    // ==================== PROJECTS ====================
    'GET /api/projects': async (req, res) => {
        requireAuth(req, res, (session) => {
            const projects = db.getProjectsByUser(session.userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(projects));
        });
    },
    
    'POST /api/projects': async (req, res, body) => {
        requireAuth(req, res, (session) => {
            const project = JSON.parse(body);
            const id = db.createProject({
                ...project,
                user_id: session.userId
            });
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id, ...project }));
        });
    },
    
    'PUT /api/projects/:id': async (req, res, body, params) => {
        requireAuth(req, res, (session) => {
            const project = JSON.parse(body);
            db.updateProject(params.id, project, session.userId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    'DELETE /api/projects/:id': async (req, res, body, params) => {
        requireAuth(req, res, (session) => {
            db.deleteProject(params.id, session.userId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    // ==================== INSTALLMENTS ====================
    'GET /api/installments': async (req, res) => {
        requireAuth(req, res, (session) => {
            const installments = db.getInstallmentsByUser(session.userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(installments));
        });
    },
    
    'POST /api/installments': async (req, res, body) => {
        requireAuth(req, res, (session) => {
            const installment = JSON.parse(body);
            const id = db.createInstallment({
                ...installment,
                user_id: session.userId
            });
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id, ...installment }));
        });
    },
    
    'PUT /api/installments/:id': async (req, res, body, params) => {
        requireAuth(req, res, (session) => {
            const installment = JSON.parse(body);
            db.updateInstallment(params.id, installment, session.userId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    'DELETE /api/installments/:id': async (req, res, body, params) => {
        requireAuth(req, res, (session) => {
            db.deleteInstallment(params.id, session.userId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    'POST /api/installments/:id/pay': async (req, res, body, params) => {
        requireAuth(req, res, (session) => {
            db.payInstallment(params.id, session.userId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    // ==================== ADMIN ====================
    'GET /api/admin/users': async (req, res) => {
        requireAdmin(req, res, () => {
            const users = db.getAllUsers();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(users.map(u => ({
                id: u.id,
                username: u.username,
                email: u.email,
                fullname: u.fullname,
                is_admin: u.is_admin,
                created_at: u.created_at
            }))));
        });
    },
    
    'PUT /api/admin/users/:id': async (req, res, body, params) => {
        requireAdmin(req, res, () => {
            const updates = JSON.parse(body);
            db.updateUser(params.id, updates);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    'DELETE /api/admin/users/:id': async (req, res, body, params) => {
        requireAdmin(req, res, () => {
            db.deleteUser(params.id);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    'GET /api/admin/market-assets': async (req, res) => {
        requireAdmin(req, res, () => {
            const assets = db.getMarketAssets();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(assets));
        });
    },
    
    'POST /api/admin/market-assets': async (req, res, body) => {
        requireAdmin(req, res, () => {
            const asset = JSON.parse(body);
            const id = db.createMarketAsset(asset);
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id, ...asset }));
        });
    },
    
    'PUT /api/admin/market-assets/:id': async (req, res, body, params) => {
        requireAdmin(req, res, () => {
            const asset = JSON.parse(body);
            db.updateMarketAsset(params.id, asset);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    'DELETE /api/admin/market-assets/:id': async (req, res, body, params) => {
        requireAdmin(req, res, () => {
            db.deleteMarketAsset(params.id);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    'POST /api/admin/broadcast': async (req, res, body) => {
        requireAdmin(req, res, () => {
            const { title, message } = JSON.parse(body);
            const id = db.createNotification({
                title,
                message,
                type: 'admin',
                is_global: 1
            });
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id, success: true }));
        });
    },
    
    'GET /api/admin/settings': async (req, res) => {
        requireAdmin(req, res, () => {
            const settings = db.getSettings();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(settings));
        });
    },
    
    'PUT /api/admin/settings': async (req, res, body) => {
        requireAdmin(req, res, () => {
            const settings = JSON.parse(body);
            db.updateSettings(settings);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    'PUT /api/admin/credentials': async (req, res, body) => {
        requireAdmin(req, res, (session) => {
            const { username, password } = JSON.parse(body);
            
            db.updateAdminCredentials({
                username,
                password: hashPassword(password)
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    // ==================== NOTIFICATIONS ====================
    'GET /api/notifications': async (req, res) => {
        requireAuth(req, res, (session) => {
            const notifications = db.getNotifications(session.userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(notifications));
        });
    },
    
    'POST /api/notifications/mark-read/:id': async (req, res, body, params) => {
        requireAuth(req, res, (session) => {
            db.markNotificationRead(params.id, session.userId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    },
    
    // ==================== PORTFOLIO TARGET ====================
    'GET /api/portfolio-target': async (req, res) => {
        requireAuth(req, res, (session) => {
            const target = db.getPortfolioTarget(session.userId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(target || {}));
        });
    },
    
    'POST /api/portfolio-target': async (req, res, body) => {
        requireAuth(req, res, (session) => {
            const target = JSON.parse(body);
            db.setPortfolioTarget(session.userId, target);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    }
};

// Server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Serve static files
    if (req.method === 'GET' && !pathname.startsWith('/api/')) {
        let filePath = '.' + pathname;
        if (filePath === './') filePath = './index.html';
        
        const extname = path.extname(filePath);
        const contentTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        
        const contentType = contentTypes[extname] || 'application/octet-stream';
        
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code == 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>', 'utf-8');
                } else {
                    res.writeHead(500);
                    res.end('Server Error: ' + error.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
        return;
    }
    
    // API routes
    const routeKey = `${req.method} ${pathname}`;
    
    // Check for exact match
    if (apiRoutes[routeKey]) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            apiRoutes[routeKey](req, res, body);
        });
        return;
    }
    
    // Check for parameterized routes
    for (const [route, handler] of Object.entries(apiRoutes)) {
        const [method, path] = route.split(' ');
        if (method !== req.method) continue;
        
        const pathParts = path.split('/');
        const urlParts = pathname.split('/');
        
        if (pathParts.length !== urlParts.length) continue;
        
        const params = {};
        let matches = true;
        
        for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i].startsWith(':')) {
                params[pathParts[i].substring(1)] = urlParts[i];
            } else if (pathParts[i] !== urlParts[i]) {
                matches = false;
                break;
            }
        }
        
        if (matches) {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                handler(req, res, body, params);
            });
            return;
        }
    }
    
    // Not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found' }));
});

// Check installments daily and send notifications
setInterval(() => {
    const users = db.getAllUsers();
    users.forEach(user => {
        const upcomingInstallments = db.getUpcomingInstallments(user.id);
        upcomingInstallments.forEach(inst => {
            const daysLeft = Math.ceil((new Date(inst.due_date) - new Date()) / (1000 * 60 * 60 * 24));
            
            if (daysLeft <= 3 && daysLeft >= 0) {
                db.createNotification({
                    user_id: user.id,
                    title: 'یادآوری قسط',
                    message: `${daysLeft} روز تا سررسید قسط ${inst.title} (${inst.amount} تومان)`,
                    type: 'installment',
                    is_global: 0
                });
            }
        });
    });
}, 24 * 60 * 60 * 1000); // Daily

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Admin credentials: esyadmin / godMSD1382');
});
