import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Plus, Pencil, Trash2, Search, User, FileText, ClipboardList, Eye, X, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import ConsultationForm, { ConsultationView } from '../../components/ConsultationForm';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientNotes, setClientNotes] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [viewConsultationDialogOpen, setViewConsultationDialogOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', phone: '', address: '', date_of_birth: '', medical_notes: '' });
  const [noteFormData, setNoteFormData] = useState({ note: '', session_date: '' });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await adminApi.getClients(searchTerm);
      setClients(response.data.clients || []);
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadClientNotes = async (clientId) => {
    try {
      const response = await adminApi.getClientNotes(clientId);
      setClientNotes(response.data.notes || []);
    } catch (error) {
      console.error('Failed to load notes');
    }
  };

  const loadConsultations = async (clientId) => {
    try {
      const response = await adminApi.getConsultations(clientId);
      setConsultations(response.data.consultations || []);
    } catch (error) {
      console.error('Failed to load consultations');
    }
  };

  const selectClient = async (client) => {
    setSelectedClient(client);
    await Promise.all([
      loadClientNotes(client.id),
      loadConsultations(client.id)
    ]);
  };

  const closeClientDetail = () => {
    setSelectedClient(null);
    setClientNotes([]);
    setConsultations([]);
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
        setConsultations([]);
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

  const handleViewConsultation = async (consultation) => {
    setSelectedConsultation(consultation);
    setViewConsultationDialogOpen(true);
  };

  const handleDeleteConsultation = async (consultationId) => {
    if (!window.confirm('Delete this consultation record?')) return;
    try {
      await adminApi.deleteConsultation(selectedClient.id, consultationId);
      toast.success('Consultation deleted');
      loadConsultations(selectedClient.id);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 lg:p-8" data-testid="admin-clients">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-slate-800">Clients</h1>
          <p className="text-slate-600 mt-1">Manage client information, consultations and notes</p>
        </div>
        {!selectedClient && (
          <Button onClick={() => openDialog()} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-client-btn">
            <Plus size={18} className="mr-2" />Add Client
          </Button>
        )}
      </div>

      {/* Client List - Hidden when client selected */}
      <div className={`transition-all duration-300 ease-in-out ${selectedClient ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[2000px] opacity-100'}`}>
        {/* Search */}
        <div className="relative mb-6">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); loadClients(); }}
            placeholder="Search clients..."
            className="pl-10"
            data-testid="client-search-input"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-medium text-slate-800">All Clients ({clients.length})</h2>
            <Button onClick={() => openDialog()} size="sm" className="bg-[#9F87C4] hover:bg-[#8A6EB5]">
              <Plus size={16} className="mr-1" />Add Client
            </Button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No clients found</div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => selectClient(client)}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                  data-testid={`client-item-${client.id}`}
                >
                  <p className="font-medium text-slate-800">{client.first_name} {client.last_name}</p>
                  <p className="text-sm text-slate-500">{client.email || client.phone || 'No contact'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Detail - Shown when client selected */}
      <div className={`transition-all duration-300 ease-in-out ${selectedClient ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        {selectedClient && (
          <div className="space-y-6">
            {/* Close Button */}
            <Button 
              variant="outline" 
              onClick={closeClientDetail}
              className="mb-2"
              data-testid="close-client-btn"
            >
              <ChevronLeft size={18} className="mr-2" />
              Back to Client List
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
                  <Button variant="outline" size="sm" onClick={() => openDialog(selectedClient)}><Pencil size={16} /></Button>
                  <Button variant="outline" size="sm" className="text-red-500" onClick={() => handleDelete(selectedClient)}><Trash2 size={16} /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Phone:</span> {selectedClient.phone || 'N/A'}</div>
                <div><span className="text-slate-500">DOB:</span> {selectedClient.date_of_birth || 'N/A'}</div>
                <div className="col-span-2"><span className="text-slate-500">Address:</span> {selectedClient.address || 'N/A'}</div>
              </div>
              {selectedClient.medical_notes && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">Medical Notes</h4>
                  <p className="text-sm text-amber-700">{selectedClient.medical_notes}</p>
                </div>
              )}
            </div>

            {/* Consultations */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList size={20} className="text-[#9F87C4]" />
                  <h3 className="font-medium text-slate-800">Consultation Records ({consultations.length})</h3>
                </div>
                <Button size="sm" onClick={() => setConsultationDialogOpen(true)} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-consultation-btn">
                  <Plus size={16} className="mr-1" />New Consultation
                </Button>
              </div>
                {consultations.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No consultation records</div>
                ) : (
                  <div className={`divide-y divide-slate-50 ${consultations.length > 5 ? 'max-h-[360px] overflow-y-auto' : ''}`}>
                    {consultations.map((consultation) => (
                      <div key={consultation.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#9F87C4]/10 flex items-center justify-center">
                            <ClipboardList size={18} className="text-[#9F87C4]" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">Consultation</p>
                            <p className="text-sm text-slate-500">{formatDate(consultation.consultation_date)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewConsultation(consultation)}
                            data-testid={`view-consultation-${consultation.id}`}
                          >
                            <Eye size={16} className="mr-1" />View
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 h-8 w-8"
                            onClick={() => handleDeleteConsultation(consultation.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-medium text-slate-800">Session Notes</h3>
                  <Button size="sm" onClick={() => setNoteDialogOpen(true)} className="bg-[#9F87C4] hover:bg-[#8A6EB5]" data-testid="add-note-btn">
                    <Plus size={16} className="mr-1" />Add Note
                  </Button>
                </div>
                {clientNotes.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No notes yet</div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                    {clientNotes.map((note) => (
                      <div key={note.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-slate-800">{note.note}</p>
                            <p className="text-xs text-slate-400 mt-2">
                              {note.session_date && `Session: ${note.session_date} • `}
                              {new Date(note.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteNote(note.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p>Select a client to view details</p>
            </div>
          )}
        </div>
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

      {/* Consultation Form Dialog - 80% width on desktop */}
      <Dialog open={consultationDialogOpen} onOpenChange={setConsultationDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:w-[80vw] md:max-w-[80vw] h-[90vh] max-h-[90vh]" data-testid="consultation-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl flex items-center gap-3">
              <ClipboardList className="text-[#9F87C4]" />
              New Consultation Form
              <span className="text-sm font-normal text-slate-500 ml-2">
                {selectedClient?.first_name} {selectedClient?.last_name}
              </span>
            </DialogTitle>
          </DialogHeader>
          <ConsultationForm 
            client={selectedClient} 
            onClose={() => setConsultationDialogOpen(false)}
            onSaved={() => loadConsultations(selectedClient.id)}
          />
        </DialogContent>
      </Dialog>

      {/* View Consultation Dialog */}
      <Dialog open={viewConsultationDialogOpen} onOpenChange={setViewConsultationDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] md:w-[80vw] md:max-w-[80vw] h-[90vh] max-h-[90vh]" data-testid="view-consultation-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl flex items-center gap-3">
              <ClipboardList className="text-[#9F87C4]" />
              Consultation Record
              <span className="text-sm font-normal text-slate-500 ml-2">
                {formatDate(selectedConsultation?.consultation_date)}
              </span>
            </DialogTitle>
          </DialogHeader>
          <ConsultationView 
            consultation={selectedConsultation}
            onClose={() => setViewConsultationDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
