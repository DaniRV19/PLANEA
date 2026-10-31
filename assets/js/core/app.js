/* =========================================================
   PLANEA - APLICACIÓN PRINCIPAL
   Inicialización y comunicación entre módulos.
========================================================= */

(() => {
    "use strict";

    const APP = {

        initialized: false,

        /* =====================================================
           INICIALIZACIÓN
        ===================================================== */

        async init() {
            if (this.initialized) return;

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

                // 5. Cargar el módulo Mis planes
                await this.loadPlansModule();

                // 6. Inicializar Mis planes
                if (window.PLANEA_PLANS) {
                    await window.PLANEA_PLANS.init();
                }

                // 7. Mostrar Dashboard inicialmente
                const profile = window.PLANEA_STORAGE.getProfile();

                if (profile?.name) {
                    window.PLANEA_ROUTER.navigateTo("dashboard");
                }

                this.initialized = true;

                console.log("PLANEA: aplicación iniciada correctamente.");

            } catch (error) {
                console.error(
                    "PLANEA: error durante la inicialización.",
                    error
                );

                this.showToast(
                    "Ha ocurrido un error al iniciar PLANEA.",
                    "danger"
                );
            }
        },

        /* =====================================================
           CARGA DINÁMICA DEL MÓDULO MIS PLANES
        ===================================================== */

        loadPlansModule() {
            return new Promise((resolve, reject) => {

                // Si ya está cargado, no volver a cargarlo
                if (window.PLANEA_PLANS) {
                    resolve();
                    return;
                }

                // Comprobar si ya existe una etiqueta script
                const existingScript = document.querySelector(
                    'script[data-planea-module="plans"]'
                );

                if (existingScript) {
                    existingScript.addEventListener("load", resolve, {
                        once: true
                    });

                    existingScript.addEventListener("error", () => {
                        reject(
                            new Error("No se pudo cargar el módulo Mis planes.")
                        );
                    }, { once: true });

                    return;
                }

                // Crear etiqueta script
                const script = document.createElement("script");

                script.src = "assets/js/modules/plans.js";
                script.dataset.planeaModule = "plans";

                script.onload = () => {
                    if (!window.PLANEA_PLANS) {
                        reject(
                            new Error(
                                "El archivo plans.js se ha cargado, pero no ha registrado el módulo."
                            )
                        );
                        return;
                    }

                    console.log("PLANEA: módulo Mis planes cargado.");

                    resolve();
                };

                script.onerror = () => {
                    reject(
                        new Error(
                            "No se ha podido cargar assets/js/modules/plans.js"
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

            // Permitir recibir tanto un tipo como una duración
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

    document.addEventListener("DOMContentLoaded", () => {
        APP.init();
    });

    // Evitar navegación accidental de enlaces vacíos
    document.addEventListener("click", event => {

        const emptyLink = event.target.closest('a[href="#"]');

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