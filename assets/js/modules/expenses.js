
/* =========================================================
   PLANEA · PRESUPUESTOS Y GASTOS
   Ruta: assets/js/modules/expenses.js

   - Gastos asociados a cada plan: plan.expenses[]
   - Categorías de gastos.
   - Reparto igualitario y personalizado.
   - Balances por participante.
   - Presupuesto calculado por persona y participantes.
   - Estadísticas y filtros.
   - Sincronización con el resto de PLANEA.
========================================================= */

(() => {
    "use strict";

    let initialized = false;
    let activePlanId = "all";

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    const storage = () => window.PLANEA_STORAGE;

    const CATEGORIES = {
        food: {
            name: "Comida y bebida",
            icon: "bi-cup-hot"
        },
        transport: {
            name: "Transporte",
            icon: "bi-car-front"
        },
        accommodation: {
            name: "Alojamiento",
            icon: "bi-house"
        },
        activities: {
            name: "Actividades",
            icon: "bi-ticket-perforated"
        },
        shopping: {
            name: "Compras",
            icon: "bi-bag"
        },
        other: {
            name: "Otros",
            icon: "bi-three-dots"
        }
    };

    const $money = value => new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR"
    }).format(Number(value) || 0);

    const today = () => {
        const date = new Date();

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    };

    const uid = () => window.crypto?.randomUUID?.()
        || `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLocaleLowerCase("es")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function getData() {
        const data = storage()?.getData?.() || {};

        if (!Array.isArray(data.plans)) {
            data.plans = [];
        }

        if (!Array.isArray(data.participants)) {
            data.participants = [];
        }

        if (
            !data.planParticipants ||
            typeof data.planParticipants !== "object"
        ) {
            data.planParticipants = {};
        }

        return data;
    }

    function getPlans() {
        const plans = storage()?.getPlans?.();

        return Array.isArray(plans) ? plans : getData().plans;
    }

    function getParticipants() {
        return getData().participants;
    }

    function getParticipantById(id) {
        return getParticipants().find(person =>
            String(person.id) === String(id)
        );
    }

    function participantName(id) {
        return getParticipantById(id)?.name || "Participante";
    }

    function expensesOf(plan) {
        if (!Array.isArray(plan.expenses)) {
            plan.expenses = [];
        }

        return plan.expenses;
    }

    function persist(data, detail = {}) {
        storage().saveData(data);

        document.dispatchEvent(
            new CustomEvent("planea:dataChanged", {
                detail: {
                    source: "expenses",
                    ...detail,
                    timestamp: new Date().toISOString()
                }
            })
        );
    }

    function showToast(message, type = "success") {
        if (window.PLANEA_APP?.showToast) {
            window.PLANEA_APP.showToast(message, type);
        } else {
            console.log(`[PLANEA] ${message}`);
        }
    }

    /* =====================================================
       PARTICIPANTES ASIGNADOS A CADA PLAN

       IMPORTANTE:
       Solo se utilizan los participantes asignados desde
       el apartado "Participantes".

       No se utilizan los nombres escritos en Mis planes.
    ===================================================== */

    function getPlanParticipants(plan) {
        if (!plan?.id) return [];

        const data = getData();

        const linked = data.planParticipants?.[String(plan.id)] || [];

        if (!Array.isArray(linked)) {
            return [];
        }

        const ids = new Set();

        linked.forEach(item => {
            if (
                item?.participantId != null &&
                item.status !== "Rechazado"
            ) {
                ids.add(String(item.participantId));
            }
        });

        return [...ids]
            .map(id => getParticipantById(id))
            .filter(Boolean);
    }

    function getAllExpenses(plans = getPlans()) {
        return plans.flatMap(plan =>
            expensesOf(plan).map(expense => ({
                ...expense,
                planId: plan.id,
                planName: plan.name || "Plan sin nombre"
            }))
        );
    }

    function roundMoney(value) {
        return Math.round((Number(value) || 0) * 100) / 100;
    }

    /* =====================================================
       CÁLCULOS
    ===================================================== */

    function calculateBalances(plans) {
        // Positivo: dinero adelantado.
        // Negativo: parte del gasto que corresponde pagar.

        const balances = new Map();

        plans.forEach(plan => {
            expensesOf(plan).forEach(expense => {
                const payer = String(expense.payerId || "");

                if (payer) {
                    balances.set(
                        payer,
                        roundMoney(
                            (balances.get(payer) || 0) +
                            Number(expense.amount || 0)
                        )
                    );
                }

                (expense.shares || []).forEach(share => {
                    const id = String(share.participantId || "");

                    if (!id) return;

                    balances.set(
                        id,
                        roundMoney(
                            (balances.get(id) || 0) -
                            Number(share.amount || 0)
                        )
                    );
                });
            });
        });

        return balances;
    }

    function calculateCategoryTotals(expenses) {
        const totals = {};

        expenses.forEach(expense => {
            const category = CATEGORIES[expense.category]
                ? expense.category
                : "other";

            totals[category] = roundMoney(
                (totals[category] || 0) +
                Number(expense.amount || 0)
            );
        });

        return totals;
    }

    // Presupuesto estimado individual.
    function getBudgetPerPerson(plan) {
        return Number(
            plan.estimatedBudget ??
            plan.budget ??
            plan.presupuesto ??
            0
        ) || 0;
    }

    // Presupuesto total = presupuesto individual × participantes asignados.
    function getTotalPlanBudget(plan) {
        const budgetPerPerson = getBudgetPerPerson(plan);
        const participants = getPlanParticipants(plan);

        return roundMoney(
            budgetPerPerson * participants.length
        );
    }

    // Presupuesto total de todos los planes seleccionados.
    function calculateTotalBudget(plans) {
        return roundMoney(
            plans.reduce(
                (sum, plan) => sum + getTotalPlanBudget(plan),
                0
            )
        );
    }

    function calculateTotal(expenses) {
        return roundMoney(
            expenses.reduce(
                (sum, expense) => sum + Number(expense.amount || 0),
                0
            )
        );
    }

    /* =====================================================
       ESTILOS
    ===================================================== */

    function injectStyles() {
        if ($("#planeaExpensesStyles")) return;

        const style = document.createElement("style");
        style.id = "planeaExpensesStyles";

        style.textContent = `
            [data-page="expenses"] {
                color:var(--text-primary,#f4f7f5);
            }

            .expenses-page {
                display:flex;
                flex-direction:column;
                gap:22px;
            }

            .expenses-header {
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                flex-wrap:wrap;
                gap:15px;
            }

            .expenses-header h2 {
                margin:0 0 6px;
                font-weight:750;
            }

            .expenses-muted {
                color:var(--text-muted,#9aa7a0);
            }

            .expenses-toolbar {
                display:flex;
                gap:10px;
                flex-wrap:wrap;
            }

            .expenses-toolbar select {
                min-width:220px;
            }

            .expenses-stats {
                display:grid;
                grid-template-columns:repeat(3,minmax(0,1fr));
                gap:14px;
            }

            .expenses-stat,
            .expenses-panel {
                background:var(--surface,#151d19);
                border:1px solid var(--border,rgba(255,255,255,.08));
                border-radius:16px;
                padding:19px;
            }

            .expenses-stat span {
                display:block;
                color:var(--text-muted,#9aa7a0);
                margin-bottom:8px;
                font-size:.9rem;
            }

            .expenses-stat strong {
                display:block;
                font-size:1.4rem;
                font-weight:750;
            }

            .expenses-stat small {
                display:block;
                margin-top:7px;
                color:var(--text-muted,#9aa7a0);
                font-size:.78rem;
                line-height:1.4;
            }

            .expenses-layout {
                display:grid;
                grid-template-columns:minmax(0,1.5fr) minmax(270px,.8fr);
                gap:18px;
            }

            .expenses-panel h3 {
                font-size:1.05rem;
                font-weight:700;
                margin:0 0 16px;
            }

            .expense-row {
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:12px;
                padding:13px;
                margin-bottom:9px;
                border-radius:12px;
                background:rgba(255,255,255,.025);
            }

            .expense-main {
                display:flex;
                align-items:center;
                gap:12px;
                min-width:0;
            }

            .expense-icon {
                width:42px;
                height:42px;
                flex-shrink:0;
                display:grid;
                place-items:center;
                border-radius:12px;
                background:rgba(22,163,106,.13);
                color:#25c784;
                font-size:1.1rem;
            }

            .expense-row h4 {
                font-size:.95rem;
                font-weight:650;
                margin:0 0 5px;
                overflow-wrap:anywhere;
            }

            .expense-row small {
                color:var(--text-muted,#9aa7a0);
            }

            .expense-category {
                display:inline-flex;
                align-items:center;
                gap:5px;
                font-size:.75rem;
                color:#42d392;
                margin-top:5px;
            }

            .expense-actions {
                display:flex;
                align-items:center;
                gap:9px;
                flex-shrink:0;
            }

            .expense-actions button {
                border:0;
                background:transparent;
                color:var(--text-muted,#9aa7a0);
                padding:5px;
            }

            .expense-actions button:hover {
                color:white;
            }

            .expense-positive {
                color:#25c784;
            }

            .expense-negative {
                color:#ff8585;
            }

            .expense-balance {
                display:flex;
                justify-content:space-between;
                gap:10px;
                padding:11px 0;
                border-bottom:1px solid rgba(255,255,255,.08);
            }

            .expense-balance:last-child {
                border-bottom:0;
            }

            .expense-empty {
                text-align:center;
                padding:30px 12px;
                color:var(--text-muted,#9aa7a0);
            }

            .expense-empty i {
                display:block;
                font-size:2rem;
                margin-bottom:10px;
                color:#25c784;
            }

            .expense-form-grid {
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:14px;
            }

            .expense-form-grid .full {
                grid-column:1/-1;
            }

            .expense-form-grid label {
                display:block;
                margin-bottom:6px;
                color:#aab5ae;
                font-size:.88rem;
            }

            .expense-form-grid .form-control,
            .expense-form-grid .form-select {
                background:#111915;
                border-color:rgba(255,255,255,.12);
                color:#f4f7f5;
            }

            .expense-form-grid .form-control:focus,
            .expense-form-grid .form-select:focus {
                border-color:#16a36a;
                box-shadow:0 0 0 .2rem rgba(22,163,106,.15);
            }

            .expense-split-list {
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:8px;
            }

            .expense-split-item {
                display:flex;
                align-items:center;
                gap:8px;
                padding:9px;
                border-radius:9px;
                background:rgba(255,255,255,.04);
                min-width:0;
            }

            .expense-split-item span {
                overflow-wrap:anywhere;
            }

            .expense-split-item input[type=number] {
                max-width:95px;
                margin-left:auto;
                flex-shrink:0;
            }

            .expense-category-row {
                display:flex;
                align-items:center;
                gap:9px;
                margin-bottom:13px;
            }

            .expense-category-row:last-child {
                margin-bottom:0;
            }

            .expense-category-icon {
                width:34px;
                height:34px;
                display:grid;
                place-items:center;
                border-radius:9px;
                background:rgba(22,163,106,.13);
                color:#42d392;
                flex-shrink:0;
            }

            .expense-category-info {
                flex:1;
                min-width:0;
            }

            .expense-category-info small {
                color:#9aa7a0;
            }

            .expense-category-track {
                height:5px;
                background:rgba(255,255,255,.08);
                border-radius:10px;
                overflow:hidden;
                margin-top:5px;
            }

            .expense-category-track div {
                height:100%;
                background:#16a36a;
                border-radius:10px;
            }

            @media(max-width:900px) {
                .expenses-layout {
                    grid-template-columns:1fr;
                }
            }

            @media(max-width:650px) {
                .expenses-stats,
                .expense-form-grid,
                .expense-split-list {
                    grid-template-columns:1fr;
                }

                .expense-form-grid .full {
                    grid-column:auto;
                }

                .expense-row {
                    align-items:flex-start;
                }

                .expense-actions {
                    flex-wrap:wrap;
                    justify-content:flex-end;
                }

                .expenses-toolbar,
                .expenses-toolbar select {
                    width:100%;
                }

                .expenses-toolbar button {
                    width:100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================================
       PÁGINA Y NAVEGACIÓN
    ===================================================== */

    function ensurePage() {
        let page = $('[data-page="expenses"]');

        if (!page) {
            page = document.createElement("section");
            page.dataset.page = "expenses";
            page.className = "page-content d-none";

            const reference =
                $('[data-page="calendar"]') ||
                $('[data-page="participants"]');

            (reference?.parentElement ||
                document.querySelector("main") ||
                document.body
            ).appendChild(page);
        }

        page.removeAttribute("hidden");

        if (!$('[data-view="expenses"]')) {
            const reference =
                $('[data-view="participants"]') ||
                $('[data-view="calendar"]');

            if (reference?.parentElement) {
                const link = reference.cloneNode(true);

                link.dataset.view = "expenses";
                link.setAttribute("href", "#");

                const icon = $("i", link);

                if (icon) {
                    icon.className = "bi bi-wallet2";
                }

                const label = $("span", link);

                if (label) {
                    label.textContent = "Presupuestos y gastos";
                } else {
                    link.append(
                        document.createTextNode("Presupuestos y gastos")
                    );
                }

                reference.parentElement.appendChild(link);
            }
        }

        return page;
    }

    function getSelectedPlans() {
        const plans = getPlans();

        return activePlanId === "all"
            ? plans
            : plans.filter(plan =>
                String(plan.id) === String(activePlanId)
            );
    }

    /* =====================================================
       RENDER PRINCIPAL
    ===================================================== */

    function render() {
        if (!storage()) return;

        const page = ensurePage();
        const plans = getPlans();
        const filteredPlans = getSelectedPlans();

        const expenses = getAllExpenses(filteredPlans);

        const total = calculateTotal(expenses);

        // Presupuesto total calculado según los participantes asignados.
        const budget = calculateTotalBudget(filteredPlans);

        const difference = roundMoney(budget - total);

        const balances = calculateBalances(filteredPlans);
        const categories = calculateCategoryTotals(expenses);

        const expensesSorted = [...expenses].sort((a, b) =>
            String(b.date || "").localeCompare(
                String(a.date || "")
            )
        );

        // Información adicional del presupuesto.
        const assignedParticipantsCount = filteredPlans.reduce(
            (sum, plan) => sum + getPlanParticipants(plan).length,
            0
        );

        const budgetDescription = filteredPlans.length === 1
            ? (() => {
                const plan = filteredPlans[0];
                const people = getPlanParticipants(plan);

                return `${people.length} ${
                    people.length === 1 ? "participante" : "participantes"
                } × ${$money(getBudgetPerPerson(plan))} por persona`;
            })()
            : `${assignedParticipantsCount} participantes asignados en ${filteredPlans.length} ${
                filteredPlans.length === 1 ? "plan" : "planes"
            }`;

        page.innerHTML = `
            <div class="expenses-page">

                <div class="expenses-header">

                    <div>
                        <h2>Presupuestos y gastos</h2>

                        <p class="expenses-muted mb-0">
                            Controla lo que gastáis y cómo se reparte entre todos.
                        </p>
                    </div>

                    <div class="expenses-toolbar">

                        <select
                            class="form-select"
                            id="expensesPlanFilter"
                            aria-label="Filtrar por plan"
                        >
                            <option value="all">
                                Todos los planes
                            </option>

                            ${plans.map(plan => `
                                <option
                                    value="${escapeHTML(plan.id)}"
                                    ${String(plan.id) === String(activePlanId)
                                        ? "selected"
                                        : ""}
                                >
                                    ${escapeHTML(plan.name || "Plan sin nombre")}
                                </option>
                            `).join("")}
                        </select>

                        <button
                            class="btn btn-primary-green"
                            id="addExpenseBtn"
                            ${plans.length ? "" : "disabled"}
                        >
                            <i class="bi bi-plus-lg me-1"></i>
                            Añadir gasto
                        </button>

                    </div>

                </div>

                <div class="expenses-stats">

                    <div class="expenses-stat">
                        <span>Gasto registrado</span>
                        <strong>${$money(total)}</strong>
                    </div>

                    <div class="expenses-stat">
                        <span>Presupuesto total estimado</span>
                        <strong>${$money(budget)}</strong>
                        <small>
                            ${escapeHTML(budgetDescription)}
                        </small>
                    </div>

                    <div class="expenses-stat">
                        <span>
                            ${difference >= 0
                                ? "Presupuesto disponible"
                                : "Exceso sobre presupuesto"}
                        </span>

                        <strong class="${difference >= 0
                            ? "expense-positive"
                            : "expense-negative"}">
                            ${$money(Math.abs(difference))}
                        </strong>
                    </div>

                </div>

                <div class="expenses-layout">

                    <section class="expenses-panel">

                        <h3>
                            <i class="bi bi-receipt me-2"></i>
                            Movimientos
                        </h3>

                        ${expensesSorted.length
                            ? expensesSorted.map(expense => {
                                const category = CATEGORIES[expense.category]
                                    || CATEGORIES.other;

                                return `
                                    <article class="expense-row">

                                        <div class="expense-main">

                                            <div class="expense-icon">
                                                <i class="bi ${category.icon}"></i>
                                            </div>

                                            <div>
                                                <h4>
                                                    ${escapeHTML(
                                                        expense.description || "Gasto"
                                                    )}
                                                </h4>

                                                <small>
                                                    ${escapeHTML(expense.planName)}
                                                    · ${escapeHTML(expense.date || "Sin fecha")}
                                                    · Pagó ${escapeHTML(
                                                        participantName(expense.payerId)
                                                    )}
                                                </small>

                                                <div class="expense-category">
                                                    <i class="bi ${category.icon}"></i>
                                                    ${escapeHTML(category.name)}
                                                </div>
                                            </div>

                                        </div>

                                        <div class="expense-actions">

                                            <strong>${$money(expense.amount)}</strong>

                                            <button
                                                type="button"
                                                data-edit-expense="${escapeHTML(expense.id)}"
                                                data-plan-id="${escapeHTML(expense.planId)}"
                                                title="Editar gasto"
                                                aria-label="Editar gasto"
                                            >
                                                <i class="bi bi-pencil"></i>
                                            </button>

                                            <button
                                                type="button"
                                                data-delete-expense="${escapeHTML(expense.id)}"
                                                data-plan-id="${escapeHTML(expense.planId)}"
                                                title="Eliminar gasto"
                                                aria-label="Eliminar gasto"
                                            >
                                                <i class="bi bi-trash"></i>
                                            </button>

                                        </div>

                                    </article>
                                `;
                            }).join("")
                            : `
                                <div class="expense-empty">
                                    <i class="bi bi-wallet2"></i>
                                    <strong>No hay gastos todavía</strong>
                                    <p class="mb-0">
                                        Añade el primero para empezar a controlar las cuentas.
                                    </p>
                                </div>
                            `
                        }

                    </section>

                    <div class="d-flex flex-column gap-3">

                        <aside class="expenses-panel">

                            <h3>
                                <i class="bi bi-people me-2"></i>
                                Balance por participante
                            </h3>

                            ${balances.size
                                ? [...balances.entries()].map(([id, value]) => `
                                    <div class="expense-balance">

                                        <span>
                                            ${escapeHTML(participantName(id))}
                                        </span>

                                        <strong class="${value >= 0
                                            ? "expense-positive"
                                            : "expense-negative"}">
                                            ${value >= 0 ? "+" : "−"}${$money(Math.abs(value))}
                                        </strong>

                                    </div>
                                `).join("")
                                : `
                                    <div class="expense-empty">
                                        <i class="bi bi-people"></i>
                                        <p class="mb-0">
                                            El reparto aparecerá cuando registres gastos compartidos.
                                        </p>
                                    </div>
                                `
                            }

                            <p class="expenses-muted small mt-3 mb-0">
                                Positivo: ha adelantado dinero. Negativo: su parte de los gastos.
                            </p>

                        </aside>

                        <aside class="expenses-panel">

                            <h3>
                                <i class="bi bi-pie-chart me-2"></i>
                                Gastos por categoría
                            </h3>

                            ${Object.keys(categories).length
                                ? Object.entries(categories)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([key, value]) => {
                                        const category = CATEGORIES[key];
                                        const percentage = total > 0
                                            ? Math.min(100, value / total * 100)
                                            : 0;

                                        return `
                                            <div class="expense-category-row">

                                                <div class="expense-category-icon">
                                                    <i class="bi ${category.icon}"></i>
                                                </div>

                                                <div class="expense-category-info">

                                                    <div class="d-flex justify-content-between gap-2">
                                                        <small>
                                                            ${escapeHTML(category.name)}
                                                        </small>

                                                        <strong class="small">
                                                            ${$money(value)}
                                                        </strong>
                                                    </div>

                                                    <div class="expense-category-track">
                                                        <div style="width:${percentage}%"></div>
                                                    </div>

                                                </div>

                                            </div>
                                        `;
                                    }).join("")
                                : `
                                    <div class="expense-empty">
                                        <i class="bi bi-bar-chart"></i>
                                        <p class="mb-0">
                                            Las categorías aparecerán al registrar gastos.
                                        </p>
                                    </div>
                                `
                            }

                        </aside>

                    </div>

                </div>

            </div>
        `;

        bindPageEvents(page);
    }

    /* =====================================================
       EVENTOS DE LA PÁGINA
    ===================================================== */

    function bindPageEvents(page) {
        $("#expensesPlanFilter", page)?.addEventListener(
            "change",
            event => {
                activePlanId = event.target.value;
                render();
            }
        );

        $("#addExpenseBtn", page)?.addEventListener(
            "click",
            () => openExpenseModal()
        );

        $$("[data-edit-expense]", page).forEach(button => {
            button.addEventListener("click", () => {
                openExpenseModal(
                    button.dataset.planId,
                    button.dataset.editExpense
                );
            });
        });

        $$("[data-delete-expense]", page).forEach(button => {
            button.addEventListener("click", () => {
                deleteExpense(
                    button.dataset.planId,
                    button.dataset.deleteExpense
                );
            });
        });
    }

    /* =====================================================
       MODAL DE GASTOS
    ===================================================== */

    function ensureModal() {
        let modal = $("#planeaExpenseModal");

        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "planeaExpenseModal";
        modal.className = "modal fade";
        modal.tabIndex = -1;
        modal.setAttribute("aria-hidden", "true");

        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-lg">

                <div
                    class="modal-content"
                    style="
                        background:#17211b;
                        color:#f4f7f5;
                        border:1px solid rgba(255,255,255,.1);
                        border-radius:18px;
                    "
                >

                    <form id="planeaExpenseForm">

                        <div class="modal-header border-secondary">

                            <div>
                                <h5
                                    class="modal-title"
                                    id="expenseModalTitle"
                                >
                                    Añadir gasto
                                </h5>

                                <small class="text-secondary">
                                    Registra el importe y cómo se reparte.
                                </small>
                            </div>

                            <button
                                type="button"
                                class="btn-close btn-close-white"
                                data-bs-dismiss="modal"
                                aria-label="Cerrar"
                            ></button>

                        </div>

                        <div class="modal-body">

                            <div class="expense-form-grid">

                                <div class="full">
                                    <label for="expenseDescription">
                                        Concepto
                                    </label>

                                    <input
                                        class="form-control"
                                        id="expenseDescription"
                                        maxlength="100"
                                        required
                                        placeholder="Ej. Cena, gasolina, alojamiento"
                                    >
                                </div>

                                <div>
                                    <label for="expenseAmount">
                                        Importe (€)
                                    </label>

                                    <input
                                        class="form-control"
                                        id="expenseAmount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        required
                                        placeholder="0,00"
                                    >
                                </div>

                                <div>
                                    <label for="expenseDate">
                                        Fecha
                                    </label>

                                    <input
                                        class="form-control"
                                        id="expenseDate"
                                        type="date"
                                        required
                                    >
                                </div>

                                <div>
                                    <label for="expenseCategory">
                                        Categoría
                                    </label>

                                    <select
                                        class="form-select"
                                        id="expenseCategory"
                                        required
                                    >
                                        ${Object.entries(CATEGORIES).map(
                                            ([key, category]) => `
                                                <option value="${key}">
                                                    ${escapeHTML(category.name)}
                                                </option>
                                            `
                                        ).join("")}
                                    </select>
                                </div>

                                <div>
                                    <label for="expensePayer">
                                        ¿Quién ha pagado?
                                    </label>

                                    <select
                                        class="form-select"
                                        id="expensePayer"
                                        required
                                    ></select>
                                </div>

                                <div class="full">

                                    <label>
                                        ¿Entre quiénes se reparte?
                                    </label>

                                    <div class="d-flex gap-2 mb-2 flex-wrap">

                                        <button
                                            class="btn btn-sm btn-outline-success"
                                            type="button"
                                            id="selectAllExpensePeople"
                                        >
                                            Todos
                                        </button>

                                        <button
                                            class="btn btn-sm btn-outline-secondary"
                                            type="button"
                                            id="clearExpensePeople"
                                        >
                                            Nadie
                                        </button>

                                    </div>

                                    <div
                                        class="expense-split-list"
                                        id="expenseSplitPeople"
                                    ></div>

                                </div>

                                <div class="full">

                                    <label for="expenseSplitMode">
                                        Tipo de reparto
                                    </label>

                                    <select
                                        class="form-select"
                                        id="expenseSplitMode"
                                    >
                                        <option value="equal">
                                            A partes iguales
                                        </option>

                                        <option value="custom">
                                            Cantidades personalizadas
                                        </option>
                                    </select>

                                </div>

                                <div
                                    class="full small text-secondary"
                                    id="expenseSplitHint"
                                ></div>

                            </div>

                            <div
                                class="alert alert-danger py-2 mt-3 d-none"
                                id="expenseFormError"
                            ></div>

                        </div>

                        <div class="modal-footer border-secondary">

                            <button
                                type="button"
                                class="btn btn-outline-light"
                                data-bs-dismiss="modal"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                class="btn btn-primary-green"
                            >
                                Guardar gasto
                            </button>

                        </div>

                    </form>

                </div>

            </div>
        `;

        document.body.appendChild(modal);

        return modal;
    }

    function openExpenseModal(planId = null, expenseId = null) {
        const plans = getPlans();

        const plan = plans.find(item =>
            String(item.id) === String(planId)
        ) || (
            activePlanId !== "all"
                ? plans.find(item =>
                    String(item.id) === String(activePlanId)
                )
                : null
        ) || plans[0];

        if (!plan) {
            showToast(
                "Primero necesitas crear un plan.",
                "warning"
            );
            return;
        }

        // Solo participantes asignados desde el apartado Participantes.
        const people = getPlanParticipants(plan);

        if (!people.length) {
            showToast(
                "Asigna participantes a este plan desde el apartado Participantes antes de registrar un gasto.",
                "warning"
            );
            return;
        }

        const existing = expenseId
            ? expensesOf(plan).find(item =>
                String(item.id) === String(expenseId)
            )
            : null;

        if (expenseId && !existing) {
            showToast("No se ha encontrado el gasto.", "danger");
            return;
        }

        const modal = ensureModal();

        $("#expenseModalTitle", modal).textContent =
            existing ? "Editar gasto" : "Añadir gasto";

        $("#expenseDescription", modal).value =
            existing?.description || "";

        $("#expenseAmount", modal).value =
            existing?.amount ?? "";

        $("#expenseDate", modal).value =
            existing?.date || today();

        $("#expenseCategory", modal).value =
            CATEGORIES[existing?.category]
                ? existing.category
                : "other";

        $("#expensePayer", modal).innerHTML = people.map(person => `
            <option value="${escapeHTML(person.id)}">
                ${escapeHTML(person.name)}
            </option>
        `).join("");

        $("#expensePayer", modal).value =
            existing?.payerId || people[0].id;

        $("#expenseSplitMode", modal).value =
            existing?.splitMode || "equal";

        const previousShares = new Map(
            (existing?.shares || []).map(share => [
                String(share.participantId),
                Number(share.amount)
            ])
        );

        $("#expenseSplitPeople", modal).innerHTML =
            people.map(person => {
                const checked = existing
                    ? previousShares.has(String(person.id))
                    : true;

                const share = previousShares.get(String(person.id));

                return `
                    <label class="expense-split-item">

                        <input
                            class="form-check-input expense-person-check"
                            type="checkbox"
                            value="${escapeHTML(person.id)}"
                            ${checked ? "checked" : ""}
                        >

                        <span>${escapeHTML(person.name)}</span>

                        <input
                            class="form-control form-control-sm expense-custom-share"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="€"
                            value="${share ?? ""}"
                            ${checked && existing?.splitMode === "custom"
                                ? ""
                                : "disabled"}
                        >

                    </label>
                `;
            }).join("");

        const updateControls = () => {
            const custom =
                $("#expenseSplitMode", modal).value === "custom";

            $$(".expense-split-item", modal).forEach(label => {
                $(".expense-custom-share", label).disabled =
                    !custom ||
                    !$(".expense-person-check", label).checked;
            });

            updateHint(modal);
        };

        $("#expenseSplitMode", modal).onchange = updateControls;

        $$(".expense-person-check", modal).forEach(check => {
            check.addEventListener("change", updateControls);
        });

        $$(".expense-custom-share", modal).forEach(input => {
            input.addEventListener("input", () => updateHint(modal));
        });

        $("#expenseAmount", modal).oninput = () => updateHint(modal);

        $("#selectAllExpensePeople", modal).onclick = () => {
            $$(".expense-person-check", modal).forEach(check => {
                check.checked = true;
            });

            updateControls();
        };

        $("#clearExpensePeople", modal).onclick = () => {
            $$(".expense-person-check", modal).forEach(check => {
                check.checked = false;
            });

            updateControls();
        };

        $("#expenseFormError", modal).classList.add("d-none");

        $("#planeaExpenseForm", modal).onsubmit = event => {
            event.preventDefault();
            submitExpense(plan, existing, modal);
        };

        if (modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }

        if (window.bootstrap?.Modal) {
            window.bootstrap.Modal.getOrCreateInstance(modal).show();
        } else {
            showToast(
                "No se ha encontrado Bootstrap Modal.",
                "danger"
            );
            return;
        }

        updateControls();
    }

    /* =====================================================
       REPARTO Y VALIDACIONES
    ===================================================== */

    function updateHint(modal) {
        const amount = Number(
            $("#expenseAmount", modal).value
        ) || 0;

        const selected = $$(".expense-person-check:checked", modal);
        const hint = $("#expenseSplitHint", modal);

        if (!selected.length) {
            hint.textContent = "Selecciona al menos una persona.";
            return;
        }

        if ($("#expenseSplitMode", modal).value === "equal") {
            hint.textContent =
                `A cada persona le corresponden ${
                    $money(amount / selected.length)
                }.`;

            return;
        }

        const sum = selected.reduce((total, check) => {
            const input = $(".expense-custom-share", check.closest("label"));

            return total + (Number(input.value) || 0);
        }, 0);

        hint.textContent =
            `Repartido: ${$money(sum)} de ${$money(amount)}.`;
    }

    function distributeEqually(amount, selected) {
        const totalCents = Math.round(amount * 100);
        const base = Math.floor(totalCents / selected.length);

        let remainder = totalCents - base * selected.length;

        return selected.map(check => {
            const cents = base + (remainder > 0 ? 1 : 0);

            if (remainder > 0) {
                remainder--;
            }

            return {
                participantId: check.value,
                amount: cents / 100
            };
        });
    }

    function getCustomShares(selected) {
        return selected.map(check => ({
            participantId: check.value,
            amount: roundMoney(
                $(".expense-custom-share", check.closest("label")).value
            )
        }));
    }

    function submitExpense(plan, existing, modal) {
        const description = $("#expenseDescription", modal)
            .value.trim();

        const amount = roundMoney(
            $("#expenseAmount", modal).value
        );

        const date = $("#expenseDate", modal).value;

        const category = $("#expenseCategory", modal).value;

        const payerId = $("#expensePayer", modal).value;

        const mode = $("#expenseSplitMode", modal).value;

        const selected = $$(".expense-person-check:checked", modal);

        const error = $("#expenseFormError", modal);

        const fail = message => {
            error.textContent = message;
            error.classList.remove("d-none");
        };

        error.classList.add("d-none");

        if (!description || !date || !payerId || amount <= 0) {
            return fail(
                "Completa el concepto, el importe y la fecha."
            );
        }

        if (!CATEGORIES[category]) {
            return fail("Selecciona una categoría válida.");
        }

        if (!selected.length) {
            return fail(
                "Selecciona al menos una persona para repartir el gasto."
            );
        }

        let shares;

        if (mode === "equal") {
            shares = distributeEqually(amount, selected);
        } else {
            shares = getCustomShares(selected);

            const sumCents = shares.reduce(
                (sum, share) =>
                    sum + Math.round(share.amount * 100),
                0
            );

            if (sumCents !== Math.round(amount * 100)) {
                return fail(
                    `Las cantidades deben sumar exactamente ${$money(amount)}.`
                );
            }
        }

        const data = getData();

        const target = data.plans.find(item =>
            String(item.id) === String(plan.id)
        );

        if (!target) {
            return fail(
                "No se ha encontrado el plan seleccionado."
            );
        }

        if (!Array.isArray(target.expenses)) {
            target.expenses = [];
        }

        const expense = {
            id: existing?.id || uid(),
            description,
            amount,
            date,
            category,
            payerId,
            splitMode: mode,
            shares,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (existing) {
            const index = target.expenses.findIndex(item =>
                String(item.id) === String(existing.id)
            );

            if (index < 0) {
                return fail(
                    "No se ha encontrado el gasto que intentas editar."
                );
            }

            target.expenses[index] = expense;
        } else {
            target.expenses.push(expense);
        }

        try {
            persist(data, {
                action: existing ? "expense_updated" : "expense_created",
                expenseId: expense.id,
                planId: String(plan.id)
            });
        } catch (exception) {
            console.error("PLANEA: error guardando gasto.", exception);

            return fail(
                "No se ha podido guardar el gasto. Comprueba el almacenamiento disponible."
            );
        }

        window.bootstrap?.Modal.getInstance(modal)?.hide();

        render();

        showToast(
            existing
                ? "Gasto actualizado correctamente."
                : "Gasto registrado correctamente."
        );
    }

    /* =====================================================
       ELIMINAR GASTOS
    ===================================================== */

    function deleteExpense(planId, expenseId) {
        const plan = getPlans().find(item =>
            String(item.id) === String(planId)
        );

        if (!plan) return;

        const expense = expensesOf(plan).find(item =>
            String(item.id) === String(expenseId)
        );

        if (!expense) return;

        const confirmed = window.confirm(
            `¿Quieres eliminar el gasto «${expense.description || "Gasto"}»?`
        );

        if (!confirmed) return;

        const data = getData();

        const target = data.plans.find(item =>
            String(item.id) === String(planId)
        );

        if (!target) return;

        target.expenses = expensesOf(target).filter(item =>
            String(item.id) !== String(expenseId)
        );

        try {
            persist(data, {
                action: "expense_deleted",
                expenseId,
                planId: String(planId)
            });
        } catch (error) {
            console.error("PLANEA: error eliminando gasto.", error);
            showToast("No se ha podido eliminar el gasto.", "danger");
            return;
        }

        render();

        showToast("Gasto eliminado correctamente.");
    }

    /* =====================================================
       INICIALIZACIÓN
    ===================================================== */

    function init() {
        if (initialized || !storage()) return;

        initialized = true;

        injectStyles();
        ensurePage();
        render();

        document.addEventListener("planea:viewChanged", event => {
            if (event.detail?.view === "expenses") {
                render();
            }
        });

        document.addEventListener("planea:dataChanged", event => {
            if (
                activePlanId !== "all" &&
                !getPlans().some(plan =>
                    String(plan.id) === String(activePlanId)
                )
            ) {
                activePlanId = "all";
            }

            render();
        });

        console.log(
            "PLANEA: módulo de Presupuestos y gastos inicializado correctamente."
        );
    }

    /* =====================================================
       API GLOBAL
    ===================================================== */

    window.PLANEA_EXPENSES = {
        init,
        render,
        openExpenseModal
    };

    document.addEventListener("DOMContentLoaded", init);

    if (document.readyState !== "loading") {
        init();
    }

})();
