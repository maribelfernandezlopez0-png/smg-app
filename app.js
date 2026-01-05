const DB_NAME = 'SMART_GYM_DATA';
const MASTER_NIP = '0000'; // Cambia tu NIP aquí

let db = JSON.parse(localStorage.getItem(DB_NAME)) || { socios: [], pagos: [] };
let inputNip = '';

// SISTEMA DE NIP
function addPin(n) { if(inputNip.length < 4) { inputNip += n; document.getElementById('pin-input').value = '•'.repeat(inputNip.length); } }
function clearPin() { inputNip = ''; document.getElementById('pin-input').value = ''; }
function checkPin() {
    if(inputNip === MASTER_NIP) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        initApp();
    } else { alert('NIP INCORRECTO'); clearPin(); }
}

// NAVEGACIÓN
function router(v) {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('view-' + v).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
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
        document.getElementById('reg-pay').value = plan;
    }
}

// PROCESAR PAGO Y MEMBRESÍA
function processRegistration() {
    const name = document.getElementById('reg-name').value.toUpperCase();
    const end = document.getElementById('reg-end').value;
    const total = parseFloat(document.getElementById('reg-cost').value);
    const pay = parseFloat(document.getElementById('reg-pay').value || 0);
    const method = document.getElementById('reg-method').value;

    if(!name) return alert("INGRESE EL NOMBRE DEL SOCIO");

    const index = db.socios.findIndex(s => s.nombre === name);
    if(index > -1) {
        db.socios[index].vence = end;
        db.socios[index].deuda = Math.max(0, total - pay);
    } else {
        db.socios.unshift({ id: Date.now(), nombre: name, vence: end, deuda: total - pay });
    }

    db.pagos.unshift({ fecha: new Date().toLocaleDateString(), socio: name, monto: pay, metodo: method });
    
    save();
    generateTicket(name, pay, method, end);
    document.getElementById('reg-name').value = "";
    router('socios');
}

// LIQUIDAR SOLO DEUDA (SIN CAMBIAR VENCIMIENTO)
function liquidarDeuda(nombre) {
    const socio = db.socios.find(s => s.nombre === nombre);
    const monto = prompt(`El socio ${nombre} debe $${socio.deuda}. ¿Cuánto paga hoy?`, socio.deuda);
    if (!monto || parseFloat(monto) <= 0) return;

    const pago = parseFloat(monto);
    const metodo = prompt("¿MÉTODO? (EFECTIVO / TRANSFERENCIA)", "EFECTIVO").toUpperCase();

    socio.deuda = Math.max(0, socio.deuda - pago);
    db.pagos.unshift({ fecha: new Date().toLocaleDateString(), socio: nombre + " (PAGO DEUDA)", monto: pago, metodo: metodo });

    save();
    generateTicket(nombre, pago, metodo, socio.vence + " (SALDADO)");
    renderSocios();
}

// DISEÑO DE TICKET PROFESIONAL
function generateTicket(n, m, mt, v) {
    const w = window.open('', '', 'width=350,height=500');
    w.document.write(`
        <html><head><style>
            body { font-family: 'Courier New', Courier, monospace; width: 280px; padding: 20px; text-align: center; }
            .box { border: 2px double #000; padding: 15px; }
            .total { background: #000; color: #fff; padding: 10px; margin: 15px 0; font-size: 20px; font-weight: bold; }
            .info { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
        </style></head><body>
            <div class="box">
                <h2>💪 SMART GYM</h2><p>CENTER</p>
                <hr>
                <div class="info"><span>CLIENTE:</span><span>${n}</span></div>
                <div class="info"><span>MÉTODO:</span><span>${mt}</span></div>
                <div class="total">PAGO: $${m}</div>
                <div class="info"><span>VENCE:</span><b>${v.replace(" (SALDADO)", "")}</b></div>
                <hr>
                <p>NO HAY REEMBOLSOS<br><b>¡ENTRENA CON TODO!</b></p>
            </div>
            <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);};</script>
        </body></html>`);
}

// DASHBOARD
function updateDashboard() {
    const hoy = new Date().toISOString().split('T')[0];
    const activos = db.socios.filter(s => s.vence >= hoy).length;
    const deuda = db.socios.reduce((a, s) => a + s.deuda, 0);
    document.getElementById('dash-total').innerText = db.socios.length;
    document.getElementById('dash-active').innerText = activos;
    document.getElementById('dash-debt').innerText = '$' + deuda;
}

// LISTADO DE SOCIOS
function renderSocios() {
    const grid = document.getElementById('grid-socios');
    const search = document.getElementById('search-bar').value.toUpperCase();
    grid.innerHTML = db.socios.filter(s => s.nombre.includes(search)).map(s => `
        <div class="card-socio">
            <div><strong>${s.nombre}</strong><br><small>VENCE: ${s.vence}</small></div>
            <div style="text-align:right">
                <span style="display:block; font-weight:bold; color:${s.deuda > 0 ? 'red':'#0f8'}">$${s.deuda}</span>
                ${s.deuda > 0 ? `<button class="btn-ren" style="border-color:#ffc107; color:#ffc107; margin-right:5px;" onclick="liquidarDeuda('${s.nombre}')">COBRAR DEUDA</button>` : ''}
                <button class="btn-ren" onclick="renovar('${s.nombre}')">RENOVAR</button>
                <button class="btn-ren" style="border-color:red; color:red; margin-left:5px;" onclick="eliminarSocio(${s.id})">🗑️</button>
            </div>
        </div>`).join('');
}

function renovar(n) {
    const socio = db.socios.find(s => s.nombre === n);
    document.getElementById('reg-name').value = n;
    if(socio && socio.deuda > 0) alert("Recordatorio: El socio debe $" + socio.deuda);
    router('registro');
}

function eliminarSocio(id) { if(confirm("¿ELIMINAR SOCIO PERMANENTEMENTE?")) { db.socios = db.socios.filter(s => s.id !== id); save(); renderSocios(); } }

function renderFinanzas() {
    document.getElementById('tbody-finanzas').innerHTML = db.pagos.map(p => 
        `<tr><td>${p.fecha}</td><td>${p.socio}</td><td>$${p.monto}</td><td>${p.metodo}</td></tr>`).join('');
}

function save() { localStorage.setItem(DB_NAME, JSON.stringify(db)); updateDashboard(); }
function logout() { location.reload(); }

// ACTIVAR PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => console.log('Smart Gym Ready')).catch(err => console.log(err));
}