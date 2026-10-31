
/* =========================================================
   PLANEA - APLICACIÓN PRINCIPAL
   Archivo: assets/js/core/app.js
   ========================================================= */

(() => {
    "use strict";

    let initialized = false;

    /* =====================================================
       NOTIFICACIONES
       ===================================================== */

    function showToast(message, delay = 3000) {
        const toastElement = document.getElementById("appToast");
        const messageElement = document.getElementById("appToastMessage");

        if (!toastElement || !messageElement) {
            console.log("PLANEA:", message);
            return;
        }

        messageElement.textContent = message;

        if (window.bootstrap && bootstrap.Toast) {
            const toast = bootstrap.Toast.getOrCreateInstance(
                toastElement,
                {
                    delay
                }
            );

            toast.show();
        } else {
            console.log("PLANEA:", message);
        }
    }

    /* =====================================================
       NOTIFICAR CAMBIOS EN LOS DATOS
       ===================================================== */

    function notifyDataChanged(detail = {}) {
        document.dispatchEvent(
            new CustomEvent("planea:dataChanged", {
                detail
            })
        );
    }

    /* =====================================================
       COMPROBACIÓN DE SISTEMAS
       ===================================================== */

    function checkSystems() {
        const systems = {
            storage: Boolean(window.PLANEA_STORAGE),
            images: Boolean(window.PLANEA_IMAGES),
            router: Boolean(window.PLANEA_ROUTER),
            profile: Boolean(window.PLANEA_PROFILE),
            dashboard: Boolean(window.PLANEA_DASHBOARD)
        };

        const missing = Object.entries(systems)
            .filter(([, available]) => !available)
            .map(([name]) => name);

        if (missing.length > 0) {
            console.error(
                "PLANEA: Faltan sistemas por cargar:",
                missing
            );

            return false;
        }

        return true;
    }

    /* =====================================================
       INICIALIZAR APLICACIÓN
       ===================================================== */

    async function init() {
        if (initialized) {
            return;
        }

        initialized = true;

        console.log("PLANEA: Iniciando aplicación...");

        if (!checkSystems()) {
            initialized = false;

            showToast(
                "No se han podido cargar todos los componentes de PLANEA."
            );

            return;
        }

        try {
            // 1. Inicializar perfil y comprobar bienvenida.
            await window.PLANEA_PROFILE.init();

            // 2. Inicializar navegación.
            window.PLANEA_ROUTER.init();

            // 3. Inicializar Dashboard.
            window.PLANEA_DASHBOARD.init();

            // 4. Mostrar la vista correspondiente.
            const profile = window.PLANEA_STORAGE.getProfile();

            if (profile && profile.name) {
                window.PLANEA_ROUTER.navigateTo("dashboard", {
                    closeMobileMenu: false
                });

                window.PLANEA_DASHBOARD.render();
            }

            console.log("PLANEA: Aplicación iniciada correctamente.");

        } catch (error) {
            console.error(
                "PLANEA: Error durante la inicialización:",
                error
            );

            initialized = false;

            showToast(
                "Ha ocurrido un error al iniciar PLANEA. Revisa la consola."
            );
        }
    }

    /* =====================================================
       EVENTOS GENERALES
       ===================================================== */

    function bindGlobalEvents() {

        // Evitar que enlaces vacíos provoquen saltos de página.
        document.addEventListener("click", event => {
            const emptyLink = event.target.closest('a[href="#"]');

            if (
                emptyLink &&
                !emptyLink.hasAttribute("data-view")
            ) {
                event.preventDefault();
            }
        });

        // Recuperar la vista actual cuando se vuelve a la pestaña.
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden && window.PLANEA_DASHBOARD) {
                if (
                    window.PLANEA_ROUTER &&
                    window.PLANEA_ROUTER.getCurrentView() === "dashboard"
                ) {
                    window.PLANEA_DASHBOARD.render();
                }
            }
        });
    }

    /* =====================================================
       INICIO AUTOMÁTICO
       ===================================================== */

    function start() {
        bindGlobalEvents();
        init();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.PLANEA_APP = {
        init,
        showToast,
        notifyDataChanged
    };

})();
