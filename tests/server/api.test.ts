import request from 'supertest';
import { app } from '../../server/index.js';
import { describe, it, expect } from 'vitest';

describe('Backend API', () => {
    it('GET /api/health should return 200', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    const testUser = `testuser_${Date.now()}`;
    const testPass = 'password123';
    let token = '';

    it('POST /api/auth/register should create user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: testUser, password: testPass });
        
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });

    it('POST /api/auth/login should return token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: testUser, password: testPass });
        
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        token = res.body.token;
    });

    it('GET /api/auth/verify should validate token', async () => {
        const res = await request(app)
            .get('/api/auth/verify')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.username).toBe(testUser);
    });

    it('GET /api/projects should list projects', async () => {
        const res = await request(app)
            .get('/api/projects')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
