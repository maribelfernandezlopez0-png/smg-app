/* --- BASE DE DATOS LOCAL (SIMULACIÓN SQL) --- */
const DB_KEY = 'SMG_TITAN_DB';
const PIN_KEY = 'SMG_TITAN_PIN';

// Estado Inicial
let db = JSON.parse(localStorage.getItem(DB_KEY)) || {
    users: [],       // { id, name, joined, phone, status }
    memberships: [], // { id, userId, planName, start, end, cost, paid, due }
    transactions: [] // { id, date, desc, amount, method, userId }
};

let currentPin = localStorage.getItem(PIN_KEY) || '0000';
let inputPin = '';
let currentUserId = null;

/* --- SISTEMA DE LOGIN --- */
function addPin(num) {
    if(inputPin.length < 4) {
        inputPin += num;
        document.getElementById('pin-input').value = inputPin;
    }
}
function clearPin() { inputPin = ''; document.getElementById('pin-input').value = ''; }
function checkPin() {
    if(inputPin === currentPin) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
    } else {
        alert('PIN INCORRECTO');
        clearPin();
        document.getElementById('pin-input').style.borderColor = 'red';
        setTimeout(() => document.getElementById('pin-input').style.borderColor = '#E50914', 500);
    }
}
function logout() { location.reload(); }

/* --- NÚCLEO DE LA APP --- */
function initApp() {
    updateDate();
    refreshDashboard();
    setInterval(updateDate, 60000); // Actualizar hora cada minuto
}

function saveDB() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    refreshDashboard(); // Reactividad simple
}

function router(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-'+viewId).classList.add('active');
    
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if(viewId === 'socios') renderSocios();
    if(viewId === 'finanzas') renderFinanzas();
}

function updateDate() {
    const d = new Date();
    document.getElementById('global-date').innerText = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

/* --- MÓDULO: REGISTRO --- */
function calcDates() {
    const planSelect = document.getElementById('reg-plan');
    const days = parseInt(planSelect.options[planSelect.selectedIndex].dataset.days);
    const cost = parseInt(planSelect.value);
    const startInput = document.getElementById('reg-start').value;

    document.getElementById('reg-cost').value = cost;
    document.getElementById('reg-pay').value = cost; // Por defecto paga todo

    if(startInput && days > 0) {
        let d = new Date(startInput + 'T00:00:00');
        d.setDate(d.getDate() + days);
        document.getElementById('reg-end').value = d.toISOString().split('T')[0];
    }
}

function processRegistration() {
    const name = document.getElementById('reg-name').value.toUpperCase();
    const planIdx = document.getElementById('reg-plan');
    const planName = planIdx.options[planIdx.selectedIndex].text;
    const start = document.getElementById('reg-start').value;
    const end = document.getElementById('reg-end').value;
    const total = parseFloat(document.getElementById('reg-cost').value);
    const paid = parseFloat(document.getElementById('reg-pay').value);
    const method = document.getElementById('reg-method').value;

    if(!name || !start) return alert("Faltan datos obligatorios");

    // 1. Crear o Buscar Usuario (Si ya existe, usamos el mismo ID)
    let user = db.users.find(u => u.name === name);
    let userId;
    
    if(user) {
        userId = user.id; // Usuario recurrente
    } else {
        userId = Date.now(); // Nuevo ID único
        db.users.push({ id: userId, name: name, joined: new Date().toISOString() });
    }

    // 2. Crear Membresía
    const due = total - paid;
    db.memberships.push({
        id: Date.now() + 1,
        userId: userId,
        plan: planName,
        start: start,
        end: end,
        cost: total,
        paid: paid,
        due: due,
        active: true
    });

    // 3. Registrar Transacción
    if(paid > 0) {
        db.transactions.unshift({
            id: Date.now() + 2,
            date: new Date().toLocaleString(),
            desc: `INSCRIPCIÓN: ${planName}`,
            amount: paid,
            method: method,
            userId: userId,
            ticketDue: due,
            ticketEnd: end
        });
        printLastTicket();
    }

    saveDB();
    alert("REGISTRO EXITOSO");
    document.getElementById('reg-name').value = "";
}

/* --- MÓDULO: SOCIOS & DASHBOARD --- */
function getStatus(userId) {
    // Busca la última membresía activa
    const m = db.memberships.filter(m => m.userId === userId && m.active).sort((a,b) => b.id - a.id)[0];
    if(!m) return { text: 'INACTIVO', class: 'expired', due: 0, end: '---' };
    
    const today = new Date().toISOString().split('T')[0];
    if(m.end < today) return { text: 'VENCIDO', class: 'expired', due: m.due, end: m.end, mid: m.id };
    return { text: 'ACTIVO', class: 'active', due: m.due, end: m.end, mid: m.id };
}

function refreshDashboard() {
    const total = db.users.length;
    let active = 0;
    let debt = 0;
    let monthIncome = 0;
    const currentMonth = new Date().getMonth();

    db.users.forEach(u => {
        const st = getStatus(u.id);
        if(st.text === 'ACTIVO') active++;
        debt += st.due;
    });

    db.transactions.forEach(t => {
        // Asumiendo que t.date es string local, usamos un chequeo simple
        // Para producción robusta, parsear mejor la fecha.
        monthIncome += t.amount; 
    });

    document.getElementById('dash-total').innerText = total;
    document.getElementById('dash-active').innerText = active;
    document.getElementById('dash-debt').innerText = '$' + debt;
    document.getElementById('dash-month').innerText = '$' + monthIncome; // Simplificado

    // Mini historial
    const tbody = document.getElementById('dash-history');
    tbody.innerHTML = db.transactions.slice(0, 5).map(t => {
        const u = db.users.find(u => u.id === t.userId);
        return `<tr><td>${t.date.split(',')[1]}</td><td>${u?u.name:'?'}</td><td>${t.desc}</td><td class="text-success">+$${t.amount}</td></tr>`;
    }).join('');
}

function renderSocios() {
    const filter = document.getElementById('search-input').value.toUpperCase();
    const grid = document.getElementById('grid-socios');
    grid.innerHTML = '';

    db.users.forEach(u => {
        if(!u.name.includes(filter)) return;
        const st = getStatus(u.id);
        
        // Lógica de pestañas (filtro global)
        const activeTab = document.querySelector('.filter-btn.active').innerText;
        if(activeTab === 'ACTIVOS' && st.text !== 'ACTIVO') return;
        if(activeTab === 'DEUDORES' && st.due <= 0) return;

        grid.innerHTML += `
            <div class="card-socio" onclick="openModal(${u.id})">
                <div class="status-dot st-${st.class}"></div>
                <div class="avatar">${u.name.charAt(0)}</div>
                <h4>${u.name}</h4>
                <p style="font-size:12px; color:#666; margin-top:5px;">${st.text}</p>
                ${st.due > 0 ? `<p style="color:var(--danger); font-weight:bold; font-size:12px">DEUDA: $${st.due}</p>` : ''}
            </div>
        `;
    });
}

function setFilter(type, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderSocios();
}

/* --- MODAL DETALLES --- */
function openModal(id) {
    currentUserId = id;
    const u = db.users.find(u => u.id === id);
    const st = getStatus(id);
    
    document.getElementById('m-name').innerText = u.name;
    document.getElementById('m-date').innerText = st.end;
    document.getElementById('m-debt').innerText = '$' + st.due;
    document.getElementById('modal-socio').style.display = 'flex';

    // Historial
    const hist = db.transactions.filter(t => t.userId === id).slice(0,5);
    document.getElementById('m-history-list').innerHTML = hist.map(t => `
        <li style="font-size:12px; padding:5px 0; border-bottom:1px solid #333; display:flex; justify-content:space-between;">
            <span>${t.date.split(',')[0]} - ${t.desc}</span>
            <span style="color:#10b981">$${t.amount}</span>
        </li>
    `).join('');
}

function closeModal() { document.getElementById('modal-socio').style.display = 'none'; }

function payDebt() {
    const amount = parseFloat(document.getElementById('pay-amount').value);
    const st = getStatus(currentUserId);
    
    if(!amount || amount <= 0) return alert("Monto inválido");
    if(st.due <= 0) return alert("Este usuario no tiene deuda en su membresía actual");

    // Buscar membresía actual y actualizar
    const mIdx = db.memberships.findIndex(m => m.id === st.mid);
    if(mIdx > -1) {
        db.memberships[mIdx].paid += amount;
        db.memberships[mIdx].due -= amount;
        
        // Registrar Transacción
        db.transactions.unshift({
            id: Date.now(),
            date: new Date().toLocaleString(),
            desc: "ABONO DEUDA",
            amount: amount,
            method: "EFECTIVO",
            userId: currentUserId,
            ticketDue: db.memberships[mIdx].due,
            ticketEnd: db.memberships[mIdx].end
        });
        
        saveDB();
        printLastTicket();
        closeModal();
        renderSocios();
        alert("Abono registrado");
    }
}

function quickRenew() {
    // Redirigir a registro con datos precargados
    closeModal();
    const u = db.users.find(u => u.id === currentUserId);
    document.getElementById('reg-name').value = u.name;
    router('registro');
    document.getElementById('reg-start').valueAsDate = new Date();
    calcDates();
}

function deleteUser() {
    if(confirm("¿ESTÁS SEGURO? Se borrará todo el historial de este socio.")) {
        db.users = db.users.filter(u => u.id !== currentUserId);
        db.memberships = db.memberships.filter(m => m.userId !== currentUserId);
        db.transactions = db.transactions.filter(t => t.userId !== currentUserId);
        saveDB();
        closeModal();
        renderSocios();
    }
}

/* --- MÓDULO: FINANZAS --- */
function renderFinanzas() {
    const tbody = document.getElementById('finance-body');
    tbody.innerHTML = db.transactions.map(t => {
        const u = db.users.find(u => u.id === t.userId);
        return `
            <tr>
                <td>${t.date}</td>
                <td>${u ? u.name : 'Borrado'}</td>
                <td>${t.desc}</td>
                <td>${t.method}</td>
                <td style="color:var(--success); font-weight:bold">$${t.amount}</td>
                <td><button onclick='rePrint(${JSON.stringify(t)})' style="background:none; border:none; color:white; cursor:pointer"><i class="fa-solid fa-print"></i></button></td>
            </tr>
        `;
    }).join('');
}

/* --- UTILS: IMPRESIÓN & DATA --- */
function printLastTicket() {
    const t = db.transactions[0];
    rePrint(t);
}

function rePrint(t) {
    const u = db.users.find(u => u.id === t.userId);
    document.getElementById('ticket-print').innerHTML = `
        <div style="text-align:center">
            <h3>SMG CENTER</h3>
            <p>COMPROBANTE DE PAGO</p>
            <p>----------------</p>
        </div>
        <p>FECHA: ${t.date}</p>
        <p>CLIENTE: ${u ? u.name : '---'}</p>
        <p>CONCEPTO: ${t.desc}</p>
        <p>----------------</p>
        <p style="font-size:14px; font-weight:bold">TOTAL PAGADO: $${t.amount}</p>
        <p>DEUDA RESTANTE: $${t.ticketDue || 0}</p>
        <p>VIGENCIA: ${t.ticketEnd || '---'}</p>
        <div style="text-align:center; margin-top:20px;">
            <p>¡Gracias por su preferencia!</p>
        </div>
    `;
    window.print();
}

function exportData() {
    const blob = new Blob([JSON.stringify(db)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'SMG_TITAN_BACKUP_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
}

function importData(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            db = JSON.parse(e.target.result);
            saveDB();
            alert("Base de datos restaurada correctamente");
            location.reload();
        } catch(err) {
            alert("Archivo corrupto o inválido");
        }
    };
    reader.readAsText(file);
}

function hardReset() {
    if(confirm("PELIGRO: ¿Borrar TODA la base de datos? No se puede deshacer.")) {
        if(prompt("Escribe 'BORRAR' para confirmar") === 'BORRAR') {
            localStorage.removeItem(DB_KEY);
            location.reload();
        }
    }
}

// Init Dates for Inputs
document.getElementById('reg-start').valueAsDate = new Date();
calcDates();