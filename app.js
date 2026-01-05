const DB_NAME = 'SMART_GYM_DATA';
const MASTER_NIP = '0000'; // Tu NIP secreto

let db = JSON.parse(localStorage.getItem(DB_NAME)) || { socios: [], pagos: [] };
let inputNip = '';

function addPin(n) { if(inputNip.length < 4) { inputNip += n; document.getElementById('pin-input').value = '•'.repeat(inputNip.length); } }
function clearPin() { inputNip = ''; document.getElementById('pin-input').value = ''; }
function checkPin() {
    if(inputNip === MASTER_NIP) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
    } else { alert('NIP INCORRECTO'); clearPin(); }
}

function router(v) {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('view-' + v).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    if(event) event.currentTarget.classList.add('active');
    if(v === 'socios') renderSocios();
    if(v === 'finanzas') renderFinanzas();
    if(v === 'dashboard') updateDashboard();
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
    }
}

function processRegistration() {
    const name = document.getElementById('reg-name').value.toUpperCase();
    const end = document.getElementById('reg-end').value;
    const total = parseFloat(document.getElementById('reg-cost').value);
    const pay = parseFloat(document.getElementById('reg-pay').value || 0);
    const method = document.getElementById('reg-method').value;

    if(!name) return alert("INGRESE NOMBRE");

    const index = db.socios.findIndex(s => s.nombre === name);
    if(index > -1) {
        db.socios[index].vence = end;
        db.socios[index].deuda = total - pay;
    } else {
        db.socios.unshift({ id: Date.now(), nombre: name, vence: end, deuda: total - pay });
    }

    db.pagos.unshift({ fecha: new Date().toLocaleDateString(), socio: name, monto: pay, metodo: method });
    
    save();
    generateTicket(name, pay, method, end);
    document.getElementById('reg-name').value = "";
    router('socios');
}

function generateTicket(n, m, mt, v) {
    const w = window.open('', '', 'width=300,height=400');
    w.document.write(`<html><body style="font-family:monospace;text-align:center;">
        <h2>SMART GYM</h2><hr><p>SOCIO: ${n}</p><p>PAGO: $${m}</p>
        <p>METODO: ${mt}</p><p>VENCE: ${v}</p><hr><p>¡DALE CON TODO!</p>
        <script>window.print();window.close();</script></body></html>`);
}

function updateDashboard() {
    const hoy = new Date().toISOString().split('T')[0];
    const activos = db.socios.filter(s => s.vence >= hoy).length;
    const deuda = db.socios.reduce((a, s) => a + s.deuda, 0);
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
            <div><span style="color:${s.deuda > 0 ? 'red':'#0f8'}">$${s.deuda}</span>
            <button class="btn-ren" onclick="renovar('${s.nombre}')">RENOVAR</button></div>
        </div>`).join('');
}

function renovar(n) { document.getElementById('reg-name').value = n; router('registro'); }
function renderFinanzas() {
    document.getElementById('tbody-finanzas').innerHTML = db.pagos.map(p => 
        `<tr><td>${p.fecha}</td><td>${p.socio}</td><td>$${p.monto}</td><td>${p.metodo}</td></tr>`).join('');
}

function save() { localStorage.setItem(DB_NAME, JSON.stringify(db)); updateDashboard(); }
function logout() { location.reload(); }

// Registro Service Worker para PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
}