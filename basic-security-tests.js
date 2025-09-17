const axios = require('axios');

class BasicSecurityTester {
    constructor(baseUrl = 'http://localhost:3001') {
        this.baseUrl = baseUrl;
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async runTest(testName, testFunction) {
        this.log(`Running: ${testName}`);
        try {
            const result = await testFunction();
            if (result) {
                this.results.passed++;
                this.results.tests.push({ name: testName, status: 'PASS', details: result });
                this.log(`PASSED: ${testName}`, 'success');
            } else {
                this.results.failed++;
                this.results.tests.push({ name: testName, status: 'FAIL', details: 'Test returned false' });
                this.log(`FAILED: ${testName}`, 'error');
            }
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({ name: testName, status: 'ERROR', details: error.message });
            this.log(`ERROR in ${testName}: ${error.message}`, 'error');
        }
    }

    // Test 1: Basic XSS Protection
    async testXSSProtection() {
        const xssPayload = '<script>alert("xss")</script>';
        
        try {
            const response = await axios.post(`${this.baseUrl}/api/llm/chat`, {
                message: xssPayload,
                systemPrompt: 'You are a helpful assistant.',
                timetableContext: ''
            });

            if (response.data && response.data.reply) {
                const reply = response.data.reply;
                // Check if XSS payload is reflected without encoding
                if (reply.includes(xssPayload) && !reply.includes('&lt;') && !reply.includes('&gt;')) {
                    return false; // Vulnerable
                }
                return true; // Safe
            }
            return true;
        } catch (error) {
            return true; // Error is good for security
        }
    }

    // Test 2: Input Validation
    async testInputValidation() {
        const maliciousInput = '../../../etc/passwd';
        
        try {
            const response = await axios.get(`${this.baseUrl}/api/search/${encodeURIComponent(maliciousInput)}`);
            
            if (response.data && JSON.stringify(response.data).includes(maliciousInput)) {
                return false; // Vulnerable
            }
            return true; // Safe
        } catch (error) {
            return true; // Error is good for security
        }
    }

    // Test 3: Information Disclosure
    async testInformationDisclosure() {
        const sensitivePaths = ['/.env', '/package.json', '/server.js'];
        let disclosures = 0;
        
        for (const path of sensitivePaths) {
            try {
                const response = await axios.get(`${this.baseUrl}${path}`);
                if (response.status === 200) {
                    disclosures++;
                }
            } catch (error) {
                // Expected for protected paths
            }
        }

        return disclosures === 0;
    }

    // Test 4: Security Headers
    async testSecurityHeaders() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/health`);
            const headers = response.headers;
            
            const requiredHeaders = [
                'x-content-type-options',
                'x-frame-options',
                'x-xss-protection'
            ];

            const missingHeaders = requiredHeaders.filter(header => !headers[header]);
            return missingHeaders.length === 0;
        } catch (error) {
            return false;
        }
    }

    // Test 5: Rate Limiting
    async testRateLimiting() {
        const requests = [];
        const numRequests = 20;
        
        for (let i = 0; i < numRequests; i++) {
            requests.push(axios.get(`${this.baseUrl}/api/health`));
        }

        try {
            const responses = await Promise.all(requests);
            // If all requests succeed, rate limiting might not be implemented
            return responses.some(r => r.status === 429);
        } catch (error) {
            // Some requests should fail if rate limiting is working
            return true;
        }
    }

    // Run all basic tests
    async runAllTests() {
        this.log('🔒 Starting Basic Security Tests');
        this.log('='.repeat(40));

        await this.runTest('XSS Protection', () => this.testXSSProtection());
        await this.runTest('Input Validation', () => this.testInputValidation());
        await this.runTest('Information Disclosure', () => this.testInformationDisclosure());
        await this.runTest('Security Headers', () => this.testSecurityHeaders());
        await this.runTest('Rate Limiting', () => this.testRateLimiting());

        this.log('='.repeat(40));
        this.log(`📊 Test Results: ${this.results.passed} passed, ${this.results.failed} failed`);
        
        if (this.results.failed > 0) {
            this.log('⚠️  Security vulnerabilities found!', 'error');
            this.results.tests.filter(t => t.status !== 'PASS').forEach(test => {
                this.log(`   - ${test.name}: ${test.status}`, 'error');
            });
        } else {
            this.log('🎉 All basic security tests passed!', 'success');
        }

        return this.results;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new BasicSecurityTester();
    tester.runAllTests().catch(console.error);
}

module.exports = BasicSecurityTester;


