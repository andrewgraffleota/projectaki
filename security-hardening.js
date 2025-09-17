const fs = require('fs');
const path = require('path');

class SecurityHardening {
    constructor() {
        this.hardeningSteps = [];
        this.appliedFixes = [];
    }

    log(message, type = 'info') {
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} ${message}`);
    }

    // Add security headers middleware
    addSecurityHeaders() {
        const middlewareCode = `
// Security Headers Middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    next();
});
`;
        this.hardeningSteps.push({
            name: 'Security Headers',
            description: 'Add security headers to prevent XSS, clickjacking, and other attacks',
            code: middlewareCode,
            location: 'After app.use(express.json())'
        });
    }

    // Add input validation
    addInputValidation() {
        const validationCode = `
// Input Validation Middleware
const validateInput = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str.replace(/[<>\"'&]/g, (match) => {
            const escapeMap = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return escapeMap[match];
        });
    };

    // Sanitize request body
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        });
    }

    // Sanitize query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        });
    }

    next();
};

app.use(validateInput);
`;
        this.hardeningSteps.push({
            name: 'Input Validation',
            description: 'Add input sanitization to prevent XSS and injection attacks',
            code: validationCode,
            location: 'After security headers middleware'
        });
    }

    // Add rate limiting
    addRateLimiting() {
        const rateLimitCode = `
// Rate Limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Stricter rate limiting for LLM endpoint
const llmLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 LLM requests per minute
    message: 'Too many LLM requests, please try again later.',
});

app.use('/api/llm/', llmLimiter);
`;
        this.hardeningSteps.push({
            name: 'Rate Limiting',
            description: 'Add rate limiting to prevent DoS attacks',
            code: rateLimitCode,
            location: 'After input validation middleware',
            dependencies: ['express-rate-limit']
        });
    }

    // Add CORS configuration
    addCORSConfiguration() {
        const corsCode = `
// CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        
        // Add your production domains here
        const allowedOrigins = [
            'https://yourdomain.com',
            'https://www.yourdomain.com'
        ];
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
`;
        this.hardeningSteps.push({
            name: 'CORS Configuration',
            description: 'Configure CORS to restrict cross-origin requests',
            code: corsCode,
            location: 'Replace app.use(cors())'
        });
    }

    // Add request logging
    addRequestLogging() {
        const loggingCode = `
// Request Logging
const morgan = require('morgan');

app.use(morgan('combined', {
    skip: function (req, res) { return res.statusCode < 400 }
}));
`;
        this.hardeningSteps.push({
            name: 'Request Logging',
            description: 'Add request logging for security monitoring',
            code: loggingCode,
            location: 'After rate limiting middleware',
            dependencies: ['morgan']
        });
    }

    // Add error handling
    addErrorHandling() {
        const errorHandlingCode = `
// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    } else {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Not found' 
    });
});
`;
        this.hardeningSteps.push({
            name: 'Error Handling',
            description: 'Add proper error handling to prevent information disclosure',
            code: errorHandlingCode,
            location: 'At the end of middleware setup'
        });
    }

    // Generate hardening report
    generateReport() {
        this.log('🔒 Security Hardening Report');
        this.log('='.repeat(50));
        
        this.hardeningSteps.forEach((step, index) => {
            this.log(`\n${index + 1}. ${step.name}`);
            this.log(`   Description: ${step.description}`);
            this.log(`   Location: ${step.location}`);
            if (step.dependencies) {
                this.log(`   Dependencies: ${step.dependencies.join(', ')}`);
            }
        });

        this.log('\n📋 Implementation Steps:');
        this.log('1. Install required dependencies:');
        this.log('   npm install express-rate-limit morgan');
        
        this.log('\n2. Add the middleware code to your server.js file');
        this.log('3. Test each security measure');
        this.log('4. Run security tests to verify improvements');

        return this.hardeningSteps;
    }

    // Apply all hardening measures
    applyAllHardening() {
        this.addSecurityHeaders();
        this.addInputValidation();
        this.addRateLimiting();
        this.addCORSConfiguration();
        this.addRequestLogging();
        this.addErrorHandling();
        
        return this.generateReport();
    }
}

// Run if executed directly
if (require.main === module) {
    const hardening = new SecurityHardening();
    hardening.applyAllHardening();
}

module.exports = SecurityHardening;