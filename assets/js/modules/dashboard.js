
/* =========================================================
   PLANEA - DASHBOARD
   Archivo: assets/js/modules/dashboard.js
   ========================================================= */

(() => {
    "use strict";

    let initialized = false;

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

    function normalizeStatus(status) {
        return String(status || "Pendiente")
            .trim()
            .toLowerCase();
    }

    function getPlanStatus(plan) {
        return plan.status || "Pendiente";
    }

    function isActivePlan(plan) {
        const status = normalizeStatus(getPlanStatus(plan));

        return status !== "cancelado" &&
               status !== "realizado";
    }

    function getPlanExpenses(plan) {
        if (!Array.isArray(plan.expenses)) {
            return 0;
        }

        return plan.expenses.reduce((total, expense) => {
            return total + (Number(expense.amount) || 0);
        }, 0);
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

    function getPlans() {
        if (!STORAGE() || typeof STORAGE().getPlans !== "function") {
            return [];
        }

        const plans = STORAGE().getPlans();

        return Array.isArray(plans) ? plans : [];
    }

    function sortPlansByDate(a, b) {
        const dateComparison = String(a.date || "")
            .localeCompare(String(b.date || ""));

        if (dateComparison !== 0) {
            return dateComparison;
        }

        return String(a.time || "").localeCompare(
            String(b.time || "")
        );
    }

    /* =====================================================
       FECHA DEL DASHBOARD
       ===================================================== */

    function renderCurrentDate() {
        const container = getElement("currentDate");

        if (!container) {
            return;
        }

        const span = container.querySelector("span");

        if (!span) {
            return;
        }

        span.textContent = new Intl.DateTimeFormat("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date());
    }

    /* =====================================================
       ESTADÍSTICAS
       ===================================================== */

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

        const now = new Date();

        const currentMonth = String(now.getMonth() + 1)
            .padStart(2, "0");

        const currentYear = String(now.getFullYear());

        const monthlyExpenses = plans.reduce((total, plan) => {
            if (!plan.date) {
                return total;
            }

            const [year, month] = String(plan.date).split("-");

            const isCurrentMonth =
                year === currentYear &&
                month === currentMonth;

            if (!isCurrentMonth) {
                return total;
            }

            return total + getPlanExpenses(plan);
        }, 0);

        const values = {
            pendingPlansCount: pending,
            confirmedPlansCount: confirmed,
            completedPlansCount: completed,
            monthlyExpenses: formatCurrency(monthlyExpenses)
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
                    plan.date >= today &&
                    isActivePlan(plan)
                );
            })
            .sort(sortPlansByDate);

        const plan = plans[0];

        if (!plan) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="bi bi-calendar-plus"></i>
                    </div>

                    <h4>Aún no tienes planes</h4>

                    <p>
                        Empieza creando tu próximo plan
                        y aparecerá aquí.
                    </p>

                    <a href="#" data-view="plans"
                       class="btn btn-primary-green">
                        Crear mi primer plan
                        <i class="bi bi-plus-lg ms-2"></i>
                    </a>
                </div>
            `;

            return;
        }

        const rawCategory = plan.category || "Otros";
        const category = escapeHTML(rawCategory);
        const name = escapeHTML(plan.name || "Plan sin nombre");
        const location = escapeHTML(
            plan.location || "Ubicación pendiente"
        );

        const status = getPlanStatus(plan);

        const date = formatDate(plan.date, {
            weekday: "long"
        });

        container.innerHTML = `
            <article class="next-plan-card">

                <div class="next-plan-category">
                    <i class="bi ${getCategoryIcon(rawCategory)}"></i>
                    ${category}
                </div>

                <h4>${name}</h4>

                <div class="next-plan-details">

                    <span>
                        <i class="bi bi-calendar3"></i>
                        ${date}
                    </span>

                    ${plan.time ? `
                        <span>
                            <i class="bi bi-clock"></i>
                            ${escapeHTML(plan.time)}
                        </span>
                    ` : ""}

                    <span>
                        <i class="bi bi-geo-alt"></i>
                        ${location}
                    </span>

                </div>

                <div class="next-plan-footer">

                    <span class="status-badge ${getStatusClass(status)}">
                        ${escapeHTML(status)}
                    </span>

                    <span class="next-plan-budget">
                        ${formatCurrency(plan.estimatedBudget)}
                    </span>

                </div>

            </article>
        `;
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
                    plan.date >= today &&
                    isActivePlan(plan)
                );
            })
            .sort(sortPlansByDate)
            .slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = `
                <div class="empty-state empty-state-small">
                    <i class="bi bi-calendar2-event"></i>
                    <p>No hay próximos acontecimientos.</p>
                </div>
            `;

            return;
        }

        container.innerHTML = upcoming.map(plan => {
            const date = new Date(`${plan.date}T00:00:00`);

            if (Number.isNaN(date.getTime())) {
                return "";
            }

            return `
                <article class="upcoming-event">

                    <div class="upcoming-event-date">
                        <strong>${date.getDate()}</strong>

                        <span>
                            ${new Intl.DateTimeFormat("es-ES", {
                                month: "short"
                            }).format(date)}
                        </span>
                    </div>

                    <div class="upcoming-event-info">

                        <h4>
                            ${escapeHTML(plan.name || "Plan sin nombre")}
                        </h4>

                        <span>
                            ${escapeHTML(plan.category || "Otros")}
                            ${plan.time
                                ? ` · ${escapeHTML(plan.time)}`
                                : ""}
                        </span>

                    </div>

                    <i class="bi bi-chevron-right"></i>

                </article>
            `;
        }).join("");
    }

    /* =====================================================
       ACTIVIDAD RECIENTE
       ===================================================== */

    function renderRecentActivity() {
        const container = getElement("recentActivityList");

        if (!container) {
            return;
        }

        let activities = [];

        if (
            STORAGE() &&
            typeof STORAGE().getActivity === "function"
        ) {
            const storedActivities = STORAGE().getActivity();

            if (Array.isArray(storedActivities)) {
                activities = storedActivities;
            }
        }

        activities = [...activities]
            .sort((a, b) => {
                const dateA = new Date(a.date || 0).getTime();
                const dateB = new Date(b.date || 0).getTime();

                return dateB - dateA;
            })
            .slice(0, 5);

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state empty-state-small">
                    <i class="bi bi-activity"></i>
                    <p>Tu actividad aparecerá aquí.</p>
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
            expense_added: "bi-wallet2"
        };

        container.innerHTML = activities.map(activity => {
            const icon = icons[activity.type] || "bi-activity";

            const parsedDate = activity.date
                ? new Date(activity.date)
                : new Date();

            const date = Number.isNaN(parsedDate.getTime())
                ? new Date()
                : parsedDate;

            const time = new Intl.DateTimeFormat("es-ES", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
            }).format(date);

            return `
                <article class="activity-item">

                    <div class="activity-icon">
                        <i class="bi ${icon}"></i>
                    </div>

                    <div class="activity-info">

                        <p>
                            ${escapeHTML(
                                activity.description ||
                                "Actividad realizada"
                            )}
                        </p>

                        <span>${time}</span>

                    </div>

                </article>
            `;
        }).join("");
    }

    /* =====================================================
       CALENDARIO RESUMIDO
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
            if (!plan.date || !isActivePlan(plan)) {
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

            const hasPlans = Boolean(plansByDate[dateKey]);
            const isToday = day === now.getDate();

            const planCount = hasPlans
                ? plansByDate[dateKey].length
                : 0;

            daysHTML += `
                <div class="mini-calendar-day
                    ${isToday ? "today" : ""}
                    ${hasPlans ? "has-event" : ""}"
                    title="${
                        hasPlans
                            ? `${planCount} plan(es)`
                            : ""
                    }">

                    <span>${day}</span>

                    ${
                        hasPlans
                            ? '<i class="mini-calendar-dot"></i>'
                            : ""
                    }

                </div>
            `;
        }

        const daysWithPlans = Object.keys(plansByDate)
            .filter(date => {
                return date.startsWith(
                    `${year}-${String(month + 1).padStart(2, "0")}`
                );
            }).length;

        container.innerHTML = `
            <div class="mini-calendar">

                <div class="mini-calendar-heading">

                    <h4>${monthName}</h4>

                    <span>
                        ${daysWithPlans} días con planes
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
       RENDER GENERAL
       ===================================================== */

    function render() {
        if (!STORAGE()) {
            console.warn(
                "PLANEA: No se ha encontrado el sistema de almacenamiento."
            );

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
            render();
            return;
        }

        initialized = true;

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
