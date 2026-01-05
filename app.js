const DB_NAME = 'SMART_GYM_DATA';
const MASTER_NIP = '0000'; 

let db = JSON.parse(localStorage.getItem(DB_NAME)) || { socios: [], pagos: [] };
let inputNip = '';

// SISTEMA NIP
function addPin(num) {
    if(inputNip.length < 4) {
        inputNip += num;
        document.getElementById('pin-input').value = '•'.repeat(inputNip.length);
    }
}
function clearPin() { inputNip = ''; document.getElementById('pin-input').value = ''; }
function checkPin() {
    if(inputNip === MASTER_NIP) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
    } else {
        alert('NIP INCORRECTO');
        clearPin();
    }
}

// ROUTER
function router(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => {
        m.classList.remove('active');
        if(m.innerText.toLowerCase().includes(view)) m.classList.add('active');
    });

    if(view === 'socios') renderSocios();
    if(view === 'finanzas') renderFinanzas();
    if(view === 'dashboard') updateDashboard();
}

function initApp() {
    document.getElementById('reg-start').valueAsDate = new Date();
    calcDates();
    updateDashboard();
}

function calcDates() {
    const plan = document.getElementById('reg-plan').value;
    const start = document.getElementById('reg-start').value;
    const days = (plan === "150") ? 7 : 30;
    
    if(start) {
        let d = new Date(start + 'T00:00:00');
        d.setDate(d.getDate() + days);
        document.getElementById('reg-end').value = d.toISOString().split('T')[0];
        document.getElementById('reg-cost').value = plan;
        document.getElementById('reg-pay').value = plan;
    }
}

function processRegistration() {
    const name = document.getElementById('reg-name').value.toUpperCase();
    const end = document.getElementById('reg-end').value;
    const total = parseFloat(document.getElementById('reg-cost').value);
    const pay = parseFloat(document.getElementById('reg-pay').value || 0);
    
    if(!name || !end) return alert("FALTA EL NOMBRE");

    db.socios.unshift({
        id: Date.now(),
        nombre: name,
        vence: end,
        deuda: total - pay
    });

    db.pagos.unshift({
        fecha: new Date().toLocaleDateString(),
        socio: name,
        monto: pay
    });

    save();
    alert("REGISTRO EXITOSO");
    document.getElementById('reg-name').value = "";
    router('socios');
}

function updateDashboard() {
    const hoy = new Date().toISOString().split('T')[0];
    const activos = db.socios.filter(s => s.vence >= hoy).length;
    const deuda = db.socios.reduce((acc, s) => acc + s.deuda, 0);

    document.getElementById('dash-total').innerText = db.socios.length;
    document.getElementById('dash-active').innerText = activos;
    document.getElementById('dash-debt').innerText = '$' + deuda;
}

function renderSocios() {
    const grid = document.getElementById('grid-socios');
    const search = document.getElementById('search-bar').value.toUpperCase();
    if(!grid) return;
    
    grid.innerHTML = db.socios
        .filter(s => s.nombre.includes(search))
        .map(s => `
        <div class="card-socio">
            <div>
                <strong>${s.nombre}</strong><br>
                <small style="color:#666">VENCE: ${s.vence}</small>
            </div>
            <div style="display:flex; align-items:center; gap:20px">
                <span style="color:${s.deuda > 0 ? '#ff0000' : '#00ff88'}; font-weight:bold; font-family: 'Rajdhani'; font-size:20px;">
                    ${s.deuda > 0 ? 'DEBE: $' + s.deuda : 'PAGADO'}
                </span>
                <button class="btn-del" onclick="deleteSocio(${s.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function deleteSocio(id) {
    if(confirm("¿ELIMINAR ESTE SOCIO?")) {
        db.socios = db.socios.filter(s => s.id !== id);
        save();
        renderSocios();
    }
}

function renderFinanzas() {
    const tbody = document.getElementById('tbody-finanzas');
    if(!tbody) return;
    tbody.innerHTML = db.pagos.map(p => `
        <tr>
            <td>${p.fecha}</td>
            <td>${p.socio}</td>
            <td style="color:#00ff88">+$${p.monto}</td>
        </tr>
    `).join('');
}

function save() { 
    localStorage.setItem(DB_NAME, JSON.stringify(db)); 
    updateDashboard(); 
}
function logout() { location.reload(); }