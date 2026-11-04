
/* =========================================================
   PLANEA - CALENDARIO
   Archivo: assets/js/modules/calendar.js
   ========================================================= */

(() => {
    "use strict";

    let initialized = false;
    let currentDate = new Date();
    let selectedDate = getToday();
    let currentView = "month";

    const STORAGE = () => window.PLANEA_STORAGE;

    /* =====================================================
       UTILIDADES
       ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function getToday() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function dateToKey(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function keyToDate(key) {
        if (!key || typeof key !== "string") {
            return null;
        }

        const parts = key.split("-").map(Number);

        if (
            parts.length !== 3 ||
            parts.some(Number.isNaN)
        ) {
            return null;
        }

        const date = new Date(
            parts[0],
            parts[1] - 1,
            parts[2]
        );

        if (
            date.getFullYear() !== parts[0] ||
            date.getMonth() !== parts[1] - 1 ||
            date.getDate() !== parts[2]
        ) {
            return null;
        }

        return date;
    }

    function formatDate(dateString, options = {}) {
        const date = keyToDate(dateString);

        if (!date) {
            return "Fecha no disponible";
        }

        return new Intl.DateTimeFormat("es-ES", {
            day: "numeric",
            month: "long",
            ...options
        }).format(date);
    }

    function formatMonth(date) {
        return new Intl.DateTimeFormat("es-ES", {
            month: "long",
            year: "numeric"
        }).format(date);
    }

    function formatWeekRange(start, end) {
        const sameMonth =
            start.getMonth() === end.getMonth() &&
            start.getFullYear() === end.getFullYear();

        const sameYear =
            start.getFullYear() === end.getFullYear();

        if (sameMonth) {
            return `${start.getDate()} - ${end.getDate()} de ${
                new Intl.DateTimeFormat("es-ES", {
                    month: "long",
                    year: "numeric"
                }).format(end)
            }`;
        }

        if (sameYear) {
            return `${start.getDate()} ${new Intl.DateTimeFormat(
                "es-ES",
                { month: "short" }
            ).format(start)} - ${end.getDate()} ${new Intl.DateTimeFormat(
                "es-ES",
                { month: "short", year: "numeric" }
            ).format(end)}`;
        }

        return `${formatDate(dateToKey(start), {
            year: "numeric"
        })} - ${formatDate(dateToKey(end), {
            year: "numeric"
        })}`;
    }

    function normalizeStatus(status) {
        return String(status || "Pendiente")
            .trim()
            .toLowerCase();
    }

    function getStatus(plan) {
        return plan.status || "Pendiente";
    }

    function getStatusClass(status) {
        const normalized = normalizeStatus(status);

        if (normalized === "confirmado") {
            return "planea-calendar-confirmed";
        }

        if (normalized === "realizado") {
            return "planea-calendar-completed";
        }

        if (normalized === "cancelado") {
            return "planea-calendar-cancelled";
        }

        return "planea-calendar-pending";
    }

    function getStatusIcon(status) {
        const normalized = normalizeStatus(status);

        if (normalized === "confirmado") {
            return "bi-check-circle-fill";
        }

        if (normalized === "realizado") {
            return "bi-check-all";
        }

        if (normalized === "cancelado") {
            return "bi-x-circle";
        }

        return "bi-clock";
    }

    function getCategoryIcon(category) {
        const icons = {
            Gastronomía: "bi-cup-hot",
            Ocio: "bi-controller",
            Viajes: "bi-airplane",
            Deporte: "bi-trophy",
            Cultura: "bi-palette",
            Naturaleza: "bi-tree",
            Otros: "bi-stars"
        };

        return icons[category] || "bi-calendar-event";
    }

    function getPlans() {
        if (
            !STORAGE() ||
            typeof STORAGE().getPlans !== "function"
        ) {
            return [];
        }

        const plans = STORAGE().getPlans();

        return Array.isArray(plans) ? plans : [];
    }

    function getPlansByDate() {
        const result = {};

        getPlans().forEach(plan => {
            if (!plan.date || !keyToDate(plan.date)) {
                return;
            }

            if (!result[plan.date]) {
                result[plan.date] = [];
            }

            result[plan.date].push(plan);
        });

        Object.values(result).forEach(plans => {
            plans.sort((a, b) => {
                return String(a.time || "").localeCompare(
                    String(b.time || "")
                );
            });
        });

        return result;
    }

    function getWeekStart(date) {
        const result = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );

        const day = (result.getDay() + 6) % 7;

        result.setDate(result.getDate() - day);

        return result;
    }

    function getWeekDays(date) {
        const start = getWeekStart(date);

        return Array.from({ length: 7 }, (_, index) => {
            const day = new Date(start);

            day.setDate(start.getDate() + index);

            return day;
        });
    }

    function isSameMonth(dateA, dateB) {
        return (
            dateA.getMonth() === dateB.getMonth() &&
            dateA.getFullYear() === dateB.getFullYear()
        );
    }

    /* =====================================================
       ESTILOS DEL CALENDARIO
       ===================================================== */

    function injectStyles() {
        if (getElement("planeaCalendarStyles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "planeaCalendarStyles";

        style.textContent = `
            .planea-calendar-wrapper {
                display: grid;
                grid-template-columns: minmax(0, 1.65fr) minmax(280px, .85fr);
                gap: 24px;
                align-items: start;
            }

            .planea-calendar-main,
            .planea-calendar-sidebar {
                background: var(--card-bg, #151a19);
                border: 1px solid var(--border-color, rgba(255,255,255,.08));
                border-radius: 18px;
                padding: 22px;
                min-width: 0;
            }

            .planea-calendar-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 14px;
                margin-bottom: 24px;
                flex-wrap: wrap;
            }

            .planea-calendar-month {
                color: var(--text-primary, #fff);
                font-size: 1.35rem;
                font-weight: 700;
                text-transform: capitalize;
                margin: 0;
            }

            .planea-calendar-toolbar-right {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }

            .planea-calendar-navigation {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .planea-calendar-nav-btn {
                width: 38px;
                height: 38px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                border: 1px solid var(--border-color, rgba(255,255,255,.1));
                background: rgba(255,255,255,.035);
                color: var(--text-primary, #fff);
                cursor: pointer;
                transition: .2s ease;
            }

            .planea-calendar-nav-btn:hover {
                background: #16a36a;
                border-color: #16a36a;
                color: #fff;
            }

            .planea-calendar-today-btn {
                height: 38px;
                padding: 0 14px;
                border-radius: 10px;
                border: 1px solid rgba(22,163,106,.4);
                background: rgba(22,163,106,.12);
                color: #36c98b;
                font-size: .85rem;
                font-weight: 600;
                cursor: pointer;
                transition: .2s ease;
            }

            .planea-calendar-today-btn:hover {
                background: #16a36a;
                color: #fff;
            }

            .planea-calendar-view-switch {
                display: flex;
                padding: 4px;
                gap: 3px;
                border-radius: 10px;
                background: rgba(255,255,255,.045);
                border: 1px solid var(--border-color, rgba(255,255,255,.08));
            }

            .planea-calendar-view-btn {
                border: 0;
                border-radius: 7px;
                padding: 7px 11px;
                background: transparent;
                color: var(--text-secondary, #a0aaa5);
                font-size: .78rem;
                font-weight: 600;
                cursor: pointer;
                transition: .2s ease;
            }

            .planea-calendar-view-btn.active {
                background: #16a36a;
                color: #fff;
            }

            .planea-calendar-grid {
                display: grid;
                grid-template-columns: repeat(7, minmax(0, 1fr));
                gap: 7px;
            }

            .planea-calendar-weekday {
                text-align: center;
                color: var(--text-secondary, #929b97);
                font-size: .78rem;
                font-weight: 700;
                padding: 8px 0;
            }

            .planea-calendar-day {
                position: relative;
                min-height: 82px;
                padding: 9px 7px;
                border: 1px solid transparent;
                border-radius: 12px;
                background: rgba(255,255,255,.025);
                color: var(--text-primary, #fff);
                cursor: pointer;
                text-align: left;
                transition: .2s ease;
                overflow: hidden;
            }

            .planea-calendar-day:hover {
                background: rgba(22,163,106,.1);
                border-color: rgba(22,163,106,.35);
            }

            .planea-calendar-day.other-month {
                opacity: .35;
            }

            .planea-calendar-day.today {
                border-color: rgba(22,163,106,.65);
                background: rgba(22,163,106,.08);
            }

            .planea-calendar-day.selected {
                background: rgba(22,163,106,.18);
                border-color: #16a36a;
                box-shadow: inset 0 0 0 1px rgba(22,163,106,.15);
            }

            .planea-calendar-day-number {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 27px;
                height: 27px;
                font-size: .85rem;
                font-weight: 600;
                border-radius: 8px;
            }

            .planea-calendar-day.today .planea-calendar-day-number {
                background: #16a36a;
                color: #fff;
            }

            .planea-calendar-day-events {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-top: 6px;
            }

            .planea-calendar-event-line {
                display: block;
                width: 100%;
                height: 4px;
                border-radius: 5px;
                background: #16a36a;
            }

            .planea-calendar-event-line.planea-calendar-confirmed {
                background: #3b9df5;
            }

            .planea-calendar-event-line.planea-calendar-completed {
                background: #9b8bea;
            }

            .planea-calendar-event-line.planea-calendar-cancelled {
                background: #d66c6c;
            }

            .planea-calendar-event-line.planea-calendar-pending {
                background: #e3aa48;
            }

            .planea-calendar-more {
                color: var(--text-secondary, #a0aaa5);
                font-size: .65rem;
                line-height: 1;
            }

            .planea-calendar-legend {
                display: flex;
                flex-wrap: wrap;
                gap: 14px;
                margin-top: 22px;
                padding-top: 17px;
                border-top: 1px solid var(--border-color, rgba(255,255,255,.08));
            }

            .planea-calendar-legend-item {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                color: var(--text-secondary, #a0aaa5);
                font-size: .76rem;
            }

            .planea-calendar-legend-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #e3aa48;
            }

            .planea-calendar-legend-dot.confirmed {
                background: #3b9df5;
            }

            .planea-calendar-legend-dot.completed {
                background: #9b8bea;
            }

            .planea-calendar-legend-dot.cancelled {
                background: #d66c6c;
            }

            /* VISTA SEMANAL */

            .planea-calendar-week-grid {
                display: grid;
                grid-template-columns: repeat(7, minmax(0, 1fr));
                gap: 8px;
            }

            .planea-calendar-week-column {
                min-width: 0;
                min-height: 190px;
                padding: 10px 7px;
                border: 1px solid var(--border-color, rgba(255,255,255,.08));
                border-radius: 12px;
                background: rgba(255,255,255,.025);
                cursor: pointer;
                transition: .2s ease;
            }

            .planea-calendar-week-column:hover {
                border-color: rgba(22,163,106,.4);
                background: rgba(22,163,106,.045);
            }

            .planea-calendar-week-column.today {
                border-color: rgba(22,163,106,.6);
            }

            .planea-calendar-week-column.selected {
                background: rgba(22,163,106,.1);
                border-color: #16a36a;
            }

            .planea-calendar-week-day-name {
                display: block;
                color: var(--text-secondary, #a0aaa5);
                text-align: center;
                font-size: .72rem;
                font-weight: 700;
                text-transform: uppercase;
            }

            .planea-calendar-week-day-number {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
                margin: 6px auto 12px;
                border-radius: 9px;
                color: var(--text-primary, #fff);
                font-weight: 700;
                font-size: .85rem;
            }

            .planea-calendar-week-column.today .planea-calendar-week-day-number {
                background: #16a36a;
                color: #fff;
            }

            .planea-calendar-week-events {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .planea-calendar-week-event {
                display: block;
                width: 100%;
                padding: 6px;
                border: 0;
                border-left: 3px solid #e3aa48;
                border-radius: 5px;
                background: rgba(227,170,72,.1);
                color: var(--text-primary, #fff);
                text-align: left;
                font-size: .68rem;
                line-height: 1.35;
                overflow-wrap: anywhere;
                cursor: pointer;
            }

            .planea-calendar-week-event.planea-calendar-confirmed {
                border-left-color: #3b9df5;
                background: rgba(59,157,245,.1);
            }

            .planea-calendar-week-event.planea-calendar-completed {
                border-left-color: #9b8bea;
                background: rgba(155,139,234,.1);
            }

            .planea-calendar-week-event.planea-calendar-cancelled {
                border-left-color: #d66c6c;
                background: rgba(214,108,108,.1);
            }

            .planea-calendar-week-event-time {
                display: block;
                margin-bottom: 3px;
                color: var(--text-secondary, #a0aaa5);
                font-size: .62rem;
            }

            .planea-calendar-week-empty {
                color: var(--text-secondary, #a0aaa5);
                text-align: center;
                font-size: .65rem;
                padding-top: 10px;
            }

            /* PANEL LATERAL */

            .planea-calendar-sidebar-title {
                color: var(--text-primary, #fff);
                font-size: 1.05rem;
                font-weight: 700;
                margin-bottom: 5px;
            }

            .planea-calendar-sidebar-date {
                color: var(--text-secondary, #a0aaa5);
                font-size: .85rem;
                margin-bottom: 20px;
                text-transform: capitalize;
            }

            .planea-calendar-day-count {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 25px;
                height: 25px;
                padding: 0 7px;
                border-radius: 20px;
                background: rgba(22,163,106,.14);
                color: #36c98b;
                font-size: .75rem;
                font-weight: 700;
                margin-left: 6px;
            }

            .planea-calendar-plan {
                padding: 15px;
                border: 1px solid var(--border-color, rgba(255,255,255,.08));
                border-radius: 13px;
                background: rgba(255,255,255,.025);
                margin-bottom: 12px;
                transition: .2s ease;
            }

            .planea-calendar-plan:hover {
                border-color: rgba(22,163,106,.4);
                background: rgba(22,163,106,.045);
            }

            .planea-calendar-plan-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            .planea-calendar-plan-category {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                color: var(--text-secondary, #a0aaa5);
                font-size: .76rem;
            }

            .planea-calendar-plan-status {
                font-size: .68rem;
                padding: 4px 8px;
                border-radius: 20px;
                background: rgba(227,170,72,.12);
                color: #e3aa48;
                white-space: nowrap;
            }

            .planea-calendar-plan-status.planea-calendar-confirmed {
                background: rgba(59,157,245,.12);
                color: #65b5ff;
            }

            .planea-calendar-plan-status.planea-calendar-completed {
                background: rgba(155,139,234,.12);
                color: #b2a4ff;
            }

            .planea-calendar-plan-status.planea-calendar-cancelled {
                background: rgba(214,108,108,.12);
                color: #e88a8a;
            }

            .planea-calendar-plan h4 {
                color: var(--text-primary, #fff);
                font-size: .95rem;
                font-weight: 700;
                margin: 0 0 9px;
                overflow-wrap: anywhere;
            }

            .planea-calendar-plan-details {
                display: flex;
                flex-direction: column;
                gap: 6px;
                color: var(--text-secondary, #a0aaa5);
                font-size: .78rem;
            }

            .planea-calendar-plan-details i {
                width: 15px;
                color: #36c98b;
            }

            .planea-calendar-edit-btn {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                margin-top: 13px;
                padding: 7px 11px;
                border: 1px solid rgba(22,163,106,.35);
                border-radius: 8px;
                background: rgba(22,163,106,.1);
                color: #36c98b;
                font-size: .76rem;
                font-weight: 600;
                cursor: pointer;
                transition: .2s ease;
            }

            .planea-calendar-edit-btn:hover {
                background: #16a36a;
                color: #fff;
            }

            .planea-calendar-empty {
                text-align: center;
                padding: 35px 15px;
                color: var(--text-secondary, #a0aaa5);
            }

            .planea-calendar-empty i {
                display: block;
                font-size: 2rem;
                color: #36c98b;
                margin-bottom: 12px;
            }

            .planea-calendar-empty p {
                margin: 0;
                font-size: .85rem;
            }

            .planea-calendar-summary {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
                margin-top: 20px;
            }

            .planea-calendar-summary-item {
                padding: 13px;
                border-radius: 11px;
                background: rgba(255,255,255,.035);
            }

            .planea-calendar-summary-item strong {
                display: block;
                color: var(--text-primary, #fff);
                font-size: 1.25rem;
            }

            .planea-calendar-summary-item span {
                color: var(--text-secondary, #a0aaa5);
                font-size: .72rem;
            }

            @media (max-width: 1050px) {
                .planea-calendar-wrapper {
                    grid-template-columns: 1fr;
                }
            }

            @media (max-width: 700px) {
                .planea-calendar-week-grid {
                    grid-template-columns: repeat(7, minmax(85px, 1fr));
                    overflow-x: auto;
                    padding-bottom: 8px;
                }

                .planea-calendar-week-column {
                    min-height: 150px;
                }
            }

            @media (max-width: 600px) {
                .planea-calendar-main,
                .planea-calendar-sidebar {
                    padding: 14px;
                    border-radius: 14px;
                }

                .planea-calendar-toolbar {
                    margin-bottom: 17px;
                }

                .planea-calendar-month {
                    font-size: 1.1rem;
                }

                .planea-calendar-toolbar-right {
                    width: 100%;
                    justify-content: space-between;
                }

                .planea-calendar-day {
                    min-height: 57px;
                    padding: 5px 3px;
                    border-radius: 8px;
                }

                .planea-calendar-grid {
                    gap: 4px;
                }

                .planea-calendar-day-number {
                    width: 24px;
                    height: 24px;
                    font-size: .78rem;
                }

                .planea-calendar-event-line {
                    height: 3px;
                }

                .planea-calendar-weekday {
                    font-size: .7rem;
                }

                .planea-calendar-more {
                    font-size: .58rem;
                }

                .planea-calendar-legend {
                    gap: 10px;
                }

                .planea-calendar-legend-item {
                    font-size: .69rem;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================================
       ESTRUCTURA DEL MÓDULO
       ===================================================== */

    function renderLayout() {
        const container = getElement("calendarModuleContainer");

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="planea-calendar-wrapper">

                <section class="planea-calendar-main">

                    <div class="planea-calendar-toolbar">

                        <h3
                            class="planea-calendar-month"
                            id="planeaCalendarMonth">
                        </h3>

                        <div class="planea-calendar-toolbar-right">

                            <div class="planea-calendar-view-switch">

                                <button
                                    type="button"
                                    class="planea-calendar-view-btn active"
                                    data-calendar-view="month">
                                    <i class="bi bi-calendar3"></i>
                                    Mes
                                </button>

                                <button
                                    type="button"
                                    class="planea-calendar-view-btn"
                                    data-calendar-view="week">
                                    <i class="bi bi-calendar-week"></i>
                                    Semana
                                </button>

                            </div>

                            <div class="planea-calendar-navigation">

                                <button
                                    type="button"
                                    class="planea-calendar-today-btn"
                                    data-calendar-action="today">
                                    Hoy
                                </button>

                                <button
                                    type="button"
                                    class="planea-calendar-nav-btn"
                                    data-calendar-action="previous"
                                    aria-label="Anterior">
                                    <i class="bi bi-chevron-left"></i>
                                </button>

                                <button
                                    type="button"
                                    class="planea-calendar-nav-btn"
                                    data-calendar-action="next"
                                    aria-label="Siguiente">
                                    <i class="bi bi-chevron-right"></i>
                                </button>

                            </div>

                        </div>

                    </div>

                    <div
                        class="planea-calendar-grid"
                        id="planeaCalendarGrid">
                    </div>

                    <div
                        class="planea-calendar-week-grid"
                        id="planeaCalendarWeekGrid"
                        hidden>
                    </div>

                    <div class="planea-calendar-legend">

                        <span class="planea-calendar-legend-item">
                            <i class="planea-calendar-legend-dot"></i>
                            Pendiente
                        </span>

                        <span class="planea-calendar-legend-item">
                            <i class="planea-calendar-legend-dot confirmed"></i>
                            Confirmado
                        </span>

                        <span class="planea-calendar-legend-item">
                            <i class="planea-calendar-legend-dot completed"></i>
                            Realizado
                        </span>

                        <span class="planea-calendar-legend-item">
                            <i class="planea-calendar-legend-dot cancelled"></i>
                            Cancelado
                        </span>

                    </div>

                </section>

                <aside class="planea-calendar-sidebar">

                    <h3 class="planea-calendar-sidebar-title">
                        Planes del día
                        <span
                            class="planea-calendar-day-count"
                            id="planeaCalendarDayCount">
                            0
                        </span>
                    </h3>

                    <p
                        class="planea-calendar-sidebar-date"
                        id="planeaCalendarSelectedDate">
                    </p>

                    <div id="planeaCalendarDayPlans"></div>

                    <div
                        class="planea-calendar-summary"
                        id="planeaCalendarSummary">
                    </div>

                </aside>

            </div>
        `;
    }

    /* =====================================================
       CAMBIO DE VISTA
       ===================================================== */

    function setView(view) {
        if (view !== "month" && view !== "week") {
            return;
        }

        currentView = view;

        const monthGrid = getElement("planeaCalendarGrid");
        const weekGrid = getElement("planeaCalendarWeekGrid");

        if (monthGrid) {
            monthGrid.hidden = view !== "month";
        }

        if (weekGrid) {
            weekGrid.hidden = view !== "week";
        }

        document.querySelectorAll("[data-calendar-view]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.calendarView === view
            );
        });

        renderCalendar();
    }

    /* =====================================================
       RENDER VISTA MENSUAL
       ===================================================== */

    function renderMonthView() {
        const grid = getElement("planeaCalendarGrid");

        if (!grid) {
            return;
        }

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const plansByDate = getPlansByDate();

        const weekdays = ["L", "M", "X", "J", "V", "S", "D"];

        let html = weekdays.map(day => `
            <div class="planea-calendar-weekday">
                ${day}
            </div>
        `).join("");

        const firstDay = new Date(year, month, 1);
        const offset = (firstDay.getDay() + 6) % 7;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const previousMonthDays = new Date(year, month, 0).getDate();

        const today = getToday();

        for (let i = offset - 1; i >= 0; i--) {
            const day = previousMonthDays - i;
            const dateKey = dateToKey(
                new Date(year, month - 1, day)
            );

            html += `
                <button
                    type="button"
                    class="planea-calendar-day other-month"
                    data-calendar-date="${dateKey}">
                    <span class="planea-calendar-day-number">
                        ${day}
                    </span>
                </button>
            `;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = dateToKey(
                new Date(year, month, day)
            );

            const plans = plansByDate[dateKey] || [];

            const isToday = dateKey === today;
            const isSelected = dateKey === selectedDate;

            const classes = [
                "planea-calendar-day",
                isToday ? "today" : "",
                isSelected ? "selected" : ""
            ].filter(Boolean).join(" ");

            const eventLines = plans.slice(0, 3).map(plan => `
                <span
                    class="planea-calendar-event-line ${getStatusClass(
                        getStatus(plan)
                    )}">
                </span>
            `).join("");

            const moreHTML = plans.length > 3
                ? `<span class="planea-calendar-more">+${plans.length - 3} más</span>`
                : "";

            html += `
                <button
                    type="button"
                    class="${classes}"
                    data-calendar-date="${dateKey}"
                    aria-label="${day} de ${escapeHTML(formatMonth(currentDate))}">

                    <span class="planea-calendar-day-number">
                        ${day}
                    </span>

                    <span class="planea-calendar-day-events">
                        ${eventLines}
                        ${moreHTML}
                    </span>

                </button>
            `;
        }

        const totalCells = offset + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;

        for (let day = 1; day <= remaining; day++) {
            const dateKey = dateToKey(
                new Date(year, month + 1, day)
            );

            html += `
                <button
                    type="button"
                    class="planea-calendar-day other-month"
                    data-calendar-date="${dateKey}">
                    <span class="planea-calendar-day-number">
                        ${day}
                    </span>
                </button>
            `;
        }

        grid.innerHTML = html;
    }

    /* =====================================================
       RENDER VISTA SEMANAL
       ===================================================== */

    function renderWeekView() {
        const grid = getElement("planeaCalendarWeekGrid");

        if (!grid) {
            return;
        }

        const days = getWeekDays(currentDate);
        const plansByDate = getPlansByDate();
        const today = getToday();

        grid.innerHTML = days.map(date => {
            const dateKey = dateToKey(date);
            const plans = plansByDate[dateKey] || [];

            const classes = [
                "planea-calendar-week-column",
                dateKey === today ? "today" : "",
                dateKey === selectedDate ? "selected" : ""
            ].filter(Boolean).join(" ");

            const eventsHTML = plans.length
                ? plans.map(plan => `
                    <button
                        type="button"
                        class="planea-calendar-week-event ${getStatusClass(
                            getStatus(plan)
                        )}"
                        data-calendar-edit="${escapeHTML(plan.id)}"
                        title="${escapeHTML(plan.name || "Plan sin nombre")}">

                        <span class="planea-calendar-week-event-time">
                            ${escapeHTML(plan.time || "Sin hora")}
                        </span>

                        ${escapeHTML(plan.name || "Plan sin nombre")}

                    </button>
                `).join("")
                : `
                    <div class="planea-calendar-week-empty">
                        Sin planes
                    </div>
                `;

            return `
                <div
                    class="${classes}"
                    data-calendar-date="${dateKey}">

                    <span class="planea-calendar-week-day-name">
                        ${new Intl.DateTimeFormat("es-ES", {
                            weekday: "short"
                        }).format(date)}
                    </span>

                    <span class="planea-calendar-week-day-number">
                        ${date.getDate()}
                    </span>

                    <div class="planea-calendar-week-events">
                        ${eventsHTML}
                    </div>

                </div>
            `;
        }).join("");
    }

    /* =====================================================
       RENDER GENERAL DEL CALENDARIO
       ===================================================== */

    function renderCalendar() {
        const monthTitle = getElement("planeaCalendarMonth");

        if (!monthTitle) {
            return;
        }

        if (currentView === "month") {
            monthTitle.textContent = formatMonth(currentDate);
            renderMonthView();
        } else {
            const days = getWeekDays(currentDate);

            monthTitle.textContent = formatWeekRange(
                days[0],
                days[6]
            );

            renderWeekView();
        }

        renderSelectedDay();
    }

    /* =====================================================
       PLANES DEL DÍA SELECCIONADO
       ===================================================== */

    function renderSelectedDay() {
        const dateContainer = getElement("planeaCalendarSelectedDate");
        const countContainer = getElement("planeaCalendarDayCount");
        const plansContainer = getElement("planeaCalendarDayPlans");
        const summaryContainer = getElement("planeaCalendarSummary");

        if (
            !dateContainer ||
            !countContainer ||
            !plansContainer ||
            !summaryContainer
        ) {
            return;
        }

        const plans = getPlans()
            .filter(plan => plan.date === selectedDate)
            .sort((a, b) => {
                return String(a.time || "").localeCompare(
                    String(b.time || "")
                );
            });

        dateContainer.textContent = formatDate(selectedDate, {
            weekday: "long",
            year: "numeric"
        });

        countContainer.textContent = plans.length;

        if (plans.length === 0) {
            plansContainer.innerHTML = `
                <div class="planea-calendar-empty">
                    <i class="bi bi-calendar2-plus"></i>
                    <p>No tienes ningún plan para este día.</p>
                </div>
            `;
        } else {
            plansContainer.innerHTML = plans.map(plan => {
                const status = getStatus(plan);
                const statusClass = getStatusClass(status);
                const category = plan.category || "Otros";

                return `
                    <article class="planea-calendar-plan">

                        <div class="planea-calendar-plan-top">

                            <span class="planea-calendar-plan-category">
                                <i class="bi ${getCategoryIcon(category)}"></i>
                                ${escapeHTML(category)}
                            </span>

                            <span class="planea-calendar-plan-status ${statusClass}">
                                ${escapeHTML(status)}
                            </span>

                        </div>

                        <h4>
                            ${escapeHTML(plan.name || "Plan sin nombre")}
                        </h4>

                        <div class="planea-calendar-plan-details">

                            ${plan.time ? `
                                <span>
                                    <i class="bi bi-clock"></i>
                                    ${escapeHTML(plan.time)}
                                </span>
                            ` : ""}

                            ${plan.location ? `
                                <span>
                                    <i class="bi bi-geo-alt"></i>
                                    ${escapeHTML(plan.location)}
                                </span>
                            ` : ""}

                            <span>
                                <i class="bi ${getStatusIcon(status)}"></i>
                                ${escapeHTML(status)}
                            </span>

                        </div>

                        <button
                            type="button"
                            class="planea-calendar-edit-btn"
                            data-calendar-edit="${escapeHTML(plan.id)}">

                            <i class="bi bi-pencil-square"></i>
                            Editar plan

                        </button>

                    </article>
                `;
            }).join("");
        }

        const pending = plans.filter(plan =>
            normalizeStatus(getStatus(plan)) === "pendiente"
        ).length;

        const confirmed = plans.filter(plan =>
            normalizeStatus(getStatus(plan)) === "confirmado"
        ).length;

        const completed = plans.filter(plan =>
            normalizeStatus(getStatus(plan)) === "realizado"
        ).length;

        const cancelled = plans.filter(plan =>
            normalizeStatus(getStatus(plan)) === "cancelado"
        ).length;

        summaryContainer.innerHTML = `
            <div class="planea-calendar-summary-item">
                <strong>${pending}</strong>
                <span>Pendientes</span>
            </div>

            <div class="planea-calendar-summary-item">
                <strong>${confirmed}</strong>
                <span>Confirmados</span>
            </div>

            <div class="planea-calendar-summary-item">
                <strong>${completed}</strong>
                <span>Realizados</span>
            </div>

            <div class="planea-calendar-summary-item">
                <strong>${cancelled}</strong>
                <span>Cancelados</span>
            </div>
        `;
    }

    /* =====================================================
       NAVEGACIÓN
       ===================================================== */

    function changeMonth(amount) {
        if (currentView === "week") {
            const date = keyToDate(selectedDate) || currentDate;

            date.setDate(date.getDate() + amount * 7);

            currentDate = date;
            selectedDate = dateToKey(date);
        } else {
            currentDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + amount,
                1
            );
        }

        renderCalendar();
    }

    function goToToday() {
        const today = new Date();

        currentDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

        selectedDate = getToday();

        renderCalendar();
    }

    function selectDate(dateKey) {
        const date = keyToDate(dateKey);

        if (!date) {
            return;
        }

        selectedDate = dateKey;

        currentDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );

        renderCalendar();
    }

    /* =====================================================
       EDICIÓN DE PLANES
       ===================================================== */

    function editPlan(planId) {
        if (
            !window.PLANEA_PLANS ||
            typeof window.PLANEA_PLANS.openEditModal !== "function"
        ) {
            console.warn(
                "PLANEA: No se ha encontrado la función de edición de planes."
            );

            return;
        }

        window.PLANEA_PLANS.openEditModal(planId);
    }

    /* =====================================================
       EVENTOS
       ===================================================== */

    function bindEvents() {
        const container = getElement("calendarModuleContainer");

        if (
            !container ||
            container.dataset.calendarEvents === "true"
        ) {
            return;
        }

        container.dataset.calendarEvents = "true";

        container.addEventListener("click", event => {
            const viewButton = event.target.closest(
                "[data-calendar-view]"
            );

            if (viewButton) {
                setView(viewButton.dataset.calendarView);
                return;
            }

            const actionButton = event.target.closest(
                "[data-calendar-action]"
            );

            if (actionButton) {
                const action = actionButton.dataset.calendarAction;

                if (action === "previous") {
                    changeMonth(-1);
                }

                if (action === "next") {
                    changeMonth(1);
                }

                if (action === "today") {
                    goToToday();
                }

                return;
            }

            const editButton = event.target.closest(
                "[data-calendar-edit]"
            );

            if (editButton) {
                editPlan(editButton.dataset.calendarEdit);
                return;
            }

            const dayButton = event.target.closest(
                "[data-calendar-date]"
            );

            if (dayButton) {
                selectDate(dayButton.dataset.calendarDate);
            }
        });
    }

    /* =====================================================
       RENDER GENERAL
       ===================================================== */

    function render() {
        const container = getElement("calendarModuleContainer");

        if (!container) {
            return;
        }

        renderCalendar();
    }

    /* =====================================================
       INICIALIZACIÓN
       ===================================================== */

    function init() {
        const container = getElement("calendarModuleContainer");

        if (!container) {
            console.warn(
                "PLANEA: No se ha encontrado calendarModuleContainer."
            );

            return;
        }

        if (!STORAGE()) {
            console.warn(
                "PLANEA: No se ha encontrado el almacenamiento."
            );

            return;
        }

        injectStyles();

        if (!initialized) {
            renderLayout();
            bindEvents();

            initialized = true;

            document.addEventListener(
                "planea:dataChanged",
                render
            );

            document.addEventListener(
                "planea:viewChanged",
                event => {
                    if (event.detail?.view === "calendar") {
                        render();
                    }
                }
            );
        }

        render();

        console.log(
            "PLANEA: Calendario inicializado correctamente."
        );
    }

    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.PLANEA_CALENDAR = {
        init,
        render,
        goToToday,
        changeMonth,
        selectDate,
        setView
    };

})();
