/* =========================================================
   PLANEA - DASHBOARD
   Archivo: assets/js/modules/dashboard.js
   Versión mejorada
========================================================= */

(() => {
    "use strict";

    let initialized = false;
    let eventsBound = false;

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

    function formatCurrency(value) {
        return new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "EUR"
        }).format(Number(value) || 0);
    }

    function formatDate(dateString, options = {}) {
        if (!dateString) {
            return "Sin fecha";
        }

        const date = new Date(`${dateString}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return "Fecha no válida";
        }

        return new Intl.DateTimeFormat("es-ES", {
            day: "numeric",
            month: "long",
            ...options
        }).format(date);
    }

    function getToday() {
        const now = new Date();

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    function getPlans() {
        if (!STORAGE()) {
            return [];
        }

        const plans = STORAGE().getPlans();

        return Array.isArray(plans) ? plans : [];
    }

    function getActivity() {
        if (!STORAGE() || typeof STORAGE().getActivity !== "function") {
            return [];
        }

        const activities = STORAGE().getActivity();

        return Array.isArray(activities) ? activities : [];
    }

    function getProfile() {
        if (!STORAGE() || typeof STORAGE().getProfile !== "function") {
            return {};
        }

        return STORAGE().getProfile() || {};
    }

    function getPlanStatus(plan) {
        return String(plan?.status || "Pendiente").trim();
    }

    function normalizeStatus(status) {
        return String(status || "")
            .trim()
            .toLowerCase();
    }

    function isCancelled(plan) {
        return normalizeStatus(getPlanStatus(plan)) === "cancelado";
    }

    function isCompleted(plan) {
        return normalizeStatus(getPlanStatus(plan)) === "realizado";
    }

    function isActivePlan(plan) {
        return !isCancelled(plan) && !isCompleted(plan);
    }

    function getStatusClass(status) {
        const normalized = normalizeStatus(status);

        if (normalized === "confirmado") {
            return "status-confirmed";
        }

        if (normalized === "realizado") {
            return "status-completed";
        }

        if (normalized === "cancelado") {
            return "status-cancelled";
        }

        return "status-pending";
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

    function getPlanExpenses(plan) {
        if (!Array.isArray(plan?.expenses)) {
            return 0;
        }

        return plan.expenses.reduce((total, expense) => {
            return total + (Number(expense.amount) || 0);
        }, 0);
    }

    function getPlanDateTime(plan) {
        return `${plan.date || "9999-12-31"}T${plan.time || "23:59"}`;
    }

    function isValidDate(dateString) {
        if (!dateString) {
            return false;
        }

        const date = new Date(`${dateString}T00:00:00`);

        return !Number.isNaN(date.getTime());
    }

    function getRelativeDate(dateString) {
        if (dateString === getToday()) {
            return "Hoy";
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const tomorrowString = [
            tomorrow.getFullYear(),
            String(tomorrow.getMonth() + 1).padStart(2, "0"),
            String(tomorrow.getDate()).padStart(2, "0")
        ].join("-");

        if (dateString === tomorrowString) {
            return "Mañana";
        }

        return formatDate(dateString, {
            weekday: "long"
        });
    }

    /* =====================================================
       FECHA Y BIENVENIDA
    ===================================================== */

    function renderCurrentDate() {
        const container = getElement("currentDate");

        if (container) {
            const span = container.querySelector("span");

            if (span) {
                span.textContent = new Intl.DateTimeFormat("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }).format(new Date());
            }
        }

        // Actualizar el nombre si existe un elemento para ello.
        const profile = getProfile();

        const name = profile.name
            ? String(profile.name).trim().split(" ")[0]
            : "";

        const greetingElement = getElement("dashboardGreetingName");

        if (greetingElement && name) {
            greetingElement.textContent = name;
        }
    }

    /* =====================================================
       ESTADÍSTICAS
    ===================================================== */

    function getExpenseDate(expense, plan) {
        if (expense?.date && isValidDate(expense.date)) {
            return expense.date;
        }

        return plan?.date || "";
    }

    function calculateMonthlyExpenses(plans) {
        const now = new Date();

        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return plans.reduce((total, plan) => {
            if (!Array.isArray(plan.expenses)) {
                return total;
            }

            const planExpenses = plan.expenses.reduce(
                (planTotal, expense) => {
                    const expenseDate = getExpenseDate(expense, plan);

                    if (!isValidDate(expenseDate)) {
                        return planTotal;
                    }

                    const date = new Date(`${expenseDate}T00:00:00`);

                    const belongsToCurrentMonth =
                        date.getMonth() === currentMonth &&
                        date.getFullYear() === currentYear;

                    if (!belongsToCurrentMonth) {
                        return planTotal;
                    }

                    return planTotal + (Number(expense.amount) || 0);
                },
                0
            );

            return total + planExpenses;
        }, 0);
    }

    function renderStatistics() {
        const plans = getPlans();

        const pending = plans.filter(plan =>
            normalizeStatus(getPlanStatus(plan)) === "pendiente"
        ).length;

        const confirmed = plans.filter(plan =>
            normalizeStatus(getPlanStatus(plan)) === "confirmado"
        ).length;

        const completed = plans.filter(plan =>
            normalizeStatus(getPlanStatus(plan)) === "realizado"
        ).length;

        const cancelled = plans.filter(plan =>
            isCancelled(plan)
        ).length;

        const upcoming = plans.filter(plan =>
            isActivePlan(plan) &&
            plan.date &&
            plan.date >= getToday()
        ).length;

        const monthlyExpenses = calculateMonthlyExpenses(plans);

        const values = {
            pendingPlansCount: pending,
            confirmedPlansCount: confirmed,
            completedPlansCount: completed,
            monthlyExpenses: formatCurrency(monthlyExpenses),

            // Estos indicadores se actualizan si existen en el HTML.
            totalPlansCount: plans.length,
            cancelledPlansCount: cancelled,
            upcomingPlansCount: upcoming
        };

        Object.entries(values).forEach(([id, value]) => {
            const element = getElement(id);

            if (element) {
                element.textContent = value;
            }
        });
    }

    /* =====================================================
       PRÓXIMO PLAN
    ===================================================== */

    function renderNextPlan() {
        const container = getElement("nextPlanContainer");

        if (!container) {
            return;
        }

        const today = getToday();

        const plans = getPlans()
            .filter(plan => {
                return (
                    plan.date &&
                    isValidDate(plan.date) &&
                    plan.date >= today &&
                    isActivePlan(plan)
                );
            })
            .sort((a, b) => {
                return getPlanDateTime(a).localeCompare(
                    getPlanDateTime(b)
                );
            });

        const plan = plans[0];

        if (!plan) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="bi bi-calendar-plus"></i>
                    </div>

                    <h4>Aún no tienes planes</h4>

                    <p>
                        Organiza algo especial y aparecerá
                        automáticamente en este apartado.
                    </p>

                    <a
                        href="#"
                        data-view="plans"
                        class="btn btn-primary-green">

                        Crear mi primer plan

                        <i class="bi bi-plus-lg ms-2"></i>
                    </a>
                </div>
            `;

            return;
        }

        const category = plan.category || "Otros";
        const name = plan.name || "Plan sin nombre";
        const location = plan.location || "Ubicación pendiente";
        const status = getPlanStatus(plan);

        const planId = plan.id || "";

        const date = getRelativeDate(plan.date);

        const budget = Number(plan.estimatedBudget) || 0;

        container.innerHTML = `
            <article
                class="next-plan-card"
                ${planId ? `data-dashboard-plan-id="${escapeHTML(planId)}"` : ""}>

                <div class="next-plan-category">
                    <i class="bi ${getCategoryIcon(category)}"></i>
                    ${escapeHTML(category)}
                </div>

                <h4>${escapeHTML(name)}</h4>

                <div class="next-plan-details">

                    <span>
                        <i class="bi bi-calendar3"></i>
                        ${escapeHTML(date)}
                    </span>

                    ${plan.time ? `
                        <span>
                            <i class="bi bi-clock"></i>
                            ${escapeHTML(plan.time)}
                        </span>
                    ` : ""}

                    <span>
                        <i class="bi bi-geo-alt"></i>
                        ${escapeHTML(location)}
                    </span>

                </div>

                <div class="next-plan-footer">

                    <span class="status-badge ${getStatusClass(status)}">
                        ${escapeHTML(status)}
                    </span>

                    <span class="next-plan-budget">
                        ${formatCurrency(budget)}
                    </span>

                </div>

                ${planId ? `
                    <div class="mt-3 text-end">
                        <span class="small text-muted">
                            Ver detalles
                            <i class="bi bi-arrow-up-right ms-1"></i>
                        </span>
                    </div>
                ` : ""}

            </article>
        `;

        const card = container.querySelector("[data-dashboard-plan-id]");

        if (card) {
            card.style.cursor = "pointer";
        }
    }

    /* =====================================================
       PRÓXIMOS ACONTECIMIENTOS
    ===================================================== */

    function renderUpcomingEvents() {
        const container = getElement("upcomingEventsList");

        if (!container) {
            return;
        }

        const today = getToday();

        const upcoming = getPlans()
            .filter(plan => {
                return (
                    plan.date &&
                    isValidDate(plan.date) &&
                    plan.date >= today &&
                    isActivePlan(plan)
                );
            })
            .sort((a, b) => {
                return getPlanDateTime(a).localeCompare(
                    getPlanDateTime(b)
                );
            })
            .slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = `
                <div class="empty-state empty-state-small">
                    <i class="bi bi-calendar2-event"></i>

                    <p>
                        No tienes próximos acontecimientos.
                    </p>

                    <a
                        href="#"
                        data-view="plans"
                        class="small text-success text-decoration-none">

                        Organizar un plan

                        <i class="bi bi-arrow-right ms-1"></i>
                    </a>
                </div>
            `;

            return;
        }

        container.innerHTML = upcoming.map(plan => {
            const date = new Date(`${plan.date}T00:00:00`);

            const day = date.getDate();

            const month = new Intl.DateTimeFormat("es-ES", {
                month: "short"
            }).format(date);

            const relativeDate = getRelativeDate(plan.date);

            const name = plan.name || "Plan sin nombre";
            const category = plan.category || "Otros";
            const location = plan.location || "";

            const status = getPlanStatus(plan);

            return `
                <article
                    class="upcoming-event"
                    ${plan.id ? `data-dashboard-plan-id="${escapeHTML(plan.id)}"` : ""}>

                    <div class="upcoming-event-date">

                        <strong>${day}</strong>

                        <span>${escapeHTML(month)}</span>

                    </div>

                    <div class="upcoming-event-info">

                        <h4>
                            ${escapeHTML(name)}
                        </h4>

                        <span>
                            ${escapeHTML(relativeDate)}
                            ·
                            ${escapeHTML(category)}
                            ${plan.time ? ` · ${escapeHTML(plan.time)}` : ""}
                        </span>

                        ${location ? `
                            <span class="d-block mt-1">
                                <i class="bi bi-geo-alt me-1"></i>
                                ${escapeHTML(location)}
                            </span>
                        ` : ""}

                    </div>

                    <span class="status-badge ${getStatusClass(status)}">
                        ${escapeHTML(status)}
                    </span>

                    <i class="bi bi-chevron-right"></i>

                </article>
            `;
        }).join("");

        container.querySelectorAll("[data-dashboard-plan-id]").forEach(card => {
            card.style.cursor = "pointer";
        });
    }

    /* =====================================================
       ACTIVIDAD RECIENTE
    ===================================================== */

    function renderRecentActivity() {
        const container = getElement("recentActivityList");

        if (!container) {
            return;
        }

        const activities = getActivity().slice(0, 5);

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state empty-state-small">

                    <i class="bi bi-activity"></i>

                    <p>
                        Tu actividad aparecerá aquí.
                    </p>

                </div>
            `;

            return;
        }

        const icons = {
            plan_created: "bi-calendar-plus",
            plan_deleted: "bi-trash",
            plan_updated: "bi-pencil-square",
            plan_completed: "bi-check-circle",
            favorite_added: "bi-heart",
            expense_added: "bi-wallet2",
            participant_added: "bi-person-plus",
            participant_updated: "bi-person-check"
        };

        container.innerHTML = activities.map(activity => {
            const icon = icons[activity.type] || "bi-activity";

            const rawDate = activity.date || activity.timestamp;

            const date = rawDate
                ? new Date(rawDate)
                : new Date();

            const validDate = !Number.isNaN(date.getTime());

            const time = validDate
                ? new Intl.DateTimeFormat("es-ES", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                }).format(date)
                : "Fecha no disponible";

            return `
                <article class="activity-item">

                    <div class="activity-icon">
                        <i class="bi ${icon}"></i>
                    </div>

                    <div class="activity-info">

                        <p>
                            ${escapeHTML(
                                activity.description || "Actividad realizada"
                            )}
                        </p>

                        <span>
                            ${escapeHTML(time)}
                        </span>

                    </div>

                </article>
            `;
        }).join("");
    }

    /* =====================================================
       MINI CALENDARIO
    ===================================================== */

    function renderMiniCalendar() {
        const container = getElement("dashboardMiniCalendar");

        if (!container) {
            return;
        }

        const now = new Date();

        const year = now.getFullYear();
        const month = now.getMonth();

        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // La semana comienza en lunes.
        const offset = (firstDay.getDay() + 6) % 7;

        const plans = getPlans();

        const plansByDate = {};

        plans.forEach(plan => {
            if (
                !plan.date ||
                !isValidDate(plan.date) ||
                isCancelled(plan)
            ) {
                return;
            }

            if (!plansByDate[plan.date]) {
                plansByDate[plan.date] = [];
            }

            plansByDate[plan.date].push(plan);
        });

        const monthName = new Intl.DateTimeFormat("es-ES", {
            month: "long",
            year: "numeric"
        }).format(now);

        const weekdays = ["L", "M", "X", "J", "V", "S", "D"];

        let daysHTML = "";

        for (let i = 0; i < offset; i++) {
            daysHTML += `
                <div class="mini-calendar-day empty"></div>
            `;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = [
                year,
                String(month + 1).padStart(2, "0"),
                String(day).padStart(2, "0")
            ].join("-");

            const dayPlans = plansByDate[dateKey] || [];

            const hasPlans = dayPlans.length > 0;
            const isToday = day === now.getDate();

            const tooltip = hasPlans
                ? `${dayPlans.length} plan(es): ${dayPlans.map(plan => plan.name || "Plan").join(", ")}`
                : "";

            daysHTML += `
                <div
                    class="mini-calendar-day
                    ${isToday ? "today" : ""}
                    ${hasPlans ? "has-event" : ""}"
                    title="${escapeHTML(tooltip)}">

                    <span>${day}</span>

                    ${hasPlans ? `
                        <i class="mini-calendar-dot"></i>
                    ` : ""}

                </div>
            `;
        }

        const daysWithPlans = Object.keys(plansByDate).filter(date => {
            return date.startsWith(
                `${year}-${String(month + 1).padStart(2, "0")}`
            );
        }).length;

        container.innerHTML = `
            <div class="mini-calendar">

                <div class="mini-calendar-heading">

                    <h4>
                        ${escapeHTML(monthName)}
                    </h4>

                    <span>
                        ${daysWithPlans}
                        ${daysWithPlans === 1 ? "día con planes" : "días con planes"}
                    </span>

                </div>

                <div class="mini-calendar-grid">

                    ${weekdays.map(day => `
                        <div class="mini-calendar-weekday">
                            ${day}
                        </div>
                    `).join("")}

                    ${daysHTML}

                </div>

            </div>
        `;
    }

    /* =====================================================
       ACCIONES DEL DASHBOARD
    ===================================================== */

    function openPlanFromDashboard(planId) {
        if (!planId) {
            return;
        }

        if (
            window.PLANEA_PLANS &&
            typeof window.PLANEA_PLANS.openEditModal === "function"
        ) {
            window.PLANEA_PLANS.openEditModal(planId);
            return;
        }

        if (window.PLANEA_ROUTER) {
            window.PLANEA_ROUTER.navigateTo("plans");
        }
    }

    function bindDashboardActions() {
        if (eventsBound) {
            return;
        }

        eventsBound = true;

        document.addEventListener("click", event => {
            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const card = target.closest("[data-dashboard-plan-id]");

            if (!card) {
                return;
            }

            const planId = card.dataset.dashboardPlanId;

            if (planId) {
                openPlanFromDashboard(planId);
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }

            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const card = target.closest("[data-dashboard-plan-id]");

            if (!card) {
                return;
            }

            event.preventDefault();

            openPlanFromDashboard(card.dataset.dashboardPlanId);
        });
    }

    /* =====================================================
       RENDER GENERAL
    ===================================================== */

    function render() {
        if (!STORAGE()) {
            return;
        }

        renderCurrentDate();
        renderStatistics();
        renderNextPlan();
        renderUpcomingEvents();
        renderRecentActivity();
        renderMiniCalendar();
    }

    /* =====================================================
       INICIALIZACIÓN
    ===================================================== */

    function init() {
        if (initialized) {
            return;
        }

        if (!STORAGE()) {
            console.warn(
                "PLANEA DASHBOARD: No se encuentra PLANEA_STORAGE."
            );

            return;
        }

        initialized = true;

        bindDashboardActions();

        render();

        document.addEventListener("planea:viewChanged", event => {
            if (event.detail?.view === "dashboard") {
                render();
            }
        });

        document.addEventListener("planea:dataChanged", () => {
            render();
        });

        console.log(
            "PLANEA: Dashboard inicializado correctamente."
        );
    }

    /* =====================================================
       API GLOBAL
    ===================================================== */

    window.PLANEA_DASHBOARD = {
        init,
        render,
        renderStatistics,
        renderNextPlan,
        renderUpcomingEvents,
        renderRecentActivity,
        renderMiniCalendar
    };

})();