
/* =========================================================
   PLANEA - APLICACIÓN PRINCIPAL
   Inicialización y comunicación entre módulos.
========================================================= */

(() => {
    "use strict";

    const APP = {

        initialized: false,
        initializing: false,

        /* =====================================================
           INICIALIZACIÓN
        ===================================================== */

        async init() {
            if (this.initialized || this.initializing) return;

            this.initializing = true;

            console.log("PLANEA: iniciando aplicación...");

            try {

                // 1. Comprobar dependencias principales
                const dependencies = [
                    "PLANEA_STORAGE",
                    "PLANEA_IMAGES",
                    "PLANEA_ROUTER",
                    "PLANEA_PROFILE",
                    "PLANEA_DASHBOARD"
                ];

                const missingDependencies = dependencies.filter(
                    dependency => !window[dependency]
                );

                if (missingDependencies.length > 0) {
                    throw new Error(
                        `Faltan dependencias: ${missingDependencies.join(", ")}`
                    );
                }

                // 2. Inicializar perfil
                await window.PLANEA_PROFILE.init();

                // 3. Inicializar navegación
                window.PLANEA_ROUTER.init();

                // 4. Inicializar Dashboard
                await window.PLANEA_DASHBOARD.init();

                // 5. Cargar módulo Mis planes
                await this.loadPlansModule();

                // 6. Inicializar módulo Mis planes
                if (!window.PLANEA_PLANS) {
                    throw new Error(
                        "El módulo Mis planes no está disponible."
                    );
                }

                await window.PLANEA_PLANS.init();

                // 7. Mostrar Dashboard inicialmente
                const profile = window.PLANEA_STORAGE.getProfile();

                if (profile?.name) {
                    window.PLANEA_ROUTER.navigateTo("dashboard");
                }

                this.initialized = true;

                console.log(
                    "PLANEA: aplicación iniciada correctamente."
                );

            } catch (error) {

                console.error(
                    "PLANEA: error durante la inicialización.",
                    error
                );

                this.showToast(
                    "Ha ocurrido un error al iniciar PLANEA.",
                    "danger"
                );

            } finally {
                this.initializing = false;
            }
        },

        /* =====================================================
           CARGA DINÁMICA DEL MÓDULO MIS PLANES
        ===================================================== */

        loadPlansModule() {

            return new Promise((resolve, reject) => {

                // Si el módulo ya está registrado, no cargarlo otra vez
                if (window.PLANEA_PLANS) {
                    resolve();
                    return;
                }

                // Buscar una etiqueta anterior del módulo
                const existingScript = document.querySelector(
                    'script[data-planea-module="plans"]'
                );

                // Si existe pero no ha registrado el módulo,
                // eliminarla para realizar una carga limpia.
                if (existingScript) {
                    existingScript.remove();
                }

                // Crear una nueva etiqueta script
                const script = document.createElement("script");

                script.src = new URL(
                    "assets/js/modules/plans.js",
                    document.baseURI
                ).href;

                script.dataset.planeaModule = "plans";

                script.onload = () => {

                    if (!window.PLANEA_PLANS) {
                        reject(
                            new Error(
                                "plans.js se ha cargado, pero no ha registrado PLANEA_PLANS."
                            )
                        );
                        return;
                    }

                    console.log(
                        "PLANEA: módulo Mis planes cargado correctamente."
                    );

                    resolve();
                };

                script.onerror = () => {

                    reject(
                        new Error(
                            "No se ha podido cargar assets/js/modules/plans.js. Comprueba la ruta del archivo."
                        )
                    );

                };

                document.body.appendChild(script);

            });
        },

        /* =====================================================
           NOTIFICACIONES
        ===================================================== */

        showToast(message, typeOrDelay = 3000) {

            const toastElement = document.getElementById("appToast");
            const toastMessage = document.getElementById("appToastMessage");

            if (!toastElement || !toastMessage) {
                console.log(`[PLANEA] ${message}`);
                return;
            }

            toastMessage.textContent = message;

            const delay = typeof typeOrDelay === "number"
                ? typeOrDelay
                : 3000;

            if (window.bootstrap?.Toast) {

                const toast = window.bootstrap.Toast.getOrCreateInstance(
                    toastElement,
                    {
                        delay,
                        autohide: true
                    }
                );

                toast.show();

            } else {

                console.log(`[PLANEA] ${message}`);

            }
        },

        /* =====================================================
           COMUNICACIÓN ENTRE MÓDULOS
        ===================================================== */

        notifyDataChanged(detail = {}) {

            document.dispatchEvent(
                new CustomEvent("planea:dataChanged", {
                    detail: {
                        ...detail,
                        timestamp: new Date().toISOString()
                    }
                })
            );

        }

    };

    // Exponer API global
    window.PLANEA_APP = APP;

    /* =====================================================
       EVENTOS GLOBALES
    ===================================================== */

    // Inicializar cuando el HTML esté preparado.
    // También contempla que DOMContentLoaded ya haya ocurrido.
    const startApplication = () => {
        APP.init();
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            startApplication,
            { once: true }
        );
    } else {
        startApplication();
    }

    // Evitar navegación accidental de enlaces vacíos
    document.addEventListener("click", event => {

        const target = event.target;

        if (!(target instanceof Element)) return;

        const emptyLink = target.closest('a[href="#"]');

        if (emptyLink) {
            event.preventDefault();
        }

    });

    // Guardar datos cuando el usuario abandone la aplicación
    document.addEventListener("visibilitychange", () => {

        if (document.visibilityState === "hidden") {

            if (window.PLANEA_STORAGE) {

                const data = window.PLANEA_STORAGE.getData();

                if (data) {
                    window.PLANEA_STORAGE.saveData(data);
                }

            }

        }

    });

})();
