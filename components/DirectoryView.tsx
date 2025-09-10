import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Contact, ContactFormState } from '../types';
import { addContact, updateContact, deleteContact } from '../services/apiService';
import { PlusIcon } from './icons/PlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import Alert from './Alert';
import Modal from './Modal';
import ConfirmationModal from './ConfirmationModal';
import Pagination from './Pagination';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ViewIcon } from './icons/ViewIcon';
import { AdjustmentsIcon } from './icons/AdjustmentsIcon';
import ContactDetailsModal from './ContactDetailsModal';
import { SortIcon } from './icons/SortIcon';

interface DirectoryViewProps {
    contacts: Contact[];
    setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
    refetchData: () => Promise<void>;
    withSyncStatus: (action: () => Promise<any>) => Promise<any>;
}

const RECORDS_PER_PAGE = 15;
const STATUS_OPTIONS = ['Active', 'Inactive', 'Lead', 'Do Not Contact'];
type DirectoryColumnKey = keyof Contact | 'FullName' | 'ContactInfo';

interface DirectorySortConfig {
    key: DirectoryColumnKey;
    direction: 'ascending' | 'descending';
}

const ALL_DIRECTORY_HEADERS: { key: DirectoryColumnKey; label: string }[] = [
    { key: 'FullName', label: 'Name' },
    { key: 'Company/Organization', label: 'Company' },
    { key: 'ContactInfo', label: 'Contact Info' },
    { key: 'Status', label: 'Status' },
    { key: 'Job Title', label: 'Title' },
    { key: 'Department', label: 'Department' },
    { key: 'Address', label: 'Address' },
    { key: 'ContactID', label: 'Contact ID' },
];

const DEFAULT_VISIBLE_DIRECTORY_COLUMNS: DirectoryColumnKey[] = ['FullName', 'Company/Organization', 'ContactInfo', 'Status'];

const getStatusSelectClass = (status: string) => {
    const baseStyles = "w-full text-left px-2 py-1 text-xs font-semibold rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary border";
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus === 'active') return `${baseStyles} bg-green-100 text-green-800 border-green-300`;
    if (lowerStatus === 'inactive' || lowerStatus === 'do not contact') return `${baseStyles} bg-red-100 text-red-800 border-red-300`;
    if (lowerStatus === 'lead') return `${baseStyles} bg-blue-100 text-blue-800 border-blue-300`;
    return `${baseStyles} bg-gray-100 text-gray-700 border-gray-300`;
};


const DirectoryView: React.FC<DirectoryViewProps> = ({ contacts, setContacts, refetchData, withSyncStatus }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<DirectorySortConfig>({ key: 'FullName', direction: 'ascending' });
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [formState, setFormState] = useState<ContactFormState>({} as ContactFormState);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({});
    
    const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<DirectoryColumnKey>>(new Set(DEFAULT_VISIBLE_DIRECTORY_COLUMNS));
    const columnSelectorRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        try {
            const saved = localStorage.getItem('directory-visible-columns');
            if (saved) {
                setVisibleColumnKeys(new Set(JSON.parse(saved)));
            }
        } catch (e) { console.error("Failed to parse visible columns from localStorage", e); }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('directory-visible-columns', JSON.stringify(Array.from(visibleColumnKeys)));
        } catch (e) { console.error("Failed to save visible columns to localStorage", e); }
    }, [visibleColumnKeys]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
                setIsColumnSelectorOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const emptyForm: ContactFormState = {
        'First Name': '', 'Last Name': '', 'Phone Number': '', 'Email Address': '',
        Address: '', 'Company/Organization': '', 'Job Title': '', Department: '',
        Status: 'Active', Notes: '',
    };

    const handleSort = (key: DirectoryColumnKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const filteredContacts = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let filtered = contacts;
        if (query) {
             filtered = contacts.filter(c => 
                `${c['First Name']} ${c['Last Name']}`.toLowerCase().includes(query) ||
                c['Email Address']?.toLowerCase().includes(query) ||
                c['Company/Organization']?.toLowerCase().includes(query)
            );
        }

        return [...filtered].sort((a, b) => {
            const { key, direction } = sortConfig;
            let aValue: string | undefined, bValue: string | undefined;

            if (key === 'FullName') {
                aValue = `${a['First Name']} ${a['Last Name']}`.toLowerCase();
                bValue = `${b['First Name']} ${b['Last Name']}`.toLowerCase();
            } else if (key === 'ContactInfo') {
                aValue = a['Email Address']?.toLowerCase();
                bValue = b['Email Address']?.toLowerCase();
            } else {
                aValue = a[key as keyof Contact]?.toLowerCase();
                bValue = b[key as keyof Contact]?.toLowerCase();
            }

            aValue = aValue || '';
            bValue = bValue || '';

            if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [contacts, searchQuery, sortConfig]);

    const paginatedContacts = useMemo(() => {
        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        return filteredContacts.slice(startIndex, startIndex + RECORDS_PER_PAGE);
    }, [filteredContacts, currentPage]);
    
    const totalPages = Math.ceil(filteredContacts.length / RECORDS_PER_PAGE);

    const openAddModal = () => {
        setSelectedContact(null);
        setFormState(emptyForm);
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (contact: Contact) => {
        setSelectedContact(contact);
        const { ContactID, 'Created On': _, ...editableFields } = contact;
        setFormState(editableFields);
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openDetailsModal = (contact: Contact) => {
        setSelectedContact(contact);
        setIsDetailsModalOpen(true);
    };

    const openDeleteModal = (contact: Contact) => {
        setSelectedContact(contact);
        setIsDeleteModalOpen(true);
    };

    const validateForm = () => {
        const errors: Partial<Record<keyof ContactFormState, string>> = {};
        if (!formState['First Name']?.trim()) errors['First Name'] = 'First Name is required.';
        if (!formState['Last Name']?.trim()) errors['Last Name'] = 'Last Name is required.';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        setIsModalOpen(false);

        if (selectedContact) { // --- UPDATE ---
            const originalContacts = [...contacts];
            const updatedContact = { ...selectedContact, ...formState };
            setContacts(prev => prev.map(c => c.ContactID === updatedContact.ContactID ? updatedContact : c));
            
            const updateAction = async () => {
                await updateContact(updatedContact);
                await refetchData();
            };

            try {
                await withSyncStatus(updateAction);
            } catch (err) {
                setContacts(originalContacts); // Revert
            }
        } else { // --- CREATE ---
            const createAction = async () => {
                await addContact(formState);
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
    
    const handleStatusChange = async (contact: Contact, newStatus: string) => {
        const originalContacts = [...contacts];
        const updatedContact = { ...contact, Status: newStatus };
        
        setContacts(prev => prev.map(c => c.ContactID === contact.ContactID ? updatedContact : c));
        
        const statusUpdateAction = async () => {
            await updateContact(updatedContact);
            await refetchData();
        };

        try {
            await withSyncStatus(statusUpdateAction);
        } catch(err) {
             setContacts(originalContacts); // Revert
        }
    }

    const handleDelete = async () => {
        if (!selectedContact) return;
        
        const originalContacts = [...contacts];
        const contactIdToDelete = selectedContact.ContactID;
        
        setContacts(prev => prev.filter(c => c.ContactID !== contactIdToDelete));
        setIsDeleteModalOpen(false);
        
        const deleteAction = async () => {
            await deleteContact(contactIdToDelete);
            await refetchData();
        };

        try {
            await withSyncStatus(deleteAction);
        } catch (err) {
            setContacts(originalContacts); // Revert
        }
    };
    
    const visibleHeaders = ALL_DIRECTORY_HEADERS.filter(h => visibleColumnKeys.has(h.key));
    
    const getCellContent = (contact: Contact, key: DirectoryColumnKey) => {
        switch (key) {
            case 'FullName': return <div className="font-semibold text-on-surface">{`${contact['First Name']} ${contact['Last Name']}`}</div>;
            case 'ContactInfo': return (<>
                <div className="font-medium text-on-surface">{contact['Email Address']}</div>
                <div className="text-sm text-on-surface-secondary">{contact['Phone Number']}</div>
            </>);
            case 'Status':
                return (
                     <select value={contact.Status || ''} onChange={e => handleStatusChange(contact, e.target.value)} disabled={isSubmitting}
                        className={getStatusSelectClass(contact.Status)}>
                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            default: return contact[key as keyof Contact];
        }
    };

    const SortableHeader: React.FC<{ title: string; sortKey: DirectoryColumnKey; }> = ({ title, sortKey }) => {
        const isSorting = sortConfig.key === sortKey;
        return (
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort(sortKey)}>
                <div className="flex items-center gap-1">
                    {title}
                    <SortIcon direction={isSorting ? sortConfig.direction : 'none'} />
                </div>
            </th>
        );
    };

    return (
        <>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-4xl font-bold text-on-surface">Directory</h1>
                <div className="flex w-full md:w-auto md:flex-grow max-w-lg items-center gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon /></div>
                        <input
                           type="search"
                           placeholder="Search by Name, Email, or Company..."
                           value={searchQuery}
                           onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                           className="w-full pl-10 pr-4 py-2 bg-surface border border-border-color text-on-surface rounded-lg focus:ring-primary focus:border-primary"
                        />
                    </div>
                     <div className="relative" ref={columnSelectorRef}>
                         <button onClick={() => setIsColumnSelectorOpen(prev => !prev)} className="h-full px-3 py-2 text-sm font-medium text-on-surface-secondary bg-surface border border-border-color rounded-lg flex items-center gap-1 hover:bg-gray-100">
                             <AdjustmentsIcon />
                         </button>
                        {isColumnSelectorOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                                <div className="p-2 font-semibold text-sm border-b">Show Columns</div>
                                <div className="p-2">
                                    {ALL_DIRECTORY_HEADERS.map(header => (
                                        <label key={header.key} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded-md cursor-pointer">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={visibleColumnKeys.has(header.key)} onChange={() => setVisibleColumnKeys(prev => {
                                                    const newSet = new Set(prev);
                                                    if (newSet.has(header.key)) newSet.delete(header.key);
                                                    else newSet.add(header.key);
                                                    return newSet;
                                                })} />
                                            <span className="text-sm text-gray-700">{header.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={openAddModal} className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                    <PlusIcon /> Add Contact
                </button>
            </header>
            
            {error && <Alert message={error} type="error" onClose={() => setError(null)} />}

            <main className="bg-surface rounded-xl shadow-lg">
                <div className="md:hidden p-2 space-y-3">
                    {paginatedContacts.map(contact => (
                        <div key={contact.ContactID} className="bg-surface border border-border-color rounded-lg p-4 shadow-sm" onClick={() => openDetailsModal(contact)}>
                            <div className="mb-3">
                                <p className="font-bold text-on-surface text-lg">{`${contact['First Name']} ${contact['Last Name']}`}</p>
                                <p className="text-sm text-on-surface-secondary">{contact['Company/Organization'] || 'No Company'}</p>
                                <p className="text-xs text-on-surface-secondary truncate">{contact['Email Address']}</p>
                            </div>
                             <div className="flex flex-col sm:flex-row items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                <div className="w-full sm:flex-1">
                                    <select
                                        value={contact.Status}
                                        onChange={(e) => handleStatusChange(contact, e.target.value)}
                                        className={getStatusSelectClass(contact.Status)}
                                        aria-label={`Status for ${contact['First Name']}`}
                                    >
                                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center justify-end gap-4 w-full sm:w-auto">
                                    <button onClick={() => openDetailsModal(contact)} className="text-emerald-500 hover:text-emerald-700" aria-label="View Details"><ViewIcon /></button>
                                    <button onClick={() => openEditModal(contact)} className="text-sky-500 hover:text-sky-700" aria-label="Edit"><PencilIcon className="h-5 w-5"/></button>
                                    <button onClick={() => openDeleteModal(contact)} className="text-red-500 hover:text-red-700" aria-label="Delete"><TrashIcon className="h-5 w-5"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left text-on-surface-secondary">
                        <thead className="text-xs text-on-surface uppercase bg-gray-50">
                            <tr>
                                {visibleHeaders.map(h => <SortableHeader key={h.key} title={h.label} sortKey={h.key} />)}
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedContacts.map(contact => (
                                <tr key={contact.ContactID} onClick={() => openDetailsModal(contact)} className="odd:bg-white even:bg-gray-50/70 border-b hover:bg-indigo-50 cursor-pointer">
                                    {visibleHeaders.map(h => (
                                        <td key={h.key} className="px-6 py-4" onClick={e => ['SELECT'].includes((e.target as HTMLElement).tagName) && e.stopPropagation()}>
                                            {getCellContent(contact, h.key)}
                                        </td>
                                    ))}
                                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => openEditModal(contact)} className="text-sky-500 hover:text-sky-700"><PencilIcon className="h-5 w-5"/></button>
                                            <button onClick={() => openDeleteModal(contact)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                )}
            </main>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedContact ? 'Edit Contact' : 'Add New Contact'} size="2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(emptyForm).map(key => {
                        const fieldKey = key as keyof ContactFormState;
                        const error = formErrors[fieldKey];
                        const isRequired = ['First Name', 'Last Name'].includes(fieldKey);
                        return (
                            <div key={fieldKey} className={['Address', 'Notes'].includes(fieldKey) ? 'md:col-span-2' : ''}>
                                <label className="block text-sm font-medium text-gray-700">{fieldKey}{isRequired && <span className="text-red-500">*</span>}</label>
                                {fieldKey === 'Status' ? (
                                    <select value={formState.Status || ''} onChange={e => setFormState(prev => ({...prev, Status: e.target.value}))}
                                        className={`mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}>
                                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={formState[fieldKey] || ''}
                                        onChange={e => setFormState(prev => ({...prev, [fieldKey]: e.target.value}))}
                                        className={`mt-1 block w-full px-3 py-2 bg-white border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md text-sm shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                                    />
                                )}
                                {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                            </div>
                        )
                    })}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-gray-200 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-primary rounded-md" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                </div>
            </Modal>
            
            {selectedContact && (
                <ContactDetailsModal 
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    contact={selectedContact}
                />
            )}

            {selectedContact && (
                <ConfirmationModal 
                    isOpen={isDeleteModalOpen} 
                    onClose={() => setIsDeleteModalOpen(false)} 
                    onConfirm={handleDelete}
                    title="Delete Contact"
                    message={`Are you sure you want to delete ${selectedContact['First Name']} ${selectedContact['Last Name']}? This cannot be undone.`}
                    isConfirming={isSubmitting}
                />
            )}
        </>
    );
};

export default DirectoryView;