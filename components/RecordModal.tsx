import React, { useState, useEffect, useMemo } from 'react';
import type { CustomerRecord, FileForUpload, FormState } from '../types';
import Spinner from './Spinner';
import Tooltip from './Tooltip';
import ConfirmationModal from './ConfirmationModal';

interface RecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: FormState, files: FileForUpload[]) => void;
    record: CustomerRecord | null;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const getInitialFormData = (record: CustomerRecord | null): FormState => {
    if (record) {
        return {
            fullName: `${record['First Name'] || ''} ${record['Last Name'] || ''}`.trim(),
            email: record['Email Address'] || '',
            phoneNumber: record['Phone Number'] || '',
            formType: record['Ticket Category'] || 'General Inquiry',
            issueDescription: record['Ticket Notes'] || '',
            purchaseDate: record['Date of Transaction'] || '',
            invoiceNumber: record['Receipt Number'] || '',
            purchaseAmount: record['Purchase Amount'] || '',
            last4Digits: record['Last 4 Digits of Card'] || '',
            product: record['Product'] || '',
            storeOfPurchase: record['Store Name'] || '',
            status: record.Status || 'New',
            officeNotes: record['Office Notes'] || '',
            receipt: record['Receipt File'] || '',
            file1: record['File 1'] || '',
            file2: record['File 2'] || '',
            file3: record['File 3'] || '',
            file4: record['File 4'] || '',
        };
    }
    return {
        fullName: '', email: '', phoneNumber: '', formType: 'General Inquiry',
        issueDescription: '', purchaseDate: '', invoiceNumber: '', purchaseAmount: '',
        last4Digits: '', product: '', storeOfPurchase: '', status: 'New', officeNotes: ''
    };
};

const RecordModal: React.FC<RecordModalProps> = ({ isOpen, onClose, onSave, record }) => {
    const [formData, setFormData] = useState<FormState>(() => getInitialFormData(record));
    const [initialFormData, setInitialFormData] = useState<FormState>(() => getInitialFormData(record));
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [fileKeys, setFileKeys] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [draftExists, setDraftExists] = useState(false);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

    const draftKey = useMemo(() => (record ? `cs-hub-draft-${record.TicketID}` : 'cs-hub-draft-new'), [record]);

    const isDirty = useMemo(() => {
        return JSON.stringify(initialFormData) !== JSON.stringify(formData) || filesToUpload.length > 0;
    }, [formData, initialFormData, filesToUpload]);

    useEffect(() => {
        const initialData = getInitialFormData(record);
        setFormData(initialData);
        setInitialFormData(initialData);
        setFilesToUpload([]);
        setFileKeys({});
    }, [record]);

    useEffect(() => {
        if (isOpen) {
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                setDraftExists(true);
            }
        } else {
            setDraftExists(false); // Reset on close
        }
    }, [isOpen, draftKey]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = setTimeout(() => {
            // Only save if it's not the pristine initial state
            if(JSON.stringify(formData) !== JSON.stringify(initialFormData)) {
                 localStorage.setItem(draftKey, JSON.stringify(formData));
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [formData, initialFormData, draftKey, isOpen]);

    const handleRestoreDraft = () => {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
            try {
                const draftData = JSON.parse(savedDraft);
                setFormData(draftData);
                setInitialFormData(draftData); // Set initial state to restored draft
                setDraftExists(false);
            } catch (e) {
                console.error("Failed to parse draft", e);
                localStorage.removeItem(draftKey);
                setDraftExists(false);
            }
        }
    };

    const handleDismissDraft = () => {
        localStorage.removeItem(draftKey);
        setDraftExists(false);
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            const file = files[0];
            setFilesToUpload(prev => [...prev.filter(f => fileKeys[f.name] !== name), file]);
            setFileKeys(prev => ({ ...prev, [file.name]: name }));
        }
    };

    const handleAttemptSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isDirty) {
            // No changes, do nothing or provide feedback
            return;
        }
        setIsSaveConfirmOpen(true);
    };

    const executeSave = async () => {
        setIsSaveConfirmOpen(false);
        setIsSaving(true);
        const uploadedFiles: FileForUpload[] = await Promise.all(
            filesToUpload.map(async (file) => {
                const base64Data = await fileToBase64(file);
                return {
                    key: fileKeys[file.name],
                    filename: file.name,
                    mimeType: file.type,
                    data: base64Data
                };
            })
        );
        onSave(formData, uploadedFiles);
        localStorage.removeItem(draftKey);
        // isSaving will be set to false by the parent component's flow
    };
    
    // This effect ensures isSaving is reset if the parent component errors out and doesn't close the modal
    useEffect(() => {
        if (!isOpen) {
            setIsSaving(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const InputField: React.FC<{ name: keyof FormState; label: string; tooltip?: string; type?: string; required?: boolean }> = ({ name, label, tooltip, type = 'text', required = false }) => (
        <div>
            <label htmlFor={name} className="block mb-2 text-sm font-medium text-on-surface-secondary">
                <Tooltip text={tooltip || label}>{label}</Tooltip>
            </label>
            <input type={type} id={name} name={name} value={formData[name] || ''} onChange={handleChange} required={required} className="bg-gray-50 border border-border-color text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5" />
        </div>
    );
    
    const FileInputField: React.FC<{ name: string; label: string }> = ({ name, label }) => (
        <div>
            <label htmlFor={name} className="block mb-2 text-sm font-medium text-on-surface-secondary">{label}</label>
            {record && formData[name] && <a href={formData[name]} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mb-2 block truncate">View current file</a>}
            <input type="file" id={name} name={name} onChange={handleFileChange} className="block w-full text-sm text-on-surface-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer"/>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="sticky top-0 bg-surface p-6 border-b border-border-color z-10">
                    <h3 className="text-xl font-semibold text-on-surface">{record ? `Edit Ticket ${record.TicketID}` : 'Create New Record'}</h3>
                </div>
                {draftExists && (
                    <div className="p-3 bg-indigo-100 border-b border-indigo-200 flex justify-between items-center text-sm">
                        <p className="text-indigo-800 font-medium">An unsaved draft was found.</p>
                        <div>
                            <button onClick={handleRestoreDraft} className="font-semibold text-primary hover:underline focus:outline-none">Restore</button>
                            <button onClick={handleDismissDraft} className="ml-4 font-semibold text-on-surface-secondary hover:underline focus:outline-none">Dismiss</button>
                        </div>
                    </div>
                )}
                <form onSubmit={handleAttemptSave} className="p-6 overflow-y-auto">
                    {record && (
                        <div className="mb-6">
                            <label htmlFor="ticketIdDisplay" className="block mb-2 text-sm font-medium text-on-surface-secondary">
                                Ticket ID
                            </label>
                            <input
                                type="text"
                                id="ticketIdDisplay"
                                value={record.TicketID}
                                disabled
                                className="bg-gray-200 border border-border-color text-on-surface-secondary text-sm rounded-lg block w-full p-2.5 cursor-not-allowed"
                            />
                        </div>
                    )}
                    <div className="grid gap-6 mb-6 grid-cols-1 md:grid-cols-2">
                        <InputField name="fullName" label="Full Name" required />
                        <InputField name="email" label="Email Address" type="email" required />
                        <InputField name="phoneNumber" label="Phone Number" />
                        <div>
                             <label htmlFor="formType" className="block mb-2 text-sm font-medium text-on-surface-secondary">Ticket Category</label>
                             <select id="formType" name="formType" value={formData.formType} onChange={handleChange} className="bg-gray-50 border border-border-color text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5">
                                <option>General Inquiry</option>
                                <option>Product Issue</option>
                                <option>Billing Question</option>
                                <option>Return Request</option>
                             </select>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="issueDescription" className="block mb-2 text-sm font-medium text-on-surface-secondary">Ticket Notes / Issue Description</label>
                            <textarea id="issueDescription" name="issueDescription" rows={4} value={formData.issueDescription} onChange={handleChange} className="bg-gray-50 border border-border-color text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5"></textarea>
                        </div>
                    </div>
                    
                    <h4 className="text-lg font-semibold text-on-surface mb-4 border-t border-border-color pt-4">Transaction Details</h4>
                    <div className="grid gap-6 mb-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                        <InputField name="purchaseDate" label="Date of Transaction" type="date"/>
                        <InputField name="invoiceNumber" label="Receipt/Invoice Number" />
                        <InputField name="purchaseAmount" label="Purchase Amount" />
                        <InputField name="last4Digits" label="Last 4 Digits of Card" tooltip="For transaction verification purposes only."/>
                        <InputField name="product" label="Product" />
                        <InputField name="storeOfPurchase" label="Store of Purchase" />
                    </div>
                    
                    <h4 className="text-lg font-semibold text-on-surface mb-4 border-t border-border-color pt-4">Internal Fields</h4>
                    <div className="grid gap-6 mb-6 grid-cols-1 md:grid-cols-2">
                         <div>
                             <label htmlFor="status" className="block mb-2 text-sm font-medium text-on-surface-secondary">Status</label>
                             <select id="status" name="status" value={formData.status} onChange={handleChange} className="bg-gray-50 border border-border-color text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5">
                                <option>New</option>
                                <option>In Progress</option>
                                <option>Closed</option>
                             </select>
                        </div>
                        <div className="md:col-span-2">
                             <label htmlFor="officeNotes" className="block mb-2 text-sm font-medium text-on-surface-secondary">
                                <Tooltip text="Internal notes not visible to the customer.">Office Notes</Tooltip>
                             </label>
                            <textarea id="officeNotes" name="officeNotes" rows={3} value={formData.officeNotes} onChange={handleChange} className="bg-gray-50 border border-border-color text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5"></textarea>
                        </div>
                    </div>

                    <h4 className="text-lg font-semibold text-on-surface mb-4 border-t border-border-color pt-4">File Attachments</h4>
                    <div className="grid gap-6 mb-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        <FileInputField name="receipt" label="Receipt File"/>
                        <FileInputField name="file1" label="File 1"/>
                        <FileInputField name="file2" label="File 2"/>
                        <FileInputField name="file3" label="File 3"/>
                        <FileInputField name="file4" label="File 4"/>
                    </div>
                </form>
                <div className="flex items-center justify-end p-4 border-t border-border-color sticky bottom-0 bg-gray-50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="text-on-surface bg-transparent hover:bg-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2">Cancel</button>
                    <button type="submit" disabled={!isDirty || isSaving} onClick={handleAttemptSave} className="text-white bg-primary hover:bg-primary-hover focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center">
                        {isSaving ? <><Spinner size="sm" /> Saving...</> : 'Save'}
                    </button>
                </div>
            </div>
            {isSaveConfirmOpen && (
                <ConfirmationModal
                    isOpen={isSaveConfirmOpen}
                    onClose={() => setIsSaveConfirmOpen(false)}
                    onConfirm={executeSave}
                    title="Confirm Changes"
                    message="You have unsaved changes. Are you sure you want to save them?"
                    isConfirming={isSaving}
                    variant="primary"
                    confirmText="Save Changes"
                />
            )}
        </div>
    );
};

export default RecordModal;