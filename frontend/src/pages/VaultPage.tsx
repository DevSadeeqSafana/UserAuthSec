import React, { useState, useEffect } from 'react';
import { getVaultItems, createVaultItem, deleteVaultItem, downloadVaultFile, getVaultStatus, setupVault, unlockVault } from '../services/vaultService';
import type { VaultItem } from '../services/vaultService';
import { Shield, Lock, Plus, Trash2, Key, FileText, Download, Eye, EyeOff, Loader2, Paperclip, File, ShieldAlert, KeyRound, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const VaultPage: React.FC = () => {
    const [items, setItems] = useState<VaultItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSetup, setIsSetup] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [vaultPassword, setVaultPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaRequired, setMfaRequired] = useState(false);
    
    // UI state
    const [showAddModal, setShowAddModal] = useState(false);
    const [visibleItems, setVisibleItems] = useState<Record<number, boolean>>({});
    
    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<'note' | 'password' | 'document' | 'file' | 'other'>('note');
    const [file, setFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    useEffect(() => {
        if (isUnlocked) {
            loadItems();
        }
    }, [isUnlocked]);

    const checkStatus = async () => {
        try {
            const result = await getVaultStatus();
            if (result.success) {
                setIsSetup(result.data.isSetup);
                setIsUnlocked(result.data.isUnlocked);
            }
        } catch (error) {
            toast.error('Failed to check vault status');
        } finally {
            setLoading(false);
        }
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const result = await setupVault(vaultPassword);
            if (result.success) {
                toast.success('Vault password set! Now unlock to access.');
                setIsSetup(true);
                setVaultPassword('');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Setup failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const result = await unlockVault(vaultPassword);
            if (result.mfaRequired) {
                setMfaRequired(true);
                toast.info('Verification required to unlock vault');
            } else if (result.success) {
                toast.success('Vault unlocked');
                setIsUnlocked(true);
                setVaultPassword('');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Unlock failed');
        } finally {
            setIsSaving(false);
        }
    };

    const loadItems = async () => {
        // Safety check: Don't fetch items if we know the vault is locked
        if (!isUnlocked) return;

        setLoading(true);
        try {
            const result = await getVaultItems();
            if (result.success) {
                setItems(result.data);
            }
        } catch (error: any) {
            if (error.response?.status === 403) {
                setIsUnlocked(false);
            }
            // Only show error toast if it's not a lock error
            if (error.response?.status !== 403) {
                toast.error('Failed to load items');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            if (content) formData.append('content', content);
            formData.append('category', file ? 'file' : category);
            if (file) formData.append('file', file);

            const result = await createVaultItem(formData);
            if (result.success) {
                toast.success(file ? 'File securely stored' : 'Secure item created');
                setShowAddModal(false);
                resetForm();
                loadItems();
            }
        } catch (error) {
            toast.error('Failed to save item');
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setCategory('note');
        setFile(null);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this sensitive item?')) return;
        
        try {
            const result = await deleteVaultItem(id);
            if (result.success) {
                toast.success('Item removed from vault');
                loadItems();
            }
        } catch (error) {
            toast.error('Failed to delete item');
        }
    };

    const handleDownload = async (item: VaultItem) => {
        if (!item.file) return;
        try {
            toast.loading('Preparing download...', { id: 'download' });
            await downloadVaultFile(item.id, item.file.name);
            toast.success('Download complete', { id: 'download' });
        } catch (error) {
            toast.error('Failed to download file', { id: 'download' });
        }
    };

    const toggleVisibility = (id: number) => {
        setVisibleItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="dashboard-container">
            {loading && !isUnlocked && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <Loader2 className="animate-spin text-primary" size={64} />
                    <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Securing connections...</p>
                </div>
            )}

            {!loading && !isSetup && (
                <div style={{ maxWidth: '500px', margin: '60px auto' }} className="glass-card">
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <ShieldAlert size={64} color="var(--primary)" style={{ margin: '0 auto 24px' }} />
                        <h2>Initialize Secure Vault</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Set a master password to protect your sensitive data. This is separate from your login password.</p>
                    </div>
                    <form onSubmit={handleSetup}>
                        <div className="input-group">
                            <label>Vault Master Password</label>
                            <input 
                                type="password"
                                value={vaultPassword} 
                                onChange={e => setVaultPassword(e.target.value)} 
                                placeholder="Create a strong vault password" 
                                required 
                            />
                        </div>
                        <div style={{ marginTop: '32px' }}>
                            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                                Create Vault
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!loading && isSetup && !isUnlocked && (
                <div style={{ maxWidth: '500px', margin: '60px auto' }} className="glass-card">
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <Lock size={64} color="var(--primary)" style={{ margin: '0 auto 24px' }} />
                        <h2>Vault is Locked</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Enter your master password to decrypt your secrets.</p>
                    </div>

                    {mfaRequired ? (
                        <form onSubmit={(e) => { e.preventDefault(); toast.error('MFA implementation pending...'); }}>
                            <div className="input-group">
                                <label>MFA Verification Code</label>
                                <input 
                                    type="text"
                                    value={mfaCode} 
                                    onChange={e => setMfaCode(e.target.value)} 
                                    placeholder="6-digit code from email" 
                                    required 
                                />
                            </div>
                            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '24px' }}>
                                Verify & Unlock
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleUnlock}>
                            <div className="input-group">
                                <label>Vault Password</label>
                                <input 
                                    type="password"
                                    value={vaultPassword} 
                                    onChange={e => setVaultPassword(e.target.value)} 
                                    placeholder="Enter vault password" 
                                    required 
                                />
                            </div>
                            <div style={{ marginTop: '32px' }}>
                                <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Unlock size={20} /> Unlock Vault
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {isUnlocked && (
                <>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Unlock size={32} className="text-primary" />
                                Secure Vault
                            </h1>
                            <p style={{ color: 'var(--text-muted)' }}>Encrypted storage for your most sensitive data and files</p>
                        </div>
                        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={20} /> Add Item
                        </button>
                    </header>

                    <div style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', display: 'grid', gap: '24px' }}>
                        <AnimatePresence>
                            {items.length === 0 ? (
                                <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px' }}>
                                    <Shield size={64} style={{ margin: '0 auto 24px', opacity: 0.2 }} />
                                    <h3>Your vault is empty</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>Store passwords, secure notes, and sensitive files here.</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="glass-card vault-card"
                                        style={{ position: 'relative', overflow: 'hidden' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', color: 'var(--primary)' }}>
                                                    {item.file ? <File size={20} /> : item.category === 'password' ? <Key size={20} /> : <FileText size={20} />}
                                                </div>
                                                <div>
                                                    <h4 style={{ margin: 0 }}>{item.title}</h4>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.category}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {!item.file && (
                                                    <button onClick={() => toggleVisibility(item.id)} className="icon-btn">
                                                        {visibleItems[item.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                )}
                                                {item.file && (
                                                    <button onClick={() => handleDownload(item)} className="icon-btn text-primary">
                                                        <Download size={18} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(item.id)} className="icon-btn text-error">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {item.file ? (
                                            <div className="vault-content" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)' }}>
                                                <Paperclip size={16} color="var(--text-muted)" />
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.file.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatSize(item.file.size)} • {item.file.type}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`vault-content ${visibleItems[item.id] ? 'visible' : 'masked'}`}>
                                                {visibleItems[item.id] ? item.content : '••••••••••••••••••••'}
                                            </div>
                                        )}

                                        <div style={{ marginTop: '16px', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                            Added: {new Date(item.updated_at).toLocaleString()}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </>
            )}

            {/* Add Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="glass-card modal-content" 
                            onClick={e => e.stopPropagation()}
                            style={{ maxWidth: '500px', width: '90%' }}
                        >
                            <h2 style={{ marginBottom: '24px' }}>Protect New Secret</h2>
                            <form onSubmit={handleCreate}>
                                <div className="input-group">
                                    <label>Title / Description</label>
                                    <input 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)} 
                                        placeholder={file ? file.name : "e.g. Master WiFi Password"} 
                                        required={!file} 
                                    />
                                </div>
                                
                                {!file && (
                                    <>
                                        <div className="input-group" style={{ marginTop: '16px' }}>
                                            <label>Category</label>
                                            <select value={category} onChange={e => setCategory(e.target.value as any)}>
                                                <option value="note">Secure Note</option>
                                                <option value="password">Password</option>
                                                <option value="document">Sensitive Doc Info</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="input-group" style={{ marginTop: '16px' }}>
                                            <label>Secret Content</label>
                                            <textarea 
                                                value={content} 
                                                onChange={e => setContent(e.target.value)} 
                                                placeholder="Enter sensitive information here..." 
                                                required={!file}
                                                rows={4}
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="input-group" style={{ marginTop: '24px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Paperclip size={16} /> 
                                        {file ? 'Selected File' : 'Attach File (Optional)'}
                                    </label>
                                    <div style={{ marginTop: '8px' }}>
                                        {file ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px dashed var(--primary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <File size={20} className="text-primary" />
                                                    <span style={{ fontSize: '0.9rem' }}>{file.name}</span>
                                                </div>
                                                <button type="button" onClick={() => setFile(null)} className="icon-btn text-error">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div 
                                                onClick={() => document.getElementById('vault-file-input')?.click()}
                                                style={{ padding: '20px', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                                className="upload-dropzone"
                                            >
                                                <Plus size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to upload a sensitive file</div>
                                                <input 
                                                    id="vault-file-input"
                                                    type="file" 
                                                    style={{ display: 'none' }} 
                                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                                    <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={isSaving} style={{ flex: 1 }}>
                                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Secure & Store'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{ __html: `
                .vault-card {
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .vault-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px rgba(0,0,0,0.3);
                }
                .icon-btn {
                    background: rgba(255,255,255,0.05);
                    border: none;
                    color: var(--text-muted);
                    padding: 8px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .icon-btn:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                }
                .icon-btn.text-error:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }
                .vault-content {
                    background: rgba(0,0,0,0.2);
                    padding: 16px;
                    border-radius: 8px;
                    font-family: monospace;
                    word-break: break-all;
                    min-height: 50px;
                }
                .vault-content.masked {
                    letter-spacing: 2px;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(8px);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-content {
                    width: 100%;
                }
            `}} />
        </div>
    );
};

export default VaultPage;
