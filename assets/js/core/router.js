
/* =========================================================
   PLANEA - ROUTER
   Navegación principal de la aplicación
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       CONFIGURACIÓN
    ===================================================== */

    const VALID_VIEWS = [
        "dashboard",
        "plans",
        "calendar",
        "generator",
        "favorites",
        "expenses",
        "history",
        "settings"
    ];

    const PAGE_TITLES = {
        dashboard: "Inicio",
        plans: "Mis planes",
        calendar: "Calendario",
        generator: "Descubre tu próximo plan",
        favorites: "Ideas favoritas",
        expenses: "Presupuestos y gastos",
        history: "Historial",
        settings: "Configuración"
    };

    const LAST_VIEW_KEY = "planea_last_view";

    let currentView = "dashboard";
    let initialized = false;


    /* =====================================================
       ELEMENTOS
    ===================================================== */

    const getSidebar = () => document.getElementById("sidebar");

    const getSidebarOverlay = () =>
        document.querySelector(".sidebar-overlay");

    const getMobileMenuButton = () =>
        document.querySelector(".mobile-menu-button");

    const getMainArea = () =>
        document.querySelector(".main-area");

    const getMoreMenu = () =>
        document.getElementById("moreMenu");


    /* =====================================================
       UTILIDADES
    ===================================================== */

    function normalizeView(view) {
        return VALID_VIEWS.includes(view) ? view : "dashboard";
    }


    function isMobile() {
        return window.matchMedia("(max-width: 768px)").matches;
    }


    function saveLastView(view) {
        try {
            localStorage.setItem(LAST_VIEW_KEY, view);
        } catch (error) {
            console.warn("PLANEA: No se pudo guardar la última vista.", error);
        }
    }


    function getLastView() {
        try {
            const savedView = localStorage.getItem(LAST_VIEW_KEY);

            if (savedView && VALID_VIEWS.includes(savedView)) {
                return savedView;
            }
        } catch (error) {
            console.warn("PLANEA: No se pudo recuperar la última vista.", error);
        }

        return "dashboard";
    }


    function dispatchViewChanged(view) {
        document.dispatchEvent(
            new CustomEvent("planea:viewChanged", {
                detail: {
                    view: view
                }
            })
        );
    }


    /* =====================================================
       CAMBIAR DE PÁGINA
    ===================================================== */

    function navigateTo(view, options = {}) {

        const targetView = normalizeView(view);

        const previousView = currentView;

        currentView = targetView;

        renderView(targetView);

        updateNavigation(targetView);

        updatePageTitle(targetView);

        saveLastView(targetView);

        closeMobileMenu();

        closeMoreMenu();

        if (previousView !== targetView || options.forceRender) {
            dispatchViewChanged(targetView);
        }

        if (options.scrollToTop !== false) {
            scrollToTop();
        }

        return targetView;
    }


    /* =====================================================
       MOSTRAR CONTENIDO
    ===================================================== */

    function renderView(view) {

        const targetView = normalizeView(view);

        const pages = document.querySelectorAll("[data-page]");

        pages.forEach(page => {

            const isActive = page.dataset.page === targetView;

            page.classList.toggle("d-none", !isActive);

            page.setAttribute(
                "aria-hidden",
                isActive ? "false" : "true"
            );

        });

    }


    /* =====================================================
       ACTUALIZAR NAVEGACIÓN
    ===================================================== */

    function updateNavigation(view) {

        const navigationItems = document.querySelectorAll("[data-view]");

        navigationItems.forEach(item => {

            const itemView = item.dataset.view;

            const isActive = itemView === view;

            item.classList.toggle("active", isActive);

            if (isActive) {
                item.setAttribute("aria-current", "page");
            } else {
                item.removeAttribute("aria-current");
            }

        });

    }


    /* =====================================================
       ACTUALIZAR TÍTULO
    ===================================================== */

    function updatePageTitle(view) {

        const titleElement = document.querySelector("[data-page-title]");

        if (!titleElement) {
            return;
        }

        titleElement.textContent =
            PAGE_TITLES[view] || PAGE_TITLES.dashboard;

        document.title =
            `${PAGE_TITLES[view] || "Inicio"} | PLANEA`;

    }


    /* =====================================================
       SCROLL
    ===================================================== */

    function scrollToTop() {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    /* =====================================================
       SIDEBAR MÓVIL
    ===================================================== */

    function openMobileMenu() {

        if (!isMobile()) {
            return;
        }

        const sidebar = getSidebar();
        const overlay = getSidebarOverlay();
        const button = getMobileMenuButton();

        if (!sidebar || !overlay) {
            return;
        }

        sidebar.classList.add("open");
        overlay.classList.add("active");

        document.body.classList.add("sidebar-open");

        if (button) {
            button.setAttribute("aria-expanded", "true");
            button.setAttribute("aria-label", "Cerrar menú");
        }

    }


    function closeMobileMenu() {

        const sidebar = getSidebar();
        const overlay = getSidebarOverlay();
        const button = getMobileMenuButton();

        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (overlay) {
            overlay.classList.remove("active");
        }

        document.body.classList.remove("sidebar-open");

        if (button) {
            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-label", "Abrir menú");
        }

    }


    function toggleMobileMenu() {

        const sidebar = getSidebar();

        if (!sidebar) {
            return;
        }

        if (sidebar.classList.contains("open")) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }

    }


    /* =====================================================
       MENÚ MÁS (OFFCANVAS BOOTSTRAP)
    ===================================================== */

    function openMoreMenu() {

        const moreMenu = getMoreMenu();

        if (!moreMenu || !window.bootstrap) {
            return;
        }

        const instance =
            bootstrap.Offcanvas.getOrCreateInstance(moreMenu);

        instance.show();

    }


    function closeMoreMenu() {

        const moreMenu = getMoreMenu();

        if (!moreMenu || !window.bootstrap) {
            return;
        }

        const instance =
            bootstrap.Offcanvas.getInstance(moreMenu);

        if (instance) {
            instance.hide();
        }

    }


    /* =====================================================
       SIDEBAR CONTRAÍDA
    ===================================================== */

    function toggleSidebar() {

        if (isMobile()) {
            return;
        }

        const sidebar = getSidebar();

        if (!sidebar) {
            return;
        }

        const isCollapsed = sidebar.classList.toggle("collapsed");

        saveSidebarPreference(isCollapsed);

    }


    function saveSidebarPreference(isCollapsed) {

        const storage = window.PLANEA_STORAGE;

        if (!storage || typeof storage.getSettings !== "function") {
            return;
        }

        const settings = storage.getSettings() || {};

        storage.saveSettings({
            ...settings,
            sidebarCollapsed: Boolean(isCollapsed)
        });

    }


    function restoreSidebarPreference() {

        const sidebar = getSidebar();

        if (!sidebar) {
            return;
        }

        if (isMobile()) {
            sidebar.classList.remove("collapsed");
            return;
        }

        const storage = window.PLANEA_STORAGE;

        if (!storage || typeof storage.getSettings !== "function") {
            return;
        }

        const settings = storage.getSettings() || {};

        sidebar.classList.toggle(
            "collapsed",
            Boolean(settings.sidebarCollapsed)
        );

    }


    /* =====================================================
       EVENTOS DE NAVEGACIÓN
    ===================================================== */

    function bindNavigationEvents() {

        /*
         * Navegación general.
         * Funciona tanto con el sidebar como con la barra
         * inferior y los accesos internos del Dashboard.
         */

        document.addEventListener("click", event => {

            const navigationItem = event.target.closest("[data-view]");

            if (!navigationItem) {
                return;
            }

            event.preventDefault();

            const view = navigationItem.dataset.view;

            if (!VALID_VIEWS.includes(view)) {
                return;
            }

            navigateTo(view);

        });


        /*
         * Botón hamburguesa.
         */

        const mobileButton = getMobileMenuButton();

        if (mobileButton) {

            mobileButton.addEventListener("click", event => {

                event.preventDefault();

                toggleMobileMenu();

            });

        }


        /*
         * Fondo oscuro del sidebar.
         */

        const overlay = getSidebarOverlay();

        if (overlay) {

            overlay.addEventListener("click", () => {
                closeMobileMenu();
            });

        }


        /*
         * Botón de contraer sidebar.
         */

        const collapseButton =
            document.querySelector("[data-sidebar-toggle]");

        if (collapseButton) {

            collapseButton.addEventListener("click", event => {

                event.preventDefault();

                toggleSidebar();

            });

        }


        /*
         * Cerrar con Escape.
         */

        document.addEventListener("keydown", event => {

            if (event.key === "Escape") {

                closeMobileMenu();

            }

        });


        /*
         * Cambio de tamaño de pantalla.
         */

        let resizeTimeout;

        window.addEventListener("resize", () => {

            clearTimeout(resizeTimeout);

            resizeTimeout = setTimeout(() => {

                if (!isMobile()) {
                    closeMobileMenu();
                }

                restoreSidebarPreference();

            }, 120);

        });


        /*
         * Al cerrar el panel Más, se mantiene sincronizada
         * la navegación.
         */

        const moreMenu = getMoreMenu();

        if (moreMenu) {

            moreMenu.addEventListener("hidden.bs.offcanvas", () => {

                const moreButton = document.querySelector(
                    '.mobile-bottom-nav [data-bs-target="#moreMenu"]'
                );

                if (moreButton) {
                    moreButton.setAttribute("aria-expanded", "false");
                }

            });

        }


        /*
         * Al abrir el panel Más, indicamos que está expandido.
         */

        if (moreMenu) {

            moreMenu.addEventListener("show.bs.offcanvas", () => {

                const moreButton = document.querySelector(
                    '.mobile-bottom-nav [data-bs-target="#moreMenu"]'
                );

                if (moreButton) {
                    moreButton.setAttribute("aria-expanded", "true");
                }

            });

        }

    }


    /* =====================================================
       INICIALIZACIÓN
    ===================================================== */

    function init() {

        if (initialized) {
            return;
        }

        initialized = true;

        restoreSidebarPreference();

        bindNavigationEvents();

        const initialView = getLastView();

        currentView = initialView;

        renderView(initialView);

        updateNavigation(initialView);

        updatePageTitle(initialView);

        dispatchViewChanged(initialView);

    }


    /* =====================================================
       API PÚBLICA
    ===================================================== */

    window.PLANEA_ROUTER = {

        init,

        navigateTo,

        renderView,

        updateNavigation,

        openMobileMenu,

        closeMobileMenu,

        toggleMobileMenu,

        openMoreMenu,

        closeMoreMenu,

        toggleSidebar,

        restoreSidebarPreference,

        getCurrentView() {
            return currentView;
        },

        getValidViews() {
            return [...VALID_VIEWS];
        }

    };

})();
