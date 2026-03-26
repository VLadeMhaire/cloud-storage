// Secure Cloud Storage Application
class CloudStorageApp {
    constructor() {
        this.files = [];
        this.currentView = 'grid';
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.user = null;
        this.storageLimit = 100 * 1024 * 1024; // 100MB in bytes
        
        this.init();
    }
    
    init() {
        this.cacheDom();
        this.bindEvents();
        this.loadFiles();
        this.checkAuth();
        this.updateUI();
    }
    
    cacheDom() {
        this.fileContainer = document.getElementById('fileContainer');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.querySelector('.upload-btn');
        this.fileFilter = document.getElementById('fileFilter');
        this.searchInput = document.getElementById('searchInput');
        this.gridViewBtn = document.getElementById('gridView');
        this.listViewBtn = document.getElementById('listView');
        this.authBtn = document.getElementById('authBtn');
        this.storageUsedBar = document.getElementById('storageUsed');
        this.storageText = document.getElementById('storageText');
        this.previewModal = document.getElementById('previewModal');
        this.toast = document.getElementById('toast');
    }
    
    bindEvents() {
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.fileFilter.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.renderFiles();
        });
        this.searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.renderFiles();
        });
        this.gridViewBtn.addEventListener('click', () => this.setView('grid'));
        this.listViewBtn.addEventListener('click', () => this.setView('list'));
        this.authBtn.addEventListener('click', () => this.handleAuth());
        
        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            this.previewModal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === this.previewModal) {
                this.previewModal.style.display = 'none';
            }
        });
    }
    
    async handleAuth() {
        if (this.user) {
            this.user = null;
            localStorage.removeItem('user');
            this.showToast('Signed out successfully', 'success');
            this.updateUI();
        } else {
            // Simple demo authentication
            const email = prompt('Enter your email:');
            if (email && email.includes('@')) {
                this.user = { email, id: Date.now().toString() };
                localStorage.setItem('user', JSON.stringify(this.user));
                this.showToast('Signed in successfully!', 'success');
                this.updateUI();
                this.loadFiles();
            } else {
                this.showToast('Please enter a valid email', 'error');
            }
        }
    }
    
    checkAuth() {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
        }
        this.updateUI();
    }
    
    updateUI() {
        if (this.user) {
            this.authBtn.style.display = 'none';
            const userInfo = document.getElementById('userInfo');
            const userEmail = document.getElementById('userEmail');
            userInfo.style.display = 'flex';
            userEmail.textContent = this.user.email;
        } else {
            this.authBtn.style.display = 'block';
            document.getElementById('userInfo').style.display = 'none';
        }
    }
    
    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        
        if (!this.user) {
            this.showToast('Please sign in to upload files', 'error');
            return;
        }
        
        // Check storage limit
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const currentUsage = this.getCurrentStorageUsage();
        
        if (currentUsage + totalSize > this.storageLimit) {
            this.showToast('Storage limit exceeded!', 'error');
            return;
        }
        
        const uploadProgress = document.getElementById('uploadProgress');
        uploadProgress.style.display = 'block';
        
        for (const file of files) {
            try {
                await this.uploadFile(file);
                this.showToast(`Uploaded: ${file.name}`, 'success');
            } catch (error) {
                console.error('Upload failed:', error);
                this.showToast(`Failed to upload: ${file.name}`, 'error');
            }
        }
        
        uploadProgress.style.display = 'none';
        this.fileInput.value = '';
        await this.loadFiles();
    }
    
    async uploadFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                const fileData = {
                    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: e.target.result,
                    uploadedAt: new Date().toISOString(),
                    userId: this.user.id
                };
                
                // Save to localStorage for demo
                // In production, this would be a Vercel Blob API call
                this.saveFileToStorage(fileData);
                resolve(fileData);
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    saveFileToStorage(fileData) {
        const files = this.getStoredFiles();
        files.push(fileData);
        localStorage.setItem(`files_${this.user.id}`, JSON.stringify(files));
        this.updateStorageStats();
    }
    
    getStoredFiles() {
        if (!this.user) return [];
        const files = localStorage.getItem(`files_${this.user.id}`);
        return files ? JSON.parse(files) : [];
    }
    
    getCurrentStorageUsage() {
        const files = this.getStoredFiles();
        return files.reduce((sum, file) => sum + file.size, 0);
    }
    
    updateStorageStats() {
        const used = this.getCurrentStorageUsage();
        const percentage = (used / this.storageLimit) * 100;
        this.storageUsedBar.style.width = `${percentage}%`;
        
        const usedMB = (used / (1024 * 1024)).toFixed(1);
        const limitMB = (this.storageLimit / (1024 * 1024)).toFixed(0);
        this.storageText.textContent = `${usedMB} MB / ${limitMB} MB used`;
    }
    
    async loadFiles() {
        if (!this.user) {
            this.fileContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <p>Please sign in to view your files</p>
                </div>
            `;
            return;
        }
        
        this.files = this.getStoredFiles();
        this.updateStorageStats();
        this.renderFiles();
    }
    
    renderFiles() {
        let filteredFiles = this.filterFiles();
        
        if (filteredFiles.length === 0) {
            this.fileContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>No files found</p>
                </div>
            `;
            return;
        }
        
        this.fileContainer.className = this.currentView === 'grid' ? 'file-grid' : 'file-grid list-view';
        
        const html = filteredFiles.map(file => this.createFileCard(file)).join('');
        this.fileContainer.innerHTML = html;
        
        // Bind file action events
        document.querySelectorAll('.file-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.file-actions')) {
                    const fileId = card.dataset.id;
                    const file = this.files.find(f => f.id === fileId);
                    this.previewFile(file);
                }
            });
            
            const deleteBtn = card.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const fileId = card.dataset.id;
                    this.deleteFile(fileId);
                });
            }
        });
    }
    
    filterFiles() {
        let filtered = this.files;
        
        // Apply filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(file => this.getFileCategory(file.type) === this.currentFilter);
        }
        
        // Apply search
        if (this.searchTerm) {
            filtered = filtered.filter(file => 
                file.name.toLowerCase().includes(this.searchTerm)
            );
        }
        
        return filtered;
    }
    
    getFileCategory(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
        return 'other';
    }
    
    getFileIcon(file) {
        const category = this.getFileCategory(file.type);
        const icons = {
            image: '<i class="fas fa-image"></i>',
            video: '<i class="fas fa-video"></i>',
            document: '<i class="fas fa-file-alt"></i>',
            other: '<i class="fas fa-file"></i>'
        };
        return icons[category] || icons.other;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    createFileCard(file) {
        const icon = this.getFileIcon(file);
        const size = this.formatFileSize(file.size);
        const date = new Date(file.uploadedAt).toLocaleDateString();
        
        return `
            <div class="file-card" data-id="${file.id}">
                <div class="file-icon">${icon}</div>
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${this.truncateName(file.name)}</div>
                    <div class="file-size">${size} • ${date}</div>
                </div>
                <div class="file-actions">
                    <button class="delete-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    truncateName(name, maxLength = 25) {
        if (name.length <= maxLength) return name;
        const ext = name.split('.').pop();
        const nameWithoutExt = name.slice(0, name.lastIndexOf('.'));
        const truncated = nameWithoutExt.slice(0, maxLength - ext.length - 3);
        return `${truncated}...${ext}`;
    }
    
    previewFile(file) {
        const previewContent = document.getElementById('previewContent');
        
        if (file.type.startsWith('image/')) {
            previewContent.innerHTML = `
                <img src="${file.data}" style="max-width: 100%; max-height: 70vh; display: block; margin: 0 auto;">
                <div class="preview-info" style="margin-top: 1rem; text-align: center;">
                    <p><strong>${file.name}</strong></p>
                    <p>Size: ${this.formatFileSize(file.size)}</p>
                    <p>Uploaded: ${new Date(file.uploadedAt).toLocaleString()}</p>
                    <a href="${file.data}" download="${file.name}" class="download-btn">Download</a>
                </div>
            `;
        } else {
            previewContent.innerHTML = `
                <div class="preview-info" style="text-align: center;">
                    <i class="fas fa-file-alt" style="font-size: 4rem; margin-bottom: 1rem;"></i>
                    <p><strong>${file.name}</strong></p>
                    <p>Type: ${file.type || 'Unknown'}</p>
                    <p>Size: ${this.formatFileSize(file.size)}</p>
                    <p>Uploaded: ${new Date(file.uploadedAt).toLocaleString()}</p>
                    <a href="${file.data}" download="${file.name}" class="download-btn">Download</a>
                </div>
            `;
        }
        
        this.previewModal.style.display = 'block';
    }
    
    deleteFile(fileId) {
        if (confirm('Are you sure you want to delete this file?')) {
            let files = this.getStoredFiles();
            files = files.filter(f => f.id !== fileId);
            localStorage.setItem(`files_${this.user.id}`, JSON.stringify(files));
            this.loadFiles();
            this.showToast('File deleted successfully', 'success');
        }
    }
    
    setView(view) {
        this.currentView = view;
        this.gridViewBtn.classList.toggle('active', view === 'grid');
        this.listViewBtn.classList.toggle('active', view === 'list');
        this.renderFiles();
    }
    
    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the application
const app = new CloudStorageApp();