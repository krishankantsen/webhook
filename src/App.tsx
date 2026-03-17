import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, Timestamp, addDoc, limit } from 'firebase/firestore';
import { auth, db, signIn, signOut, handleFirestoreError, OperationType } from './firebase';
import { Endpoint, CapturedRequest } from './types';
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Clock, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw,
  LogOut,
  Webhook,
  Code,
  Globe,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  X,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// --- Components ---

const Navbar = ({ user }: { user: User | null }) => (
  <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-50">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
        <Webhook className="text-white w-6 h-6" />
      </div>
      <span className="text-xl font-bold tracking-tight text-gray-900">HookCapture</span>
    </div>
    {user ? (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
          <img src={user.photoURL || ''} alt="" className="w-6 h-6 rounded-full" />
          <span className="text-sm font-medium text-gray-700">{user.displayName}</span>
        </div>
        <button 
          onClick={signOut}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>
      </div>
    ) : (
      <button 
        onClick={signIn}
        className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
      >
        Sign In with Google
      </button>
    )}
  </nav>
);

const EndpointCard = ({ 
  endpoint, 
  isSelected, 
  onClick, 
  onDelete 
}: { 
  endpoint: Endpoint; 
  isSelected: boolean; 
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) => {
  const isExpired = endpoint.expiresAt.toDate() < new Date();
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`group relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-indigo-600 bg-indigo-50/30' 
          : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50/50'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
            {endpoint.name || 'Unnamed Endpoint'}
          </span>
        </div>
        <button 
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <Code size={14} />
        <span className="font-mono truncate">{endpoint.id}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-gray-400">
          <Clock size={12} />
          {isExpired ? 'Expired' : `Expires ${formatDistanceToNow(endpoint.expiresAt.toDate(), { addSuffix: true })}`}
        </div>
        <div className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-600">
          {endpoint.responseStatus}
        </div>
      </div>
    </motion.div>
  );
};

const RequestItem = ({ request }: { request: CapturedRequest }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
            request.method === 'GET' ? 'bg-blue-100 text-blue-700' :
            request.method === 'POST' ? 'bg-green-100 text-green-700' :
            request.method === 'PUT' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {request.method}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{request.ip}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(request.timestamp.toDate(), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400">#{request.id.slice(0, 8)}</span>
          {isOpen ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-gray-50/50"
          >
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Headers</h4>
                <div className="bg-white border border-gray-100 rounded-xl p-3 font-mono text-xs overflow-x-auto">
                  {Object.entries(request.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-indigo-600 font-semibold">{key}:</span>
                      <span className="text-gray-600">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {request.body && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Body</h4>
                  <pre className="bg-white border border-gray-100 rounded-xl p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                    {request.body}
                  </pre>
                </div>
              )}

              {Object.keys(request.query).length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Query Params</h4>
                  <div className="bg-white border border-gray-100 rounded-xl p-3 font-mono text-xs overflow-x-auto">
                    {Object.entries(request.query).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-indigo-600 font-semibold">{key}:</span>
                        <span className="text-gray-600">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Edit Response Panel ---
const EditResponsePanel = ({
  endpoint,
  onSave,
  onCancel,
}: {
  endpoint: Endpoint;
  onSave: (status: number, body: string, headers: string) => Promise<void>;
  onCancel: () => void;
}) => {
  const [status, setStatus] = useState(endpoint.responseStatus);
  const [body, setBody] = useState(endpoint.responseBody);
  const [headers, setHeaders] = useState(
    typeof endpoint.responseHeaders === 'object'
      ? JSON.stringify(endpoint.responseHeaders, null, 2)
      : '{}'
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    try {
      JSON.parse(headers); // validate JSON
    } catch {
      setError('Response Headers must be valid JSON.');
      return;
    }
    setSaving(true);
    try {
      await onSave(status, body, headers);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="p-6 border-t border-gray-100 bg-gradient-to-b from-indigo-50/40 to-white"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-indigo-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">Edit Response</h3>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Live
          </span>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Status Code
            </label>
            <input
              type="number"
              value={status}
              onChange={(e) => setStatus(parseInt(e.target.value) || 200)}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono font-bold"
            />
          </div>
          <div className="flex flex-col justify-end">
            <div className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center border ${
              status >= 200 && status < 300 ? 'bg-green-50 border-green-200 text-green-700' :
              status >= 400 && status < 500 ? 'bg-orange-50 border-orange-200 text-orange-700' :
              status >= 500 ? 'bg-red-50 border-red-200 text-red-700' :
              'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              {status >= 200 && status < 300 ? '✓ Success' :
               status >= 400 && status < 500 ? '⚠ Client Error' :
               status >= 500 ? '✗ Server Error' : 'ℹ Info / Redirect'}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
            Response Headers (JSON)
          </label>
          <textarea
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-xs resize-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
            Response Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-xs resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saved ? (
              <>
                <CheckCircle2 size={16} className="text-green-300" />
                Saved!
              </>
            ) : saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Response
              </>
            )}
          </motion.button>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    status: 200,
    body: '{"message": "Webhook received successfully"}',
    headers: '{"Content-Type": "application/json"}'
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setEndpoints([]);
      return;
    }

    const q = query(
      collection(db, 'endpoints'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Endpoint));
      setEndpoints(data);
      // Keep selectedEndpoint in sync with latest data
      setSelectedEndpoint(prev => {
        if (!prev) return prev;
        const updated = data.find(ep => ep.id === prev.id);
        return updated || prev;
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'endpoints'));

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!selectedEndpoint) {
      setRequests([]);
      return;
    }

    const q = query(
      collection(db, 'endpoints', selectedEndpoint.id, 'requests'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CapturedRequest));
      setRequests(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `endpoints/${selectedEndpoint.id}/requests`));

    return unsubscribe;
  }, [selectedEndpoint?.id]);

  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const id = uuidv4().split('-')[0]; // Short ID
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      let parsedHeaders = {};
      try { parsedHeaders = JSON.parse(formData.headers); } catch(e) { /* ignore */ }

      const newEndpoint: Endpoint = {
        id,
        userId: user.uid,
        name: formData.name,
        responseStatus: formData.status,
        responseBody: formData.body,
        responseHeaders: parsedHeaders,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt)
      };

      await setDoc(doc(db, 'endpoints', id), newEndpoint);
      setIsCreating(false);
      setSelectedEndpoint(newEndpoint);
      setFormData({ name: '', status: 200, body: '{"message": "Webhook received successfully"}', headers: '{"Content-Type": "application/json"}' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'endpoints');
    }
  };

  const handleUpdateResponse = async (status: number, body: string, headersJson: string) => {
    if (!selectedEndpoint) return;
    let parsedHeaders = {};
    try { parsedHeaders = JSON.parse(headersJson); } catch { /* already validated */ }

    await updateDoc(doc(db, 'endpoints', selectedEndpoint.id), {
      responseStatus: status,
      responseBody: body,
      responseHeaders: parsedHeaders,
    });
    // selectedEndpoint will auto-update via the onSnapshot listener
  };

  const handleDeleteEndpoint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this endpoint? All captured requests will be lost.')) return;
    try {
      await deleteDoc(doc(db, 'endpoints', id));
      if (selectedEndpoint?.id === id) {
        setSelectedEndpoint(null);
        setIsEditingResponse(false);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `endpoints/${id}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const webhookUrl = selectedEndpoint ? `${window.location.origin}/webhook/${selectedEndpoint.id}` : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar user={user} />

      {!user ? (
        <main className="max-w-4xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="inline-flex p-4 bg-indigo-50 rounded-3xl mb-4">
              <Webhook size={64} className="text-indigo-600" />
            </div>
            <h1 className="text-6xl font-black tracking-tight leading-tight">
              Capture &amp; Customize <br />
              <span className="text-indigo-600">Webhooks Instantly</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Generate unique URLs valid for 24 hours. Capture requests, inspect payloads, 
              and customize responses with zero configuration.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={signIn}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
              >
                Get Started for Free
                <ChevronRight size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-8 mt-20">
              {[
                { icon: Globe, title: 'Public URLs', desc: 'Instant unique endpoints' },
                { icon: Settings, title: 'Custom Responses', desc: 'Tweak status, body & headers anytime' },
                { icon: RefreshCw, title: 'Real-time', desc: 'Live request inspection' }
              ].map((feature, i) => (
                <div key={i} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <feature.icon className="text-indigo-600 mb-4" size={24} />
                  <h3 className="font-bold mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </main>
      ) : (
        <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-80px)]">
          {/* Sidebar: Endpoints List */}
          <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Your Endpoints</h2>
              <button 
                onClick={() => setIsCreating(true)}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {endpoints.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                  <p className="text-sm text-gray-400">No endpoints yet</p>
                </div>
              ) : (
                endpoints.map(ep => (
                  <EndpointCard 
                    key={ep.id} 
                    endpoint={ep} 
                    isSelected={selectedEndpoint?.id === ep.id}
                    onClick={() => {
                      setSelectedEndpoint(ep);
                      setIsCreating(false);
                      setIsEditingResponse(false);
                    }}
                    onDelete={(e) => {
                      e.stopPropagation();
                      handleDeleteEndpoint(ep.id);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Main Content: Request Viewer or Form */}
          <div className="lg:col-span-9 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {isCreating ? (
              <div className="p-8 max-w-2xl mx-auto w-full overflow-y-auto">
                <h2 className="text-3xl font-black mb-8">Create New Endpoint</h2>
                <form onSubmit={handleCreateEndpoint} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Friendly Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Stripe Webhook Test"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Response Status</label>
                      <input 
                        type="number" 
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Expiration</label>
                      <div className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-medium flex items-center gap-2">
                        <Clock size={16} /> 24 Hours
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Response Headers (JSON)</label>
                    <textarea 
                      value={formData.headers}
                      onChange={e => setFormData({...formData, headers: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Response Body</label>
                    <textarea 
                      value={formData.body}
                      onChange={e => setFormData({...formData, body: e.target.value})}
                      rows={5}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      Create Endpoint
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedEndpoint ? (
              <>
                {/* Endpoint Header */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 mb-1">{selectedEndpoint.name || 'Unnamed Endpoint'}</h2>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-100">{selectedEndpoint.id}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Expires {formatDistanceToNow(selectedEndpoint.expiresAt.toDate(), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Edit Response Button */}
                      <button
                        onClick={() => setIsEditingResponse(!isEditingResponse)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                          isEditingResponse
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
                        }`}
                      >
                        <Edit3 size={15} />
                        {isEditingResponse ? 'Editing Response' : 'Edit Response'}
                      </button>

                      <div className="flex-1 md:flex-none bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-3">
                        <Globe size={16} className="text-indigo-600" />
                        <span className="text-sm font-mono text-gray-600 truncate max-w-[200px] md:max-w-md">{webhookUrl}</span>
                        <button 
                          onClick={() => copyToClipboard(webhookUrl)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-indigo-600"
                        >
                          {copying ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Current response badge strip */}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                      selectedEndpoint.responseStatus >= 200 && selectedEndpoint.responseStatus < 300
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : selectedEndpoint.responseStatus >= 400
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-orange-50 border-orange-200 text-orange-700'
                    }`}>
                      <Zap size={10} />
                      Status: {selectedEndpoint.responseStatus}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 border border-gray-200 text-gray-600 font-mono max-w-xs truncate">
                      Body: {selectedEndpoint.responseBody?.slice(0, 40)}{selectedEndpoint.responseBody?.length > 40 ? '…' : ''}
                    </div>
                  </div>
                </div>

                {/* Inline Edit Response Panel */}
                <AnimatePresence>
                  {isEditingResponse && (
                    <EditResponsePanel
                      endpoint={selectedEndpoint}
                      onSave={async (status, body, headers) => {
                        await handleUpdateResponse(status, body, headers);
                      }}
                      onCancel={() => setIsEditingResponse(false)}
                    />
                  )}
                </AnimatePresence>

                {/* Requests List */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Captured Requests ({requests.length})</h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Listening for requests...
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {requests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-12">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <RefreshCw className="text-gray-300 animate-spin-slow" size={32} />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Waiting for requests</h4>
                        <p className="text-sm text-gray-500 max-w-xs">
                          Send a request to your unique URL to see it appear here in real-time.
                        </p>
                        <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-left">
                          <p className="text-xs font-bold text-indigo-700 mb-2 uppercase tracking-widest flex items-center gap-2 justify-between">
                            <span>Try it now:</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`curl -X POST ${webhookUrl} -d '{"hello": "world"}'`)}
                              className="px-2 py-1 text-[10px] bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                            >
                              {copying ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                          </p>

                          <code className="text-[10px] text-indigo-900 break-all">
                            {`curl -X POST ${webhookUrl} -d '{"hello": "world"}'`}
                          </code>
                        </div>
                      </div>
                    ) : (
                      requests.map((req: CapturedRequest) => (
                        <RequestItem key={req.id} request={req} />
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-12">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
                  <Webhook className="text-indigo-600" size={40} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">Select an Endpoint</h2>
                <p className="text-gray-500 max-w-md mx-auto mb-8">
                  Choose an existing endpoint from the sidebar or create a new one to start capturing webhooks.
                </p>
                <button 
                  onClick={() => setIsCreating(true)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Create Your First Endpoint
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
