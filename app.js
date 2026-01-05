// CONFIGURACIÓN INICIAL
const DB_NAME = 'SMART_GYM_DATA';
const MASTER_NIP = '0000'; // Cambia tu NIP aquí

let db = JSON.parse(localStorage.getItem(DB_NAME)) || {
    socios: [],
    pagos: []
};

let inputNip = '';

// --- SISTEMA DE ACCESO (NIP) ---
function addPin(num) {
    if(inputNip.length < 4) {
        inputNip += num;
        document.getElementById('pin-input').value = '•'.repeat(inputNip.length);
    }
}

function clearPin() {
    inputNip = '';
    document.getElementById('pin-input').value = '';
}

function checkPin() {
    if(inputNip === MASTER_NIP) {
        document.getElementById('login-screen').style.fadeOut = "slow";
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
    } else {
        alert('NIP INCORRECTO');
        clearPin();
    }
}

// --- NAVEGACIÓN ---
function router(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if(view === 'socios') renderSocios();
    if(view === 'finanzas') renderFinanzas();
    if(view === 'dashboard') updateDashboard();
}

// --- LÓGICA DE NEGOCIO ---
function initApp() {
    updateDashboard();
    // Pre-configurar fecha de hoy en registro
    if(document.getElementById('reg-start')) {
        document.getElementById('reg-start').valueAsDate = new Date();
        calcDates();
    }
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
    const pay = parseFloat(document.getElementById('reg-pay').value);
    
    if(!name || !end) return alert("COMPLETE LOS DATOS");

    const deuda = total - pay;
    const nuevoSocio = {
        id: Date.now(),
        nombre: name,
        vence: end,
        deuda: deuda,
        status: (new Date(end) >= new Date()) ? 'ACTIVO' : 'VENCIDO'
    };

    db.socios.unshift(nuevoSocio);
    db.pagos.unshift({
        fecha: new Date().toLocaleString(),
        socio: name,
        monto: pay,
        concepto: 'MEMBRESÍA'
    });

    save();
    alert("REGISTRO EXITOSO EN SMART GYM CENTER");
    router('socios');
}

function updateDashboard() {
    const hoy = new Date().toISOString().split('T')[0];
    const activos = db.socios.filter(s => s.vence >= hoy).length;
    const deudaTotal = db.socios.reduce((acc, s) => acc + s.deuda, 0);
    
    // Inyectar en el HTML si existen los IDs
    if(document.getElementById('dash-total')) document.getElementById('dash-total').innerText = db.socios.length;
    if(document.getElementById('dash-active')) document.getElementById('dash-active').innerText = activos;
    if(document.getElementById('dash-debt')) document.getElementById('dash-debt').innerText = '$' + deudaTotal;
}

function renderSocios() {
    const container = document.getElementById('grid-socios'); // Asegúrate que este ID exista en tu HTML
    if(!container) return;
    
    container.innerHTML = db.socios.map(s => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div>
                <h3 style="color:var(--primary)">${s.nombre}</h3>
                <p style="font-size:12px">VENCE: ${s.vence}</p>
            </div>
            <div style="text-align:right">
                <span class="badge" style="color:${s.deuda > 0 ? 'var(--danger)' : 'var(--success)'}">
                    ${s.deuda > 0 ? 'DEBE: $' + s.deuda : 'PAGADO'}
                </span>
            </div>
        </div>
    `).join('');
}

function save() {
    localStorage.setItem(DB_NAME, JSON.stringify(db));
}

function logout() {
    location.reload();
}