import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const LoginPage: React.FC = () => {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

        try {
            const response = await axios.post(endpoint, { username, password });
            if (isRegister) {
                // Auto login after register? Or just switch to login
                setIsRegister(false);
                setError('注册成功，请登录 (Registration successful, please login)');
            } else {
                const { token, username: user } = response.data;
                login(user, token);
                navigate('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Operation failed');
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100vh', background: '#f3f4f6', fontFamily: 'system-ui'
        }}>
            <div style={{
                background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                width: '100%', maxWidth: '400px'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#111827' }}>
                    {isRegister ? '注册 (Register)' : '登录 (Login)'}
                </h2>

                {error && <div style={{
                    background: '#fee2e2', color: '#b91c1c', padding: '0.75rem',
                    borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem'
                }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                            用户名 (Username)
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                            密码 (Password)
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button type="submit" style={{
                        background: '#4f46e5', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '4px',
                        fontWeight: 500, cursor: 'pointer', marginTop: '0.5rem'
                    }}>
                        {isRegister ? '注册' : '登录'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                    {isRegister ? '已有账号? ' : '没有账号? '}
                    <button
                        onClick={() => { setIsRegister(!isRegister); setError(''); }}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontWeight: 500 }}
                    >
                        {isRegister ? '去登录' : '去注册'}
                    </button>
                </div>
            </div>
        </div>
    );
};
