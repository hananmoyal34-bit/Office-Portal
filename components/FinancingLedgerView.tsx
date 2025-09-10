import React, { useState, useMemo } from 'react';
import { FinancingRecord, FileForUpload, FinancingFormState, AgreementStatus } from '../types';
import { addFinancingRecord, updateFinancingRecord, deleteFinancingRecord } from '../services/apiService';
import { PlusIcon } from './icons/PlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import Alert from './Alert';
import Pagination from './Pagination';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ViewIcon } from './icons/ViewIcon';
import { formatCurrency, formatDateToMDY } from '../utils/formatting';
import FinancingRecordModal from './FinancingRecordModal';
import FinancingDetailsModal from './FinancingDetailsModal';
import ConfirmationModal from './ConfirmationModal';
import { SortIcon } from './icons/SortIcon';

interface FinancingLedgerViewProps {
    records: FinancingRecord[];
    setRecords: React.Dispatch<React.SetStateAction<FinancingRecord[]>>;
    refetchData: () => Promise<void>;
    withSyncStatus: (action: () => Promise<any>) => Promise<any>;
}

const RECORDS_PER_PAGE = 20;
const STATUS_OPTIONS: AgreementStatus[] = ['Active', 'Paid Off', 'On Hold', 'Default'];

type SortKey = 'customer_name' | 'sale_date' | 'total_sale_amount' | 'total_amount_paid' | 'current_balance_due';
type SortConfig = { key: SortKey; direction: 'ascending' | 'descending' };

const getStatusClass = (status: string) => {
    const baseStyles = "w-full text-left px-2 py-1 text-xs font-semibold rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary border";
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus === 'active') return `${baseStyles} bg-blue-100 text-blue-800 border-blue-300`;
    if (lowerStatus === 'paid off') return `${baseStyles} bg-green-100 text-green-800 border-green-300`;
    if (lowerStatus === 'on hold') return `${baseStyles} bg-yellow-100 text-yellow-800 border-yellow-300`;
    if (lowerStatus === 'default') return `${baseStyles} bg-red-100 text-red-800 border-red-300`;
    return `${baseStyles} bg-gray-100 text-gray-700 border-gray-300`;
};

const FinancingLedgerView: React.FC<FinancingLedgerViewProps> = ({ records, setRecords, refetchData, withSyncStatus }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'customer_name', direction: 'ascending' });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [selectedRecord, setSelectedRecord] = useState<FinancingRecord | null>(null);
    
    const handleSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const filteredRecords = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let filtered = records;

        if (query) {
             filtered = records.filter(r =>
                r.customer_name?.toLowerCase().includes(query) ||
                r.customer_email?.toLowerCase().includes(query) ||
                r.receipt_number?.toLowerCase().includes(query) ||
                r.finance_id?.toLowerCase().includes(query)
            );
        }
        
        return [...filtered].sort((a, b) => {
            const { key, direction } = sortConfig;
            const aValue = a[key];
            const bValue = b[key];
            const dir = direction === 'ascending' ? 1 : -1;

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return (aValue - bValue) * dir;
            }
            return String(aValue).localeCompare(String(bValue)) * dir;
        });
    }, [records, searchQuery, sortConfig]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        return filteredRecords.slice(startIndex, startIndex + RECORDS_PER_PAGE);
    }, [filteredRecords, currentPage]);

    const totalPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE);

    const openAddModal = () => {
        setSelectedRecord(null);
        setIsModalOpen(true);
    };
    const openEditModal = (record: FinancingRecord) => {
        setSelectedRecord(record);
        setIsModalOpen(true);
    };
    const openDetailsModal = (record: FinancingRecord) => {
        setSelectedRecord(record);
        setIsDetailsModalOpen(true);
    };
    const openDeleteModal = (record: FinancingRecord) => {
        setSelectedRecord(record);
        setIsDeleteModalOpen(true);
    };

    const handleSave = async (formData: FinancingFormState, files: FileForUpload[]) => {
        setIsSubmitting(true);
        setIsModalOpen(false);

        if (selectedRecord) { // --- UPDATE ---
            const originalRecords = [...records];
            const updatedRecord = { ...selectedRecord, ...formData };
            setRecords(prev => prev.map(r => r.finance_id === updatedRecord.finance_id ? updatedRecord : r));
            
            const updateAction = async () => {
                await updateFinancingRecord(updatedRecord, files);
                await refetchData();
            };
            
            try {
                await withSyncStatus(updateAction);
            } catch (err) {
                setRecords(originalRecords); // Revert
            }
        } else { // --- CREATE ---
            const createAction = async () => {
                await addFinancingRecord(formData, files);
                await refetchData();
            };
             try {
                await withSyncStatus(createAction);
            } catch (err) {
                // Error handled by status bar
            }
        }
        setIsSubmitting(false);
    };
    
    const handleStatusChange = async (record: FinancingRecord, newStatus: string) => {
        const originalRecords = [...records];
        const updatedRecord = { ...record, agreement_status: newStatus };
        
        setRecords(prev => prev.map(r => r.finance_id === record.finance_id ? updatedRecord : r));
        
        const statusUpdateAction = async () => {
            await updateFinancingRecord(updatedRecord, []);
            await refetchData();
        };

        try {
            await withSyncStatus(statusUpdateAction);
        } catch (err) {
            setRecords(originalRecords); // Revert
        }
    }

    const handleDelete = async () => {
        if (!selectedRecord) return;
        
        const originalRecords = [...records];
        const recordIdToDelete = selectedRecord.finance_id;

        setRecords(prev => prev.filter(r => r.finance_id !== recordIdToDelete));
        setIsDeleteModalOpen(false);
        
        const deleteAction = async () => {
            await deleteFinancingRecord(recordIdToDelete);
            await refetchData();
        };

        try {
            await withSyncStatus(deleteAction);
        } catch (err) {
            setRecords(originalRecords); // Revert
        }
    };
    
    const SortableHeader: React.FC<{ label: string; sortKey: SortKey }> = ({ label, sortKey }) => {
        const isSorting = sortConfig.key === sortKey;
        return (
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort(sortKey)}>
                <div className="flex items-center gap-1">
                    {label}
                    <SortIcon direction={isSorting ? sortConfig.direction : 'none'} />
                </div>
            </th>
        );
    };

    return (
        <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-4xl font-bold text-on-surface">Financing Ledger</h1>
                <div className="relative flex-grow max-w-lg">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon /></div>
                    <input type="search" placeholder="Search by Name, Email, Receipt..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                           className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color text-on-surface rounded-lg focus:ring-primary focus:border-primary" />
                </div>
                <button onClick={openAddModal} className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                    <PlusIcon /> Add Agreement
                </button>
            </header>
            
            {error && <Alert message={error} type="error" onClose={() => setError(null)} />}

            <main className="bg-surface rounded-xl shadow-lg">
                <div className="md:hidden p-2 space-y-3">
                    {paginatedRecords.map(rec => (
                        <div key={rec.finance_id} className="bg-surface border border-border-color rounded-lg p-4 shadow-sm" onClick={() => openDetailsModal(rec)}>
                            <p className="font-bold text-on-surface text-lg">{rec.customer_name}</p>
                            <p className="text-sm text-on-surface-secondary">ID: {rec.finance_id}</p>
                            <p className="text-sm text-on-surface-secondary">Balance: <span className="font-semibold text-on-surface">{formatCurrency(rec.current_balance_due)}</span></p>
                            <div className="flex flex-col sm:flex-row items-center gap-4 mt-3" onClick={e => e.stopPropagation()}>
                                <select value={rec.agreement_status} onChange={e => handleStatusChange(rec, e.target.value)} className={getStatusClass(rec.agreement_status)} disabled={isSubmitting}>
                                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <div className="flex items-center justify-end gap-4 w-full sm:w-auto">
                                    <button onClick={() => openDetailsModal(rec)} className="text-emerald-500 hover:text-emerald-700" aria-label="View"><ViewIcon /></button>
                                    <button onClick={() => openEditModal(rec)} className="text-sky-500 hover:text-sky-700" aria-label="Edit"><PencilIcon className="h-5 w-5"/></button>
                                    <button onClick={() => openDeleteModal(rec)} className="text-red-500 hover:text-red-700" aria-label="Delete"><TrashIcon className="h-5 w-5"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-on-surface-secondary">
                        <thead className="text-xs text-on-surface uppercase bg-gray-50">
                            <tr>
                                <SortableHeader label="Customer" sortKey="customer_name" />
                                <SortableHeader label="Sale Date" sortKey="sale_date" />
                                <SortableHeader label="Total Sale" sortKey="total_sale_amount" />
                                <SortableHeader label="Amount Paid" sortKey="total_amount_paid" />
                                <SortableHeader label="Balance Due" sortKey="current_balance_due" />
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRecords.map(rec => (
                                <tr key={rec.finance_id} onClick={() => openDetailsModal(rec)} className="bg-white border-b hover:bg-gray-50 cursor-pointer">
                                    <th scope="row" className="px-6 py-4 font-medium text-on-surface whitespace-nowrap">
                                        <div>{rec.customer_name}</div>
                                        <div className="text-xs text-on-surface-secondary">{rec.customer_email}</div>
                                    </th>
                                    <td className="px-6 py-4">{formatDateToMDY(rec.sale_date)}</td>
                                    <td className="px-6 py-4">{formatCurrency(rec.total_sale_amount)}</td>
                                    <td className="px-6 py-4">{formatCurrency(rec.total_amount_paid)}</td>
                                    <td className="px-6 py-4 font-semibold text-on-surface">{formatCurrency(rec.current_balance_due)}</td>
                                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                        <select value={rec.agreement_status} onChange={e => handleStatusChange(rec, e.target.value)} className={getStatusClass(rec.agreement_status)} disabled={isSubmitting}>
                                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => openEditModal(rec)} className="text-sky-500 hover:text-sky-700" aria-label="Edit"><PencilIcon className="h-5 w-5"/></button>
                                            <button onClick={() => openDeleteModal(rec)} className="text-red-500 hover:text-red-700" aria-label="Delete"><TrashIcon className="h-5 w-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </main>

            {isModalOpen && (
                <FinancingRecordModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    record={selectedRecord}
                />
            )}
             {isDetailsModalOpen && selectedRecord && (
                <FinancingDetailsModal 
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    record={selectedRecord}
                />
            )}
            {isDeleteModalOpen && selectedRecord && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDelete}
                    title="Delete Agreement"
                    message={`Are you sure you want to delete the financing agreement for ${selectedRecord.customer_name}?`}
                    isConfirming={isSubmitting}
                />
            )}
        </>
    );
};

export default FinancingLedgerView;