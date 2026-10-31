
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

    function getPlanExpenses(plan) {
        if (!Array.isArray(plan.expenses)) {
            return 0;
        }

        return plan.expenses.reduce((total, expense) => {
            return total + (Number(expense.amount) || 0);
        }, 0);
    }

    function getPlanStatus(plan) {
        return plan.status || "Pendiente";
    }

    function getStatusClass(status) {
        const normalized = String(status).toLowerCase();

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
        return STORAGE() ? STORAGE().getPlans() : [];
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
            getPlanStatus(plan).toLowerCase() === "pendiente"
        ).length;

        const confirmed = plans.filter(plan =>
            getPlanStatus(plan).toLowerCase() === "confirmado"
        ).length;

        const completed = plans.filter(plan =>
            getPlanStatus(plan).toLowerCase() === "realizado"
        ).length;

        const now = new Date();

        const monthlyExpenses = plans.reduce((total, plan) => {
            const planDate = new Date(`${plan.date}T00:00:00`);

            const isCurrentMonth =
                planDate.getMonth() === now.getMonth() &&
                planDate.getFullYear() === now.getFullYear();

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
                const status = getPlanStatus(plan).toLowerCase();

                return (
                    plan.date &&
                    plan.date >= today &&
                    status !== "cancelado" &&
                    status !== "realizado"
                );
            })
            .sort((a, b) => {
                const dateComparison = a.date.localeCompare(b.date);

                if (dateComparison !== 0) {
                    return dateComparison;
                }

                return String(a.time || "").localeCompare(
                    String(b.time || "")
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
                        Empieza creando tu próximo plan
                        y aparecerá aquí.
                    </p>

                    <a href="#" data-view="plans" class="btn btn-primary-green">
                        Crear mi primer plan
                        <i class="bi bi-plus-lg ms-2"></i>
                    </a>
                </div>
            `;

            return;
        }

        const category = escapeHTML(plan.category || "Otros");
        const name = escapeHTML(plan.name || "Plan sin nombre");
        const location = escapeHTML(plan.location || "Ubicación pendiente");
        const status = getPlanStatus(plan);
        const date = formatDate(plan.date, {
            weekday: "long"
        });

        container.innerHTML = `
            <article class="next-plan-card">

                <div class="next-plan-category">
                    <i class="bi ${getCategoryIcon(category)}"></i>
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
                const status = getPlanStatus(plan).toLowerCase();

                return (
                    plan.date &&
                    plan.date >= today &&
                    status !== "cancelado" &&
                    status !== "realizado"
                );
            })
            .sort((a, b) => a.date.localeCompare(b.date))
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
                        <h4>${escapeHTML(plan.name || "Plan sin nombre")}</h4>

                        <span>
                            ${escapeHTML(plan.category || "Otros")}
                            ${plan.time ? ` · ${escapeHTML(plan.time)}` : ""}
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

        const activities = STORAGE()
            ? STORAGE().getActivity().slice(0, 5)
            : [];

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

            const date = activity.date
                ? new Date(activity.date)
                : new Date();

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
                        <p>${escapeHTML(activity.description || "Actividad realizada")}</p>
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
            if (!plan.date) {
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
            daysHTML += `<div class="mini-calendar-day empty"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = [
                year,
                String(month + 1).padStart(2, "0"),
                String(day).padStart(2, "0")
            ].join("-");

            const hasPlans = Boolean(plansByDate[dateKey]);
            const isToday = day === now.getDate();

            daysHTML += `
                <div class="mini-calendar-day
                    ${isToday ? "today" : ""}
                    ${hasPlans ? "has-event" : ""}"
                    title="${hasPlans ? plansByDate[dateKey].length + " plan(es)" : ""}">

                    <span>${day}</span>

                    ${hasPlans ? '<i class="mini-calendar-dot"></i>' : ""}

                </div>
            `;
        }

        container.innerHTML = `
            <div class="mini-calendar">

                <div class="mini-calendar-heading">
                    <h4>${monthName}</h4>
                    <span>
                        ${Object.keys(plansByDate).filter(date => {
                            return date.startsWith(
                                `${year}-${String(month + 1).padStart(2, "0")}`
                            );
                        }).length} días con planes
                    </span>
                </div>

                <div class="mini-calendar-grid">

                    ${weekdays.map(day => `
                        <div class="mini-calendar-weekday">${day}</div>
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

        initialized = true;

        render();

        document.addEventListener("planea:viewChanged", event => {
            if (event.detail.view === "dashboard") {
                render();
            }
        });

        document.addEventListener("planea:dataChanged", render);

        console.log("PLANEA: Dashboard inicializado correctamente.");
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
