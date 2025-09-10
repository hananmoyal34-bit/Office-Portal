import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { CustomerRecord, FileForUpload, FormState, Status, SortConfig } from '../types';
import { updateRecord, deleteRecord, createRecord } from '../services/apiService';
import CustomerTable from './CustomerTable';
import RecordModal from './RecordModal';
import ConfirmationModal from './ConfirmationModal';
import { PlusIcon } from './icons/PlusIcon';
import Alert from './Alert';
import DetailsModal from './DetailsModal';
import { SearchIcon } from './icons/SearchIcon';
import Tooltip from './Tooltip';
import Pagination from './Pagination';
import { AdjustmentsIcon } from './icons/AdjustmentsIcon';

interface CSHubViewProps {
    records: CustomerRecord[];
    setRecords: React.Dispatch<React.SetStateAction<CustomerRecord[]>>;
    refetchData: () => Promise<void>;
    withSyncStatus: (action: () => Promise<any>) => Promise<any>;
}

const RECORDS_PER_PAGE = 20;
const STATUS_ORDER: (Status | string)[] = ['New', 'In Progress', 'Closed'];

const ALL_CSHUB_HEADERS: { key: keyof CustomerRecord | 'Customer'; label: string }[] = [
    { key: 'Ticket Category', label: 'Category' },
    { key: 'Receipt Number', label: 'Receipt #' },
    { key: 'Customer', label: 'Customer' },
    { key: 'Timestamp', label: 'Submitted On' },
    { key: 'Product', label: 'Product' },
    { key: 'Store Name', label: 'Store' },
    { key: 'TicketID', label: 'Ticket ID' },
];

const DEFAULT_VISIBLE_COLUMNS: (keyof CustomerRecord | 'Customer')[] = [
    'Ticket Category',
    'Receipt Number',
    'Customer',
    'Timestamp'
];

// Helper to map form state back to a partial record for optimistic updates
const mapFormToRecord = (formData: FormState, originalRecord: CustomerRecord): CustomerRecord => {
    const [firstName = '', ...lastNameParts] = formData.fullName.split(' ');
    return {
        ...originalRecord,
        'First Name': firstName,
        'Last Name': lastNameParts.join(' '),
        'Email Address': formData.email,
        'Phone Number': formData.phoneNumber,
        'Ticket Category': formData.formType,
        'Ticket Notes': formData.issueDescription,
        'Date of Transaction': formData.purchaseDate,
        'Receipt Number': formData.invoiceNumber,
        'Purchase Amount': formData.purchaseAmount,
        'Last 4 Digits of Card': formData.last4Digits,
        'Product': formData.product,
        'Store Name': formData.storeOfPurchase,
        Status: formData.status,
        'Office Notes': formData.officeNotes,
    };
}


const CSHubView: React.FC<CSHubViewProps> = ({ records, setRecords, refetchData, withSyncStatus }) => {
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'Timestamp', direction: 'descending' });
    const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
    const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set());
    const [actionTarget, setActionTarget] = useState<{action: string, ticketId: string} | null>(null);

    const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

    const [selectedRecord, setSelectedRecord] = useState<CustomerRecord | null>(null);
    const [recordToDelete, setRecordToDelete] = useState<CustomerRecord | null>(null);
    const [recordToView, setRecordToView] = useState<CustomerRecord | null>(null);

    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<keyof CustomerRecord | 'Customer'>>(new Set(DEFAULT_VISIBLE_COLUMNS));
    const columnSelectorRef = useRef<HTMLDivElement>(null);

    const uniqueStatuses = useMemo(() => {
        const statuses = new Set(records.filter(r => r.Status && r.Status !== 'Closed').map(r => r.Status));
        return Array.from(statuses).sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b));
    }, [records]);

    const uniqueCategories = useMemo(() => {
        return [...new Set(records.map(r => r['Ticket Category']).filter(Boolean))].sort();
    }, [records]);

    const getLocalStorageKey = (tab: 'open' | 'closed') => `cshub-visible-columns-${tab}`;

    useEffect(() => {
        try {
            const saved = localStorage.getItem(getLocalStorageKey(activeTab));
            if (saved) {
                setVisibleColumnKeys(new Set(JSON.parse(saved)));
            } else {
                setVisibleColumnKeys(new Set(DEFAULT_VISIBLE_COLUMNS));
            }
        } catch (e) {
            console.error("Failed to parse visible columns from localStorage", e);
            setVisibleColumnKeys(new Set(DEFAULT_VISIBLE_COLUMNS));
        }
    }, [activeTab]);

    useEffect(() => {
        try {
            localStorage.setItem(getLocalStorageKey(activeTab), JSON.stringify(Array.from(visibleColumnKeys)));
        } catch (e) {
            console.error("Failed to save visible columns to localStorage", e);
        }
    }, [visibleColumnKeys, activeTab]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleColumnVisibilityChange = (key: keyof CustomerRecord | 'Customer') => {
        setVisibleColumnKeys(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const handleAddNew = () => {
        setSelectedRecord(null);
        setIsRecordModalOpen(true);
    };

    const handleEdit = (record: CustomerRecord) => {
        setActionTarget({ action: 'edit', ticketId: record.TicketID });
        setTimeout(() => {
            setSelectedRecord(record);
            setIsRecordModalOpen(true);
            setActionTarget(null);
        }, 100);
    };

    const handleDelete = (record: CustomerRecord) => {
        setRecordToDelete(record);
        setIsDeleteModalOpen(true);
    };

    const handleViewDetails = (record: CustomerRecord) => {
        setActionTarget({ action: 'view', ticketId: record.TicketID });
        setTimeout(() => {
            setRecordToView(record);
            setIsDetailsModalOpen(true);
            setActionTarget(null);
        }, 100);
    };
    
    const handleToggleCollapse = useCallback((status: string) => {
        setCollapsedStatuses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(status)) {
                newSet.delete(status);
            } else {
                newSet.add(status);
            }
            return newSet;
        });
    }, []);

    const handleSort = (key: keyof CustomerRecord | 'Customer') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const handleStatusChange = async (ticketId: string, status: Status | string) => {
        const originalRecords = [...records];
        const recordToUpdate = originalRecords.find(r => r.TicketID === ticketId);
        if (!recordToUpdate) return;
        
        const updatedRecord = { ...recordToUpdate, Status: status };
        
        // Optimistic UI update
        setRecords(prev => prev.map(r => r.TicketID === ticketId ? updatedRecord : r));
        
        const formData: FormState = {
            fullName: `${recordToUpdate['First Name'] || ''} ${recordToUpdate['Last Name'] || ''}`.trim(),
            email: recordToUpdate['Email Address'] || '',
            phoneNumber: recordToUpdate['Phone Number'] || '',
            formType: recordToUpdate['Ticket Category'] || '',
            issueDescription: recordToUpdate['Ticket Notes'] || '',
            purchaseDate: recordToUpdate['Date of Transaction'] || '',
            invoiceNumber: recordToUpdate['Receipt Number'] || '',
            purchaseAmount: recordToUpdate['Purchase Amount'] || '',
            last4Digits: recordToUpdate['Last 4 Digits of Card'] || '',
            product: recordToUpdate['Product'] || '',
            storeOfPurchase: recordToUpdate['Store Name'] || '',
            officeNotes: recordToUpdate['Office Notes'] || '',
            status,
            ticketId: recordToUpdate.TicketID,
            receipt: recordToUpdate['Receipt File'] || '', file1: recordToUpdate['File 1'] || '',
            file2: recordToUpdate['File 2'] || '', file3: recordToUpdate['File 3'] || '', file4: recordToUpdate['File 4'] || '',
        };
        
        const updateAction = async () => {
            await updateRecord(formData, []);
            await refetchData();
        };

        try {
            await withSyncStatus(updateAction);
        } catch (err) {
            setRecords(originalRecords); // Revert on failure
        }
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;

        const originalRecords = [...records];
        const ticketIdToDelete = recordToDelete.TicketID;

        // Optimistic UI update
        setRecords(prevRecords => prevRecords.filter(r => r.TicketID !== ticketIdToDelete));
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);
        
        const deleteAction = async () => {
            await deleteRecord(ticketIdToDelete);
            await refetchData();
        };

        try {
            await withSyncStatus(deleteAction);
        } catch (err) {
            setRecords(originalRecords); // Revert on failure
        }
    };
    
    const handleSave = async (formData: FormState, files: FileForUpload[]) => {
        setIsSubmitting(true);
        setIsRecordModalOpen(false);
        
        if (selectedRecord) { // --- UPDATE ---
            const originalRecords = [...records];
            const updatedRecord = mapFormToRecord(formData, selectedRecord);
            
            setRecords(prev => prev.map(r => r.TicketID === selectedRecord.TicketID ? updatedRecord : r));
            setSelectedRecord(null);

            const updateAction = async () => {
                await updateRecord({ ...formData, ticketId: selectedRecord.TicketID }, files);
                await refetchData();
            };

            try {
                await withSyncStatus(updateAction);
            } catch (err) {
                setRecords(originalRecords); // Revert on failure
            } finally {
                setIsSubmitting(false);
            }
        } else { // --- CREATE ---
            const createAction = async () => {
                await createRecord(formData, files);
                await refetchData();
            };

            try {
                await withSyncStatus(createAction);
            } catch (err) {
                // No optimistic UI to revert, error is handled by status bar
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
     const handleTabChange = (tab: 'open' | 'closed') => {
        setActiveTab(tab);
        setCurrentPage(1);
        setStatusFilter('all');
        setCategoryFilter('all');
    };

    const processedRecords = useMemo(() => {
        // 0. Filter by tab
        const tabFiltered = records.filter(record => {
            if (activeTab === 'open') {
                return record.Status !== 'Closed';
            }
            return record.Status === 'Closed';
        });

        // 1. Filter by status and category
        const advancedFiltered = tabFiltered.filter(record => {
            const statusMatch = activeTab === 'closed' || statusFilter === 'all' || record.Status === statusFilter;
            const categoryMatch = categoryFilter === 'all' || record['Ticket Category'] === categoryFilter;
            return statusMatch && categoryMatch;
        });

        // 2. Filter by search
        const searchFiltered = advancedFiltered.filter(record => {
            const query = searchQuery.toLowerCase();
            const fullName = `${record['First Name'] || ''} ${record['Last Name'] || ''}`.toLowerCase();
            const email = (record['Email Address'] || '').toLowerCase();
            const ticketId = (record.TicketID || '').toLowerCase();
            return fullName.includes(query) || email.includes(query) || ticketId.includes(query);
        });

        // 3. Sort & Group
        searchFiltered.sort((a, b) => {
            // Primary sort: Group by Status
            const statusA = STATUS_ORDER.indexOf(a.Status);
            const statusB = STATUS_ORDER.indexOf(b.Status);
            if (statusA !== statusB) {
                return statusA - statusB;
            }

            // Secondary sort: by selected column
            const { key, direction } = sortConfig;
            let aValue: string | number, bValue: string | number;

            if (key === 'Customer') {
                aValue = `${a['First Name'] || ''} ${a['Last Name'] || ''}`.trim().toLowerCase();
                bValue = `${b['First Name'] || ''} ${b['Last Name'] || ''}`.trim().toLowerCase();
            } else if (key === 'Timestamp') {
                aValue = a.Timestamp ? new Date(a.Timestamp).getTime() : 0;
                bValue = b.Timestamp ? new Date(b.Timestamp).getTime() : 0;
            } else {
                aValue = a[key]?.toLowerCase() || '';
                bValue = b[key]?.toLowerCase() || '';
            }

            if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return searchFiltered;
    }, [records, searchQuery, sortConfig, activeTab, statusFilter, categoryFilter]);

    const paginatedRecords = useMemo(() => {
        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        return processedRecords.slice(startIndex, startIndex + RECORDS_PER_PAGE);
    }, [processedRecords, currentPage]);

    const totalPages = Math.ceil(processedRecords.length / RECORDS_PER_PAGE);

    return (
        <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <h1 className="text-4xl font-bold text-on-surface text-center md:text-left w-full md:w-auto">Customer Service Hub</h1>
                 <div className="flex w-full md:w-auto md:flex-grow max-w-lg items-center gap-2">
                     <div className="relative flex-grow">
                         <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <SearchIcon />
                         </div>
                         <input
                            type="search"
                            placeholder="Search by Ticket ID, Name, or Email..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color text-on-surface rounded-lg focus:ring-primary focus:border-primary"
                         />
                     </div>
                     <div className="relative" ref={columnSelectorRef}>
                        <Tooltip text="Manage Columns">
                             <button onClick={() => setIsColumnSelectorOpen(prev => !prev)} className="h-full px-3 py-2 text-sm font-medium text-on-surface-secondary bg-surface border border-border-color rounded-lg flex items-center gap-1 hover:bg-gray-100">
                                 <AdjustmentsIcon />
                             </button>
                        </Tooltip>
                        {isColumnSelectorOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                                <div className="p-2 font-semibold text-sm border-b">Show Columns</div>
                                <div className="p-2 max-h-60 overflow-y-auto">
                                    {ALL_CSHUB_HEADERS.map(header => (
                                        <label key={String(header.key)} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-md cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={visibleColumnKeys.has(header.key)}
                                                onChange={() => handleColumnVisibilityChange(header.key)}
                                            />
                                            <span className="text-sm text-gray-700 select-none">{header.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
                <Tooltip text="Create a new customer ticket">
                    <button
                        onClick={handleAddNew}
                        className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
                    >
                        <PlusIcon />
                        Add New Record
                    </button>
                </Tooltip>
            </header>

            <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-gray-50 rounded-lg border border-border-color items-center">
                <span className="font-semibold text-on-surface-secondary text-sm flex-shrink-0">Filters:</span>
                <div className="flex items-center gap-4 w-full flex-wrap">
                    {activeTab === 'open' && (
                        <div className="flex-1 min-w-[150px]">
                            <label htmlFor="statusFilter" className="sr-only">Filter by Status</label>
                            <select
                                id="statusFilter"
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-3 pr-8 py-2 bg-surface border border-border-color text-on-surface rounded-lg focus:ring-primary focus:border-primary text-sm"
                                aria-label="Filter by Status"
                            >
                                <option value="all">All Statuses</option>
                                {uniqueStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex-1 min-w-[150px]">
                        <label htmlFor="categoryFilter" className="sr-only">Filter by Category</label>
                        <select
                            id="categoryFilter"
                            value={categoryFilter}
                            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-3 pr-8 py-2 bg-surface border border-border-color text-on-surface rounded-lg focus:ring-primary focus:border-primary text-sm"
                            aria-label="Filter by Category"
                        >
                            <option value="all">All Categories</option>
                            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {error && <Alert message={error} type="error" onClose={() => setError(null)} />}

             <div className="mb-4 border-b border-border-color">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => handleTabChange('open')}
                        className={`${activeTab === 'open' ? 'border-primary text-primary' : 'border-transparent text-on-surface-secondary hover:text-on-surface hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none`}
                        aria-current={activeTab === 'open' ? 'page' : undefined}
                    >
                        Open Tickets
                    </button>
                    <button
                        onClick={() => handleTabChange('closed')}
                        className={`${activeTab === 'closed' ? 'border-primary text-primary' : 'border-transparent text-on-surface-secondary hover:text-on-surface hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none`}
                         aria-current={activeTab === 'closed' ? 'page' : undefined}
                    >
                        Closed Tickets
                    </button>
                </nav>
            </div>

            <main className="bg-surface rounded-xl shadow-lg">
                <CustomerTable 
                    records={paginatedRecords} 
                    searchQuery={searchQuery}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                    onViewDetails={handleViewDetails}
                    onStatusChange={handleStatusChange}
                    isClosedTab={activeTab === 'closed'}
                    collapsedStatuses={collapsedStatuses}
                    onToggleCollapse={handleToggleCollapse}
                    actionTarget={actionTarget}
                    allHeaders={ALL_CSHUB_HEADERS}
                    visibleColumnKeys={visibleColumnKeys}
                />
                {totalPages > 1 && (
                    <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}
            </main>

            {isRecordModalOpen && (
                <RecordModal
                    isOpen={isRecordModalOpen}
                    onClose={() => setIsRecordModalOpen(false)}
                    onSave={handleSave}
                    record={selectedRecord}
                />
            )}

            {isDetailsModalOpen && recordToView && (
                <DetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    record={recordToView}
                />
            )}

            {isDeleteModalOpen && recordToDelete && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Record"
                    message={`Are you sure you want to delete Ticket ${recordToDelete.TicketID}? This action cannot be undone.`}
                    variant="danger"
                    confirmText="Delete"
                />
            )}
        </>
    );
};

export default CSHubView;