import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Mail, Phone, CheckCircle, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await adminApi.getContacts();
      setContacts(response.data.contacts || []);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (contact) => {
    try {
      await adminApi.markContactRead(contact.id);
      toast.success('Marked as read');
      loadContacts();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (contact) => {
    if (!window.confirm('Delete this contact submission?')) return;
    try {
      await adminApi.deleteContact(contact.id);
      toast.success('Contact deleted');
      setSelectedContact(null);
      loadContacts();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="admin-contacts">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-slate-800">Contact Submissions</h1>
        <p className="text-slate-600 mt-1">View and manage contact form submissions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-medium text-slate-800">All Contacts</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No contacts yet</div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-[#9F87C4]/5' : ''
                  }`}
                  data-testid={`contact-item-${contact.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 mt-2 rounded-full ${contact.is_read ? 'bg-slate-300' : 'bg-[#A7D7C5]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{contact.name}</p>
                      <p className="text-sm text-slate-500 truncate">{contact.email}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contact Detail */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {selectedContact ? (
            <div>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl text-slate-800">{selectedContact.name}</h2>
                  <p className="text-slate-500">{new Date(selectedContact.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {!selectedContact.is_read && (
                    <Button variant="outline" size="sm" onClick={() => handleMarkRead(selectedContact)}>
                      <CheckCircle size={16} className="mr-2" />
                      Mark Read
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(selectedContact)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-6 mb-6">
                  <a href={`mailto:${selectedContact.email}`} className="flex items-center gap-2 text-[#9F87C4] hover:underline">
                    <Mail size={18} />
                    {selectedContact.email}
                  </a>
                  {selectedContact.phone && (
                    <a href={`tel:${selectedContact.phone}`} className="flex items-center gap-2 text-[#9F87C4] hover:underline">
                      <Phone size={18} />
                      {selectedContact.phone}
                    </a>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Message</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{selectedContact.message}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <Eye size={48} className="mx-auto mb-4 opacity-30" />
              <p>Select a contact to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
