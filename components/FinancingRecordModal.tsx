import React, { useState, useEffect } from 'react';
import { FinancingRecord, FinancingFormState, FileForUpload, AgreementStatus } from '../types';
import { formatCurrency, formatDateToYMD, fileToBase64 } from '../utils/formatting';
import Modal from './Modal';
import Spinner from './Spinner';
import { PencilIcon } from './icons/PencilIcon';

interface FinancingRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: FinancingFormState, files: FileForUpload[]) => Promise<void>;
    record: FinancingRecord | null;
}

const emptyForm: FinancingFormState = {
    customer_name: '', customer_email: '', customer_phone: '', product_description: '',
    receipt_number: '', sale_date: '', sales_rep: '', store_name: '', total_sale_amount: 0,
    down_payment_amount: 0, financed_amount: 0, installment_count: 0, installment_amount: 0,
    payment_method: '', payment_due_day: '', total_amount_paid: 0, current_balance_due: 0,
    agreement_status: 'Active', notes_log: '', agreement_file: '', id_card_file_url: '', receipt_file: '',
};

const STATUS_OPTIONS: AgreementStatus[] = ['Active', 'Paid Off', 'On Hold', 'Default'];
const PAYMENT_METHOD_OPTIONS = ['ACH', 'Credit Card', 'Check', 'Cash', 'Wire Transfer', 'Other'];


const FinancingRecordModal: React.FC<FinancingRecordModalProps> = ({ isOpen, onClose, onSave, record }) => {
    const [formData, setFormData] = useState<FinancingFormState>(emptyForm);
    const [filesToUpload, setFilesToUpload] = useState<Record<string, File | null>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isInstallmentManual, setIsInstallmentManual] = useState(false);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof FinancingFormState, string>>>({});

    useEffect(() => {
        if (record) {
            setFormData({
                ...emptyForm,
                ...record,
                total_sale_amount: Number(record.total_sale_amount) || 0,
                down_payment_amount: Number(record.down_payment_amount) || 0,
                total_amount_paid: Number(record.total_amount_paid) || 0,
            });
            // If the record has a pre-existing installment amount, assume it was custom.
            setIsInstallmentManual(!!record.installment_amount && record.installment_amount > 0);
        } else {
            setFormData(emptyForm);
            setIsInstallmentManual(false);
        }
        setFilesToUpload({});
        setFormErrors({});
    }, [record, isOpen]);

    useEffect(() => {
        const total = Number(formData.total_sale_amount) || 0;
        const down = Number(formData.down_payment_amount) || 0;
        const financed = total - down;
        const paid = Number(formData.total_amount_paid) || 0;
        const installments = Number(formData.installment_count) || 0;

        let newInstallmentAmount = formData.installment_amount;
        if (!isInstallmentManual && installments > 0) {
            newInstallmentAmount = parseFloat((financed / installments).toFixed(2));
        }

        setFormData(prev => ({
            ...prev,
            financed_amount: financed,
            current_balance_due: financed - paid,
            installment_amount: newInstallmentAmount,
        }));
    }, [formData.total_sale_amount, formData.down_payment_amount, formData.total_amount_paid, formData.installment_count, isInstallmentManual]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'installment_amount') {
            setIsInstallmentManual(true);
        }
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (formErrors[name as keyof FinancingFormState]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof FinancingFormState];
                return newErrors;
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            setFilesToUpload(prev => ({ ...prev, [name]: files[0] }));
        }
    };
    
    const validateForm = (): boolean => {
        const errors: Partial<Record<keyof FinancingFormState, string>> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.customer_email && !emailRegex.test(formData.customer_email)) {
            errors.customer_email = "Please enter a valid email address.";
        }

        const phoneRegex = /^\D*(\d\D*){10,}$/;
        if (formData.customer_phone && !phoneRegex.test(formData.customer_phone)) {
            errors.customer_phone = "Please enter a valid phone number (at least 10 digits).";
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }
        
        setIsSaving(true);
        const uploadedFiles: FileForUpload[] = [];
        for (const key in filesToUpload) {
            const file = filesToUpload[key];
            if (file) {
                const base64Data = await fileToBase64(file);
                uploadedFiles.push({ key, filename: file.name, mimeType: file.type, data: base64Data });
            }
        }
        await onSave(formData, uploadedFiles);
        setIsSaving(false);
    };
    
    const renderInputField = (name: keyof FinancingFormState, label: string, type: string = 'text') => {
        const error = formErrors[name];
        const baseClasses = "mt-1 block w-full border rounded-md shadow-sm p-2";
        const errorClasses = "border-red-500 ring-1 ring-red-500";
        const normalClasses = "border-gray-300 focus:border-primary focus:ring-primary";
        return (
            <div>
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                <input type={type} name={name} value={formData[name] as any || ''} onChange={handleChange}
                       className={`${baseClasses} ${error ? errorClasses : normalClasses}`}
                       step={type === 'number' ? '0.01' : undefined} />
                {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
        );
    };
    
    const renderFileField = (name: keyof FinancingFormState, label: string) => (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {record && record[name] && <a href={record[name] as string} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View current</a>}
            <input type="file" name={name} onChange={handleFileChange}
                   className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-100 hover:file:bg-indigo-200" />
        </div>
    );

    const modalFooter = (
        <>
            <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm bg-gray-200 rounded-md">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md flex items-center">
                {isSaving ? <><Spinner size="sm" /> Saving...</> : 'Save Agreement'}
            </button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={record ? 'Edit Financing Agreement' : 'Add New Agreement'} size="2xl" footer={modalFooter}>
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Customer Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInputField('customer_name', 'Customer Name')}
                        {renderInputField('customer_email', 'Customer Email', 'email')}
                        {renderInputField('customer_phone', 'Customer Phone', 'tel')}
                    </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Sale Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInputField('sale_date', 'Sale Date', 'date')}
                        {renderInputField('receipt_number', 'Receipt Number')}
                        {renderInputField('sales_rep', 'Sales Rep')}
                        {renderInputField('store_name', 'Store Name')}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Product Description</label>
                            <textarea name="product_description" value={formData.product_description} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows={3}></textarea>
                        </div>
                    </div>
                </div>
                 <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Financials</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {renderInputField('total_sale_amount', 'Total Sale', 'number')}
                        {renderInputField('down_payment_amount', 'Down Payment', 'number')}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount Financed</label>
                            <p className="mt-1 p-2 bg-gray-200 rounded-md">{formatCurrency(formData.financed_amount)}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Current Balance</label>
                            <p className="mt-1 p-2 bg-gray-200 rounded-md">{formatCurrency(formData.current_balance_due)}</p>
                        </div>
                         {renderInputField('installment_count', '# Installments', 'number')}
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Installment Amt</label>
                            <div className="relative mt-1">
                                <input
                                    type="number"
                                    name="installment_amount"
                                    value={formData.installment_amount}
                                    onChange={handleChange}
                                    readOnly={!isInstallmentManual}
                                    className={`block w-full border rounded-md shadow-sm p-2 pr-10 ${!isInstallmentManual ? 'bg-gray-200' : 'border-gray-300'}`}
                                    step="0.01"
                                />
                                {!isInstallmentManual && (
                                     <button type="button" onClick={() => setIsInstallmentManual(true)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-primary" aria-label="Manually edit installment amount">
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                            <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="">Select Method</option>
                                {PAYMENT_METHOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Due Day</label>
                            <select name="payment_due_day" value={formData.payment_due_day} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                <option value="">Select Day</option>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => <option key={day} value={day}>{day}</option>)}
                            </select>
                         </div>
                         {renderInputField('total_amount_paid', 'Total Paid To Date', 'number')}
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Status</label>
                             <select name="agreement_status" value={formData.agreement_status} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                 {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                         </div>
                    </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Files & Notes</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                         {renderFileField('agreement_file', 'Agreement File')}
                         {renderFileField('id_card_file_url', 'ID Card File')}
                         {renderFileField('receipt_file', 'Receipt File')}
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700">Notes Log</label>
                         <textarea name="notes_log" value={formData.notes_log} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" rows={5}></textarea>
                     </div>
                </div>
            </div>
        </Modal>
    );
};

export default FinancingRecordModal;