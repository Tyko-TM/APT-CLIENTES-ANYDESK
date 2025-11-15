// CLAVE_REMOTA: 11aa
// ==UserScript==
// @name         APT -TOTAL <v-4.1.5>
// @namespace    http://tampermonkey.net/
// @version      4.1.5
// @description  v4.1.5: Añadido módulo para auto-cerrar popup "Entero guardado con éxito".
// @author       Gemini
// @match        https://apt.cfia.or.cr/APT2/*
// @icon         https://apt.cfia.or.cr/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// v-4.1.5

(function() {
    'use strict';

    // --- SECCIÓN DE HERRAMIENTAS ---
    function log(message) { console.log(`[APT Unificado] ${message}`); }
    function superClick(el) { if (!el) return; try { el.focus({ preventScroll: true }); ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(function(t) { el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })); }); el.click(); } catch (e) { console.error("superClick falló:", e); } }
    function fireChangeLike(el) { if (!el) return; ['input', 'keyup', 'change', 'blur'].forEach(function(t) { el.dispatchEvent(new Event(t, { bubbles: true })); }); }
    const visible = function(el) { return !!el && el.offsetParent !== null && el.getClientRects().length > 0; }; // Sintaxis ES5

    // --- "CEREBRO" ORQUESTADOR ÚNICO ---
    (function bootstrap() {
        log('Iniciando Orquestador v4.1.3...'); // El log interno del bootstrap sigue siendo 4.1.3, lo respetamos.

        // Variable global para rastrear archivos subidos
        window.archivosSubidosEnP7 = new Set();

        // --- INICIO CÓDIGO (Estrategia Global de Pegado) ---
        document.addEventListener('paste', function(e) {
            if (e.target && typeof e.target.id !== 'undefined') {
                const targetId = e.target.id;
                const camposPermitidos = [
                    'txtareareal', 'txtAreaReal', 'txtAreaRegistro', 'txtTotalCFIA',
                    'txtMontoCIT_NTRIP', 'txtTotalRegistro', 'txtMontoPagado'
                ];
                if (camposPermitidos.includes(targetId)) {
                    log(`[Habilitar Pegado] Evento "paste" detectado en "${targetId}". Permitiendo...`);
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }
        }, true);
        log('Módulo "Habilitar Pegado Global" activado.');
        // --- FIN CÓDIGO (Estrategia Global de Pegado) ---


        // --- MÓDULO SATÉLITE 2: IR A MENU PLANOS (Solo en /Home) ---
        function iniciarModuloIrAPlanos() {
            if (!window.location.href.endsWith('/Home')) {
                return;
            }
            log('Activando módulo "IR A MENU PLANOS"...');
            let estado = "BUSCANDO_PLANOS";
            let contadorIntentos = 0;
            const intervalo = setInterval(function() { // ES5
                contadorIntentos++;
                if (estado === "BUSCANDO_PLANOS") {
                    const menuPlanos = Array.from(document.querySelectorAll('a.list-group-item'))
                        .find(function(el) { return el.textContent.trim().includes('Planos'); }); // ES5
                    if (menuPlanos) {
                        log('Módulo IR A PLANOS: Menú "Planos" encontrado. Dando clic...');
                        menuPlanos.click();
                        estado = "BUSCANDO_CONSULTA";
                    }
                }
                if (estado === "BUSCANDO_CONSULTA") {
                    const submenuConsulta = Array.from(document.querySelectorAll('a.text-reset'))
                        .find(function(el) { return el.textContent.trim() === 'Consulta'; }); // ES5
                    if (submenuConsulta && visible(submenuConsulta)) {
                        log('Módulo IR A PLANOS: Submenú "Consulta" encontrado y visible. Dando clic...');
                        submenuConsulta.click();
                        estado = "TERMINADO";
                    }
                }
                if (estado === "TERMINADO" || contadorIntentos > 30) {
                    log('Módulo IR A PLANOS: Tarea completada o tiempo agotado. Módulo detenido.');
                    clearInterval(intervalo);
                }
            }, 500);
        }
        iniciarModuloIrAPlanos();

        // --- MÓDULO SATÉLITE 3: DESCARGAR PDF (Independiente) ---
        (function() {
            log('Activando módulo "DESCARGAR PDF"...');
            const pdfLog = function() { console.log('[PDF-RENAME]', ...arguments); }; // ES5
            let PREFIJO_PLANO = '';
            const TEXTO_CLAVE_PDF = 'Plano Seleccionado:';

            function extraerPrefijo(node) {
                const raw = (node.innerText || node.textContent || '').replace(/\u00A0/g, ' ').trim();
                if (!raw.includes(TEXTO_CLAVE_PDF)) return null;
                return raw.split(TEXTO_CLAVE_PDF).slice(1).join(TEXTO_CLAVE_PDF).trim() || null;
            }
            function buscarYActualizarPrefijo() {
                const nodos = document.querySelectorAll('.row.divSticky h3, h3, .divSticky h3');
                for (let i = 0; i < nodos.length; i++) { const v = extraerPrefijo(nodos[i]); if (v) { PREFIJO_PLANO = v; return; } } // ES5
            }
            new MutationObserver(buscarYActualizarPrefijo).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
            document.addEventListener('click', async function(ev) { // Async/Await es compatible con v5.4.0
                const btn = ev.target.closest('a.btn.btn-sm.btn-outline-success');
                if (!btn) return;
                ev.preventDefault(); ev.stopPropagation(); if (!PREFIJO_PLANO) buscarYActualizarPrefijo();
                try {
                    const resp = await fetch(btn.href, { credentials: 'include' }); if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                    const cd = resp.headers.get('content-disposition'); let original = 'archivo.pdf';
                    if (cd) { let m = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i) || cd.match(/filename\s*=\s*"([^"]+)"/i) || cd.match(/filename\s*=\s*([^;]+)/i); if (m && m[1]) original = decodeURIComponent(m[1].replace(/"/g, '').trim()); }
                    const nombreFinal = `${PREFIJO_PLANO} ${original}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
                    pdfLog(`Renombrando archivo a: "${nombreFinal}"`);
                    const blob = await resp.blob(); const blobUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = blobUrl; a.download = nombreFinal;
                    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(blobUrl);
                } catch (e) { pdfLog('Fallo descarga renombrada:', e); window.location.href = btn.href; }
            }, true);
        })(); // Fin del módulo IIFE para PDF

        // --- MÓDULO SATÉLITE 4: REINGRESO AUTOMÁTICO (Lógica "Ari" v-1.0.1 + Notificación) ---
        (function() {
            log('Activando módulo "REINGRESO AUTOMÁTICO" (v-4.1.0)...');

            if (window.__APT_RN_AUTOGUARDAR__) {
                log('Módulo Reingreso ya está cargado. Abortando instancia duplicada.');
                return;
            }
            window.__APT_RN_AUTOGUARDAR__ = true;

            const TICK_MS = 200, TIMEOUT_MS = 45000;
            const reingresoLog = function() { console.log('[APT-RN]', ...arguments); }; // ES5

            // Helper (del script de Ari, 'visible' ya existe globalmente)
            const byTextContains = function(root, sel, txt) { // ES5
                if (!root) return null; // Guardia por si 'prn' no existe
                const els = root.querySelectorAll(sel);
                txt = (txt || '').toLowerCase();
                for (let i = 0; i < els.length; i++) { // ES5
                    const el = els[i];
                    if ((el.textContent || '').toLowerCase().includes(txt)) return el;
                }
                return null;
            };

            // Condition Checkers (del script de Ari, con ajustes)
            const planosActiva = function() { return visible(document.querySelector('a#plano-tab[aria-selected="true"], a#plano-tab.active')); }; // ES5

            const panelTramiteVisible = function() { // ES5
                const prn = document.querySelector('#PRN.accordion-collapse.show');
                if (!visible(prn)) return false;
                const h_titulo = byTextContains(prn, 'h4, h5', 'Seleccione el tipo de tramite');
                return visible(h_titulo);
            };

            const reingresoSeleccionado = function() { // ES5
                const s = document.querySelector('#ddlTipoTramiteRN');
                if (!visible(s)) return false;
                const selectedText = s.options[s.selectedIndex].text;
                return /reingreso/i.test(selectedText);
            };

            const getBotonGuardar = function() { // ES5
                return (document.querySelector('#PRN button[onclick^="GuardarTramiteRN"]')
                    || document.querySelector('button.btn.btn-outline-primary[onclick^="Guardar"]'));
            };

            // --- Notificación parpadeante ---
            let notificacionMostrada = false;
            const mostrarNotificacion = function() { // ES5
                if (notificacionMostrada) return;
                notificacionMostrada = true;
                reingresoLog('Mostrando notificación "REINGRESO ACTIVADO"');
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
                setTimeout(function() { notificacion.remove(); }, 6000); // ES5
            };
            // --- Fin Notificación ---

            let clicked = false, stop = false, start = Date.now();

            const tryRun = function() { // ES5
                if (stop || Date.now() - start > TIMEOUT_MS) {
                    if (!stop) {
                        reingresoLog('Timeout. Deteniendo módulo de Reingreso.');
                        stop = true;
                        obs.disconnect();
                        clearInterval(int);
                        clearInterval(intSwal);
                    }
                    return;
                }

                if (!planosActiva()) {
                    if (clicked) reingresoLog('Panel de planos oculto. Reseteando flag de clic.');
                    clicked = false;
                    notificacionMostrada = false;
                    return;
                }

                if (!clicked && panelTramiteVisible() && reingresoSeleccionado()) {
                    const btn = getBotonGuardar();
                    if (visible(btn)) {
                        mostrarNotificacion();
                        clicked = true;
                        reingresoLog('Clic al disquete');
                        btn.click();
                    }
                }
            };

            const obs = new MutationObserver(tryRun);
            obs.observe(document.documentElement, { childList: true, subtree: true });
            const int = setInterval(tryRun, TICK_MS);

            const closeSwal = function() { // ES5
                const pop = document.querySelector('.swal2-popup.swal2-show');
                if (!visible(pop)) return false;
                const title = document.querySelector('#swal2-title');
                const msg = document.querySelector('#swal2-html-container');

                if (title && (/enviado/i.test(title.textContent) || /atención/i.test(title.textContent)) &&
                    msg && /guardado exitosamente/i.test(msg.textContent)) {

                    const btn = document.querySelector('button.swal2-confirm.swal2-styled');
                    if (btn) {
                        reingresoLog('Popup "Guardado exitosamente" detectado. Cerrando…');
                        btn.click();
                        return true;
                    }
                }
                return false;
            };

            const intSwal = setInterval(function() { // ES5
                if (closeSwal()) {
                    // No detenemos el interval
                }
            }, 120);
        })(); // Fin del módulo IIFE de Reingreso


        // --- MÓDULO SATÉLITE 5: PLANO MODIFICAR EN CONTRATO (v-1.0.1-b) ---
        (function() {
            // Este módulo se activa solo en la página de "Nuevo Contrato"
            if (!window.location.href.includes('/APT2/Contrato/Nuevo')) {
                return; // No es la página correcta
            }
            log('Activando módulo "PLANO MODIFICAR CONTRATO" (v-1.0.1-b)...');

            function procesarCampos() {
                const campoPlano = document.querySelector("#txtNumPlanoModificar");
                const campoAnno = document.querySelector("#txtAnnoModificar");

                if (!campoPlano || !campoAnno) return;

                // ==================== DESBLOQUEAR CAMPO ====================
                campoPlano.removeAttribute("maxlength");
                campoPlano.removeAttribute("pattern");
                campoPlano.classList.remove("solonumeros");
                campoPlano.readOnly = false;
                campoPlano.disabled = false;

                campoPlano.onkeypress = null;
                campoPlano.onkeydown = null;
                campoPlano.oninput = null;
                campoPlano.onpaste = null;

                const bloqueos = ["keypress","keydown","keyup","input","beforeinput","paste"];
                bloqueos.forEach(function(tipo) { // Convertido a ES5 forEach
                    campoPlano.addEventListener(
                        tipo,
                        function(e) { e.stopPropagation(); }, // Convertido a ES5 function
                        true
                    );
                });

                // ==================== PROCESAR FORMATO ====================
                function procesarFormato() {
                    const raw = campoPlano.value.trim();

                    // Formato P-0004657-2025
                    const match = raw.match(/^([A-Za-z])-(\d+)-(\d{4})$/);
                    if (!match) return;

                    const numeroPlano = match[2]; // 0004657
                    const anno = match[3]; // 2025

                    // Mostrar solo el número en el campo de plano
                    campoPlano.value = numeroPlano;

                    // Guardar año global (El script original hacía esto, lo mantengo)
                    window.APT_ANNO_PLANO_MODIFICAR = anno;

                    // COPIAR automáticamente el año en su celda
                    campoAnno.value = anno;

                    // Usando el logger unificado y sintaxis ES5 para compatibilidad
                    log("[Plano Modificar Contrato] Procesado -> Número:" + numeroPlano + " Año:" + anno);
                }

                // Eventos normales
                campoPlano.addEventListener("input", procesarFormato);
                campoPlano.addEventListener("change", procesarFormato);
                campoPlano.addEventListener("blur", procesarFormato);

                // Después del pegado
                campoPlano.addEventListener("paste", function() {
                    setTimeout(procesarFormato, 0);
                });

                log("[Plano Modificar Contrato] v-1.0.1-b activo: Año será copiado automáticamente.");
            }

            // Esperar que existan los campos
            const intv = setInterval(function() { // Convertido a ES5 function
                if (document.querySelector("#txtNumPlanoModificar") &&
                    document.querySelector("#txtAnnoModificar")) {

                    procesarCampos();
                    clearInterval(intv);
                }
            }, 300);
        })(); // Fin del módulo IIFE de Plano Modificar Contrato


        // --- MÓDULO SATÉLITE: TARIFA-CATASTROS ---
        function activarCalculadoraHonorarios() {
            const areaInput = document.getElementById('txtareareal');
            const honorariosInput = document.getElementById('txtValorAproximadoHonorarios');
            if (visible(areaInput) && visible(honorariosInput) && !areaInput.hasAttribute('data-calc-attached')) {
                log('Activando módulo "TARIFA-CATASTROS"...');
                const interpolar = function(x, x1, y1, x2, y2) { return y1 + (x - x1) * ((y2 - y1) / (x2 - x1)); }; // ES5
                areaInput.addEventListener('input', function(event) { // ES5
                    const area = parseFloat(event.target.value) || 0;
                    let honorarios = 0;
                    if (area <= 0) { honorarios = 0; }
                    else if (area <= 306) { honorarios = 100758.50; }
                    else if (area < 1000) { honorarios = interpolar(area, 307, 101066.47, 999, 192413.89); }
                    else if (area <= 22375) { honorarios = 300000.00; }
                    else if (area <= 24999) { honorarios = interpolar(area, 22375, 300000.00, 24999, 317100.54); }
                    else if (area <= 29999) { honorarios = interpolar(area, 24999, 317100.54, 29999, 347367.39); }
                    else if (area <= 39999) { honorarios = interpolar(area, 29999, 347367.39, 39999, 401106.99); }
                    else if (area <= 49999) { honorarios = interpolar(area, 39999, 401106.99, 49999, 448452.36); }
                    else if (area <= 99999) { honorarios = interpolar(area, 49999, 448452.36, 99999, 634210.59); }
                    else if (area <= 149999) { honorarios = interpolar(area, 99999, 634210.59, 149999, 776747.46); }
                    else if (area <= 199999) { honorarios = interpolar(area, 149999, 776747.46, 199999, 896911.46); }
                    else if (area <= 249999) { honorarios = interpolar(area, 199999, 896911.46, 249999, 1002777.99); }
                    else if (area <= 349999) { honorarios = interpolar(area, 249999, 1002777.99, 349999, 1186503.60); }
                    else if (area <= 449999) { honorarios = interpolar(area, 349999, 1186503.60, 449999, 1345369.05); }
                    else if (area <= 849999) { honorarios = interpolar(area, 449999, 1345369.05, 849999, 1849033.87); }
                    else if (area <= 999999) { honorarios = interpolar(area, 849999, 1849033.87, 999999, 2005559); }
                    else { honorarios = 2005559; }
                    const resultado = Math.round(honorarios);
                    if (honorariosInput.value != resultado) {
                        log(`TARIFA-CATASTROS: Área: ${area} m², Honorarios: ₡${resultado}`);
                        honorariosInput.value = resultado;
                        fireChangeLike(honorariosInput);
                    }
                });
                areaInput.setAttribute('data-calc-attached', 'true');
            }
        }
        setInterval(activarCalculadoraHonorarios, 1000);

        // --- MÓDULO SATÉLITE: APT-PANELES ---
        function iniciarModuloAptPaneles() {
            const url = window.location.href;
            const urlsPermitidas = [
                'https://apt.cfia.or.cr/APT2/Home',
                'https://apt.cfia.or.cr/APT2/Plano/Consulta'
            ];
            const urlValida = urlsPermitidas.some(function(u) { return url.startsWith(u); }); // ES5
            if (!urlValida) {
                return;
            }
            log('Activando módulo "APT-PANELES"...');

            const DEFAULTS = {
                cfiaW: "120px", cfiaH: "auto", barraW: "100%", barraH: "20px",
                sidebarW: "125px", panelScale: "1.40", panelAjustesScale: "1.0",
                menuTexto: "16px", menuIcono: "0.4em", menuEspacio: "2px"
            };
            const LS = {
                get: function(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }, // ES5 (?? -> ||)
                set: function(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
            };
            const state = {
                cfiaW: LS.get('cfiaW', DEFAULTS.cfiaW), cfiaH: LS.get('cfiaH', DEFAULTS.cfiaH),
                barraW: LS.get('barraW', DEFAULTS.barraW), barraH: LS.get('barraH', DEFAULTS.barraH),
                sidebarW: LS.get('sidebarW', DEFAULTS.sidebarW), panelScale: LS.get('panelScale', DEFAULTS.panelScale),
                panelAjustesScale: LS.get('panelAjustesScale', DEFAULTS.panelAjustesScale),
            };

            const q = function(sel, root) { return (root || document).querySelector(sel); }; // ES5
            const $$ = function(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }; // ES5
            function addStyle(css) { try { if (typeof GM_addStyle === "function") { GM_addStyle(css); return; } } catch (e) {} const s = document.createElement("style"); s.textContent = css; (document.head || document.documentElement).appendChild(s); }
            function findLogoCFIA() { let img = q('img[src*="Logo-CFIA-esencial"], img[alt*="LogoCFIA"]'); if (img) return img; return Array.from(document.images).find(function(im) { return /logo[-_]?cfia/i.test(im.src) || /LogoCFIA/i.test(im.alt); }) || null; } // ES5
            function findBarraColegios() { let img = q('img[src*="Logos_Coleg"], img[src*="Logos-Coleg"], img[alt*="LogoColeg"]'); if (img) return img; return Array.from(document.images).find(function(im) { return /logos[_-]?coleg/i.test(im.src) || /LogoColeg/i.test(im.alt); }) || null; } // ES5

            function injectGlobalCSS() {
                addStyle(`
                    :root { --sidebar-w: ${state.sidebarW}; --panel-scale: ${state.panelScale}; --panel-ajustes-scale: ${state.panelAjustesScale}; }
                    nav#sidebarMenu, #sidebarMenu, .sidebar { width: var(--sidebar-w) !important; min-width: var(--sidebar-w) !important; max-width: var(--sidebar-w) !important; }
                    #main-content, #main-contain, .main-content, div[id*="main-cont"] { margin-left: var(--sidebar-w) !important; padding: 0 !important; width: calc(100% - var(--sidebar-w)) !important; max-width: none !important; }
                    .container, .container-fluid, .container-lg, .container-xl, .wizard-card, .card, .card-body, .row, [class*="col-"] { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                    .table,table{ table-layout:auto!important; width:100%!important; } .table th,.table td{ white-space:nowrap!important; text-overflow:clip!important; } .table-responsive,.dataTables_wrapper,.table-wrapper{ overflow-x:visible!important; }
                    nav#sidebarMenu .list-group-item span { font-size: ${DEFAULTS.menuTexto} !important; letter-spacing: ${DEFAULTS.menuEspacio} !important; } nav#sidebarMenu .list-group-item i { font-size: ${DEFAULTS.menuIcono} !important; }
                    .apt-panel-escala { transform: scale(var(--panel-scale)); transform-origin: top left; width: calc(100% / var(--panel-scale)) !important; }
                `);
            }
            function applyLogoSizes(targets) { if (targets.logo) { targets.logo.style.width = state.cfiaW; targets.logo.style.height = state.cfiaH; } if (targets.barra) { targets.barra.style.width = state.barraW; targets.barra.style.height = state.barraH; } }
            function applyPanelScale() { const scale = state.panelScale || DEFAULTS.panelScale; document.documentElement.style.setProperty('--panel-scale', scale); const panel = q('.wizard-card') || q('#main-content'); if (panel) panel.classList.add('apt-panel-escala'); }
            function applyPanelAjustesScale() { const scale = state.panelAjustesScale || DEFAULTS.panelAjustesScale; document.documentElement.style.setProperty('--panel-ajustes-scale', scale); }
            function medirBarra() { const el = q("#sidebarMenu") || q(".sidebar"); if (!el) return parseFloat(state.sidebarW) || 125; return Math.round(el.getBoundingClientRect().width); }
            function aplicarFluido() { const w = medirBarra(); $$('#main-content, #main-contain, .main-content, div[id*="main-cont"]').forEach(function(el) { el.style.setProperty('width', `calc(100% - ${w}px)`, 'important'); el.style.setProperty('margin-left', `${w}px`, 'important'); }); } // ES5
            function applySidebarWidth() { const w = state.sidebarW || DEFAULTS.sidebarW; document.documentElement.style.setProperty('--sidebar-w', w); setTimeout(aplicarFluido, 50); }

            function createControlPanel(targets) {
                const panel = document.createElement('div'); panel.id = 'tm-cfia-panel';
                panel.innerHTML = `
                    <div class="tmc-header"><span>⚙️ Ajustes de Layout</span><button id="tmcOcultar">Ocultar</button></div>
                    <div class="tmc-controls-wrapper">
                        <div class="tmc-block">
                            <div class="tmc-title">Layout General</div><label class="tmc-row"><span>Sidebar:</span><input id="sidebarW" type="text" value="${state.sidebarW}"></label>
                            <div class="tmc-btns"><button id="sidebarMenos">–10px</button><button id="sidebarMas">+10px</button></div>
                            <div class="tmc-inner-row">
                                <div class="tmc-inner-col"><label class="tmc-row tmc-row-margin"><span>Escala Contenido:</span><input id="panelScale" type="text" value="${state.panelScale}"></label><div class="tmc-btns"><button id="scaleMenos">–0.05</button><button id="scaleMas">+0.05</button></div></div>
                                <div class="tmc-inner-col"><label class="tmc-row tmc-row-margin"><span>Escala UI:</span><input id="panelAjustesScale" type="text" value="${state.panelAjustesScale}"></label><div class="tmc-btns"><button id="panelAjustesMenos">–0.1</button><button id="panelAjustesMas">+0.1</button></div></div>
                            </div>
                            <div class="tmc-btns tmc-btns-margin"><button id="layoutReset">Reset Layout</button></div>
                        </div>
                        <div class="tmc-block"><div class="tmc-title">Logo CFIA</div><label class="tmc-row"><span>Ancho:</span><input id="cfiaW" type="text" value="${state.cfiaW}"></label><label class="tmc-row"><span>Alto:</span><input id="cfiaH" type="text" value="${state.cfiaH}"></label><div class="tmc-btns tmc-btns-margin"><button id="cfiaMenos">–10px</button><button id="cfiaMas">+10px</button><button id="cfiaReset">Reset</button></div></div>
                        <div class="tmc-block"><div class="tmc-title">Barra inferior</div><label class="tmc-row"><span>Ancho:</span><input id="barraW" type="text" value="${state.barraW}"></label><label class="tmc-row"><span>Alto:</span><input id="barraH" type="text" value="${state.barraH}"></label><div class="tmc-btns tmc-btns-margin"><button id="barraMenos">–4px</button><button id="barraMas">+4px</button><button id="barraReset">Reset</button></div></div>
                    </div>`;
                const css = document.createElement('style');
                css.textContent = `
                    #tm-cfia-panel { position: relative; z-index: 9999; background: rgba(18,18,18,.92); color: #eee; border: 2px solid yellow; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.35); font-family: system-ui, Arial, sans-serif; font-size: 13px; backdrop-filter: blur(3px); width: auto; min-width: 680px; margin-left: 20px; padding: 6px; transform: scale(calc(var(--panel-ajustes-scale) / var(--panel-scale))); transform-origin: top right; }
                    #tm-cfia-panel * { box-sizing: border-box; } #tm-cfia-panel .tmc-header { padding: 6px 10px 8px; border-bottom: 2px solid magenta; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
                    #tm-cfia-panel button#tmcOcultar { flex: 0 0 auto !important; padding: 4px 8px !important; font-size: 11px; background: #155e75 !important; border: 1px solid #444 !important; }
                    #tm-cfia-panel button#tmcOcultar:hover { background: #0e7490 !important; } .tmc-controls-wrapper { display: flex; flex-direction: row; padding-top: 8px; }
                    #tm-cfia-panel .tmc-block { flex: 1; min-width: 210px; padding: 0px 12px; } #tm-cfia-panel .tmc-block + .tmc-block { border-left: 2px solid #00FF00; } #tmc-cfia-panel .tmc-title { font-weight: 600; margin: 0 0 6px; text-align: center; }
                    .tmc-controls-wrapper .tmc-block:nth-of-type(1) .tmc-title { color: #60A5FA; } .tmc-controls-wrapper .tmc-block:nth-of-type(2) .tmc-title { color: #F59E0B; } .tmc-controls-wrapper .tmc-block:nth-of-type(3) .tmc-title { color: #A3E635; }
                    #tmc-cfia-panel .tmc-row { display:flex; gap:8px; align-items:center; margin:6px 0; } #tmc-cfia-panel .tmc-row.tmc-row-margin { margin-top: 10px; } #tmc-cfia-panel .tmc-row span { width: auto; padding-right: 5px; color:#bbb; flex-shrink: 0; font-size: 12px; }
                    #tmc-cfia-panel input[type="text"] { flex:1; padding:6px 8px; border-radius:8px; border:1px solid #444; background:#111; color:#eee; } #tmc-cfia-panel .tmc-btns { display:flex; gap:6px; margin-top:6px; } #tmc-cfia-panel .tmc-btns.tmc-btns-margin { margin-top: 10px; }
                    .tmc-inner-row { display: flex; gap: 6px; } .tmc-inner-col { flex: 1; min-width: 0; } #tmc-cfia-panel button { flex:1; padding:6px 8px; border-radius:8px; border:1px solid #444; background: #164e63; color:#eee; cursor:pointer; }
                    #tmc-cfia-panel button:hover { background: #155e75; }
                `;
                const titleH2 = q('body #main-content h2, body .wizard-card h2');
                if (titleH2 && titleH2.parentElement) {
                    const titleContainer = titleH2.parentElement;
                    titleContainer.style.display = 'flex'; titleContainer.style.justifyContent = 'space-between'; titleContainer.style.alignItems = 'center'; titleContainer.style.padding = '0 1rem';
                    document.head.appendChild(css); titleContainer.appendChild(panel);
                } else { console.warn('⚠️ No se encontró el H2 "Consulta de planos". No se puede inyectar el panel de control.'); return; }
                const $ = function(id) { return panel.querySelector('#' + id); }; // ES5
                const inputs = { cfiaW: $('cfiaW'), cfiaH: $('cfiaH'), barraW: $('barraW'), barraH: $('barraH'), sidebarW: $('sidebarW'), panelScale: $('panelScale'), panelAjustesScale: $('panelAjustesScale') };
                Object.keys(inputs).forEach(function(k) { // ES5
                    const el = inputs[k];
                    el.addEventListener('change', function() { // ES5
                        state[k] = el.value.trim(); LS.set(k, state[k]);
                        if (k === 'sidebarW') applySidebarWidth();
                        else if (k === 'panelScale') { applyPanelScale(); applyPanelAjustesScale(); }
                        else if (k === 'panelAjustesScale') applyPanelAjustesScale();
                        else applyLogoSizes(targets);
                    });
                });
                function bump(key, delta, unit, isFloat) {
                    const cur = state[key]; const num = parseFloat(cur); if (isNaN(num)) return;
                    let nextVal = isFloat ? (num + delta).toFixed(2) : (num + delta) + unit;
                    state[key] = nextVal; LS.set(key, nextVal);
                    if (key === 'sidebarW') applySidebarWidth();
                    else if (key === 'panelScale') { applyPanelScale(); applyPanelAjustesScale(); }
                    else if (key === 'panelAjustesScale') applyPanelAjustesScale(); // Corregido (k -> key)
                    else applyLogoSizes(targets);
                    syncInputs();
                }
                $('sidebarMas').addEventListener('click', function() { bump('sidebarW', +10, 'px'); }); $('sidebarMenos').addEventListener('click', function() { bump('sidebarW', -10, 'px'); }); // ES5
                $('scaleMas').addEventListener('click', function() { bump('panelScale', +0.05, '', true); }); $('scaleMenos').addEventListener('click', function() { bump('panelScale', -0.05, '', true); }); // ES5
                $('panelAjustesMas').addEventListener('click', function() { bump('panelAjustesScale', +0.1, '', true); }); $('panelAjustesMenos').addEventListener('click', function() { bump('panelAjustesScale', -0.1, '', true); }); // ES5
                $('cfiaMas').addEventListener('click', function() { bump('cfiaW', +10, 'px'); }); $('cfiaMenos').addEventListener('click', function() { bump('cfiaW', -10, 'px'); }); // ES5
                $('barraMas').addEventListener('click', function() { bump('barraH', +4, 'px'); }); $('barraMenos').addEventListener('click', function() { bump('barraH', -4, 'px'); }); // ES5
                function syncInputs() { Object.keys(inputs).forEach(function(k) { if(inputs[k]) inputs[k].value = state[k]; }); } // ES5
                function resetLayout() { state.sidebarW = DEFAULTS.sidebarW; state.panelScale = DEFAULTS.panelScale; state.panelAjustesScale = DEFAULTS.panelAjustesScale; LS.set('sidebarW', state.sidebarW); LS.set('panelScale', state.panelScale); LS.set('panelAjustesScale', state.panelAjustesScale); }
                function resetCFIA() { state.cfiaW = DEFAULTS.cfiaW; state.cfiaH = DEFAULTS.cfiaH; LS.set('cfiaW', state.cfiaW); LS.set('cfiaH', state.cfiaH); }
                function resetBarra() { state.barraW = DEFAULTS.barraW; state.barraH = DEFAULTS.barraH; LS.set('barraW', state.barraW); LS.set('barraH', state.barraH); }
                $('layoutReset').addEventListener('click', function() { resetLayout(); applySidebarWidth(); applyPanelScale(); applyPanelAjustesScale(); syncInputs(); }); // ES5
                $('cfiaReset').addEventListener('click', function() { resetCFIA(); applyLogoSizes(targets); syncInputs(); }); // ES5
                $('barraReset').addEventListener('click', function() { resetBarra(); applyLogoSizes(targets); syncInputs(); }); // ES5
                $('tmcOcultar').addEventListener('click', function() { panel.remove(); }); // ES5
            }
            injectGlobalCSS(); applySidebarWidth(); applyPanelScale(); applyPanelAjustesScale();
            try { new ResizeObserver(function() { aplicarFluido(); applyPanelScale(); applyPanelAjustesScale(); }).observe(document.documentElement); } catch (e) {} // ES5
            const INTERVALO_MS = 400, MAX_INTENTOS = 40; let intentos = 0, panelCreado = false;
            const h = setInterval(function() { // ES5
                intentos++; if (panelCreado) { clearInterval(h); return; }
                const logo = findLogoCFIA(), barra = findBarraColegios();
                if (q('body #main-content h2, body .wizard-card h2')) { applyLogoSizes({ logo: logo, barra: barra }); createControlPanel({ logo: logo, barra: barra }); panelCreado = true; } // ES5
                if (intentos >= MAX_INTENTOS) { clearInterval(h); if (!panelCreado) { console.warn('⚠️ No se localizaron elementos (logo/barra/h2) tras varios intentos.'); } }
            }, INTERVALO_MS);
        }
        iniciarModuloAptPaneles();

        // --- MÓDULO SATÉLITE: GESTOR DE ARCHIVOS UNIFICADO (v-1.0.3) ---
        (function() {
            log('Activando módulo "GESTOR DE ARCHIVOS UNIFICADO"...');

            // --- (A) MÓDULO INTERNO: ARCHIVOS EN UNA LÍNEA ---
            (function() {
                log('Activando submódulo "ARCHIVOS EN UNA LÍNEA"...');
                const estiloID = 'estilo-archivos-compactos';

                // --- AJUSTES MANUALES ---
                const ESPACIO_LI_VERTICAL = "0.01rem";
                const COLOR_BORDE = "#FF6600";
                const GROSOR_BORDE = "2px";
                // --- FIN DE AJUSTES ---

                const COLORES_NITIDOS = {
                    ANVERSO: '#1E90FF', // Azul
                    ENTERO: '#32CD32', // Verde
                    DERROTERO: '#FF8C00', // Naranja
                    MINUTA: '#FF00FF', // Magenta
                    IMAGEN: '#00CED1', // Turquesa
                    DEFAULT: '#E0E0E0'
                };

                if (!document.getElementById(estiloID)) {
                    const estilos = document.createElement("style");
                    estilos.id = estiloID;
                    estilos.textContent = `
                        .linea-unificada {
                            display: flex; gap: 10px; align-items: center; justify-content: flex-start;
                            font-size: 13px; color: #495057; padding: 3px 0; margin-bottom: 8px;
                        }
                        .linea-unificada span { white-space: nowrap; }
                        .linea-unificada .descripcion-archivo { font-weight: 600; }
                        .desc-anverso { color: ${COLORES_NITIDOS.ANVERSO} !important; }
                        .desc-entero { color: ${COLORES_NITIDOS.ENTERO} !important; }
                        .desc-derrotero { color: ${COLORES_NITIDOS.DERROTERO} !important; }
                        .desc-minuta { color: ${COLORES_NITIDOS.MINUTA} !important; }
                        .desc-imagen { color: ${COLORES_NITIDOS.IMAGEN} !important; }
                        .desc-default { color: ${COLORES_NITIDOS.DEFAULT} !important; }
                        #ULArchivos li.list-group-item {
                            padding-top: ${ESPACIO_LI_VERTICAL} !important; padding-bottom: ${ESPACIO_LI_VERTICAL} !important;
                            border-bottom: ${GROSOR_BORDE} solid ${COLOR_BORDE} !important; border-top: none !important;
                        }
                        #ULArchivos li.list-group-item:last-child { border-bottom: none !important; }
                    `;
                    document.head.appendChild(estilos);
                }

                function obtenerClaseDeColor(descripcionTexto) {
                    const texto = descripcionTexto.toUpperCase();
                    if (texto.includes('IMAGEN')) return 'desc-imagen';
                    if (texto.includes('MINUTA')) return 'desc-minuta';
                    if (texto.includes('ANVERSO')) return 'desc-anverso';
                    if (texto.includes('ENTERO')) return 'desc-entero';
                    if (texto.includes('DERROTERO')) return 'desc-derrotero';
                    return 'desc-default';
                }

                window.runArchivosEnUnaLinea = function() {
                    const lista = document.querySelector("#ULArchivos");
                    if (!lista) return;

                    window.archivosSubidosEnP7.clear();

                    lista.querySelectorAll("li.list-group-item").forEach(function(li) {
                        let descSpan = li.querySelector(".linea-unificada .descripcion-archivo");

                        if (descSpan) {
                            window.archivosSubidosEnP7.add(descSpan.textContent.trim().toUpperCase());
                            return;
                        }

                        const labels = li.querySelectorAll("label");
                        if (labels.length < 3) return;

                        const desc_original = labels[0]?.textContent || "";
                        let desc = desc_original.replace(/Descripción:/i, "").replace(/Oficial/i, "").trim();
                        desc = desc.replace(/MINUTAPDF/i, "MINUTA").trim();
                        desc = desc.replace(/IMAGEN\s*MINUTA/i, "IMAGEN-MINUTA").trim();
                        desc = desc.toUpperCase();

                        const fecha = labels[1]?.textContent.trim();
                        const tipo = labels[2]?.textContent.trim();

                        if (!desc || !fecha || !tipo) return;

                        window.archivosSubidosEnP7.add(desc);

                        const claseColor = obtenerClaseDeColor(desc);
                        const nuevaLinea = document.createElement("div");
                        nuevaLinea.className = "linea-unificada";
                        nuevaLinea.innerHTML = `
                            <span class="descripcion-archivo ${claseColor}">${desc}</span> |
                            <span>${fecha}</span> |
                            <span>${tipo}</span>
                        `;

                        const primerDiv = li.querySelector("div");
                        if (primerDiv) {
                            li.insertBefore(nuevaLinea, primerDiv);
                            labels.forEach(function(l) { l.style.display = "none"; });
                        }
                    });
                }
            })(); // Fin del submódulo IIFE de Archivos en una Línea

            // --- (B) MÓDULO INTERNO: GESTOR DE PESTAÑA ARCHIVOS + AUTO-CARGAR ---
            (function() {
                let panelArchivosVisible = false;
                let observerArchivos = null;
                let autoCargarIniciado = false;

                function gestionarTipoArchivoPorDefecto() {
                    const select = document.getElementById('ddlTipoArchivo');
                    if (!select || !visible(select) || document.activeElement === select) {
                        return;
                    }

                    const subidos = window.archivosSubidosEnP7;

                    const tieneAnverso = Array.from(subidos).some(function(s) { return s.includes('ANVERSO'); });
                    const tieneEntero = Array.from(subidos).some(function(s) { return s.includes('ENTERO'); });
                    const tieneMinuta = Array.from(subidos).some(function(s) { return s.includes('MINUTA') && !s.includes('IMAGEN'); });
                    const tieneImagenMinuta = Array.from(subidos).some(function(s) { return s.includes('IMAGEN-MINUTA'); });

                    let textoOpcionBuscada = "";
                    let logMsg = "";

                    if (tieneMinuta && tieneImagenMinuta) {
                        textoOpcionBuscada = "anverso";
                        logMsg = "[Gestor Archivos] Detectados Minuta e Imagen-Minuta. Seleccionando ANVERSO (.pdf)...";
                    }
                    else if (tieneAnverso && tieneEntero) {
                        textoOpcionBuscada = "derrotero";
                        logMsg = "[Gestor Archivos] Detectados Anverso y Entero. Seleccionando DERROTERO (.zip)...";
                    }
                    else if (tieneAnverso) {
                        textoOpcionBuscada = "entero";
                        logMsg = "[Gestor Archivos] Detectado Anverso. Seleccionando ENTERO (.pdf)...";
                    }
                    else {
                        textoOpcionBuscada = "anverso";
                        logMsg = "[Gestor Archivos] No hay archivos (o falta Anverso/Minutas). Seleccionando ANVERSO (.pdf)...";
                    }

                    const regex = new RegExp(textoOpcionBuscada, 'i');
                    const opt = Array.from(select.options).find(function(o) { return regex.test(o.textContent); });

                    if (!opt) return;

                    if (select.value !== opt.value) {
                        log(logMsg);
                        select.value = opt.value;
                        fireChangeLike(select);
                    }
                }

                function runAnchoCompletoArchivos() {
                    const mainContainer = document.querySelector('div.card-container-archivos.col-md-6');
                    if (mainContainer) {
                        mainContainer.classList.remove('col-md-6');
                        mainContainer.classList.add('col-md-12');
                    }
                    const cardElements = document.querySelectorAll('#P7 div.card[style*="width"]');
                    if (cardElements.length > 0) {
                        cardElements.forEach(function(card) {
                            if (card.style.width) card.style.removeProperty('width');
                            if (!card.classList.contains('w-100')) card.classList.add('w-100');
                        });
                    }
                }

                function runEliminarMensajeArchivos() {
                    const alertBox = document.querySelector('#P7 div.alert.alert-info');
                    if (alertBox) {
                        const messageContainer = alertBox.parentElement;
                        if (messageContainer) {
                            messageContainer.remove();
                            log('[Gestor Archivos] Cuadro de mensaje eliminado.');
                        }
                    }
                }

                // --- SUBMÓDULO: AUTO CARGAR ARCHIVO ---
                function iniciarAutoCargarArchivo() {
                    if (autoCargarIniciado) return;
                    autoCargarIniciado = true;

                    log('[Gestor Archivos] Iniciando submódulo "AUTO CARGAR ARCHIVO"...');

                    var ultimoTituloCargado = null;

                    function clickCargarArchivo(titulo) {
                        var btn = document.getElementById('btnCargarArchivo');
                        if (!btn) {
                            log('[Gestor Archivos][Auto Cargar] Botón #btnCargarArchivo no encontrado.');
                            return;
                        }
                        log('[Gestor Archivos][Auto Cargar] Clic automático en CARGAR ARCHIVO para: ' + titulo);
                        btn.click();
                        ultimoTituloCargado = titulo;
                    }

                    function procesarCampo(campo) {
                        if (!campo || campo.dataset.aptaObs === '1') return;

                        campo.dataset.aptaObs = '1';

                        var observer = new MutationObserver(function(mutations) {
                            mutations.forEach(function(m) {
                                if (m.type === 'attributes' && m.attributeName === 'title') {
                                    var titulo = (campo.getAttribute('title') || '').trim();
                                    if (!titulo) return;
                                    if (titulo === ultimoTituloCargado) return;

                                    console.log('📄 Archivo detectado (title):', titulo);

                                    setTimeout(function() {
                                        clickCargarArchivo(titulo);
                                    }, 400);
                                }
                            });
                        });

                        observer.observe(campo, {
                            attributes: true,
                            attributeFilter: ['title']
                        });

                        var inicial = (campo.getAttribute('title') || '').trim();
                        if (inicial) {
                            console.log('📄 Archivo actual (title al enganchar):', inicial);
                            ultimoTituloCargado = inicial;
                        }
                    }

                    function buscarCamposIniciales() {
                        var campos = document.querySelectorAll('#P7 input.file-caption-name, input.file-caption-name');
                        if (campos.length > 0) {
                            log('[Gestor Archivos][Auto Cargar] Encontrados ' + campos.length + ' input.file-caption-name.');
                            campos.forEach(procesarCampo);
                            return true;
                        }
                        return false;
                    }

                    var intentos = 0;
                    var maxIntentos = 15;

                    var timer = setInterval(function() {
                        intentos++;
                        if (buscarCamposIniciales() || intentos >= maxIntentos) {
                            clearInterval(timer);
                        }
                    }, 700);

                    var bodyObserver = new MutationObserver(function(mutations) {
                        mutations.forEach(function(m) {
                            if (m.type === 'childList' && m.addedNodes.length > 0) {
                                Array.prototype.forEach.call(m.addedNodes, function(node) {
                                    if (!(node instanceof HTMLElement)) return;

                                    if (node.matches && node.matches('input.file-caption-name')) {
                                        procesarCampo(node);
                                    }

                                    if (node.querySelectorAll) {
                                        var internos = node.querySelectorAll('input.file-caption-name');
                                        if (internos.length > 0) {
                                            internos.forEach(procesarCampo);
                                        }
                                    }
                                });
                            }
                        });
                    });

                    if (document.body) {
                        bodyObserver.observe(document.body, {
                            childList: true,
                            subtree: true
                        });
                        log('[Gestor Archivos][Auto Cargar] MutationObserver sobre <body> iniciado.');
                    }
                }
                // --- FIN SUBMÓDULO AUTO CARGAR ARCHIVO ---

                function escanearYActualizar() {
                    if (typeof window.runArchivosEnUnaLinea !== 'function') {
                        log('Error: Módulo "runArchivosEnUnaLinea" no encontrado.');
                        return;
                    }
                    window.runArchivosEnUnaLinea();
                    gestionarTipoArchivoPorDefecto();
                }

                observerArchivos = new MutationObserver(function(mutations) {
                    for (let i = 0; i < mutations.length; i++) {
                        const mutation = mutations[i];
                        if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                            log('[Gestor Archivos] Detectado cambio en la lista de archivos. Re-escaneando...');
                            escanearYActualizar();
                            return;
                        }
                    }
                });

                setInterval(function() {
                    const panelArchivos = document.getElementById('P7');
                    const listaArchivos = document.getElementById('ULArchivos');

                    if (!document.getElementById('plano-tab')) {
                        if (panelArchivosVisible) {
                            log('[Gestor Archivos] Saliendo de la vista de planos. Deteniendo observer.');
                            panelArchivosVisible = false;
                            observerArchivos.disconnect();
                        }
                        return;
                    }

                    if (panelArchivos && panelArchivos.classList.contains('show')) {
                        if (!panelArchivosVisible) {
                            log('[Gestor Archivos] Pestaña Archivos detectada. Iniciando módulos y observer...');
                            panelArchivosVisible = true;

                            runAnchoCompletoArchivos();
                            runEliminarMensajeArchivos();
                            escanearYActualizar();
                            iniciarAutoCargarArchivo();

                            if (listaArchivos) {
                                observerArchivos.observe(listaArchivos, {
                                    childList: true
                                });
                            }
                        }
                    } else {
                        if (panelArchivosVisible) {
                            log('[Gestor Archivos] Pestaña Archivos oculta. Deteniendo observer.');
                            panelArchivosVisible = false;
                            observerArchivos.disconnect();
                        }
                    }
                }, 500); // Intervalo de vigilancia
            })(); // Fin del submódulo IIFE Gestor de Archivos
        })(); // --- FIN MÓDULO: GESTOR DE ARCHIVOS UNIFICADO ---


        // --- MÓDULO SATÉLITE: COPIAR-CONTRATO (v-1.0.1) ---
        (function () {
            'use strict';
            // v-1.0.1 INICIO MODULO COPIAR-CONTRATO

            // Este módulo se activa solo en la página de "Nuevo Contrato"
            if (!window.location.href.includes('/APT2/Contrato/Nuevo')) {
                return; // No es la página correcta
            }

            const VERSION     = 'v-1.0.1';
            const MAX_INTENTOS = 40;         // Máximo de intentos de búsqueda
            const INTERVALO_MS = 500;        // Tiempo entre intentos (ms)

            let intentos = 0;
            let yaCapturado = false;
            let temporizador = null;

            // --- Log sencillo (local a este módulo) ---
            function log(msg) {
                console.log(`[APT Trámite ${VERSION}] ${msg}`);
            }

            // Normaliza texto (quita acentos y pasa a minúsculas)
            function normalizarTexto(str) {
                return (str || '')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .trim();
            }

            // Busca el texto que contiene "Trámite:" dentro del tab de planos
            function obtenerTextoTramite() {
                const contenedorPlano = document.querySelector('#plano') || document;
                if (!contenedorPlano) return null;

                const candidatos = contenedorPlano.querySelectorAll('h1, h2, h3, span, div, p');
                for (const el of candidatos) {
                    const texto = (el.textContent || '').trim();
                    if (texto.startsWith('Trámite:')) {
                        return texto;
                    }
                }
                return null;
            }

            // Extrae sólo los dígitos a la derecha de "Trámite:"
            function extraerDigitos(textoTramite) {
                if (!textoTramite) return null;
                const match = textoTramite.match(/Trámite:\s*([0-9]+)/);
                return match ? match[1] : null;
            }

            // Obtiene el valor numérico del área total ingresada (si existe)
            // Devuelve:
            //   - número (ej. 0, 423.17) si logra leerlo
            //   - null si no encuentra el texto todavía
            function obtenerValorAreaTotal() {
                const contenedorPlano = document.querySelector('#plano') || document;
                if (!contenedorPlano) return null;

                const candidatos = contenedorPlano.querySelectorAll('h1, h2, h3, span, div, p');

                for (const el of candidatos) {
                    const textoRaw = (el.textContent || '').trim();
                    if (!textoRaw) continue;

                    const textoNorm = normalizarTexto(textoRaw);
                    if (!textoNorm.includes('area total ingresada')) continue;

                    // Busca un número antes de "m2" o "m²"
                    const match = textoRaw.match(/([0-9]+(?:[.,][0-9]+)?)\s*m[²2]/i);
                    if (match) {
                        const numero = parseFloat(match[1].replace(',', '.'));
                        if (!isNaN(numero)) {
                            return numero;
                        }
                    }
                }

                return null;
            }

            // Copia el texto al portapapeles
            function copiarAlPortapapeles(texto) {
                try {
                    // El script principal usa "@grant none", por lo que GM_setClipboard NO estará disponible.
                    if (typeof GM_setClipboard === 'function') {
                        // Esta rama probablemente nunca se ejecute, pero se deja por seguridad
                        GM_setClipboard(texto);
                        log(`Trámite copiado con GM_setClipboard: ${texto}`);
                    } else if (navigator.clipboard && navigator.clipboard.writeText) {
                        // Se usará este método (navigator.clipboard)
                        navigator.clipboard.writeText(texto)
                            .then(() => log(`Trámite copiado con navigator.clipboard: ${texto}`))
                            .catch(err => console.error('[APT Trámite] Error al copiar:', err));
                    } else {
                        log('No hay API de portapapeles disponible.');
                    }
                } catch (e) {
                    console.error('[APT Trámite] Excepción al copiar:', e);
                }
            }

            // Intenta localizar menú PLANOS, área total y Trámite y copiarlo
            function intentarCapturaTramite() {
                if (yaCapturado) return;

                // Debe existir el menú de PLANOS
                const menuPlanos = document.querySelector('#plano-tab');
                if (!menuPlanos) {
                    return; // aún no aparece el menú
                }

                // 1) Verificar que el Área Total Ingresada sea 0 m²
                const valorArea = obtenerValorAreaTotal();

                // Si todavía no encuentra el texto de área, seguimos intentando en la próxima vuelta
                if (valorArea === null) {
                    log('Área Total aún no detectada, reintentando...');
                    return;
                }

                // Si el área es distinta de cero, NO copiamos el trámite y ya no seguimos más
                if (valorArea !== 0) {
                    log(`Área Total Ingresada = ${valorArea} (≠ 0). No se copia el Trámite.`);
                    yaCapturado = true;
                    if (temporizador) {
                        clearInterval(temporizador);
                        temporizador = null;
                    }
                    return;
                }

                // 2) Si el área es exactamente 0, ahora sí leemos el Trámite
                const textoTramite = obtenerTextoTramite();
                const digitos = extraerDigitos(textoTramite);

                if (digitos) {
                    yaCapturado = true;
                    copiarAlPortapapeles(digitos);
                    log(`Trámite detectado y copiado (Área=0): ${digitos}`);

                    if (temporizador) {
                        clearInterval(temporizador);
                        temporizador = null;
                    }
                }
            }

            // Bucle de intentos limitados
            temporizador = setInterval(() => {
                intentos++;

                if (yaCapturado || intentos > MAX_INTENTOS) {
                    if (temporizador) {
                        clearInterval(temporizador);
                        temporizador = null;
                    }
                    if (!yaCapturado) {
                        log('No se logró encontrar condición (Área=0 + Trámite) dentro del número máximo de intentos.');
                    }
                    return;
                }

                intentarCapturaTramite();
            }, INTERVALO_MS);

            // Intento extra al cargar totalmente la página
            window.addEventListener('load', () => {
                if (!yaCapturado) {
                    intentarCapturaTramite();
                }
            });

            log('Módulo COPIAR-CONTRATO iniciado.');

            // v-1.0.1 FIN MODULO COPIAR-CONTRATO
        })(); // Fin IIFE Módulo COPIAR-CONTRATO


        // --- MÓDULO SATÉLITE: CERRAR POPUP 'ENTERO GUARDADO' (v-1.0.0) ---
        (function() {
            // Usar la función 'log' global si existe, o un console.log de respaldo
            var logLocal_ENT = (typeof log === 'function') ?
                function(msg) { log('[Entero Popup] ' + msg); } :
                function(msg) { console.log('[Entero Popup] ' + msg); };

            logLocal_ENT('Activando módulo "CERRAR POPUP ENTERO GUARDADO"...');

            /**
             * Esta función vigila el DOM en busca de la aparición del popup de SweetAlert
             * con el título específico y hace clic en el botón de confirmar.
             */
            function autoClickConfirm_ENT() {
                // 1. Crear un MutationObserver.
                var observer_ENT = new MutationObserver(function(mutationsList_ENT, obs_ENT) {

                    // Recorrer todas las mutaciones que ocurrieron (estilo ES5)
                    for (var i = 0; i < mutationsList_ENT.length; i++) {
                        var mutation_ENT = mutationsList_ENT[i];

                        // Solo nos interesan las mutaciones donde se añadieron nuevos elementos
                        if (mutation_ENT.type === 'childList' && mutation_ENT.addedNodes.length > 0) {

                            // 2. Buscar el elemento del título por su ID
                            var titleElement_ENT = document.getElementById('swal2-title');

                            // 3. Verificar si el título existe y tiene el texto exacto
                            // Se usa (innerText || textContent) para máxima compatibilidad
                            if (titleElement_ENT && (titleElement_ENT.innerText || titleElement_ENT.textContent).trim() === "Entero guardado con éxito") {

                                // 4. Si el título es correcto, buscar el botón "Aceptar"
                                var acceptButton_ENT = document.querySelector('button.swal2-confirm');

                                // 5. Si se encuentra el botón, hacer clic en él
                                if (acceptButton_ENT) {
                                    logLocal_ENT('Popup "Entero guardado con éxito" detectado. Haciendo clic en Aceptar.');
                                    acceptButton_ENT.click();
                                }
                            }
                        }
                    }
                });

                // 6. Iniciar el observador
                observer_ENT.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }

            // Ejecutar la función principal del módulo
            autoClickConfirm_ENT();

        })(); // Fin del módulo IIFE de Entero Popup


        // --- LÓGICA PRINCIPAL DEL ORQUESTADOR (v3.7) ---
        let planosClickeado = false;
        let faseGeneralesIniciada = false;
        let faseFincasIniciada = false;
        let fasePlanosModificarIniciada = false;
        let faseEnterosIniciada = false;
        let rellenadorContratoIniciado = false;

        // --- LÓGICA DE ARCHIVOS ELIMINADA DE AQUÍ ---
        // (Ahora se maneja en el módulo unificado de arriba)

        function runGeneralesBlock() {
            const p1 = document.getElementById('P1'); if (!p1 || p1.hasAttribute('data-generales-listo')) { return; }
            const verticesInput = document.getElementById('txtVertices');
            if (verticesInput && (verticesInput.value.trim() !== '' && verticesInput.value !== '0')) { log('Bloque "Generales" omitido: ya existen vértices definidos.'); p1.setAttribute('data-generales-listo', 'true'); sessionStorage.removeItem('cfia_generales_step'); return; }
            const destArea = document.getElementById('txtAreaReal'); const sourceArea = document.getElementById('txtareareal');
            if (sourceArea && sourceArea.value && destArea && visible(destArea) && destArea.value !== sourceArea.value) { log('Planos/Generales: Copiando Área...'); destArea.value = sourceArea.value; fireChangeLike(destArea); }
            const procesarSelector = function(config) { // ES5
                const select = document.querySelector(config.selector);
                if (select && visible(select) && select.options.length > 1) {
                    const opcion = Array.from(select.options).find(function(opt) { return config.textoBusqueda.test(opt.textContent); }); // ES5
                    if (opcion) { if (select.value !== opcion.value) { log(config.log); select.value = opcion.value; fireChangeLike(select); } return true; }
                } return false;
            };
            const campos = [
                { selector: 'select[name="DatosPlano.Generales.TipoZona"]', textoBusqueda: /urbano/i, log: 'Planos/Generales: Tipo Zona -> URBANO' }, { selector: '#ddlTipoUso', textoBusqueda: /construido y solar/i, log: 'Planos/Generales: Tipo Uso -> CONSTRUIDO Y SOLAR' },
                { selector: '#ddlTamanno', textoBusqueda: /22\s*x\s*32\s*cm/i, log: 'Planos/Generales: Tamaño -> 22x32 cm' }, { selector: 'select[name="DatosPlano.Generales.TipoCoordenada"]', textoBusqueda: /cr-sirgas/i, log: 'Planos/Generales: Tipo Coordenada -> CR-SIRGAS' },
                { selector: '#ddlTipoUbicacion', textoBusqueda: /parcela e/i, log: 'Planos/Generales: Tipo Ubicación -> PARCELA E' }
            ];
            const todosCompletados = campos.every(procesarSelector);
            if (todosCompletados) { log('✔ Bloque "Generales" auto-rellenado. Esperando clic manual en Guardar...'); p1.setAttribute('data-generales-listo', 'true'); sessionStorage.removeItem('cfia_generales_step'); }
        }
        function syncProvinciaToFincas() { const sourceProvinciaSelect = document.querySelector('select[name="General.ProvinciaUbicacion"]'); const destinationFincasSelect = document.getElementById('ddlProvinciaFinca'); if (sourceProvinciaSelect && sourceProvinciaSelect.value && sourceProvinciaSelect.value !== '0' && destinationFincasSelect && visible(destinationFincasSelect) && destinationFincasSelect.options.length > 1) { const valorACopiar = sourceProvinciaSelect.value; if (destinationFincasSelect.value !== valorACopiar) { log(`Planos/Fincas: Replicando provincia (${valorACopiar})...`); destinationFincasSelect.value = valorACopiar; fireChangeLike(destinationFincasSelect); } return true; } return false; }
        function setDefaultDerecho() { const inputDerecho = document.getElementById('txtDerecho'); const valorDeseado = '000'; if (inputDerecho && visible(inputDerecho)) { if (document.activeElement !== inputDerecho) { if (inputDerecho.value !== valorDeseado) { log(`Planos/Fincas: Estableciendo valor por defecto "${valorDeseado}" en Derecho...`); inputDerecho.value = valorDeseado; fireChangeLike(inputDerecho); } } inputDerecho.readOnly = false; inputDerecho.disabled = false; return true; } return false; }
        function syncNumeroFinca() { const listaFincas = document.getElementById('ULFincas'); const destinationInput = document.getElementById('txtNumFinca'); if (listaFincas && destinationInput && visible(destinationInput)) { const ultimaFinca = listaFincas.querySelector('li:last-child'); if (!ultimaFinca) return false; const pNumeroFinca = Array.from(ultimaFinca.querySelectorAll('p')).find(function(p) { return /Número de Finca/i.test(p.textContent); }); if (!pNumeroFinca) return false; const match = pNumeroFinca.textContent.match(/:\s*(\d+)/); if (!match || !match[1]) return false; const numeroACopiar = match[1]; if (destinationInput.value !== numeroACopiar) { log(`Planos/Fincas: Replicando Número de Finca (${numeroACopiar})...`); destinationInput.value = numeroACopiar; fireChangeLike(destinationInput); } return true; } return false; } // ES5
        function crearBotonIrAPlanosModificar() { if (document.getElementById('continuarAPlanosBtn')) return; const btn = document.createElement('button'); btn.id = 'continuarAPlanosBtn'; btn.textContent = "Continuar a 'Planos a Modificar' >>"; Object.assign(btn.style, { backgroundColor: '#007bff', color: 'white', padding: '16px 24px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '15px', display: 'block', fontSize: '1.6em' }); btn.onclick = function(e) { e.preventDefault(); log('Botón "Continuar a Planos a Modificar" presionado.'); sessionStorage.setItem('APT_PLANOS_FASE', 'CERRAR_FINCAS'); btn.remove(); }; const panelFincas = document.getElementById('P2'); if (panelFincas) { panelFincas.appendChild(btn); log('Botón de avance a "Planos a Modificar" creado.'); } } // ES5
        function runFincasBlock() { syncProvinciaToFincas(); setDefaultDerecho(); crearBotonIrAPlanosModificar(); }
        function syncProvinciaToPlanosModificar() { const sourceProvinciaSelect = document.querySelector('select[name="General.ProvinciaUbicacion"]'); const destinationSelect = document.getElementById('ddlProvinciaPlanoModificar'); if (sourceProvinciaSelect && sourceProvinciaSelect.value && sourceProvinciaSelect.value !== '0' && destinationSelect && visible(destinationSelect) && destinationSelect.options.length > 1) { const valorACopiar = sourceProvinciaSelect.value; if (destinationSelect.value !== valorACopiar) { log(`Planos/Modificar: Replicando provincia (${valorACopiar})...`); destinationSelect.value = valorACopiar; fireChangeLike(destinationSelect); } return true; } return false; }
        function crearBotonIrAEnteros() { if (document.getElementById('continuarAEnterosBtn')) return; const btn = document.createElement('button'); btn.id = 'continuarAEnterosBtn'; btn.textContent = "Continuar a 'ENTEROS' >>"; Object.assign(btn.style, { backgroundColor: '#d63384', color: 'white', padding: '16px 24px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '15px', display: 'block', fontSize: '1.6em' }); btn.onclick = function(e) { e.preventDefault(); log('Botón "Continuar a Enteros" presionado.'); sessionStorage.setItem('APT_PLANOS_FASE', 'CERRAR_PLANOS_MODIFICAR'); btn.remove(); }; const panel = document.getElementById('P5'); if (panel) { panel.appendChild(btn); log('Botón de avance a "Enteros" creado.'); } } // ES5
        function runPlanosModificarBlock() { syncProvinciaToPlanosModificar(); crearBotonIrAEnteros(); }
        function setTotalCFIA() { const input = document.getElementById('txtTotalCFIA'); const valor = '1600'; if (input && visible(input)) { if (input.value.trim() === '') { log(`Planos/Enteros: Estableciendo valor por defecto de Total CFIA: "${valor}"...`); input.value = valor; fireChangeLike(input); } return true; } return false; }
        function setMontoCIT() { const input = document.getElementById('txtMontoCIT_NTRIP'); const valor = '300'; if (input && visible(input)) { if (input.value.trim() === '') { log(`Planos/Enteros: Estableciendo valor por defecto de Monto CIT-NTRIP: "${valor}"...`); input.value = valor; fireChangeLike(input); } return true; } return false; }
        function crearBotonesDeMonto() { const inputMontoPagado = document.getElementById('txtMontoPagado'); if (!inputMontoPagado || !visible(inputMontoPagado) || document.getElementById('botones-monto-rapido')) return true; log('Planos/Enteros: Creando botones de monto rápido...'); const montos = [ { valor: '6930', color: '#dc3545' }, { valor: '11930', color: '#fd7e14' }, { valor: '11940', color: '#ffc107' }, { valor: '12020', color: '#28a745' }, { valor: '17020', color: '#20c997' }, { valor: '22020', color: '#17a2b8' } ]; const container = document.createElement('div'); container.id = 'botones-monto-rapido'; container.style.marginTop = '10px'; montos.forEach(function(monto) { const btn = document.createElement('button'); btn.textContent = monto.valor; Object.assign(btn.style, { backgroundColor: monto.color, color: 'white', border: 'none', borderRadius: '4px', padding: '8px 12px', marginRight: '5px', cursor: 'pointer', fontWeight: 'bold' }); btn.onclick = function(e) { e.preventDefault(); inputMontoPagado.value = monto.valor; fireChangeLike(inputMontoPagado); }; container.appendChild(btn); }); const containerCol = inputMontoPagado.closest('.col-md-3, .col-md-4'); if (containerCol) { containerCol.appendChild(container); return true; } return false; } // ES5
        function calcularYActualizarRegistro() { const inputMontoPagado = document.getElementById('txtMontoPagado'); const inputTotalRegistro = document.getElementById('txtTotalRegistro'); if (!inputMontoPagado || !inputTotalRegistro) return; const montoPagado = parseFloat(inputMontoPagado.value.replace(/,/g, '')) || 0; let valorRegistro = ''; if (montoPagado < 10000) { valorRegistro = '5000'; } else if (montoPagado >= 11000 && montoPagado <= 15000) { valorRegistro = '10000'; } else if (montoPagado >= 17000 && montoPagado <= 19000) { valorRegistro = '15000'; } else if (montoPagado >= 21000 && montoPagado <= 29000) { valorRegistro = '20000'; } else if (montoPagado >= 31000 && montoPagado <= 48000) { valorRegistro = '30000'; } else if (montoPagado >= 49000 && montoPagado <= 53000) { valorRegistro = '50000'; } else if (montoPagado >= 54000 && montoPagado <= 58000) { valorRegistro = '55000'; } else if (montoPagado >= 59000 && montoPagado <= 63000) { valorRegistro = '60000'; } else if (montoPagado >= 64000 && montoPagado <= 68000) { valorRegistro = '65000'; } else if (montoPagado >= 69000 && montoPagado <= 73000) { valorRegistro = '70000'; } else if (montoPagado >= 74000 && montoPagado <= 78000) { valorRegistro = '75000'; } else if (montoPagado >= 79000 && montoPagado <= 83000) { valorRegistro = '80000'; } else if (montoPagado >= 84000 && montoPagado <= 88000) { valorRegistro = '85000'; } else if (montoPagado >= 89000 && montoPagado <= 93000) { valorRegistro = '90000'; } else if (montoPagado >= 94000 && montoPagado <= 98000) { valorRegistro = '95000'; } else if (montoPagado >= 99000 && montoPagado <= 103000) { valorRegistro = '100000'; } if (inputTotalRegistro.value !== valorRegistro) { log(`Monto Pagado ${montoPagado} -> Calculando Total Registro: ${valorRegistro}`); inputTotalRegistro.value = valorRegistro; fireChangeLike(inputTotalRegistro); } }
        function activarCalculadorRegistroNacional() { const inputMontoPagado = document.getElementById('txtMontoPagado'); if (inputMontoPagado && !inputMontoPagado.hasAttribute('data-calculator-active')) { log('Planos/Enteros: Activando calculadora de Total Registro Nacional...'); inputMontoPagado.addEventListener('input', calcularYActualizarRegistro); inputMontoPagado.setAttribute('data-calculator-active', 'true'); } return !!inputMontoPagado; }
        function crearBotonIrAArchivos() { if (document.getElementById('irAArchivosBtn')) return; const btn = document.createElement('button'); btn.id = 'irAArchivosBtn'; btn.textContent = "IR A ARCHIVOS >>"; Object.assign(btn.style, { backgroundColor: '#fd7e14', color: 'white', padding: '16px 24px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '15px', display: 'block', fontSize: '1.6em' }); btn.onclick = function(e) { e.preventDefault(); log('Botón "IR A ARCHIVOS" presionado.'); sessionStorage.setItem('APT_PLANOS_FASE', 'CERRAR_ENTEROS'); }; const panelEnterosBody = document.getElementById('P6'); if (panelEnterosBody) { panelEnterosBody.appendChild(btn); log('Botón de avance a "Archivos" creado.'); } } // ES5
        function runEnterosBlock() { setTotalCFIA(); setMontoCIT(); crearBotonesDeMonto(); activarCalculadorRegistroNacional(); crearBotonIrAArchivos(); }

        function RELLENAR_CONTRATO_NUEVO() { sessionStorage.removeItem('activarModuloContrato'); log('Módulo "Rellenador" activado...'); function closeAttention() { if (typeof Swal !== 'undefined' && Swal.isVisible()) { const p = Swal.getPopup(); if (p && /atenci[oó]n/i.test(p.textContent)) { log('Cerré aviso “Atención”.'); Swal.clickConfirm(); return true; } } return false; } function handleTipoProyecto() { const m = document.querySelector('.modal.show, .modal.in'), s = document.querySelector('#ddlTipoProyectoModal'); if (!m || !s) return false; const o = Array.from(s.options).find(function(opt) { return /plano\s*simple/i.test(opt.textContent); }); if (o && s.value !== o.value) { s.value = o.value; fireChangeLike(s); log('Seleccioné "Plano Simple".'); } const g = m.querySelector('.btn-success, .btn-primary'); if (g && visible(g)) { log('Confirmando tipo de proyecto...'); superClick(g); } return !document.querySelector('.modal.show, .modal.in'); } function handleContratante() { const b = document.getElementById('bC2'), p = document.getElementById('C2'); if (!b || !p) return false; const s = p.querySelector('select[name="Contratante.Tipo"]'), o = b.getAttribute('aria-expanded') === 'true'; if (s) { const opt = Array.from(s.options).find(function(op) { return /f[ií]sica/i.test(op.textContent); }); if (!opt) return false; if (s.value !== opt.value) { log('Seleccionando "FISICA"...'); s.value = opt.value; fireChangeLike(s); return false; } if (o) { log('Cerrando panel "Contratante"...'); superClick(b); return false; } return true; } else if (!o) { log('Abriendo "Contratante"...'); superClick(b); } return false; } function setCedulaFisica() { const sels = document.querySelectorAll('select'); for (let i = 0; i < sels.length; i++) { const s = sels[i]; const f = Array.from(s.options).find(function(o) { return /f[ií]sica/i.test(o.textContent||''); }); const t = (s.closest('div, .form-group')?.textContent||'').toLowerCase(); if (f && /tipo.*c[eé]dula/.test(t) && s.name !== 'Contratante.Tipo') { if (s.value !== f.value) { s.value = f.value; fireChangeLike(s); log('Tipo Cédula: FISICA.'); } return true; } } return false; } function checkPropietarioMismoContratante() { const l = Array.from(document.querySelectorAll('label,span,div')).find(function(n) { return /propietario\s+es\s+el\s+mismo\s+contratante/i.test(n.textContent||''); }); let cb = l ? (l.htmlFor ? document.getElementById(l.htmlFor) : l.querySelector('input[type="checkbox"]')) : document.querySelector('section,div')?.querySelector('input[type="checkbox"]'); if (cb && !cb.checked) { cb.checked = true; fireChangeLike(cb); log('Marqué “Propietario es el mismo contratante”.'); } return !!cb; } function openProyecto() { const b = document.getElementById('bC5'); if (b && b.getAttribute('aria-expanded') === 'false') { superClick(b); log('Abriendo "Proyecto"...'); } return b && b.getAttribute('aria-expanded') === 'true'; } function setProvinciaPuntarenas() { const s = document.querySelector('select[name="General.ProvinciaUbicacion"]'); if (!s || s.options.length <= 1) return false; const o = Array.from(s.options).find(function(opt) { return /puntarenas/i.test(opt.textContent); }); if (!o) return false; if (s.value !== o.value) { s.value = o.value; fireChangeLike(s); log('Seleccionando Provincia...'); } return s.value === o.value; } function setMonedaColones() { const s = document.querySelector('select[name="General.TipoMoneda"]'); if (!s || s.options.length <= 1) return false; const o = Array.from(s.options).find(function(opt) { return /col[oó]n/i.test(opt.textContent); }); if (!o) return false; if (s.value !== o.value) { s.value = o.value; fireChangeLike(s); log('Seleccionando Moneda...'); } return s.value === o.value; } function setMontoExacto() { const i = document.getElementById('txtAdelanto'); if (!i) return false; if (i.value !== '0') { i.value = '0'; fireChangeLike(i); log('Monto Exacto: 0'); } return i.value === '0'; } function setPagosParciales() { const i = document.getElementById('txtpagosparciales'); if (!i) return false; if (i.value !== '12') { i.value = '12'; fireChangeLike(i); log('Pagos Parciales: 12'); } return i.value === '12'; } function setPlazoEntrega() { const i = document.getElementById('txtPlazoEntrega'), t = '3 MESES'; if (!i) return false; if (i.value !== t) { i.value = t; fireChangeLike(i); log('Plazo de Entrega: 3 MESES'); } return i.value === t; } function setDetalleProyecto() { const t = document.getElementById('txtAreadetalle'), x = 'A CATASTRAR'; if (!t) return false; if (t.value !== x) { t.value = x; fireChangeLike(t); log('Detalle: A CATASTRAR'); } return t.value === x; } function setMaximoPlanos() { const i = document.getElementById('txtmaximoplanos'); if (!i) return false; if (i.value !== '5') { i.value = '5'; fireChangeLike(i); log('Máximo Planos: 5'); } return i.value === '5'; } function handleControversias() { const b = document.getElementById('bC6'), rA = document.getElementById('ChkComposicionUnipersonal'), rB = document.getElementById('rbEquidad'); if (!b || !rA || !rB) return false; const c = rA.checked && rB.checked, o = b.getAttribute('aria-expanded') === 'true'; if (!c) { if (!o) { log('Abriendo Controversias...'); superClick(b); } else { if (!rA.checked) superClick(rA); if (!rB.checked) superClick(rB); } return false; } if (o) { log('Cerrando Controversias...'); superClick(b); return false; } return true; } function openFirmas() { const b = document.getElementById('bC8'); if (b && b.getAttribute('aria-expanded') === 'false') { superClick(b); log('Abriendo "Firmas"...'); } return b && b.getAttribute('aria-expanded') === 'true'; } function activarSincronizadores() { const sp = document.querySelector('select[name="General.ProvinciaUbicacion"]'); if (sp && !sp.hasAttribute('data-sync')) { log('Activando Sincronizadores para Firmas...'); sp.addEventListener('change', setFirmaProvincia); sp.setAttribute('data-sync', 'true'); const sc = document.querySelector('select[name="General.CantonUbicacion"]'); if(sc) sc.addEventListener('change', setFirmaCanton); const sd = document.querySelector('select[name="General.DistritoUbicacion"]'); if(sd) sd.addEventListener('change', setFirmaDistrito); } return true; } function setFirmaProvincia() { const src = document.querySelector('select[name="General.ProvinciaUbicacion"]'); if (!src || !src.value || src.value === '0') return false; const val = src.value, txt = src.options[src.selectedIndex].text, dst = document.querySelector('select[name="General.ProvinciaFirma"]'); if (!dst) return false; if (dst.value !== val) { log(`Sincronizando provincia: "${txt}"...`); dst.value = val; fireChangeLike(dst); } return dst.value === val; } function setFirmaCanton() { const src = document.querySelector('select[name="General.CantonUbicacion"]'); if (!src || !src.value || src.value === '0') return false; const val = src.value, txt = src.options[src.selectedIndex].text, dst = document.querySelector('select[name="General.CantonFirma"]'); if (!dst || dst.options.length <= 1 && val !== '0') return false; if (dst.value !== val) { log(`Sincronizando cantón: "${txt}"...`); dst.value = val; fireChangeLike(dst); } return dst.value === val; } function setFirmaDistrito() { const src = document.querySelector('select[name="General.DistritoUbicacion"]'); if (!src || !src.value || src.value === '0') return false; const val = src.value, txt = src.options[src.selectedIndex].text, dst = document.querySelector('select[name="General.DistritoFirma"]'); if (!dst || dst.options.length <= 1 && val !== '0') return false; if (dst.value !== val) { log(`Sincronizando distrito: "${txt}"...`); dst.value = val; fireChangeLike(dst); } return dst.value === val; } function checkNotificaProfesional() { const cb = document.getElementById('ChkNotificaProfesional'); if (!cb) return false; if (!cb.checked) { cb.checked = true; fireChangeLike(cb); log('Marqué “Propietario es el mismo contratante”.'); } return true; } function setFechaFirma() { const d = document.getElementById('txtFechaFirma'); if (!d) return false; const f = new Date(); f.setDate(f.getDate() - 18); const fFmt = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`; if (d.value !== fFmt) { log(`Estableciendo Fecha Firma: ${fFmt}`); d.value = fFmt; fireChangeLike(d); } return d.value === fFmt; }
            const STEPS = [
                { name: "Cerrar Pop-up 'Atención' o Manejar Modal 'Tipo de Proyecto'", func: function() { return closeAttention() || handleTipoProyecto(); } },
                { name: "Manejar Panel 'Contratante'", func: handleContratante },
                { name: "Establecer Cédula Física", func: setCedulaFisica },
                { name: "Marcar 'Propietario es mismo contratante'", func: checkPropietarioMismoContratante },
                { name: "Abrir Panel 'Proyecto'", func: openProyecto },
                { name: "Activar Sincronizadores de Dirección", func: activarSincronizadores },
                { name: "Establecer Provincia a Puntarenas", func: setProvinciaPuntarenas },
                { name: "Establecer Moneda a Colones", func: setMonedaColones },
                { name: "Establecer Monto a 0", func: setMontoExacto },
                { name: "Establecer Pagos Parciales a 12", func: setPagosParciales },
                { name: "Establecer Plazo de Entrega", func: setPlazoEntrega },
                { name: "Establecer Detalle de Proyecto", func: setDetalleProyecto },
                { name: "Establecer Máximo de Planos a 5", func: setMaximoPlanos },
                { name: "Manejar Panel 'Controversias'", func: handleControversias },
                { name: "Abrir Panel 'Firmas'", func: openFirmas },
                { name: "Marcar 'Notificar a Profesional'", func: checkNotificaProfesional },
                { name: "Establecer Fecha de Firma", func: setFechaFirma },
                { name: "Sincronizar Provincia de Firma", func: setFirmaProvincia },
                { name: "Sincronizar Cantón de Firma", func: setFirmaCanton },
                { name: "Sincronizar Distrito de Firma", func: setFirmaDistrito }
            ];
            let currentStep = 0; const fillInterval = setInterval(function() { if (currentStep >= STEPS.length) { log(">>> Relleno de formulario completado. <<<"); clearInterval(fillInterval); return; } const step = STEPS[currentStep]; try { if (step.func()) { log(`Paso ${currentStep + 1}/${STEPS.length} [${step.name}] -> COMPLETADO`); currentStep++; } } catch (error) { console.error(`Error en el paso "${step.name}":`, error); clearInterval(fillInterval); } }, 350); }; // ES5

        const orquestadorInterval = setInterval(function() { // ES5
            const popUpVisible = !!document.querySelector('.swal2-popup.swal2-show');
            const confirmButton = document.querySelector('.swal2-popup.swal2-show button.swal2-confirm');

            if (confirmButton && visible(confirmButton)) {
                const titleEl = document.querySelector('.swal2-popup.swal2-show #swal2-title');
                const msg = document.querySelector('#swal2-html-container');

                if (titleEl && /enviado/i.test(titleEl.textContent) && msg && /guardado exitosamente/i.test(msg.textContent)) {
                    return; // Este popup lo maneja el módulo de Reingreso
                }

                // Excepción para el nuevo módulo de Enteros. Si él lo maneja, el orquestador no hace nada.
                if (titleEl && (titleEl.innerText || titleEl.textContent).trim() === "Entero guardado con éxito") {
                    return; // Este popup lo maneja el módulo 'Entero Popup'
                }

                if (titleEl && /Plano a modificar guardado con éxito/i.test(titleEl.textContent)) { sessionStorage.setItem('APT_PLANOS_FASE', 'RESYNC_PLANOS_MODIFICAR'); superClick(confirmButton); }
                else if (titleEl && /Finca de plano guardada con éxito/i.test(titleEl.textContent)) { sessionStorage.setItem('APT_PLANOS_FASE', 'RESYNC_FINCAS'); superClick(confirmButton); }
                else if (!!document.getElementById('plano-tab') && titleEl && /exitoso/i.test(titleEl.textContent)) { sessionStorage.setItem('APT_PLANOS_FASE', 'ESPERANDO_REFRESH'); superClick(confirmButton); }
                else if (!document.getElementById('plano-tab')) { superClick(confirmButton); }
                return;
            }

            const faseActual = sessionStorage.getItem('APT_PLANOS_FASE');
            const panelGenerales = document.getElementById('P1');
            const panelFincas = document.getElementById('P2');
            const panelPlanosModificar = document.getElementById('P5');
            const panelEnteros = document.getElementById('P6');

            if (faseActual === 'ESPERANDO_REFRESH' && !popUpVisible && panelGenerales && panelGenerales.classList.contains('show')) { sessionStorage.setItem('APT_PLANOS_FASE', 'CERRAR_GENERALES'); }
            else if (faseActual === 'CERRAR_GENERALES' && panelGenerales && panelGenerales.classList.contains('show')) { superClick(document.getElementById('bP1')); sessionStorage.setItem('APT_PLANOS_FASE', 'ABRIR_FINCAS'); }
            else if (faseActual === 'ABRIR_FINCAS' && panelGenerales && !panelGenerales.classList.contains('show')) { const botonFincas = document.getElementById('bP2'); if (botonFincas) { superClick(botonFincas); sessionStorage.removeItem('APT_PLANOS_FASE'); } }
            else if (faseActual === 'RESYNC_FINCAS' && !popUpVisible) { if (syncProvinciaToFincas() && setDefaultDerecho() && syncNumeroFinca()) { sessionStorage.removeItem('APT_PLANOS_FASE'); } }
            else if (faseActual === 'CERRAR_FINCAS' && panelFincas && panelFincas.classList.contains('show')) { superClick(document.getElementById('bP2')); sessionStorage.setItem('APT_PLANOS_FASE', 'ABRIR_PLANOS_MODIFICAR'); }
            else if (faseActual === 'ABRIR_PLANOS_MODIFICAR' && panelFincas && !panelFincas.classList.contains('show')) { const boton = document.getElementById('bP5'); if (boton) { superClick(boton); sessionStorage.removeItem('APT_PLANOS_FASE'); } }
            else if (faseActual === 'RESYNC_PLANOS_MODIFICAR' && !popUpVisible) { runPlanosModificarBlock(); sessionStorage.removeItem('APT_PLANOS_FASE'); }
            else if (faseActual === 'CERRAR_PLANOS_MODIFICAR' && panelPlanosModificar && panelPlanosModificar.classList.contains('show')) { superClick(document.getElementById('bP5')); sessionStorage.setItem('APT_PLANOS_FASE', 'ABRIR_ENTEROS'); }
            else if (faseActual === 'ABRIR_ENTEROS' && panelPlanosModificar && !panelPlanosModificar.classList.contains('show')) { const boton = document.getElementById('bP6'); if (boton) { superClick(boton); sessionStorage.removeItem('APT_PLANOS_FASE'); } }
            else if (faseActual === 'CERRAR_ENTEROS' && panelEnteros && panelEnteros.classList.contains('show')) { superClick(document.getElementById('bP6')); sessionStorage.setItem('APT_PLANOS_FASE', 'ABRIR_ARCHIVOS'); }
            else if (faseActual === 'ABRIR_ARCHIVOS' && panelEnteros && !panelEnteros.classList.contains('show')) { const boton = document.getElementById('bP7'); if (boton) { superClick(boton); sessionStorage.removeItem('APT_PLANOS_FASE'); } }

            const enPaginaConPestanas = document.getElementById('plano-tab');
            if (enPaginaConPestanas) {
                if (!planosClickeado && visible(enPaginaConPestanas)) { superClick(enPaginaConPestanas); planosClickeado = true; }
                if (panelGenerales && panelGenerales.classList.contains('show')) { if (!faseGeneralesIniciada) { faseGeneralesIniciada = true; } runGeneralesBlock(); }
                if (panelFincas && panelFincas.classList.contains('show')) { if (!faseFincasIniciada) { faseFincasIniciada = true; } runFincasBlock(); }
                if (panelPlanosModificar && panelPlanosModificar.classList.contains('show')) { if (!fasePlanosModificarIniciada) { fasePlanosModificarIniciada = true; } runPlanosModificarBlock(); }
                if (panelEnteros && panelEnteros.classList.contains('show')) { if (!faseEnterosIniciada) { faseEnterosIniciada = true; } runEnterosBlock(); }

                // --- Bloque de ARCHIVOS ELIMINADO de aquí ---
                // (Se autogestiona en su propio módulo)

            } else {
                if (!rellenadorContratoIniciado && window.location.href.includes('/APT2/Contrato/Nuevo') && sessionStorage.getItem('activarModuloContrato') === 'true') {
                    rellenadorContratoIniciado = true; RELLENAR_CONTRATO_NUEVO();
                }
            }

            const selectorNuevoContrato = 'a[href="/APT2/Contrato/Nuevo"]';
            const linkNuevoContrato = document.querySelector(selectorNuevoContrato);
            if (linkNuevoContrato && !linkNuevoContrato.hasAttribute('data-listener-attached')) {
                linkNuevoContrato.setAttribute('data-listener-attached', 'true');
                linkNuevoContrato.addEventListener('click', function() { sessionStorage.setItem('activarModuloContrato', 'true'); }, { once: true }); // ES5
            }
        }, 500);
    })();

})();

// v-4.1.5
