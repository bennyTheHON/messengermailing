import { useState, useEffect } from 'react';
import api from '../api';

export default function Auth() {
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [step, setStep] = useState(1); // 1: Phone, 2: Code, 3: Password (optional)
    const [status, setStatus] = useState('');
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = () => {
        api.get('/telegram/status').then(res => setConnected(res.data.connected));
    }

    const sendCode = async () => {
        try {
            const res = await api.post('/telegram/send-code', { phone });
            if (res.data.status === 'code_sent') {
                setStep(2);
                setStatus('Code sent!');
            }
        } catch (err) {
            setStatus('Error sending code: ' + (err.response?.data?.detail || err.message));
        }
    }

    const login = async () => {
        try {
            const res = await api.post('/telegram/login', { code, password: password || null });
            if (res.data.status === 'success') {
                setStatus('Logged in successfully!');
                setConnected(true);
                setStep(1);
            } else if (res.data.status === '2fa_required') {
                setStep(3);
                setStatus('2FA Password required');
            }
        } catch (err) {
            setStatus('Login failed: ' + (err.response?.data?.detail || err.message));
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-semibold text-white">Telegram Authentication</h1>

            <div className="mt-6 max-w-md">
                <div className="rounded-lg bg-surface p-6 shadow ring-1 ring-white/5">
                    {connected ? (
                        <div className="text-green-400 font-bold text-lg">
                            ✅ Telegram Connected
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {step === 1 && (
                                <>
                                    <label className="block text-sm font-medium text-gray-300">Phone Number (with +)</label>
                                    <input
                                        type="text"
                                        className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="+1234567890"
                                    />
                                    <button
                                        onClick={sendCode}
                                        className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    >
                                        Send Code
                                    </button>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <label className="block text-sm font-medium text-gray-300">Verification Code</label>
                                    <input
                                        type="text"
                                        className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                        value={code}
                                        onChange={e => setCode(e.target.value)}
                                    />
                                    <button
                                        onClick={login}
                                        className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400"
                                    >
                                        Login
                                    </button>
                                </>
                            )}

                            {step === 3 && (
                                <>
                                    <label className="block text-sm font-medium text-gray-300">2FA Password</label>
                                    <input
                                        type="password"
                                        className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button
                                        onClick={login}
                                        className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400"
                                    >
                                        Login with 2FA
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    {status && <p className="mt-4 text-sm text-gray-400">{status}</p>}
                </div>
            </div>
        </div>
    )
}
