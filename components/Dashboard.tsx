import React, { useState, useEffect, useCallback, useRef } from 'react';
import CSHubView from './CSHubView';
import AccountsView from './AccountsView';
import TasksView from './TasksView';
import DirectoryView from './DirectoryView';
import FinancingLedgerView from './FinancingLedgerView';
import { UsersIcon } from './icons/UsersIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import * as api from '../services/apiService';
import type { User, CustomerRecord, Account, Task, Contact, FinancingRecord } from '../types';
import Spinner from './Spinner';
import StatusBar from './StatusBar';

type View = 'csHub' | 'accounts' | 'tasks' | 'directory' | 'financing';

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

const roleViews: Record<User['Role'], View[]> = {
    'Office': ['csHub', 'financing'],
    'Accounting': ['accounts', 'tasks', 'directory'],
};

interface SyncState {
    pending: number;
    status: 'idle' | 'syncing' | 'success' | 'error';
    message: string;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
    const [activeView, setActiveView] = useState<View | null>(null);
    
    const [csHubRecords, setCsHubRecords] = useState<CustomerRecord[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [financingRecords, setFinancingRecords] = useState<FinancingRecord[]>([]);
    
    const [isLoading, setIsLoading] = useState<Partial<Record<View, boolean>>>({});
    const [error, setError] = useState<Partial<Record<View, string | null>>>({});
    const [fetchedViews, setFetchedViews] = useState<Set<View>>(new Set());
    
    const [syncState, setSyncState] = useState<SyncState>({ pending: 0, status: 'idle', message: '' });
    const syncTimeoutRef = useRef<number | null>(null);

    const availableViews = roleViews[user.Role] || [];

    useEffect(() => {
        if (availableViews.length > 0 && !activeView) {
            setActiveView(availableViews[0]);
        }
    }, [user.Role, availableViews, activeView]);

    const fetchCSHubData = useCallback(async () => {
        setCsHubRecords(await api.getAllRecords());
    }, []);

    const fetchAccountsData = useCallback(async () => {
        setAccounts(await api.getAccounts());
    }, []);

    const fetchTasksData = useCallback(async () => {
        setTasks(await api.getTasks());
    }, []);

    const fetchDirectoryData = useCallback(async () => {
        setContacts(await api.getDirectory());
    }, []);
    
    const fetchFinancingData = useCallback(async () => {
        setFinancingRecords(await api.getFinancingLedger());
    }, []);

    useEffect(() => {
        if (!activeView || fetchedViews.has(activeView) || isLoading[activeView]) {
            return;
        }

        const fetchDataForView = async (view: View) => {
            setIsLoading(prev => ({ ...prev, [view]: true }));
            setError(prev => ({ ...prev, [view]: null }));

            try {
                switch (view) {
                    case 'csHub':
                        await fetchCSHubData();
                        break;
                    case 'accounts':
                        await fetchAccountsData();
                        break;
                    case 'tasks':
                        await fetchTasksData();
                        break;
                    case 'directory':
                        await fetchDirectoryData();
                        break;
                    case 'financing':
                        await fetchFinancingData();
                        break;
                }
                setFetchedViews(prev => new Set(prev).add(view));
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                setError(prev => ({ ...prev, [view]: `Failed to load data: ${message}` }));
            } finally {
                setIsLoading(prev => ({ ...prev, [view]: false }));
            }
        };

        fetchDataForView(activeView);
    }, [activeView, fetchedViews, isLoading, fetchCSHubData, fetchAccountsData, fetchTasksData, fetchDirectoryData, fetchFinancingData]);


    useEffect(() => {
        if (syncState.status === 'success' || syncState.status === 'error') {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = window.setTimeout(() => {
                setSyncState(prev => ({ ...prev, status: 'idle', message: '' }));
            }, 4000);
        }
        return () => {
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [syncState.status]);

    const withSyncStatus = useCallback(async (action: () => Promise<any>) => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        setSyncState(prev => ({
            pending: prev.pending + 1,
            status: 'syncing',
            message: `Saving ${prev.pending + 1} change${prev.pending + 1 > 1 ? 's' : ''}...`
        }));

        try {
            await action();
            setSyncState(prev => {
                const newPending = prev.pending - 1;
                if (newPending === 0) {
                    return { pending: 0, status: 'success', message: 'All changes saved.' };
                }
                return {
                    pending: newPending,
                    status: 'syncing',
                    message: `Saving ${newPending} change${newPending > 1 ? 's' : ''}...`
                };
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Update failed.';
            setSyncState(prev => ({
                pending: prev.pending - 1,
                status: 'error',
                message: errorMessage
            }));
            throw err;
        }
    }, []);


    const NavButton: React.FC<{ label: string; view: View; icon: React.ReactNode; }> = ({ label, view, icon }) => {
        const isActive = activeView === view;
        return (
            <button
                onClick={() => setActiveView(view)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                    isActive
                        ? 'bg-primary text-white'
                        : 'text-on-surface-secondary hover:bg-gray-200'
                }`}
                aria-current={isActive ? 'page' : undefined}
            >
                {icon}
                {label}
            </button>
        );
    };

    const renderContent = () => {
        if (!activeView) {
            return (
                <div className="flex flex-col justify-center items-center h-[60vh]">
                    <Spinner size="lg" />
                    <p className="mt-4 text-on-surface-secondary text-lg">Loading Application...</p>
                </div>
            );
        }

        if (isLoading[activeView]) {
            return (
                <div className="flex flex-col justify-center items-center h-[60vh]">
                    <Spinner size="lg" />
                    <p className="mt-4 text-on-surface-secondary text-lg">Loading {activeView} Data...</p>
                </div>
            );
        }
        if (error[activeView]) {
            const refetch = () => {
                setFetchedViews(prev => {
                    const newSet = new Set(prev);
                    if(activeView) newSet.delete(activeView);
                    return newSet;
                });
            };

            return (
                <div className="text-center py-10 px-4 bg-red-50 text-red-700 rounded-lg">
                    <h2 className="text-xl font-bold mb-2">Failed to Load Data</h2>
                    <p>{error[activeView]}</p>
                    <button onClick={refetch} className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover">
                        Try Again
                    </button>
                </div>
            );
        }

        switch (activeView) {
            case 'csHub':
                return <CSHubView records={csHubRecords} setRecords={setCsHubRecords} refetchData={fetchCSHubData} withSyncStatus={withSyncStatus} />;
            case 'accounts':
                return <AccountsView accounts={accounts} setAccounts={setAccounts} refetchData={fetchAccountsData} withSyncStatus={withSyncStatus} />;
            case 'tasks':
                return <TasksView tasks={tasks} setTasks={setTasks} accounts={accounts} contacts={contacts} refetchData={fetchTasksData} withSyncStatus={withSyncStatus} />;
            case 'directory':
                return <DirectoryView contacts={contacts} setContacts={setContacts} refetchData={fetchDirectoryData} withSyncStatus={withSyncStatus} />;
            case 'financing':
                return <FinancingLedgerView records={financingRecords} setRecords={setFinancingRecords} refetchData={fetchFinancingData} withSyncStatus={withSyncStatus} />;
            default:
                return <div className="text-center p-8 text-on-surface-secondary">Please select a view from the navigation bar.</div>;
        }
    }

    return (
        <div className="bg-background min-h-screen text-on-surface font-sans">
            <div className="container mx-auto p-4 md:p-8">
                <header className="mb-6 bg-surface p-3 rounded-xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
                    <nav className="flex items-center gap-2 flex-wrap">
                        {availableViews.includes('csHub') && <NavButton label="CS Hub" view="csHub" icon={<UsersIcon />} />}
                        {availableViews.includes('financing') && <NavButton label="Financing" view="financing" icon={<CreditCardIcon />} />}
                        {availableViews.includes('accounts') && <NavButton label="Accounts" view="accounts" icon={<BriefcaseIcon />} />}
                        {availableViews.includes('tasks') && <NavButton label="Tasks" view="tasks" icon={<ClipboardListIcon />} />}
                        {availableViews.includes('directory') && <NavButton label="Directory" view="directory" icon={<UserCircleIcon />} />}
                    </nav>
                     <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-on-surface">{user.Name}</p>
                            <p className="text-xs text-on-surface-secondary">{user.Role}</p>
                        </div>
                        <button 
                            onClick={onLogout} 
                            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main>
                    {renderContent()}
                </main>
            </div>
            <StatusBar status={syncState.status} message={syncState.message} />
        </div>
    );
};

export default Dashboard;