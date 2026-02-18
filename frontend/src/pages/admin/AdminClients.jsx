import { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Plus, Pencil, Trash2, Search, User, FileText, X, ChevronLeft, Mail, Phone, Filter, ClipboardList, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ConsultationForm, { ConsultationView } from '../../components/ConsultationForm';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'with-email', 'with-phone'
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientNotes, setClientNotes] = useState([]);
  const [clientConsultations, setClientConsultations] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [viewConsultation, setViewConsultation] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '', address: '', date_of_birth: '', medical_notes: '' });
  const [noteFormData, setNoteFormData] = useState({ note: '', session_date: '' });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await adminApi.getClients();
      setClients(response.data.clients || []);
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for instant search
  const filteredClients = useMemo(() => {
    let result = clients;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(client => 
        client.first_name?.toLowerCase().includes(term) ||
        client.last_name?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.phone?.includes(term)
      );
    }
    
    // Apply category filter
    if (activeFilter === 'with-email') {
      result = result.filter(client => client.email && client.email.trim() !== '');
    } else if (activeFilter === 'with-phone') {
      result = result.filter(client => client.phone && client.phone.trim() !== '');
    }
    
    return result;
  }, [clients, searchTerm, activeFilter]);

  const loadClientNotes = async (clientId) => {
    try {
      const response = await adminApi.getClientNotes(clientId);
      setClientNotes(response.data.notes || []);
    } catch (error) {
      console.error('Failed to load notes');
    }
  };

  const loadClientConsultations = async (clientId) => {
    try {
      const response = await adminApi.getClientConsultations(clientId);
      setClientConsultations(response.data.consultations || []);
    } catch (error) {
      console.error('Failed to load consultations');
    }
  };

  const selectClient = async (client) => {
    setSelectedClient(client);
    await loadClientNotes(client.id);
    await loadClientConsultations(client.id);
  };

  const closeClientDetail = () => {
    setSelectedClient(null);
    setClientNotes([]);
    setClientConsultations([]);
  };

  const handleDeleteConsultation = async (consultationId) => {
    if (!window.confirm('Delete this consultation record?')) return;
    try {
      await adminApi.deleteConsultation(selectedClient.id, consultationId);
      toast.success('Consultation deleted');
      loadClientConsultations(selectedClient.id);
    } catch (error) {
      toast.error('Failed to delete consultation');
    }
  };

  const openDialog = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({ first_name: client.first_name, last_name: client.last_name, email: client.email || '', phone: client.phone || '', address: client.address || '', date_of_birth: client.date_of_birth || '', medical_notes: client.medical_notes || '' });
    } else {
      setEditingClient(null);
      setFormData({ first_name: '', last_name: '', email: '', phone: '', address: '', date_of_birth: '', medical_notes: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await adminApi.updateClient(editingClient.id, formData);
        toast.success('Client updated');
        if (selectedClient?.id === editingClient.id) {
          setSelectedClient({ ...selectedClient, ...formData });
        }
      } else {
        await adminApi.createClient(formData);
        toast.success('Client created');
      }
      setDialogOpen(false);
      loadClients();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`Delete ${client.first_name} ${client.last_name}?`)) return;
    try {
      await adminApi.deleteClient(client.id);
      toast.success('Client deleted');
      if (selectedClient?.id === client.id) {
        setSelectedClient(null);
        setClientNotes([]);
      }
      loadClients();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createClientNote(selectedClient.id, noteFormData);
      toast.success('Note added');
      setNoteDialogOpen(false);
      setNoteFormData({ note: '', session_date: '' });
      loadClientNotes(selectedClient.id);
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await adminApi.deleteClientNote(selectedClient.id, noteId);
      toast.success('Note deleted');
      loadClientNotes(selectedClient.id);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="admin-clients">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-slate-800">Clients</h1>
          <p className="text-slate-600 mt-1">Manage client information and notes</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-client-btn">
          <Plus size={18} className="mr-2" />Add Client
        </Button>
      </div>

      {/* Search and Filters - only show when no client selected */}
      {!selectedClient && (
        <div className="space-y-4 mb-6">
          {/* Search Input */}
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="pl-10"
              data-testid="client-search-input"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                data-testid="clear-search-btn"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter size={16} className="text-slate-400" />
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'all' 
                  ? 'bg-[#9F87C4] text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              data-testid="filter-all"
            >
              All Clients
            </button>
            <button
              onClick={() => setActiveFilter('with-email')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeFilter === 'with-email' 
                  ? 'bg-[#9F87C4] text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              data-testid="filter-with-email"
            >
              <Mail size={14} />
              Has Email
            </button>
            <button
              onClick={() => setActiveFilter('with-phone')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeFilter === 'with-phone' 
                  ? 'bg-[#9F87C4] text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              data-testid="filter-with-phone"
            >
              <Phone size={14} />
              Has Phone
            </button>
          </div>
        </div>
      )}

      {/* Client List - show when no client selected */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          selectedClient ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}
      >
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-medium text-slate-800">
              {searchTerm || activeFilter !== 'all' ? (
                <>Showing {filteredClients.length} of {clients.length} clients</>
              ) : (
                <>All Clients ({clients.length})</>
              )}
            </h2>
            {(searchTerm || activeFilter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
                className="text-sm text-[#9F87C4] hover:text-[#8A6EB5] font-medium"
                data-testid="clear-filters-btn"
              >
                Clear filters
              </button>
            )}
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {clients.length === 0 ? 'No clients found' : 'No clients match your search'}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => selectClient(client)}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                  data-testid={`client-item-${client.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#9F87C4]/10 flex items-center justify-center flex-shrink-0">
                      <User size={20} className="text-[#9F87C4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800">{client.first_name} {client.last_name}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        {client.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail size={12} />
                            <span className="truncate">{client.email}</span>
                          </span>
                        )}
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {client.phone}
                          </span>
                        )}
                        {!client.email && !client.phone && <span>No contact info</span>}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Detail - show when client selected */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          selectedClient ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {selectedClient && (
          <div className="space-y-6">
            {/* Close Button */}
            <Button 
              onClick={closeClientDetail}
              className="mb-4 bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 shadow-md"
              data-testid="close-client-btn"
            >
              <ChevronLeft size={18} className="mr-2" />
              Close
            </Button>

            {/* Client Info Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#9F87C4]/10 flex items-center justify-center">
                    <User size={32} className="text-[#9F87C4]" />
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl text-slate-800">{selectedClient.first_name} {selectedClient.last_name}</h2>
                    <p className="text-slate-500">{selectedClient.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openDialog(selectedClient)}>
                    <Pencil size={16} className="mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(selectedClient)}>
                    <Trash2 size={16} className="mr-1" /> Delete
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block text-xs uppercase tracking-wide mb-1">Phone</span>
                  <span className="text-slate-800">{selectedClient.phone || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block text-xs uppercase tracking-wide mb-1">Date of Birth</span>
                  <span className="text-slate-800">{selectedClient.date_of_birth || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg md:col-span-2">
                  <span className="text-slate-500 block text-xs uppercase tracking-wide mb-1">Address</span>
                  <span className="text-slate-800">{selectedClient.address || 'N/A'}</span>
                </div>
              </div>
              {selectedClient.medical_notes && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">Medical Notes</h4>
                  <p className="text-sm text-amber-700">{selectedClient.medical_notes}</p>
                </div>
              )}
            </div>

            {/* Session Notes */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-medium text-slate-800">Session Notes ({clientNotes.length})</h3>
                <Button size="sm" onClick={() => setNoteDialogOpen(true)} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-note-btn">
                  <Plus size={16} className="mr-1" />Add Note
                </Button>
              </div>
              {clientNotes.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No session notes yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {clientNotes.map((note) => (
                    <div key={note.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-slate-800">{note.note}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {note.session_date && <span className="bg-slate-100 px-2 py-0.5 rounded mr-2">Session: {note.session_date}</span>}
                            Added: {new Date(note.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteNote(note.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consultations */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-medium text-slate-800">Consultations ({clientConsultations.length})</h3>
                <Button size="sm" onClick={() => setConsultationDialogOpen(true)} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-consultation-btn">
                  <Plus size={16} className="mr-1" />New Consultation
                </Button>
              </div>
              {clientConsultations.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No consultation records yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {clientConsultations.map((consultation) => (
                    <div key={consultation.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">
                            Consultation - {new Date(consultation.consultation_date).toLocaleDateString('en-GB')}
                          </p>
                          <div className="text-sm text-slate-500 mt-1">
                            {consultation.treatment_objectives?.length > 0 && (
                              <p>Objectives: {consultation.treatment_objectives.slice(0, 3).join(', ')}{consultation.treatment_objectives.length > 3 ? '...' : ''}</p>
                            )}
                            {consultation.contra_indications?.length > 0 && (
                              <p className="text-amber-600">Contra-indications: {consultation.contra_indications.length} noted</p>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            Added: {new Date(consultation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 hover:bg-slate-100" onClick={() => setViewConsultation(consultation)} data-testid={`view-consultation-${consultation.id}`}>
                            <Eye size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteConsultation(consultation.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="client-dialog">
          <DialogHeader><DialogTitle className="font-serif text-xl">{editingClient ? 'Edit Client' : 'Add Client'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-slate-700">First Name *</label><Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required className="mt-1" /></div>
              <div><label className="text-sm font-medium text-slate-700">Last Name *</label><Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-slate-700">Email</label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium text-slate-700">Phone</label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="mt-1" /></div>
            </div>
            <div><label className="text-sm font-medium text-slate-700">Address</label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Date of Birth</label><Input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Medical Notes</label><Textarea value={formData.medical_notes} onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })} rows={3} className="mt-1" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" className="bg-[#9F87C4] hover:bg-[#8A6EB5]">{editingClient ? 'Update' : 'Create'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="note-dialog">
          <DialogHeader><DialogTitle className="font-serif text-xl">Add Session Note</DialogTitle></DialogHeader>
          <form onSubmit={handleAddNote} className="space-y-4">
            <div><label className="text-sm font-medium text-slate-700">Session Date</label><Input type="date" value={noteFormData.session_date} onChange={(e) => setNoteFormData({ ...noteFormData, session_date: e.target.value })} className="mt-1" /></div>
            <div><label className="text-sm font-medium text-slate-700">Note *</label><Textarea value={noteFormData.note} onChange={(e) => setNoteFormData({ ...noteFormData, note: e.target.value })} required rows={4} className="mt-1" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button><Button type="submit" className="bg-[#9F87C4] hover:bg-[#8A6EB5]">Add Note</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Consultation Form Dialog */}
      <Dialog open={consultationDialogOpen} onOpenChange={setConsultationDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]" data-testid="consultation-dialog">
          <DialogHeader><DialogTitle className="font-serif text-xl">New Consultation</DialogTitle></DialogHeader>
          <ConsultationForm 
            client={selectedClient} 
            onClose={() => setConsultationDialogOpen(false)} 
            onSaved={() => loadClientConsultations(selectedClient.id)}
          />
        </DialogContent>
      </Dialog>

      {/* View Consultation Dialog */}
      <Dialog open={!!viewConsultation} onOpenChange={() => setViewConsultation(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]" data-testid="view-consultation-dialog">
          <DialogHeader><DialogTitle className="font-serif text-xl">Consultation Details</DialogTitle></DialogHeader>
          <ConsultationView 
            consultation={viewConsultation} 
            onClose={() => setViewConsultation(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
