import api from './apiService';

export interface VaultItem {
    id: number;
    title: string;
    content: string | null;
    file: {
        name: string;
        size: number;
        type: string;
    } | null;
    category: 'note' | 'password' | 'document' | 'file' | 'other';
    updated_at: string;
}

export const getVaultStatus = async () => {
    const response = await api.get('/vault/status');
    return response.data;
};

export const setupVault = async (password: string) => {
    const response = await api.post('/vault/setup', { password });
    return response.data;
};

export const unlockVault = async (password: string) => {
    const response = await api.post('/vault/unlock', { password });
    return response.data;
};

export const getVaultItems = async () => {
    const response = await api.get('/vault');
    return response.data;
};

export const createVaultItem = async (data: FormData) => {
    const response = await api.post('/vault', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const downloadVaultFile = async (id: number, fileName: string) => {
    const response = await api.get(`/vault/download/${id}`, {
        responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
};

export const deleteVaultItem = async (id: number) => {
    const response = await api.delete(`/vault/${id}`);
    return response.data;
};
