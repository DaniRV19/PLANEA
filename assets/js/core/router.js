/* =========================================================
   PLANEA - ROUTER
   Archivo: assets/js/core/router.js
   ========================================================= */

(() => {
    "use strict";

    let initialized = false;
    let currentView = null;

    const DEFAULT_VIEW = "dashboard";

    const VALID_VIEWS = [
        "dashboard",
        "plans",
        "calendar",
        "participants",
        "expenses",
        "generator",
        "favorites",
        "budget",
        "history",
        "settings"
    ];

    /* =====================================================
       UTILIDADES
       ===================================================== */

    function getSections() {
        return Array.from(
            document.querySelectorAll("[data-page]")
        );
    }

    function getNavigationLinks() {
        return Array.from(
            document.querySelectorAll("[data-view]")
        );
    }

    function isValidView(view) {
        return VALID_VIEWS.includes(view);
    }

    function getSection(view) {
        return document.querySelector(
            `[data-page="${view}"]`
        );
    }

    /* =====================================================
       MOSTRAR VISTA
       ===================================================== */

    function showView(view) {
        const section = getSection(view);

        if (!section) {
            console.warn(
                `PLANEA ROUTER: No se encuentra la sección "${view}".`
            );

            return false;
        }

        getSections().forEach(page => {
            const isActive = page.dataset.page === view;

            page.classList.toggle("d-none", !isActive);
            page.setAttribute(
                "aria-hidden",
                String(!isActive)
            );

            if (isActive) {
                page.classList.add("active-page");
            } else {
                page.classList.remove("active-page");
            }
        });

        return true;
    }

    /* =====================================================
       ACTUALIZAR NAVEGACIÓN
       ===================================================== */

    function updateNavigation(view) {
        getNavigationLinks().forEach(link => {
            const isActive = link.dataset.view === view;

            link.classList.toggle("active", isActive);

            if (isActive) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    /* =====================================================
       NAVEGACIÓN PRINCIPAL
       ===================================================== */

    function navigateTo(view) {
        if (!view || !isValidView(view)) {
            console.warn(
                `PLANEA ROUTER: Vista no válida: "${view}".`
            );

            return false;
        }

        /*
         * Buscamos la sección en cada navegación.
         * Esto permite utilizar vistas creadas dinámicamente,
         * como el módulo de Participantes.
         */

        const section = getSection(view);

        if (!section) {
            console.warn(
                `PLANEA ROUTER: La vista "${view}" todavía no existe en el DOM.`
            );

            return false;
        }

        const previousView = currentView;

        if (!showView(view)) {
            return false;
        }

        currentView = view;

        updateNavigation(view);

        /*
         * Evento global para que los módulos puedan
         * detectar cuándo se cambia de pantalla.
         */

        document.dispatchEvent(
            new CustomEvent("planea:viewChanged", {
                detail: {
                    view: view,
                    previousView: previousView
                }
            })
        );

        /*
         * Volver al inicio del contenido.
         */

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        console.log(
            `PLANEA ROUTER: Navegando a "${view}".`
        );

        return true;
    }

    /* =====================================================
       EVENTOS DE NAVEGACIÓN
       ===================================================== */

    function bindNavigationEvents() {
        /*
         * Delegación de eventos:
         * también funciona con enlaces añadidos
         * dinámicamente después de iniciar la aplicación.
         */

        document.addEventListener("click", event => {
            const link = event.target.closest("[data-view]");

            if (!link) {
                return;
            }

            const view = link.dataset.view;

            if (!view) {
                return;
            }

            event.preventDefault();

            navigateTo(view);
        });
    }

    /* =====================================================
       VISTA INICIAL
       ===================================================== */

    function getInitialView() {
        const activeSection = document.querySelector(
            '[data-page]:not(.d-none)'
        );

        if (
            activeSection &&
            isValidView(activeSection.dataset.page)
        ) {
            return activeSection.dataset.page;
        }

        return DEFAULT_VIEW;
    }

    /* =====================================================
       INICIALIZACIÓN
       ===================================================== */

    function init() {
        if (initialized) {
            return;
        }

        initialized = true;

        bindNavigationEvents();

        const initialView = getInitialView();

        /*
         * Intentamos mostrar la vista inicial.
         * Si no existe, probamos con dashboard.
         */

        if (!showView(initialView)) {
            if (!showView(DEFAULT_VIEW)) {
                console.error(
                    "PLANEA ROUTER: No se ha encontrado ninguna vista inicial."
                );

                return;
            }

            currentView = DEFAULT_VIEW;
        } else {
            currentView = initialView;
        }

        updateNavigation(currentView);

        document.dispatchEvent(
            new CustomEvent("planea:viewChanged", {
                detail: {
                    view: currentView,
                    previousView: null
                }
            })
        );

        console.log(
            "PLANEA ROUTER: Inicializado correctamente."
        );
    }

    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.PLANEA_ROUTER = {
        init,
        navigateTo,

        getCurrentView() {
            return currentView;
        },

        getValidViews() {
            return [...VALID_VIEWS];
        },

        refreshNavigation() {
            if (currentView) {
                updateNavigation(currentView);
            }
        }
    };

})();