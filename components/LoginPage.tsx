import React, { useState } from 'react';
import Spinner from './Spinner';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ClipboardTextIcon } from './icons/ClipboardTextIcon';

interface LoginPageProps {
    onLogin: (accessCode: string, role: 'Office' | 'Accounting') => Promise<void>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [loginType, setLoginType] = useState<'Office' | 'Accounting' | null>(null);
    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessCode.trim()) {
            setError('Please enter your access code.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            if (loginType) {
                await onLogin(accessCode, loginType);
            } else {
                throw new Error("Please select a portal type.");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            if (errorMessage.includes("Invalid access code")) {
                 setError("Invalid access code for the selected portal. Please try again.");
            } else {
                 setError(errorMessage);
            }
            setIsLoading(false);
        }
    };

    const PortalCard: React.FC<{
        type: 'Office' | 'Accounting';
        icon: React.ReactNode;
        description: string;
        onClick: () => void;
        iconBgClass?: string;
    }> = ({ type, icon, description, onClick, iconBgClass = 'bg-indigo-100' }) => (
        <div
            onClick={onClick}
            className="bg-white rounded-2xl shadow-lg p-8 text-center w-full max-w-sm cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border border-gray-100"
        >
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${iconBgClass}`}>
                {icon}
            </div>
            <h2 className="mt-6 text-xl font-bold text-gray-800">{type} Portal</h2>
            <p className="mt-2 text-base text-gray-600">{description}</p>
        </div>
    );

    const renderSelection = () => (
        <div className="w-full">
            <div className="text-center mb-12">
                <h1 className="text-5xl md:text-6xl font-bold">
                    <span className="text-purple-600">Inv</span><span className="text-gray-900">Sys</span>
                </h1>
                <p className="text-gray-600 mt-3 text-lg">Your Modern Retail Inventory System</p>
            </div>
            <div className="flex flex-col md:flex-row flex-wrap items-center justify-center gap-8">
                <PortalCard
                    type="Office"
                    icon={<ClipboardTextIcon className="h-8 w-8 text-orange-600" />}
                    description="Access CS Hub and Financing modules for customer-facing operations."
                    onClick={() => setLoginType('Office')}
                    iconBgClass="bg-orange-100"
                />
                <PortalCard
                    type="Accounting"
                    icon={<CalculatorIcon />}
                    description="Manage Accounts, Tasks, and the Directory for backend operations."
                    onClick={() => setLoginType('Accounting')}
                />
            </div>
        </div>
    );

    const renderForm = () => {
        const portalDetails = {
            Office: {
                icon: <ClipboardTextIcon className="h-8 w-8 text-orange-600" />,
                iconBgClass: 'bg-orange-100',
                description: "Enter your Office access code to continue."
            },
            Accounting: {
                icon: <CalculatorIcon />,
                iconBgClass: 'bg-indigo-100',
                description: "Enter your Accounting access code to continue."
            }
        };
        const details = portalDetails[loginType!];

        return (
             <div className="w-full max-w-md mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 animate-fade-in relative">
                <button 
                    onClick={() => {
                        setLoginType(null);
                        setError('');
                    }}
                    className="absolute top-4 left-4 text-sm text-gray-600 hover:text-primary font-semibold flex items-center gap-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back
                </button>
                <div className="text-center">
                     <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${details.iconBgClass} mb-4`}>
                        {details.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">{loginType} Portal</h2>
                    <p className="text-gray-600 mt-2">{details.description}</p>
                </div>
                <form onSubmit={handleSignIn} className="mt-8">
                    <div>
                        <label htmlFor="accessCode" className="sr-only">Access Code</label>
                        <input
                            id="accessCode"
                            type="password"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                            placeholder="Enter your access code"
                            autoFocus
                        />
                    </div>
                    
                    {error && <p className="text-red-600 text-sm mt-4 text-center">{error}</p>}
                    
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                        {isLoading ? <Spinner size="sm" /> : 'Sign In'}
                    </button>
                </form>
            </div>
        );
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-screen flex items-center justify-center p-4 font-sans">
            {loginType ? renderForm() : renderSelection()}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.4s ease-out forwards;
                }
                body {
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }
            `}</style>
        </div>
    );
};

export default LoginPage;