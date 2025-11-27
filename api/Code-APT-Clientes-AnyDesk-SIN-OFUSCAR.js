// ==UserScript==
// @name         APT TOTAL PARA CLIENTES ANYDESK <versión 4.1.9>
// @namespace    http://tampermonkey.net/
// @version      4.1.9
// @description  v4.1.9: Bloqueo de Seguridad (11aa) + Código Funcional (v-4.1.8).
// @author       Gemini
// @match        https://apt.cfia.or.cr/APT2/*
// @icon         https://apt.cfia.or.cr/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// ===============================================================
//  BLOQUE DE SEGURIDAD (VALLA DE ACCESO)
//  ---------------------------------------------------------------
//  Si la clave no es "11aa", el script muere en la línea 35.
//  No tocar nada de este bloque.
// ===============================================================

const CLIENT_PASS = '11aa';

(function() {
    // 1. Capturar credenciales del Lanzador
    var pass = window.__APT_CLIENT_PASS__;
    var token = window.__TYKO_SECURE_TOKEN__;

    // 2. Limpieza inmediata (Seguridad)
    window.__APT_CLIENT_PASS__ = null;
    window.__TYKO_SECURE_TOKEN__ = null;
    try { delete window.__APT_CLIENT_PASS__; delete window.__TYKO_SECURE_TOKEN__; } catch(e){}

    // 3. Validar Token (Que venga del lanzador)
    if (token !== 'ACCESO-TYKO-OK') {
        console.error('⛔ [APT-SEC] Acceso directo no permitido. Use el Lanzador.');
        throw new Error('STOP'); // Detiene el script aquí
    }

    // 4. Validar Clave
    if (pass !== CLIENT_PASS) {
        console.error('⛔ [APT-SEC] Clave incorrecta.');
        alert('⛔ CLAVE INCORRECTA ⛔\nEl script se detendrá.');
        throw new Error('STOP'); // Detiene el script aquí
    }

    // 5. Si pasa, confirmamos en consola
    console.log('%c✅ Clave 11aa aceptada. Ejecutando APT v-4.1.8...', 'color: green; font-weight: bold;');

})();

// ===============================================================
//  ⬇️ PEGA AQUÍ DEBAJO TU CÓDIGO v-4.1.8 COMPLETO ⬇️
//  (Desde el primer "(function..." hasta el final del archivo)
// ===============================================================

// ... Aquí va tu código gigante tal cual lo tenías, sin envolverlo en nada extra ...
