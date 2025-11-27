// ==UserScript==
// @name         APT TOTAL PARA CLIENTES ANYDESK <versión 4.1.9>
// @namespace    http://tampermonkey.net/
// @version      4.1.9
// @description  v4.1.9: Corrección crítica de seguridad. Bloqueo total si la clave es incorrecta.
// @author       Gemini
// @match        https://apt.cfia.or.cr/APT2/*
// @icon         https://apt.cfia.or.cr/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// ===============================================================
//  SISTEMA DE SEGURIDAD APT-ANYDESK (v-4.1.9)
// ===============================================================

// 🔐 CONFIGURACIÓN DE CLAVE
const CLIENT_PASS = '11aa'; 

(function () {
    'use strict';

    // --- 1. VALIDACIÓN DE SEGURIDAD ---
    function validarAcceso() {
        // Recuperar credenciales enviadas por el Lanzador v-2.0
        var passIngresado = window.__APT_CLIENT_PASS__;
        var token         = window.__TYKO_SECURE_TOKEN__;

        // Limpieza inmediata de variables globales para no dejar rastro
        window.__APT_CLIENT_PASS__ = null;
        window.__TYKO_SECURE_TOKEN__ = null;
        try { delete window.__APT_CLIENT_PASS__; delete window.__TYKO_SECURE_TOKEN__; } catch (e) {}

        // A) Verificar Token del Lanzador (Evita ejecución manual sin lanzador)
        if (token !== 'ACCESO-TYKO-OK') {
            console.error('⛔ [APT-SEC] Intento de ejecución sin Lanzador oficial.');
            return false;
        }

        // B) Verificar Contraseña
        if (passIngresado !== CLIENT_PASS) {
            console.error('⛔ [APT-SEC] Clave incorrecta.');
            alert('⛔ ACCESO DENEGADO\n\nLa clave ingresada es incorrecta.');
            
            // ACCIÓN CRÍTICA: Si la clave está mal, borramos la memoria del lanzador y recargamos
            // para obligar a pedirla de nuevo.
            sessionStorage.removeItem('apt_client_session_pass'); 
            location.reload(); 
            
            return false;
        }

        console.log('%c✅ [APT-SEC] Acceso Autorizado. Iniciando v-4.1.9...', 'color: #00FF00; font-weight: bold;');
        return true;
    }

    // Si la validación falla, CORTAMOS AQUÍ. No se lee nada más.
    if (!validarAcceso()) {
        return;
    }

    // ===============================================================
    //  SI LLEGAMOS AQUÍ, LA CLAVE ES CORRECTA.
    //  SE EJECUTA EL SISTEMA COMPLETO.
    // ===============================================================

    iniciarSistema();

    function iniciarSistema() {
        
        // --- SECCIÓN DE HERRAMIENTAS ---
        function log(message) { console.log(`[APT Unificado] ${message}`); }
        function superClick(el) { if (!el) return; try { el.focus({ preventScroll: true }); ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(function(t) { el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); }); el.click(); } catch (e) { console.error("superClick falló:", e); } }
        function fireChangeLike(el) { if (!el) return; ['input', 'keyup', 'change', 'blur'].forEach(function(t) { el.dispatchEvent(new Event(t, { bubbles: true })); }); }
        const visible = function(el) { return !!el && el.offsetParent !== null && el.getClientRects().length > 0; };

        // --- "CEREBRO" ORQUESTADOR ÚNICO ---
        (function bootstrap() {
            log('Iniciando Orquestador v4.1.9...');

            // Variable global para rastrear archivos subidos
            window.archivosSubidosEnP7 = new Set();

            // --- INICIO CÓDIGO (Estrategia Global de Pegado General) ---
            document.addEventListener('paste', function(e) {
                if (e.target && typeof e.target.id !== 'undefined') {
                    const targetId = e.target.id;
                    const camposPermitidos = ['txtareareal', 'txtAreaReal', 'txtAreaRegistro', 'txtTotalCFIA', 'txtMontoCIT_NTRIP', 'txtTotalRegistro', 'txtMontoPagado'];
                    if (camposPermitidos.includes(targetId)) {
                        log(`[Habilitar Pegado] Evento "paste" detectado en "${targetId}". Permitiendo...`);
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                    }
                }
            }, true);
            log('Módulo "Habilitar Pegado Global" activado.');

            // --- MÓDULO SATÉLITE 2: IR A MENU PLANOS ---
            function iniciarModuloIrAPlanos() {
                if (!window.location.href.endsWith('/Home')) return;
                log('Activando módulo "IR A MENU PLANOS"...');
                let estado = "BUSCANDO_PLANOS";
                let contadorIntentos = 0;
                const intervalo = setInterval(function() {
                    contadorIntentos++;
                    if (estado === "BUSCANDO_PLANOS") {
                        const menuPlanos = Array.from(document.querySelectorAll('a.list-group-item')).find(function(el) { return el.textContent.trim().includes('Planos'); });
                        if (menuPlanos) {
                            log('Módulo IR A PLANOS: Menú "Planos" encontrado. Dando clic...');
                            menuPlanos.click();
                            estado = "BUSCANDO_CONSULTA";
                        }
                    }
                    if (estado === "BUSCANDO_CONSULTA") {
                        const submenuConsulta = Array.from(document.querySelectorAll('a.text-reset')).find(function(el) { return el.textContent.trim() === 'Consulta'; });
                        if (submenuConsulta && visible(submenuConsulta)) {
                            log('Módulo IR A PLANOS: Submenú "Consulta" encontrado. Dando clic...');
                            submenuConsulta.click();
                            estado = "TERMINADO";
                        }
                    }
                    if (estado === "TERMINADO" || contadorIntentos > 30) clearInterval(intervalo);
                }, 500);
            }
            iniciarModuloIrAPlanos();

            // --- MÓDULO SATÉLITE 3: DESCARGAR PDF ---
            (function() {
                log('Activando módulo "DESCARGAR PDF"...');
                const pdfLog = function() { console.log('[PDF-RENAME]', ...arguments); };
                let PREFIJO_PLANO = '';
                const TEXTO_CLAVE_PDF = 'Plano Seleccionado:';

                function extraerPrefijo(node) {
                    const raw = (node.innerText || node.textContent || '').replace(/\u00A0/g, ' ').trim();
                    if (!raw.includes(TEXTO_CLAVE_PDF)) return null;
                    return raw.split(TEXTO_CLAVE_PDF).slice(1).join(TEXTO_CLAVE_PDF).trim() || null;
                }
                function buscarYActualizarPrefijo() {
                    const nodos = document.querySelectorAll('.row.divSticky h3, h3, .divSticky h3');
                    for (let i = 0; i < nodos.length; i++) { const v = extraerPrefijo(nodos[i]); if (v) { PREFIJO_PLANO = v; return; } }
                }
                new MutationObserver(buscarYActualizarPrefijo).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
                document.addEventListener('click', async function(ev) {
                    const btn = ev.target.closest('a.btn.btn-sm.btn-outline-success');
                    if (!btn) return;
                    ev.preventDefault(); ev.stopPropagation(); if (!PREFIJO_PLANO) buscarYActualizarPrefijo();
                    try {
                        const resp = await fetch(btn.href, { credentials: 'include' }); if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                        const cd = resp.headers.get('content-disposition'); let original = 'archivo.pdf';
                        if (cd) { let m = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i) || cd.match(/filename\s*=\s*"([^"]+)"/i) || cd.match(/filename\s*=\s*([^;]+)/i); if (m && m[1]) original = decodeURIComponent(m[1].replace(/"/g, '').trim()); }
                        const nombreFinal = `${PREFIJO_PLANO} ${original}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
                        pdfLog(`Renombrando archivo a: "${nombreFinal}"`);
                        const blob = await resp.blob();
                        const blobUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = blobUrl; a.download = nombreFinal;
                        document.body.appendChild(a);
                        a.click(); a.remove(); URL.revokeObjectURL(blobUrl);
                    } catch (e) { pdfLog('Fallo descarga renombrada:', e); window.location.href = btn.href; }
                }, true);
            })();

            // --- MÓDULO SATÉLITE 4: REINGRESO AUTOMÁTICO ---
            (function() {
                log('Activando módulo "REINGRESO AUTOMÁTICO"...');
                if (window.__APT_RN_AUTOGUARDAR__) return;
                window.__APT_RN_AUTOGUARDAR__ = true;

                const TICK_MS = 200, TIMEOUT_MS = 45000;
                const reingresoLog = function() { console.log('[APT-RN]', ...arguments); };
                const byTextContains = function(root, sel, txt) {
                    if (!root) return null;
                    const els = root.querySelectorAll(sel);
                    txt = (txt || '').toLowerCase();
                    for (let i = 0; i < els.length; i++) { if ((els[i].textContent || '').toLowerCase().includes(txt)) return els[i]; }
                    return null;
                };
                const planosActiva = function() { return visible(document.querySelector('a#plano-tab[aria-selected="true"], a#plano-tab.active')); };
                const panelTramiteVisible = function() {
                    const prn = document.querySelector('#PRN.accordion-collapse.show');
                    if (!visible(prn)) return false;
                    return visible(byTextContains(prn, 'h4, h5', 'Seleccione el tipo de tramite'));
                };
                const reingresoSeleccionado = function() {
                    const s = document.querySelector('#ddlTipoTramiteRN');
                    if (!visible(s)) return false;
                    return /reingreso/i.test(s.options[s.selectedIndex].text);
                };
                const getBotonGuardar = function() { return (document.querySelector('#PRN button[onclick^="GuardarTramiteRN"]') || document.querySelector('button.btn.btn-outline-primary[onclick^="Guardar"]')); };
                
                let notificacionMostrada = false;
                const mostrarNotificacion = function() {
                    if (notificacionMostrada) return;
                    notificacionMostrada = true;
                    const notificacion = document.createElement('div');
                    notificacion.textContent = 'REINGRESO ACTIVADO';
                    const estiloID = 'estilo-parpadeo-reingreso';
                    if (!document.getElementById(estiloID)) {
                        const estilo = document.createElement('style');
                        estilo.id = estiloID;
                        estilo.innerHTML = `@keyframes parpadeo-reingreso { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }`;
                        document.head.appendChild(estilo);
                    }
                    Object.assign(notificacion.style, {
                        position: 'fixed', bottom: '20px', right: '20px', padding: '18px 30px', backgroundColor: '#FFC300', color: 'red',
                        fontWeight: 'bold', fontSize: '18px', zIndex: '99999', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        textAlign: 'center', animation: 'parpadeo-reingreso 2s linear 3'
                    });
                    document.body.appendChild(notificacion);
                    setTimeout(function() { notificacion.remove(); }, 6000);
                };

                let clicked = false, stop = false, start = Date.now();
                const tryRun = function() {
                    if (stop || Date.now() - start > TIMEOUT_MS) {
                        if (!stop) { stop = true; obs.disconnect(); clearInterval(int); clearInterval(intSwal); }
                        return;
                    }
                    if (!planosActiva()) { if (clicked) clicked = false; notificacionMostrada = false; return; }
                    if (!clicked && panelTramiteVisible() && reingresoSeleccionado()) {
                        const btn = getBotonGuardar();
                        if (visible(btn)) { mostrarNotificacion(); clicked = true; reingresoLog('Clic al disquete'); btn.click(); }
                    }
                };
                const obs = new MutationObserver(tryRun);
                obs.observe(document.documentElement, { childList: true, subtree: true });
                const int = setInterval(tryRun, TICK_MS);
                const closeSwal = function() {
                    const pop = document.querySelector('.swal2-popup.swal2-show');
                    if (!visible(pop)) return false;
                    const title = document.querySelector('#swal2-title'), msg = document.querySelector('#swal2-html-container');
                    if (title && (/enviado/i.test(title.textContent) || /atención/i.test(title.textContent)) && msg && /guardado exitosamente/i.test(msg.textContent)) {
                        const btn = document.querySelector('button.swal2-confirm.swal2-styled');
                        if (btn) { btn.click(); return true; }
                    }
                    return false;
                };
                const intSwal = setInterval(function() { closeSwal(); }, 120);
            })();

            // --- MÓDULO SATÉLITE 5: PLANO MODIFICAR EN CONTRATO ---
            (function() {
                if (!window.location.href.includes('/APT2/Contrato/Nuevo')) return;
                log('Activando módulo "PLANO MODIFICAR CONTRATO"...');
                function procesarCampos() {
                    const campoPlano = document.querySelector("#txtNumPlanoModificar");
                    const campoAnno = document.querySelector("#txtAnnoModificar");
                    if (!campoPlano || !campoAnno) return;
                    campoPlano.removeAttribute("maxlength"); campoPlano.removeAttribute("pattern"); campoPlano.classList.remove("solonumeros");
                    campoPlano.readOnly = false; campoPlano.disabled = false;
                    campoPlano.onkeypress = null; campoPlano.onkeydown = null; campoPlano.oninput = null; campoPlano.onpaste = null;
                    ["keypress","keydown","keyup","input","beforeinput","paste"].forEach(t => campoPlano.addEventListener(t, e => e.stopPropagation(), true));
                    function procesarFormato() {
                        const raw = campoPlano.value.trim();
                        const match = raw.match(/^([A-Za-z]{1,2})-(\d+)-(\d{4})$/);
                        if (!match) return;
                        campoPlano.value = match[2];
                        window.APT_ANNO_PLANO_MODIFICAR = match[3];
                        campoAnno.value = match[3];
                        log("[Plano Modificar] Procesado -> " + match[2] + "-" + match[3]);
                    }
                    campoPlano.addEventListener("input", procesarFormato); campoPlano.addEventListener("change", procesarFormato); campoPlano.addEventListener("blur", procesarFormato);
                    campoPlano.addEventListener("paste", function() { setTimeout(procesarFormato, 0); });
                }
                const intv = setInterval(function() { if (document.querySelector("#txtNumPlanoModificar") && document.querySelector("#txtAnnoModificar")) { procesarCampos(); clearInterval(intv); } }, 300);
            })();

            // --- MÓDULO SATÉLITE: TARIFA-CATASTROS ---
            function activarCalculadoraHonorarios() {
                const areaInput = document.getElementById('txtareareal'), honorariosInput = document.getElementById('txtValorAproximadoHonorarios');
                if (visible(areaInput) && visible(honorariosInput) && !areaInput.hasAttribute('data-calc-attached')) {
                    log('Activando módulo "TARIFA-CATASTROS"...');
                    const interpolar = (x, x1, y1, x2, y2) => y1 + (x - x1) * ((y2 - y1) / (x2 - x1));
                    areaInput.addEventListener('input', function(event) {
                        const area = parseFloat(event.target.value) || 0;
                        let honorarios = 0;
                        if (area <= 306) honorarios = 100758.50;
                        else if (area < 1000) honorarios = interpolar(area, 307, 101066.47, 999, 192413.89);
                        else if (area <= 22375) honorarios = 300000.00;
                        else if (area <= 24999) honorarios = interpolar(area, 22375, 300000.00, 24999, 317100.54);
                        else if (area <= 29999) honorarios = interpolar(area, 24999, 317100.54, 29999, 347367.39);
                        else if (area <= 39999) honorarios = interpolar(area, 29999, 347367.39, 39999, 401106.99);
                        else if (area <= 49999) honorarios = interpolar(area, 39999, 401106.99, 49999, 448452.36);
                        else if (area <= 99999) honorarios = interpolar(area, 49999, 448452.36, 99999, 634210.59);
                        else if (area <= 149999) honorarios = interpolar(area, 99999, 634210.59, 149999, 776747.46);
                        else if (area <= 199999) honorarios = interpolar(area, 149999, 776747.46, 199999, 896911.46);
                        else if (area <= 249999) honorarios = interpolar(area, 199999, 896911.46, 249999, 1002777.99);
                        else if (area <= 349999) honorarios = interpolar(area, 249999, 1002777.99, 349999, 1186503.60);
                        else if (area <= 449999) honorarios = interpolar(area, 349999, 1186503.60, 449999, 1345369.05);
                        else if (area <= 849999) honorarios = interpolar(area, 449999, 1345369.05, 849999, 1849033.87);
                        else if (area <= 999999) honorarios = interpolar(area, 849999, 1849033.87, 999999, 2005559);
                        else honorarios = 2005559;
                        const resultado = Math.round(honorarios);
                        if (honorariosInput.value != resultado) { honorariosInput.value = resultado; fireChangeLike(honorariosInput); }
                    });
                    areaInput.setAttribute('data-calc-attached', 'true');
                }
            }
            setInterval(activarCalculadoraHonorarios, 1000);

            // --- MÓDULO SATÉLITE: APT-PANELES ---
            function iniciarModuloAptPaneles() {
                const url = window.location.href;
                if (!url.startsWith('https://apt.cfia.or.cr/APT2/Home') && !url.startsWith('https://apt.cfia.or.cr/APT2/Plano/Consulta')) return;
                log('Activando módulo "APT-PANELES"...');
                const DEFAULTS = { cfiaW: "120px", cfiaH: "auto", barraW: "100%", barraH: "20px", sidebarW: "125px", panelScale: "1.40", panelAjustesScale: "1.0", menuTexto: "16px", menuIcono: "0.4em", menuEspacio: "2px" };
                const LS = { get: (k,f)=>localStorage.getItem(k)||f, set: (k,v)=>{try{localStorage.setItem(k,v)}catch(e){}} };
                const state = { cfiaW: LS.get('cfiaW', DEFAULTS.cfiaW), cfiaH: LS.get('cfiaH', DEFAULTS.cfiaH), barraW: LS.get('barraW', DEFAULTS.barraW), barraH: LS.get('barraH', DEFAULTS.barraH), sidebarW: LS.get('sidebarW', DEFAULTS.sidebarW), panelScale: LS.get('panelScale', DEFAULTS.panelScale), panelAjustesScale: LS.get('panelAjustesScale', DEFAULTS.panelAjustesScale) };
                const q=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
                function addStyle(css) { const s=document.createElement("style"); s.textContent=css; document.head.appendChild(s); }
                function findLogoCFIA() { return q('img[src*="Logo-CFIA-esencial"], img[alt*="LogoCFIA"]') || Array.from(document.images).find(im=>/logo[-_]?cfia/i.test(im.src)||/LogoCFIA/i.test(im.alt)); }
                function findBarraColegios() { return q('img[src*="Logos_Coleg"], img[src*="Logos-Coleg"]') || Array.from(document.images).find(im=>/logos[_-]?coleg/i.test(im.src)); }
                function injectGlobalCSS() {
                    addStyle(`
                        :root { --sidebar-w: ${state.sidebarW}; --panel-scale: ${state.panelScale}; --panel-ajustes-scale: ${state.panelAjustesScale}; }
                        nav#sidebarMenu, #sidebarMenu, .sidebar { width: var(--sidebar-w) !important; min-width: var(--sidebar-w) !important; max-width: var(--sidebar-w) !important; }
                        #main-content, #main-contain, .main-content { margin-left: var(--sidebar-w) !important; padding: 0 !important; width: calc(100% - var(--sidebar-w)) !important; max-width: none !important; }
                        .container, .container-fluid, .wizard-card, .card { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                        .table,table{ table-layout:auto!important; width:100%!important; } .table th,.table td{ white-space:nowrap!important; text-overflow:clip!important; }
                        nav#sidebarMenu .list-group-item span { font-size: ${DEFAULTS.menuTexto} !important; letter-spacing: ${DEFAULTS.menuEspacio} !important; } 
                        nav#sidebarMenu .list-group-item i { font-size: ${DEFAULTS.menuIcono} !important; }
                        .apt-panel-escala { transform: scale(var(--panel-scale)); transform-origin: top left; width: calc(100% / var(--panel-scale)) !important; }
                    `);
                }
                function applyLogoSizes(t) { if(t.logo){t.logo.style.width=state.cfiaW;t.logo.style.height=state.cfiaH;} if(t.barra){t.barra.style.width=state.barraW;t.barra.style.height=state.barraH;} }
                function applyPanelScale() { const s=state.panelScale||DEFAULTS.panelScale; document.documentElement.style.setProperty('--panel-scale', s); const p=q('.wizard-card')||q('#main-content'); if(p) p.classList.add('apt-panel-escala'); }
                function applyPanelAjustesScale() { document.documentElement.style.setProperty('--panel-ajustes-scale', state.panelAjustesScale||DEFAULTS.panelAjustesScale); }
                function aplicarFluido() { const w = q("#sidebarMenu")?Math.round(q("#sidebarMenu").getBoundingClientRect().width):125; $$('#main-content').forEach(el=>{el.style.setProperty('width',`calc(100% - ${w}px)`,'important'); el.style.setProperty('margin-left',`${w}px`,'important');}); }
                function applySidebarWidth() { document.documentElement.style.setProperty('--sidebar-w', state.sidebarW); setTimeout(aplicarFluido, 50); }
                function createControlPanel(t) {
                    const panel=document.createElement('div'); panel.id='tm-cfia-panel';
                    panel.innerHTML=`<div class="tmc-header"><span>⚙️ Ajustes Layout</span><button id="tmcOcultar">Ocultar</button></div>
                        <div class="tmc-controls-wrapper">
                            <div class="tmc-block"><div class="tmc-title">Layout General</div><label class="tmc-row"><span>Sidebar:</span><input id="sidebarW" type="text" value="${state.sidebarW}"></label><div class="tmc-btns"><button id="sidebarMenos">-</button><button id="sidebarMas">+</button></div>
                            <div class="tmc-inner-row"><div class="tmc-inner-col"><label class="tmc-row"><span>Escala Cont:</span><input id="panelScale" type="text" value="${state.panelScale}"></label><div class="tmc-btns"><button id="scaleMenos">-</button><button id="scaleMas">+</button></div></div>
                            <div class="tmc-inner-col"><label class="tmc-row"><span>Escala UI:</span><input id="panelAjustesScale" type="text" value="${state.panelAjustesScale}"></label><div class="tmc-btns"><button id="panelAjustesMenos">-</button><button id="panelAjustesMas">+</button></div></div></div><div class="tmc-btns"><button id="layoutReset">Reset</button></div></div>
                            <div class="tmc-block"><div class="tmc-title">Logo CFIA</div><label class="tmc-row"><span>Ancho:</span><input id="cfiaW" type="text" value="${state.cfiaW}"></label><div class="tmc-btns"><button id="cfiaMenos">-</button><button id="cfiaMas">+</button><button id="cfiaReset">Reset</button></div></div>
                        </div>`;
                    const css=document.createElement('style'); css.textContent=`#tm-cfia-panel{position:relative; z-index:9999; background:rgba(18,18,18,.92); color:#eee; border:2px solid yellow; border-radius:12px; font-family:sans-serif; font-size:13px; min-width:680px; margin-left:20px; padding:6px; transform:scale(calc(var(--panel-ajustes-scale) / var(--panel-scale))); transform-origin:top right;} #tm-cfia-panel .tmc-header{display:flex; justify-content:space-between; padding:5px; border-bottom:2px solid magenta; font-weight:700;} .tmc-controls-wrapper{display:flex;} .tmc-block{flex:1; padding:0 10px;} .tmc-row{display:flex; align-items:center; gap:5px; margin:5px 0;} input{background:#111; color:#fff; border:1px solid #444; padding:5px; flex:1;} button{background:#164e63; color:#eee; border:1px solid #444; padding:5px; cursor:pointer; flex:1;} button:hover{background:#155e75;}`;
                    const h2=q('body #main-content h2, body .wizard-card h2'); if(h2 && h2.parentElement){ const tc=h2.parentElement; tc.style.display='flex'; tc.style.justifyContent='space-between'; document.head.appendChild(css); tc.appendChild(panel); } else return;
                    const $=id=>panel.querySelector('#'+id);
                    const bump=(k,d,u,f)=>{ const v=parseFloat(state[k]); if(isNaN(v))return; state[k]=f?(v+d).toFixed(2):(v+d)+u; LS.set(k,state[k]); if(k==='sidebarW')applySidebarWidth(); else if(k.includes('Scale')){applyPanelScale();applyPanelAjustesScale();} else applyLogoSizes(t); $(k).value=state[k]; };
                    $('sidebarMas').onclick=()=>bump('sidebarW',10,'px'); $('sidebarMenos').onclick=()=>bump('sidebarW',-10,'px');
                    $('scaleMas').onclick=()=>bump('panelScale',0.05,'',true); $('scaleMenos').onclick=()=>bump('panelScale',-0.05,'',true);
                    $('panelAjustesMas').onclick=()=>bump('panelAjustesScale',0.1,'',true); $('panelAjustesMenos').onclick=()=>bump('panelAjustesScale',-0.1,'',true);
                    $('cfiaMas').onclick=()=>bump('cfiaW',10,'px'); $('cfiaMenos').onclick=()=>bump('cfiaW',-10,'px');
                    $('layoutReset').onclick=()=>{state.sidebarW=DEFAULTS.sidebarW; state.panelScale=DEFAULTS.panelScale; state.panelAjustesScale=DEFAULTS.panelAjustesScale; LS.set('sidebarW',state.sidebarW); LS.set('panelScale',state.panelScale); applySidebarWidth(); applyPanelScale(); applyPanelAjustesScale(); $('sidebarW').value=state.sidebarW; $('panelScale').value=state.panelScale;};
                    $('cfiaReset').onclick=()=>{state.cfiaW=DEFAULTS.cfiaW; LS.set('cfiaW',state.cfiaW); applyLogoSizes(t); $('cfiaW').value=state.cfiaW;};
                    $('tmcOcultar').onclick=()=>panel.remove();
                }
                injectGlobalCSS(); applySidebarWidth(); applyPanelScale(); applyPanelAjustesScale();
                try{new ResizeObserver(()=>{aplicarFluido();applyPanelScale();}).observe(document.documentElement);}catch(e){}
                let intentos=0; const h=setInterval(()=>{ intentos++; const l=findLogoCFIA(), b=findBarraColegios(); if(q('body #main-content h2')){ applyLogoSizes({logo:l,barra:b}); createControlPanel({logo:l,barra:b}); clearInterval(h); } if(intentos>40) clearInterval(h); }, 400);
            }
            iniciarModuloAptPaneles();

            // --- MÓDULO SATÉLITE: GESTOR DE ARCHIVOS UNIFICADO ---
            (function() {
                log('Activando módulo "GESTOR DE ARCHIVOS UNIFICADO"...');
                // (A) ARCHIVOS EN UNA LÍNEA
                (function() {
                    const estiloID = 'estilo-archivos-compactos';
                    const COLORES = { ANVERSO:'#1E90FF', ENTERO:'#32CD32', DERROTERO:'#FF8C00', MINUTA:'#FF00FF', IMAGEN:'#00CED1', DEFAULT:'#E0E0E0' };
                    if (!document.getElementById(estiloID)) {
                        const s = document.createElement("style"); s.id = estiloID;
                        s.textContent = `.linea-unificada { display:flex; gap:10px; align-items:center; font-size:13px; color:#495057; padding:3px 0; margin-bottom:8px; } .linea-unificada span{white-space:nowrap;} .descripcion-archivo{font-weight:600;} .desc-anverso{color:${COLORES.ANVERSO}!important;} .desc-entero{color:${COLORES.ENTERO}!important;} .desc-derrotero{color:${COLORES.DERROTERO}!important;} .desc-minuta{color:${COLORES.MINUTA}!important;} .desc-imagen{color:${COLORES.IMAGEN}!important;} #ULArchivos li.list-group-item{padding:0.01rem!important; border-bottom:2px solid #FF6600!important;}`;
                        document.head.appendChild(s);
                    }
                    function getColorClass(txt) { txt=(txt||'').toUpperCase(); if(txt.includes('IMAGEN'))return'desc-imagen'; if(txt.includes('MINUTA'))return'desc-minuta'; if(txt.includes('ANVERSO'))return'desc-anverso'; if(txt.includes('ENTERO'))return'desc-entero'; if(txt.includes('DERROTERO'))return'desc-derrotero'; return 'desc-default'; }
                    window.runArchivosEnUnaLinea = function() {
                        const lista = document.querySelector("#ULArchivos"); if (!lista) return;
                        window.archivosSubidosEnP7.clear();
                        lista.querySelectorAll("li.list-group-item").forEach(li => {
                            let ds = li.querySelector(".linea-unificada .descripcion-archivo");
                            if (ds) { window.archivosSubidosEnP7.add(ds.textContent.trim().toUpperCase()); return; }
                            const lbls = li.querySelectorAll("label"); if (lbls.length < 3) return;
                            let desc = lbls[0].textContent.replace(/Descripción:|Oficial/gi,"").replace(/MINUTAPDF/i,"MINUTA").replace(/IMAGEN\s*MINUTA/i,"IMAGEN-MINUTA").trim().toUpperCase();
                            window.archivosSubidosEnP7.add(desc);
                            const fecha = lbls[1].textContent.trim(), tipo = lbls[2].textContent.trim();
                            const div = document.createElement("div"); div.className = "linea-unificada";
                            div.innerHTML = `<span class="descripcion-archivo ${getColorClass(desc)}">${desc}</span> | <span>${fecha}</span> | <span>${tipo}</span>`;
                            const f = li.querySelector("div"); if (f) li.insertBefore(div, f);
                            lbls.forEach(l => l.style.display = "none");
                        });
                    }
                })();
                // (B) GESTOR Y AUTO-CARGAR
                (function() {
                    let panelArchivosVisible = false, observerArchivos = null, autoCargarIniciado = false;
                    function gestionarTipoArchivoPorDefecto() {
                        const sel = document.getElementById('ddlTipoArchivo'); if (!sel || !visible(sel)) return;
                        const sub = Array.from(window.archivosSubidosEnP7);
                        let busq = "anverso";
                        if (sub.some(s=>s.includes('MINUTA')&&!s.includes('IMAGEN')) && sub.some(s=>s.includes('IMAGEN-MINUTA'))) busq = "anverso";
                        else if (sub.some(s=>s.includes('ANVERSO')) && sub.some(s=>s.includes('ENTERO'))) busq = "derrotero";
                        else if (sub.some(s=>s.includes('ANVERSO'))) busq = "entero";
                        const opt = Array.from(sel.options).find(o => new RegExp(busq,'i').test(o.textContent));
                        if (opt && sel.value !== opt.value) { sel.value = opt.value; fireChangeLike(sel); }
                    }
                    function ajustarEspacio() { const f = document.querySelector('#P7 .accordion-body > .row'); if(f) { const hay = document.querySelector('#ULArchivos li.list-group-item'); f.style.display = hay ? '' : 'none'; } }
                    function iniciarAutoCargar() {
                        if (autoCargarIniciado) return; autoCargarIniciado = true;
                        let lastTitle = null;
                        const clickCargar = (t) => { const b = document.getElementById('btnCargarArchivo'); if(b) { b.click(); lastTitle = t; } };
                        const proc = (inp) => {
                            if(inp.dataset.aptaObs) return; inp.dataset.aptaObs='1';
                            new MutationObserver(ms => { ms.forEach(m => { if(m.attributeName==='title'){ const t=(inp.getAttribute('title')||'').trim(); if(t && t!==lastTitle) setTimeout(()=>clickCargar(t),400); } }); }).observe(inp, {attributes:true, attributeFilter:['title']});
                            const ini = (inp.getAttribute('title')||'').trim(); if(ini) lastTitle = ini;
                        };
                        const find = () => { const ips = document.querySelectorAll('input.file-caption-name'); if(ips.length){ ips.forEach(proc); return true; } return false; };
                        let i = 0; const t = setInterval(() => { if(find() || ++i>15) clearInterval(t); }, 700);
                        new MutationObserver(ms => { ms.forEach(m => { m.addedNodes.forEach(n => { if(n.matches && n.matches('input.file-caption-name')) proc(n); else if(n.querySelectorAll) n.querySelectorAll('input.file-caption-name').forEach(proc); }); }); }).observe(document.body, {childList:true, subtree:true});
                    }
                    function update() { if(window.runArchivosEnUnaLinea) window.runArchivosEnUnaLinea(); gestionarTipoArchivoPorDefecto(); ajustarEspacio(); }
                    observerArchivos = new MutationObserver(ms => { if(ms.some(m => m.type==='childList')) update(); });
                    setInterval(() => {
                        const p = document.getElementById('P7'), l = document.getElementById('ULArchivos');
                        if (!document.getElementById('plano-tab')) { if(panelArchivosVisible){panelArchivosVisible=false; observerArchivos.disconnect();} return; }
                        if (p && p.classList.contains('show')) {
                            if (!panelArchivosVisible) {
                                panelArchivosVisible = true;
                                const c = document.querySelector('div.card-container-archivos.col-md-6'); if(c){c.classList.remove('col-md-6'); c.classList.add('col-md-12');}
                                const al = document.querySelector('#P7 div.alert.alert-info'); if(al && al.parentElement) al.parentElement.remove();
                                update(); iniciarAutoCargar();
                                if(l) observerArchivos.observe(l, {childList:true});
                            } else ajustarEspacio();
                        } else if (panelArchivosVisible) { panelArchivosVisible = false; observerArchivos.disconnect(); }
                    }, 500);
                })();
            })();

            // --- MÓDULO SATÉLITE: COPIAR-CONTRATO ---
            (function () {
                if (!window.location.href.includes('/APT2/Contrato/Nuevo')) return;
                log('Activando módulo "COPIAR-CONTRATO"...');
                let ya = false, ints = 0;
                function copy(t) { if(navigator.clipboard) navigator.clipboard.writeText(t); }
                function run() {
                    if (ya) return;
                    const area = (() => { const m = (document.body.textContent||'').match(/area total ingresada\s*[:\s]\s*([0-9.,]+)/i); return m ? parseFloat(m[1].replace(',','.')) : null; })();
                    if (area !== null && area !== 0) { ya = true; return; }
                    const tr = (document.body.textContent||'').match(/Trámite:\s*([0-9]+)/);
                    if (tr && tr[1]) { ya = true; copy(tr[1]); log(`Trámite copiado: ${tr[1]}`); }
                }
                const t = setInterval(() => { ints++; if(ya || ints>40) clearInterval(t); run(); }, 500);
            })();

            // --- MÓDULO SATÉLITE: CERRAR POPUP 'ENTERO GUARDADO' ---
            (function() {
                new MutationObserver(ms => {
                    ms.forEach(m => {
                        if (m.addedNodes.length) {
                            const t = document.getElementById('swal2-title');
                            if (t && t.textContent.trim() === "Entero guardado con éxito") {
                                const b = document.querySelector('button.swal2-confirm'); if (b) b.click();
                            }
                        }
                    });
                }).observe(document.body, {childList:true, subtree:true});
            })();

            // --- LÓGICA PRINCIPAL DEL ORQUESTADOR (v3.7) ---
            let planosClickeado = false, faseGeneralesIniciada = false, faseFincasIniciada = false;
            let fasePlanosModificarIniciada = false, faseEnterosIniciada = false, rellenadorContratoIniciado = false;
            
            function runGeneralesBlock() {
                const p1=document.getElementById('P1'); if(!p1||p1.hasAttribute('data-gen-ok'))return;
                const v=document.getElementById('txtVertices'); if(v && v.value.trim()!=='' && v.value!=='0'){p1.setAttribute('data-gen-ok','1');sessionStorage.removeItem('cfia_generales_step');return;}
                const da=document.getElementById('txtAreaReal'), sa=document.getElementById('txtareareal'); if(sa&&da&&visible(da)&&da.value!==sa.value){da.value=sa.value;fireChangeLike(da);}
                const sels=[{s:'select[name="DatosPlano.Generales.TipoZona"]',t:/urbano/i},{s:'#ddlTipoUso',t:/construido y solar/i},{s:'#ddlTamanno',t:/22\s*x\s*32/i},{s:'select[name="DatosPlano.Generales.TipoCoordenada"]',t:/cr-sirgas/i},{s:'#ddlTipoUbicacion',t:/parcela e/i}];
                if(sels.every(c=>{const s=document.querySelector(c.s); if(s&&visible(s)){const o=Array.from(s.options).find(op=>c.t.test(op.textContent)); if(o&&s.value!==o.value){s.value=o.value;fireChangeLike(s);} return true;} return false;})) { p1.setAttribute('data-gen-ok','1'); }
            }
            function runFincasBlock() {
                const sp=document.querySelector('select[name="General.ProvinciaUbicacion"]'), df=document.getElementById('ddlProvinciaFinca'); if(sp&&df&&visible(df)&&sp.value!=='0'&&df.value!==sp.value){df.value=sp.value;fireChangeLike(df);}
                const id=document.getElementById('txtDerecho'); if(id&&visible(id)&&id.value!=='000'){id.value='000';fireChangeLike(id);}
                const lf=document.getElementById('ULFincas'), dn=document.getElementById('txtNumFinca'); if(lf&&dn&&visible(dn)){const p=Array.from(lf.querySelectorAll('li:last-child p')).find(x=>/N.mero de Finca/i.test(x.textContent)); if(p){const m=p.textContent.match(/:\s*(\d+)/); if(m&&dn.value!==m[1]){dn.value=m[1];fireChangeLike(dn);}}}
                if(!document.getElementById('btnIrMod')) {const b=document.createElement('button'); b.id='btnIrMod'; b.textContent="Continuar a 'Planos a Modificar' >>"; Object.assign(b.style,{backgroundColor:'#007bff',color:'white',padding:'10px',display:'block',marginTop:'10px',fontSize:'1.2em'}); b.onclick=(e)=>{e.preventDefault(); sessionStorage.setItem('APT_PHASE','CERRAR_FINCAS'); b.remove();}; document.getElementById('P2').appendChild(b);}
            }
            function runPlanosModificarBlock() {
                const sp=document.querySelector('select[name="General.ProvinciaUbicacion"]'), dm=document.getElementById('ddlProvinciaPlanoModificar'); if(sp&&dm&&visible(dm)&&sp.value!=='0'&&dm.value!==sp.value){dm.value=sp.value;fireChangeLike(dm);}
                if(!document.getElementById('btnIrEnt')) {const b=document.createElement('button'); b.id='btnIrEnt'; b.textContent="Continuar a 'ENTEROS' >>"; Object.assign(b.style,{backgroundColor:'#d63384',color:'white',padding:'10px',display:'block',marginTop:'10px',fontSize:'1.2em'}); b.onclick=(e)=>{e.preventDefault(); sessionStorage.setItem('APT_PHASE','CERRAR_MODIFICAR'); b.remove();}; document.getElementById('P5').appendChild(b);}
            }
            function runEnterosBlock() {
                const tcf=document.getElementById('txtTotalCFIA'); if(tcf&&visible(tcf)&&tcf.value===''){tcf.value='1600';fireChangeLike(tcf);}
                const mcit=document.getElementById('txtMontoCIT_NTRIP'); if(mcit&&visible(mcit)&&mcit.value===''){mcit.value='300';fireChangeLike(mcit);}
                const mp=document.getElementById('txtMontoPagado'), tr=document.getElementById('txtTotalRegistro');
                if(mp&&!document.getElementById('btns-monto')){const c=document.createElement('div'); c.id='btns-monto'; c.style.marginTop='5px'; ['6930','11930','11940','12020','17020','22020'].forEach(v=>{const b=document.createElement('button'); b.textContent=v; Object.assign(b.style,{marginRight:'5px',padding:'5px',background:'#dc3545',color:'white',border:'none'}); b.onclick=(e)=>{e.preventDefault(); mp.value=v; fireChangeLike(mp);}; c.appendChild(b);}); mp.parentElement.appendChild(c);}
                if(mp&&tr&&!mp.hasAttribute('d-calc')){mp.addEventListener('input',()=>{const m=parseFloat(mp.value.replace(/,/g,''))||0; let r='5000'; if(m>=11000)r='10000'; if(m>=17000)r='15000'; if(m>=21000)r='20000'; if(m>=31000)r='30000'; if(m>=49000)r='50000'; if(tr.value!==r){tr.value=r;fireChangeLike(tr);}}); mp.setAttribute('d-calc','1');}
                if(!document.getElementById('btnIrArch')) {const b=document.createElement('button'); b.id='btnIrArch'; b.textContent="IR A ARCHIVOS >>"; Object.assign(b.style,{backgroundColor:'#fd7e14',color:'white',padding:'10px',display:'block',marginTop:'10px',fontSize:'1.2em'}); b.onclick=(e)=>{e.preventDefault(); sessionStorage.setItem('APT_PHASE','CERRAR_ENTEROS');}; document.getElementById('P6').appendChild(b);}
            }
            function runRellenarContrato() {
                sessionStorage.removeItem('activarModuloContrato'); log('Rellenador Contrato...');
                const steps=[
                    ()=> {const s=document.querySelector('.swal2-confirm');if(visible(s)){s.click();return true;} const m=document.querySelector('#ddlTipoProyectoModal');if(m&&visible(m)){m.value=Array.from(m.options).find(o=>/plano\s*simple/i.test(o.text)).value;fireChangeLike(m); document.querySelector('.modal.show .btn-primary').click();return true;} return false;},
                    ()=> {const b=document.getElementById('bC2'), s=document.querySelector('select[name="Contratante.Tipo"]'); if(s){s.value=Array.from(s.options).find(o=>/f[ií]sica/i.test(o.text)).value;fireChangeLike(s); if(b.getAttribute('aria-expanded')==='true')superClick(b); return true;} else if(b.getAttribute('aria-expanded')==='false')superClick(b); return false;},
                    ()=> {const c=document.getElementById('ChkPropietarioMismoContratante'); if(c&&!c.checked){c.click();return true;} return true;},
                    ()=> {const b=document.getElementById('bC5'); if(b.getAttribute('aria-expanded')==='false'){superClick(b);return false;} return true;},
                    ()=> {const s=document.querySelector('select[name="General.ProvinciaUbicacion"]'); if(s.value!=='6'){s.value='6';fireChangeLike(s);return false;} return true;},
                    ()=> {const s=document.querySelector('select[name="General.TipoMoneda"]'); if(s.value!=='1'){s.value='1';fireChangeLike(s);} return true;},
                    ()=> {document.getElementById('txtAdelanto').value='0'; document.getElementById('txtpagosparciales').value='12'; document.getElementById('txtPlazoEntrega').value='3 MESES'; document.getElementById('txtAreadetalle').value='A CATASTRAR'; document.getElementById('txtmaximoplanos').value='5'; return true;},
                    ()=> {const b=document.getElementById('bC6'); if(b.getAttribute('aria-expanded')==='false')superClick(b); else {document.getElementById('ChkComposicionUnipersonal').click(); document.getElementById('rbEquidad').click(); superClick(b);} return true;},
                    ()=> {const b=document.getElementById('bC8'); if(b.getAttribute('aria-expanded')==='false'){superClick(b);return false;} return true;},
                    ()=> {document.getElementById('ChkNotificaProfesional').click(); const d=new Date();d.setDate(d.getDate()-18); document.getElementById('txtFechaFirma').value=d.toISOString().split('T')[0]; return true;}
                ];
                let i=0; const h=setInterval(()=>{if(i>=steps.length){clearInterval(h);return;} try{if(steps[i]())i++;}catch(e){clearInterval(h);}}, 350);
            }

            // Loop Principal
            setInterval(() => {
                const pop=document.querySelector('.swal2-confirm');
                if(pop && visible(pop)) {
                    const t=document.querySelector('#swal2-title').textContent;
                    const ph=sessionStorage.getItem('APT_PHASE');
                    if(/Plano a modificar guardado/.test(t)){sessionStorage.setItem('APT_PHASE','RESYNC_MODIFICAR');pop.click();}
                    else if(/Finca de plano guardada/.test(t)){sessionStorage.setItem('APT_PHASE','RESYNC_FINCAS');pop.click();}
                    else if(/exitoso/i.test(t) && document.getElementById('plano-tab')){sessionStorage.setItem('APT_PHASE','WAIT_REFRESH');pop.click();}
                    else if(!document.getElementById('plano-tab')) pop.click();
                    return;
                }
                const ph=sessionStorage.getItem('APT_PHASE');
                if(ph==='WAIT_REFRESH' && document.getElementById('P1').classList.contains('show')) sessionStorage.setItem('APT_PHASE','CERRAR_GENERALES');
                else if(ph==='CERRAR_GENERALES'){superClick(document.getElementById('bP1'));sessionStorage.setItem('APT_PHASE','ABRIR_FINCAS');}
                else if(ph==='ABRIR_FINCAS' && !document.getElementById('P1').classList.contains('show')){superClick(document.getElementById('bP2'));sessionStorage.removeItem('APT_PHASE');}
                else if(ph==='RESYNC_FINCAS'){runFincasBlock();sessionStorage.removeItem('APT_PHASE');}
                else if(ph==='CERRAR_FINCAS'){superClick(document.getElementById('bP2'));sessionStorage.setItem('APT_PHASE','ABRIR_MODIFICAR');}
                else if(ph==='ABRIR_MODIFICAR' && !document.getElementById('P2').classList.contains('show')){superClick(document.getElementById('bP5'));sessionStorage.removeItem('APT_PHASE');}
                else if(ph==='RESYNC_MODIFICAR'){runPlanosModificarBlock();sessionStorage.removeItem('APT_PHASE');}
                else if(ph==='CERRAR_MODIFICAR'){superClick(document.getElementById('bP5'));sessionStorage.setItem('APT_PHASE','ABRIR_ENTEROS');}
                else if(ph==='ABRIR_ENTEROS' && !document.getElementById('P5').classList.contains('show')){superClick(document.getElementById('bP6'));sessionStorage.removeItem('APT_PHASE');}
                else if(ph==='CERRAR_ENTEROS'){superClick(document.getElementById('bP6'));sessionStorage.setItem('APT_PHASE','ABRIR_ARCHIVOS');}
                else if(ph==='ABRIR_ARCHIVOS' && !document.getElementById('P6').classList.contains('show')){superClick(document.getElementById('bP7'));sessionStorage.removeItem('APT_PHASE');}

                const tab = document.getElementById('plano-tab');
                if (tab) {
                    if (!planosClickeado && visible(tab)) { superClick(tab); planosClickeado = true; }
                    // Coordenadas Pegar
                    const inpN = document.getElementById("txtNorteP");
                    if (inpN && !inpN.dataset.paste) {
                        inpN.addEventListener('paste', e => {
                            const txt = (e.clipboardData).getData('text');
                            const m = txt.match(/^([\d\.]+)\s+([\d\.]+)\$+(\d+)$/);
                            if(m) { e.preventDefault(); e.stopPropagation();
                                const s=(el,v)=>{el.value=v;['input','change','blur'].forEach(ev=>el.dispatchEvent(new Event(ev,{bubbles:true})));};
                                s(inpN, m[1]); s(document.getElementById("txtEsteP"), m[2]); s(document.getElementById("txtVertices"), m[3]);
                            }
                        });
                        inpN.dataset.paste = '1';
                    }
                    if (document.getElementById('P1').classList.contains('show')) runGeneralesBlock();
                    if (document.getElementById('P2').classList.contains('show')) runFincasBlock();
                    if (document.getElementById('P5').classList.contains('show')) runPlanosModificarBlock();
                    if (document.getElementById('P6').classList.contains('show')) runEnterosBlock();
                } else {
                    if (!rellenadorContratoIniciado && window.location.href.includes('/APT2/Contrato/Nuevo') && sessionStorage.getItem('activarModuloContrato')==='true') {
                        rellenadorContratoIniciado = true; runRellenarContrato();
                    }
                }
                const lnk = document.querySelector('a[href="/APT2/Contrato/Nuevo"]');
                if (lnk && !lnk.hasAttribute('d-list')) { lnk.setAttribute('d-list','1'); lnk.addEventListener('click', ()=>sessionStorage.setItem('activarModuloContrato','true')); }
            }, 500);
        })();

    } // FIN iniciarSistema()

})();
// v-4.1.9
