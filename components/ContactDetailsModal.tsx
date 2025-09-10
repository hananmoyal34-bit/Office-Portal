import React from 'react';
import type { Contact } from '../types';
import Modal from './Modal';

interface ContactDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    contact: Contact | null;
}

const DetailItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <p className="font-semibold text-sm text-gray-500">{label}</p>
        <p className="text-gray-900 bg-gray-50 p-2 rounded-md mt-1 text-sm whitespace-pre-wrap break-words">{value || 'Not provided'}</p>
    </div>
);

const getStatusClass = (status: string) => {
    const lowerStatus = (status || '').toLowerCase();
    if (lowerStatus === 'active') return 'bg-green-100 text-green-800';
    if (lowerStatus === 'inactive' || lowerStatus === 'do not contact') return 'bg-red-100 text-red-800';
    if (lowerStatus === 'lead') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
};

const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({ isOpen, onClose, contact }) => {
    if (!isOpen || !contact) return null;

    const modalFooter = (
        <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
            Close
        </button>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Contact: ${contact['First Name']} ${contact['Last Name']}`}
            size="2xl"
            footer={modalFooter}
        >
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <DetailItem label="Full Name" value={`${contact['First Name']} ${contact['Last Name']}`} />
                        <DetailItem label="Email Address" value={contact['Email Address']} />
                        <DetailItem label="Phone Number" value={contact['Phone Number']} />
                        <DetailItem label="Full Address" value={contact.Address} />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">Professional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <DetailItem label="Company / Organization" value={contact['Company/Organization']} />
                        <DetailItem label="Job Title" value={contact['Job Title']} />
                        <DetailItem label="Department" value={contact.Department} />
                        <div>
                             <p className="font-semibold text-sm text-gray-500">Status</p>
                             <div className="mt-1">
                                <span className={`px-2 py-1 text-xs font-semibold leading-4 rounded-full ${getStatusClass(contact.Status)}`}>
                                    {contact.Status}
                                </span>
                             </div>
                        </div>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-3">Notes & Metadata</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2">
                             <DetailItem label="Notes" value={contact.Notes} />
                        </div>
                        <DetailItem label="Created On" value={contact['Created On'] ? new Date(contact['Created On']).toLocaleDateString() : 'N/A'} />
                        <DetailItem label="Contact ID" value={contact.ContactID} />
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ContactDetailsModal;
