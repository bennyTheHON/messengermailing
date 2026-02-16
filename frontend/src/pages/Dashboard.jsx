import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAPI } from '../api';
import {
    UsersIcon,
    AdjustmentsHorizontalIcon,
    ChatBubbleLeftRightIcon,
    ShieldCheckIcon,
    SignalIcon,
    CheckBadgeIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
    const { t } = useTranslation();
    const [stats, setStats] = useState({
        accounts_count: 0,
        rules_count: 0,
        messages_processed: 0,
        telegram_connected: false,
        active_rules: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const res = await adminAPI.getStats();
            setStats(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, []);

    const cards = [
        {
            name: t('accounts'),
            value: stats.accounts_count,
            icon: UsersIcon,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            sub: stats.telegram_connected ? t('messengerStatus') + ': ' + t('connected') : t('messengerStatus') + ': ' + t('disconnected')
        },
        {
            name: t('routingRules'),
            value: stats.rules_count,
            icon: AdjustmentsHorizontalIcon,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            sub: `${stats.active_rules} ${t('active')}`
        },
        {
            name: t('messagesProcessed'),
            value: stats.messages_processed,
            icon: ChatBubbleLeftRightIcon,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            sub: t('realTimeForwarding')
        }
    ];

    if (loading) return <div className="animate-pulse flex items-center justify-center min-h-[400px] text-gray-400 font-bold">{t('loading')}...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t('dashboard')}</h1>
                    <p className="mt-2 text-sm text-gray-500">System overview and real-time performance metrics.</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${stats.telegram_connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                        {stats.telegram_connected ? t('systemActive') : t('systemIdle')}
                    </span>
                </div>
            </div>

            {/* System Overview / Explanation */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-500/5 border border-gray-100 p-8 md:p-12 relative overflow-hidden group">
                <div className="relative z-10 max-w-3xl">
                    <span className="inline-block px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-widest mb-6">
                        System Status: {stats.telegram_connected ? t('online') : t('offline')}
                    </span>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 leading-tight">
                        {t('dashboardTitle')}
                    </h2>
                    <p className="text-lg text-gray-500 font-medium leading-relaxed mb-8">
                        {t('dashboardDesc')}
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <div className="px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('accounts')}</p>
                            <p className="text-2xl font-black text-gray-900">{stats.accounts_count}</p>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('processedMessages')}</p>
                            <p className="text-2xl font-black text-blue-600">{stats.messages_processed}</p>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('activeRules')}</p>
                            <p className="text-2xl font-black text-emerald-600">{stats.active_rules}</p>
                        </div>
                    </div>
                </div>

                <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-blue-50/50 to-transparent hidden lg:block"></div>
                <UsersIcon className="absolute -bottom-12 -right-12 h-96 w-96 text-blue-50/50 rotate-12 group-hover:scale-105 transition-transform duration-700" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {cards.map((item) => (
                        <div key={item.name} className="relative group overflow-hidden rounded-[2rem] bg-white p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                            <div className={`p-4 rounded-2xl inline-block ${item.bg} ${item.color} mb-6`}>
                                <item.icon className="h-8 w-8" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{item.name}</span>
                                <span className="text-4xl font-black text-gray-900">{item.value}</span>
                            </div>
                            <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400">{item.sub}</span>
                                <div className={`h-1 w-12 rounded-full ${item.bg.replace('50', '200')}`}></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Status Side Panel */}
                <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${stats.telegram_connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                <SignalIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest opacity-50">{t('connection')}</p>
                                <p className={`text-lg font-bold ${stats.telegram_connected ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {stats.telegram_connected ? t('connected') : t('disconnected')}
                                </p>
                            </div>
                        </div>

                        <div className="h-px bg-white/10"></div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-400">{t('serviceStatus')}</span>
                                <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">Healthy</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-400">{t('uptime')}</span>
                                <span className="text-sm font-mono text-white">99.9%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-400">{t('version')}</span>
                                <span className="text-sm font-mono text-blue-400">v2.1.0</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-8">
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">
                            System is running normally. All forwarding rules are active and monitoring for new messages.
                        </p>
                    </div>

                    <ShieldCheckIcon className="absolute -top-10 -right-10 h-64 w-64 text-white/5 rotate-12" />
                </div>
            </div>
        </div>
    );
}
