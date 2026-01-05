const DB_NAME = 'SMART_GYM_DATA';
const MASTER_NIP = '0000'; 

let db = JSON.parse(localStorage.getItem(DB_NAME)) || { socios: [], pagos: [] };
let inputNip = '';

// NIP
function addPin(n) { if(inputNip.length < 4) { inputNip += n; document.getElementById('pin-input').value = '•'.repeat(inputNip.length); } }
function clearPin() { inputNip = ''; document.getElementById('pin-input').value = ''; }
function checkPin() {
    if(inputNip === MASTER_NIP) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
    } else { alert('NIP INCORRECTO'); clearPin(); }
}

// NAVEGACION
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

// REGISTRO Y TICKET
function processRegistration() {
    const name = document.getElementById('reg-name').value.toUpperCase();
    const start = document.getElementById('reg-start').value;
    const end = document.getElementById('reg-end').value;
    const total = parseFloat(document.getElementById('reg-cost').value);
    const pay = parseFloat(document.getElementById('reg-pay').value || 0);
    const method = document.getElementById('reg-method').value;
    
    if(!name || !start) return alert("DATOS INCOMPLETOS");

    // Guardar Socio (Actualiza si ya existe)
    const indexSocio = db.socios.findIndex(s => s.nombre === name);
    if(indexSocio > -1) {
        db.socios[indexSocio].vence = end;
        db.socios[indexSocio].deuda = total - pay;
    } else {
        db.socios.unshift({ id: Date.now(), nombre: name, vence: end, deuda: total - pay });
    }

    // Guardar Pago
    db.pagos.unshift({ fecha: new Date().toLocaleDateString(), socio: name, monto: pay, metodo: method });

    save();
    generateTicket(name, pay, method, end);
    document.getElementById('reg-name').value = "";
    router('socios');
}

function generateTicket(nombre, monto, metodo, vence) {
    const win = window.open('', '', 'width=300,height=400');
    win.document.write(`
        <div style="font-family:monospace; text-align:center; width:250px;">
            <h2>SMART GYM CENTER</h2>
            <p>COMPROBANTE DE PAGO</p>
            <hr>
            <p align="left">FECHA: ${new Date().toLocaleDateString()}</p>
            <p align="left">SOCIO: ${nombre}</p>
            <p align="left">MONTO: $${monto}</p>
            <p align="left">MÉTODO: ${metodo}</p>
            <p align="left">VENCE EL: ${vence}</p>
            <hr>
            <p>¡ENTRENA SIN LÍMITES!</p>
        </div>
    `);
    win.print(); win.close();
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
    grid.innerHTML = db.socios.filter(s => s.nombre.includes(search)).map(s => `
        <div class="card-socio">
            <div><strong>${s.nombre}</strong><br><small>VENCE: ${s.vence}</small></div>
            <div>
                <span style="color:${s.deuda > 0 ? '#ff0000' : '#00ff88'}">$${s.deuda}</span>
                <button class="btn-action renovate" onclick="renovar('${s.nombre}')">RENOVAR</button>
                <button class="btn-action delete" onclick="deleteSocio(${s.id})">❌</button>
            </div>
        </div>
    `).join('');
}

function renovar(nombre) {
    document.getElementById('reg-name').value = nombre;
    router('registro');
}

function deleteSocio(id) {
    if(confirm("¿ELIMINAR SOCIO?")) { db.socios = db.socios.filter(s => s.id !== id); save(); renderSocios(); }
}

function renderFinanzas() {
    const tbody = document.getElementById('tbody-finanzas');
    tbody.innerHTML = db.pagos.map(p => `
        <tr><td>${p.fecha}</td><td>${p.socio}</td><td>$${p.monto}</td><td>${p.metodo}</td></tr>
    `).join('');
}

function save() { localStorage.setItem(DB_NAME, JSON.stringify(db)); updateDashboard(); }
function logout() { location.reload(); }