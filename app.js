const app = {
    data: {
        kiosks: [
            { id: 'cea', name: 'Kiosk 1 (CEA)' },
            { id: 'cine', name: 'Kiosk 2 (CINE)' },
            { id: 'lasa', name: 'Kiosk 3 (LASA)' }
        ],
        items: [
            { id: 'cups', name: 'Cups', type: 'number' },
            { id: 'syrup', name: 'Syrup Bottles', type: 'number' },
            { id: 'clean', name: 'Counter Cleaned?', type: 'checkbox' }
        ],
        inventory: {}
    },
    
    guidedState: { queue: [], currentIndex: 0 },

    init() {
        this.loadData();
        this.renderOverview();
    },

    loadData() {
        const savedData = localStorage.getItem('kioskData');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            this.data.items = parsed.items || this.data.items;
            this.data.inventory = parsed.inventory || {};
        }
        this.data.kiosks.forEach(k => {
            if (!this.data.inventory[k.id]) this.data.inventory[k.id] = {};
            this.data.items.forEach(i => {
                if (!this.data.inventory[k.id][i.id]) {
                    this.data.inventory[k.id][i.id] = i.type === 'number' 
                        ? { current: '', bring: '' } 
                        : { checked: false };
                }
            });
        });
    },

    saveData() {
        localStorage.setItem('kioskData', JSON.stringify({
            items: this.data.items,
            inventory: this.data.inventory
        }));
    },

    resetShift() {
        if(confirm('Reset all counts for the new shift? Your item list will be saved.')) {
            this.data.inventory = {};
            this.loadData(); 
            this.saveData();
            this.renderOverview();
        }
    },

    renderOverview() {
        const content = document.getElementById('app-content');
        let html = `<div style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
                        <h2>Overview</h2>
                        <button class="danger" onclick="app.resetShift()">Reset Shift</button>
                    </div>`;

        this.data.kiosks.forEach(kiosk => {
            html += `<div class="card"><h3>${kiosk.name}</h3><div style="margin-top: 0.5rem;">`;
            this.data.items.forEach(item => {
                const val = this.data.inventory[kiosk.id][item.id];
                if (item.type === 'number') {
                    html += `<p><strong>${item.name}:</strong> Stock: ${val.current || 0} | Bring: ${val.bring || 0}</p>`;
                } else {
                    html += `<p><strong>${item.name}:</strong> ${val.checked ? '✅ Done' : '❌ Pending'}</p>`;
                }
            });
            html += `</div></div>`;
        });
        content.innerHTML = html;
    },

    renderManageItems() {
        const content = document.getElementById('app-content');
        let html = `<h2>Manage Items</h2>
                    <p style="margin-bottom: 1rem; color: #64748b;">Changes apply to all kiosks.</p>
                    <div class="card">
                        <input type="text" id="new-item-name" placeholder="Item Name (e.g. Napkins)" style="margin-bottom: 0.5rem;">
                        <select id="new-item-type" style="padding: 0.75rem; width: 100%; margin-bottom: 1rem;">
                            <option value="number">Stock/Count (Numbers)</option>
                            <option value="checkbox">Task (Checkbox)</option>
                        </select>
                        <button onclick="app.addItem()" style="width: 100%;">Add Item</button>
                    </div>`;

        this.data.items.forEach(item => {
            html += `<div class="card item-row" style="padding-bottom: 1rem; border: none;">
                        <span><strong>${item.name}</strong> (${item.type})</span>
                        <button class="danger" onclick="app.removeItem('${item.id}')">Remove</button>
                     </div>`;
        });
        content.innerHTML = html;
    },

    addItem() {
        const name = document.getElementById('new-item-name').value;
        const type = document.getElementById('new-item-type').value;
        if (!name) return alert('Please enter an item name');
        
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        this.data.items.push({ id, name, type });
        this.loadData(); 
        this.saveData();
        this.renderManageItems();
    },

    removeItem(id) {
        if(confirm('Remove this item from all kiosks?')) {
            this.data.items = this.data.items.filter(i => i.id !== id);
            this.saveData();
            this.renderManageItems();
        }
    },

    startGuidedAudit() {
        this.guidedState.queue = [];
        this.data.kiosks.forEach(kiosk => {
            this.data.items.forEach(item => {
                this.guidedState.queue.push({ kiosk, item });
            });
        });
        this.guidedState.currentIndex = 0;
        this.renderGuidedStep();
    },

    renderGuidedStep() {
        if (this.guidedState.currentIndex >= this.guidedState.queue.length) {
            alert('Audit Complete!');
            return this.renderOverview();
        }

        const step = this.guidedState.queue[this.guidedState.currentIndex];
        const val = this.data.inventory[step.kiosk.id][step.item.id];
        const content = document.getElementById('app-content');

        let inputHtml = '';
        if (step.item.type === 'number') {
            inputHtml = `
                <div style="display: flex; justify-content: space-between; margin-top: 1rem;">
                    <div class="input-group">
                        <label>Current Stock</label>
                        <input type="number" id="audit-current" value="${val.current}" pattern="[0-9]*" inputmode="numeric">
                    </div>
                    <div class="input-group">
                        <label>Need to Bring</label>
                        <input type="number" id="audit-bring" value="${val.bring}" pattern="[0-9]*" inputmode="numeric">
                    </div>
                </div>`;
        } else {
            inputHtml = `
                <div style="text-align: center; margin-top: 2rem;">
                    <label style="font-size: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 1rem;">
                        <input type="checkbox" id="audit-check" ${val.checked ? 'checked' : ''}>
                        Task Completed
                    </label>
                </div>`;
        }

        content.innerHTML = `
            <div class="card" style="padding: 2rem 1rem;">
                <h3 class="guided-kiosk-title">${step.kiosk.name}</h3>
                <h2 class="guided-item-title">${step.item.name}</h2>
                ${inputHtml}
                <div class="guided-controls">
                    <button class="secondary" onclick="app.guidedNavigate(-1)" ${this.guidedState.currentIndex === 0 ? 'disabled' : ''}>Previous</button>
                    <button onclick="app.guidedNavigate(1)">Next</button>
                </div>
                <p style="text-align: center; margin-top: 1rem; color: #64748b;">Step ${this.guidedState.currentIndex + 1} of ${this.guidedState.queue.length}</p>
            </div>
        `;
    },

    guidedNavigate(direction) {
        // Save current data before moving
        const step = this.guidedState.queue[this.guidedState.currentIndex];
        if (step.item.type === 'number') {
            this.data.inventory[step.kiosk.id][step.item.id].current = document.getElementById('audit-current').value;
            this.data.inventory[step.kiosk.id][step.item.id].bring = document.getElementById('audit-bring').value;
        } else {
            this.data.inventory[step.kiosk.id][step.item.id].checked = document.getElementById('audit-check').checked;
        }
        this.saveData();

        this.guidedState.currentIndex += direction;
        this.renderGuidedStep();
    }
};

app.init();
