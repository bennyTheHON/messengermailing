import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api';

export default function Login() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authAPI.login(username, password, twoFactorRequired ? twoFactorCode : null);
            localStorage.setItem('token', response.data.access_token);
            navigate('/');
        } catch (err) {
            if (err.response?.status === 403 && err.response?.data?.detail === "2FA_REQUIRED") {
                setTwoFactorRequired(true);
                setError(t('enter2FACode'));
            } else {
                setError(err.response?.data?.detail || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-blue-500">messenger2mail</h1>
                    <p className="text-slate-400 mt-2">{t('login')}</p>
                    <p className="text-xs text-slate-500 mt-1">{t('sessionTimeout')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className={`px-4 py-3 rounded text-sm ${twoFactorRequired ? 'bg-blue-900/20 border border-blue-800 text-blue-400' : 'bg-red-900/20 border border-red-800 text-red-400'}`}>
                            {error}
                        </div>
                    )}

                    {!twoFactorRequired ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    {t('username')}
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    {t('password')}
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {t('twoFactorAuth')}
                            </label>
                            <input
                                type="text"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value)}
                                placeholder="123456"
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-center text-2xl tracking-widest"
                                required
                                autoFocus
                                maxLength="6"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? t('loading') : (twoFactorRequired ? t('verifyCode') : t('login'))}
                    </button>
                </form>
            </div>
        </div>
    );
}
