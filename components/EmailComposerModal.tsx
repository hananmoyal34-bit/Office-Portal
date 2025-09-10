import React, { useState, useMemo } from 'react';
import type { CustomerRecord } from '../types';
import Modal from './Modal';
import { MailIcon } from './icons/MailIcon';
import { PencilIcon } from './icons/PencilIcon';

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: CustomerRecord;
}

type Template = 'warranty' | 'custom' | null;

const TemplateCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; }> = ({ title, description, icon, onClick }) => (
    <div onClick={onClick} className="p-6 border rounded-lg hover:bg-gray-50 hover:border-primary cursor-pointer transition-all text-center flex flex-col items-center">
        <div className="flex-shrink-0 bg-indigo-100 text-primary p-3 rounded-full">{icon}</div>
        <h3 className="mt-4 text-lg font-semibold text-on-surface">{title}</h3>
        <p className="mt-1 text-sm text-on-surface-secondary">{description}</p>
    </div>
);

const EmailComposerModal: React.FC<EmailComposerModalProps> = ({ isOpen, onClose, record }) => {
    const [selectedTemplate, setSelectedTemplate] = useState<Template>(null);
    const [customSubject, setCustomSubject] = useState('');
    const [customBody, setCustomBody] = useState('');

    const warrantySubject = `Warranty Confirmation for ${record['First Name']} - ${record.TicketID}`;
    const warrantyBody = `Dear ${record['First Name']} ${record['Last Name']},

We are pleased to confirm that your warranty has been successfully registered. Should you encounter any issues in the future, simply provide us with your invoice number, and we will be able to promptly locate your active warranty.

To ensure you are fully informed, we have attached a copy of our Apex Electronics Lifetime Warranty Policy for your reference. This document outlines the coverage, limitations, and the process should you ever need to make a claim.

Our goal is to assist you quickly and effectively, so please don't hesitate to contact us at your convenience.

Thank you for choosing Apex Electronics. We look forward to supporting you whenever needed.

Best regards,
Customer Service Team

---
Warranty Documents:
Policy 1: https://drive.google.com/file/d/1P1yZdPnABov6DdIloV9-NuyvPr-IjvBa/view?usp=sharing
Policy 2: https://drive.google.com/file/d/1ZJQ02zAdONKOnDLM9wh_wPFJJll1Ac54/view?usp=sharing
`;
    
    const mailtoLink = useMemo(() => {
        const to = record['Email Address'];
        let subject = '';
        let body = '';

        if (selectedTemplate === 'warranty') {
            subject = warrantySubject;
            body = warrantyBody;
        } else if (selectedTemplate === 'custom') {
            subject = customSubject;
            body = customBody;
        }

        return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    }, [record, selectedTemplate, customSubject, customBody, warrantySubject, warrantyBody]);

    const renderContent = () => {
        if (!selectedTemplate) {
            return (
                <div>
                    <h3 className="text-xl font-semibold text-center mb-6">Choose an Email Template</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TemplateCard 
                            title="Warranty Confirmation"
                            description="Send a pre-filled warranty registration email with policy links."
                            icon={<MailIcon />}
                            onClick={() => setSelectedTemplate('warranty')}
                        />
                        <TemplateCard 
                            title="Custom Email"
                            description="Write a new email from scratch to this customer."
                            icon={<PencilIcon className="h-6 w-6"/>}
                            onClick={() => setSelectedTemplate('custom')}
                        />
                    </div>
                </div>
            );
        }

        const isWarranty = selectedTemplate === 'warranty';
        const subject = isWarranty ? warrantySubject : customSubject;
        const body = isWarranty ? warrantyBody : customBody;

        return (
            <div>
                <button onClick={() => setSelectedTemplate(null)} className="text-sm text-primary font-semibold mb-4">&larr; Back to templates</button>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-500">To</label>
                        <p className="mt-1 p-2 bg-gray-100 rounded-md text-sm text-gray-800">{record['Email Address']}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500">Subject</label>
                        <input type="text" value={subject} onChange={e => !isWarranty && setCustomSubject(e.target.value)} readOnly={isWarranty}
                               className={`w-full mt-1 p-2 border rounded-md text-sm ${isWarranty ? 'bg-gray-100' : 'border-gray-300'}`} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-500">Body</label>
                        <textarea value={body} onChange={e => !isWarranty && setCustomBody(e.target.value)} readOnly={isWarranty}
                                  className={`w-full mt-1 p-2 border rounded-md text-sm font-mono h-64 ${isWarranty ? 'bg-gray-100' : 'border-gray-300'}`}></textarea>
                    </div>
                 </div>
            </div>
        )
    };
    
    const modalFooter = (
         <>
            <p className="text-xs text-on-surface-secondary mr-auto">This will open in your default email application.</p>
            <button type="button" onClick={onClose} className="text-on-surface bg-transparent hover:bg-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2">
                Cancel
            </button>
            {selectedTemplate && (
                 <a href={mailtoLink} onClick={onClose} target="_blank" rel="noopener noreferrer"
                   className="text-white bg-primary hover:bg-primary-hover font-medium rounded-lg text-sm px-5 py-2.5 text-center flex items-center gap-2">
                    <MailIcon />
                    Open in Email Client
                </a>
            )}
        </>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Compose Email" 
            size="2xl" 
            footer={modalFooter}
        >
            {renderContent()}
        </Modal>
    );
};

export default EmailComposerModal;
