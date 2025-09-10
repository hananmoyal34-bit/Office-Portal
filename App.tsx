import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import * as api from './services/apiService';
import type { User } from './types';
import Spinner from './components/Spinner';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(true);

    useEffect(() => {
        try {
            const savedUser = sessionStorage.getItem('currentUser');
            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }
        } catch (error) {
            console.error("Failed to parse user from session storage", error);
            sessionStorage.removeItem('currentUser');
        } finally {
            setIsAuthenticating(false);
        }
    }, []);

    const handleLogin = useCallback(async (accessCode: string, role: 'Office' | 'Accounting'): Promise<void> => {
        const loggedInUser = await api.loginUser(accessCode, role);
        if (loggedInUser && loggedInUser.UserID) {
            setUser(loggedInUser);
            sessionStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        } else {
            throw new Error("Login failed: No user data returned.");
        }
    }, []);
    
    const handleLogout = useCallback(() => {
        setUser(null);
        sessionStorage.removeItem('currentUser');
    }, []);

    if (isAuthenticating) {
        return (
            <div className="bg-background min-h-screen flex flex-col justify-center items-center">
                <Spinner size="lg" />
                <p className="mt-4 text-on-surface-secondary text-lg">Loading Application...</p>
            </div>
        );
    }
    
    return (
        <>
            {user ? (
                <Dashboard user={user} onLogout={handleLogout} />
            ) : (
                <LoginPage onLogin={handleLogin} />
            )}
        </>
    );
};

export default App;