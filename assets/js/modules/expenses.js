/* =========================================================
   PLANEA · PRESUPUESTOS Y GASTOS
   Ruta: assets/js/modules/expenses.js

   Requiere PLANEA_STORAGE (getData, getPlans, saveData)
   Guarda los gastos dentro de cada plan: plan.expenses[].
   ========================================================= */
(() => {
    "use strict";

    let initialized = false;
    let activePlanId = "all";

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const storage = () => window.PLANEA_STORAGE;

    const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);

    const money = value => new Intl.NumberFormat("es-ES", {
        style: "currency", currency: "EUR"
    }).format(Number(value) || 0);

    const today = () => {
        const date = new Date();
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-").replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1-$2-$3");
    };

    const uid = () => window.crypto?.randomUUID?.()
        || `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    function getData() {
        return storage()?.getData?.() || {};
    }

    function getPlans() {
        const result = storage()?.getPlans?.();
        return Array.isArray(result) ? result : [];
    }

    function getParticipants() {
        const result = getData().participants;
        return Array.isArray(result) ? result : [];
    }

    function getPlanParticipants(plan) {
        const data = getData();
        const linked = data.planParticipants?.[String(plan.id)] || [];
        const ids = new Set();

        linked.forEach(item => {
            if (item?.participantId && item.status !== "Rechazado") {
                ids.add(String(item.participantId));
            }
        });

        // Compatibilidad con planes que almacenen participantes directamente.
        if (Array.isArray(plan.participants)) {
            plan.participants.forEach(item => {
                const id = typeof item === "object"
                    ? item.participantId || item.id
                    : item;
                if (id != null) ids.add(String(id));
            });
        }

        return [...ids]
            .map(id => getParticipants().find(person => String(person.id) === id))
            .filter(Boolean);
    }

    function participantName(id) {
        return getParticipants().find(person => String(person.id) === String(id))?.name
            || "Participante";
    }

    function expensesOf(plan) {
        if (!Array.isArray(plan.expenses)) plan.expenses = [];
        return plan.expenses;
    }

    function persist(data) {
        storage().saveData(data);
        document.dispatchEvent(new CustomEvent("planea:dataChanged", {
            detail: { source: "expenses" }
        }));
    }

    function injectStyles() {
        if ($("#planeaExpensesStyles")) return;

        const style = document.createElement("style");
        style.id = "planeaExpensesStyles";
        style.textContent = `
            [data-page="expenses"] { color:var(--text-primary,#f4f7f5); }
            .expenses-page { display:flex; flex-direction:column; gap:22px; }
            .expenses-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:15px; }
            .expenses-header h2 { margin:0 0 6px; font-weight:750; }
            .expenses-muted { color:var(--text-muted,#9aa7a0); }
            .expenses-toolbar { display:flex; gap:10px; flex-wrap:wrap; }
            .expenses-toolbar select { min-width:220px; }
            .expenses-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
            .expenses-stat,.expenses-panel { background:var(--surface,#151d19); border:1px solid var(--border,rgba(255,255,255,.08)); border-radius:16px; padding:19px; }
            .expenses-stat span { display:block; color:var(--text-muted,#9aa7a0); margin-bottom:8px; font-size:.9rem; }
            .expenses-stat strong { font-size:1.4rem; font-weight:750; }
            .expenses-layout { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(270px,.8fr); gap:18px; }
            .expenses-panel h3 { font-size:1.05rem; font-weight:700; margin:0 0 16px; }
            .expense-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:13px; margin-bottom:9px; border-radius:12px; background:rgba(255,255,255,.025); }
            .expense-main { display:flex; align-items:center; gap:12px; min-width:0; }
            .expense-icon { width:42px; height:42px; flex-shrink:0; display:grid; place-items:center; border-radius:12px; background:rgba(22,163,106,.13); color:#25c784; font-size:1.1rem; }
            .expense-row h4 { font-size:.95rem; font-weight:650; margin:0 0 5px; overflow-wrap:anywhere; }
            .expense-row small { color:var(--text-muted,#9aa7a0); }
            .expense-actions { display:flex; align-items:center; gap:9px; flex-shrink:0; }
            .expense-actions button { border:0; background:transparent; color:var(--text-muted,#9aa7a0); padding:5px; }
            .expense-actions button:hover { color:white; }
            .expense-positive { color:#25c784; }
            .expense-negative { color:#ff8585; }
            .expense-balance { display:flex; justify-content:space-between; gap:10px; padding:11px 0; border-bottom:1px solid rgba(255,255,255,.08); }
            .expense-empty { text-align:center; padding:30px 12px; color:var(--text-muted,#9aa7a0); }
            .expense-empty i { display:block; font-size:2rem; margin-bottom:10px; color:#25c784; }
            .expense-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
            .expense-form-grid .full { grid-column:1/-1; }
            .expense-form-grid label { display:block; margin-bottom:6px; color:#aab5ae; font-size:.88rem; }
            .expense-form-grid .form-control,.expense-form-grid .form-select { background:#111915; border-color:rgba(255,255,255,.12); color:#f4f7f5; }
            .expense-form-grid .form-control:focus,.expense-form-grid .form-select:focus { border-color:#16a36a; box-shadow:0 0 0 .2rem rgba(22,163,106,.15); }
            .expense-split-list { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
            .expense-split-item { display:flex; align-items:center; gap:8px; padding:9px; border-radius:9px; background:rgba(255,255,255,.04); }
            .expense-split-item input[type=number] { max-width:95px; margin-left:auto; }

            @media(max-width:900px) {
                .expenses-layout { grid-template-columns:1fr; }
            }

            @media(max-width:650px) {
                .expenses-stats,
                .expense-form-grid,
                .expense-split-list { grid-template-columns:1fr; }

                .expense-form-grid .full { grid-column:auto; }
                .expense-row { align-items:flex-start; }
                .expense-actions { flex-wrap:wrap; justify-content:flex-end; }
            }
        `;

        document.head.appendChild(style);
    }

    function ensurePage() {
        let page = $('[data-page="expenses"]');

        if (!page) {
            page = document.createElement("section");
            page.dataset.page = "expenses";
            page.className = "page-content";
            page.hidden = true;

            const reference = $('[data-page="calendar"]') || $('[data-page="participants"]');

            (reference?.parentElement || document.querySelector("main") || document.body)
                .appendChild(page);
        }

        // Añade el enlace si la navegación usa los selectores data-view habituales.
        if (!$('[data-view="expenses"]')) {
            const reference = $('[data-view="participants"]') || $('[data-view="calendar"]');

            if (reference?.parentElement) {
                const link = reference.cloneNode(true);

                link.dataset.view = "expenses";

                const icon = $("i", link);
                if (icon) icon.className = "bi bi-wallet2";

                const label = $("span", link);

                if (label) {
                    label.textContent = "Presupuestos y gastos";
                } else {
                    const textNode = [...link.childNodes]
                        .find(node => node.nodeType === Node.TEXT_NODE);

                    if (textNode) {
                        textNode.textContent = "Presupuestos y gastos";
                    } else {
                        link.append(document.createTextNode("Presupuestos y gastos"));
                    }
                }

                reference.parentElement.appendChild(link);
            }
        }

        return page;
    }

    function selectedPlans() {
        const plans = getPlans();

        return activePlanId === "all"
            ? plans
            : plans.filter(plan => String(plan.id) === String(activePlanId));
    }

    function calculateBalances(plans) {
        // Saldo = dinero adelantado por la persona - su parte de los gastos.
        const balances = new Map();

        plans.forEach(plan => {
            expensesOf(plan).forEach(expense => {
                const payer = String(expense.payerId || "");

                if (payer) {
                    balances.set(
                        payer,
                        (balances.get(payer) || 0) + Number(expense.amount || 0)
                    );
                }

                (expense.shares || []).forEach(share => {
                    const id = String(share.participantId || "");

                    if (!id) return;

                    balances.set(
                        id,
                        (balances.get(id) || 0) - Number(share.amount || 0)
                    );
                });
            });
        });

        return balances;
    }

    function render() {
        if (!storage()) return;

        const page = ensurePage();
        const plans = getPlans();
        const filteredPlans = selectedPlans();

        const rows = filteredPlans.flatMap(plan =>
            expensesOf(plan).map(expense => ({
                ...expense,
                planId: plan.id,
                planName: plan.name || "Plan sin nombre"
            }))
        );

        const total = rows.reduce(
            (sum, expense) => sum + Number(expense.amount || 0),
            0
        );

        // Se admiten varios nombres habituales para el presupuesto del plan.
        const budget = filteredPlans.reduce(
            (sum, plan) => sum + Number(
                plan.estimatedBudget ?? plan.budget ?? plan.presupuesto ?? 0
            ),
            0
        );

        const difference = budget - total;
        const balances = calculateBalances(filteredPlans);

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
                        <select class="form-select" id="expensesPlanFilter" aria-label="Filtrar por plan">
                            <option value="all">Todos los planes</option>

                            ${plans.map(plan => `
                                <option
                                    value="${escapeHTML(plan.id)}"
                                    ${String(plan.id) === String(activePlanId) ? "selected" : ""}
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
                        <strong>${money(total)}</strong>
                    </div>

                    <div class="expenses-stat">
                        <span>Presupuesto estimado</span>
                        <strong>${money(budget)}</strong>
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
                            ${money(Math.abs(difference))}
                        </strong>
                    </div>
                </div>

                <div class="expenses-layout">
                    <section class="expenses-panel">
                        <h3>Movimientos</h3>

                        ${rows.length ? rows
                            .sort((a, b) =>
                                String(b.date || "").localeCompare(String(a.date || ""))
                            )
                            .map(expense => `
                                <article class="expense-row">
                                    <div class="expense-main">
                                        <div class="expense-icon">
                                            <i class="bi bi-receipt"></i>
                                        </div>

                                        <div>
                                            <h4>${escapeHTML(expense.description || "Gasto")}</h4>

                                            <small>
                                                ${escapeHTML(expense.planName)}
                                                · ${escapeHTML(expense.date || "Sin fecha")}
                                                · Pagó ${escapeHTML(participantName(expense.payerId))}
                                            </small>
                                        </div>
                                    </div>

                                    <div class="expense-actions">
                                        <strong>${money(expense.amount)}</strong>

                                        <button
                                            type="button"
                                            data-edit-expense="${escapeHTML(expense.id)}"
                                            data-plan-id="${escapeHTML(expense.planId)}"
                                            title="Editar"
                                        >
                                            <i class="bi bi-pencil"></i>
                                        </button>

                                        <button
                                            type="button"
                                            data-delete-expense="${escapeHTML(expense.id)}"
                                            data-plan-id="${escapeHTML(expense.planId)}"
                                            title="Eliminar"
                                        >
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </article>
                            `).join("")
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

                    <aside class="expenses-panel">
                        <h3>Reparto de gastos</h3>

                        ${balances.size
                            ? [...balances.entries()].map(([id, value]) => `
                                <div class="expense-balance">
                                    <span>${escapeHTML(participantName(id))}</span>

                                    <strong class="${value >= 0
                                        ? "expense-positive"
                                        : "expense-negative"}">
                                        ${value >= 0 ? "+" : "−"}${money(Math.abs(value))}
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
                            Positivo: ha adelantado dinero. Negativo: es su parte del gasto.
                        </p>
                    </aside>
                </div>
            </div>
        `;

        $("#expensesPlanFilter", page)?.addEventListener("change", event => {
            activePlanId = event.target.value;
            render();
        });

        $("#addExpenseBtn", page)?.addEventListener("click", () => openExpenseModal());

        $$("[data-edit-expense]", page).forEach(button => {
            button.addEventListener("click", () =>
                openExpenseModal(button.dataset.planId, button.dataset.editExpense)
            );
        });

        $$("[data-delete-expense]", page).forEach(button => {
            button.addEventListener("click", () =>
                deleteExpense(button.dataset.planId, button.dataset.deleteExpense)
            );
        });
    }

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
                                <h5 class="modal-title" id="expenseModalTitle">
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
                                    <label for="expenseDescription">Concepto</label>
                                    <input
                                        class="form-control"
                                        id="expenseDescription"
                                        maxlength="100"
                                        required
                                        placeholder="Ej. Cena, gasolina, alojamiento"
                                    >
                                </div>

                                <div>
                                    <label for="expenseAmount">Importe (€)</label>
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
                                    <label for="expenseDate">Fecha</label>
                                    <input
                                        class="form-control"
                                        id="expenseDate"
                                        type="date"
                                        required
                                    >
                                </div>

                                <div class="full">
                                    <label for="expensePayer">¿Quién ha pagado?</label>
                                    <select class="form-select" id="expensePayer" required></select>
                                </div>

                                <div class="full">
                                    <label>¿Entre quiénes se reparte?</label>

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

                                    <div class="expense-split-list" id="expenseSplitPeople"></div>
                                </div>

                                <div class="full">
                                    <label for="expenseSplitMode">Tipo de reparto</label>

                                    <select class="form-select" id="expenseSplitMode">
                                        <option value="equal">A partes iguales</option>
                                        <option value="custom">Cantidades personalizadas</option>
                                    </select>
                                </div>

                                <div class="full small text-secondary" id="expenseSplitHint"></div>
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

                            <button type="submit" class="btn btn-primary-green">
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

        const plan = plans.find(item => String(item.id) === String(planId))
            || (activePlanId !== "all"
                ? plans.find(item => String(item.id) === String(activePlanId))
                : null)
            || plans[0];

        if (!plan) {
            alert("Primero necesitas crear un plan.");
            return;
        }

        const people = getPlanParticipants(plan);

        if (!people.length) {
            alert("Asigna participantes a este plan antes de registrar un gasto compartido.");
            return;
        }

        const existing = expenseId
            ? expensesOf(plan).find(item => String(item.id) === String(expenseId))
            : null;

        const modal = ensureModal();

        $("#expenseModalTitle", modal).textContent =
            existing ? "Editar gasto" : "Añadir gasto";

        $("#expenseDescription", modal).value = existing?.description || "";
        $("#expenseAmount", modal).value = existing?.amount ?? "";
        $("#expenseDate", modal).value = existing?.date || today();

        $("#expensePayer", modal).innerHTML = people.map(person => `
            <option value="${escapeHTML(person.id)}">
                ${escapeHTML(person.name)}
            </option>
        `).join("");

        $("#expensePayer", modal).value = existing?.payerId || people[0].id;
        $("#expenseSplitMode", modal).value = existing?.splitMode || "equal";

        const previousShares = new Map(
            (existing?.shares || []).map(share => [
                String(share.participantId),
                Number(share.amount)
            ])
        );

        $("#expenseSplitPeople", modal).innerHTML = people.map(person => {
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
                        ${checked && existing?.splitMode === "custom" ? "" : "disabled"}
                    >
                </label>
            `;
        }).join("");

        const updateControls = () => {
            const custom = $("#expenseSplitMode", modal).value === "custom";

            $$(".expense-split-item", modal).forEach(label => {
                $(".expense-custom-share", label).disabled =
                    !custom || !$(".expense-person-check", label).checked;
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

        // Igual que los otros modales de PLANEA: modal colgado directamente de body.
        if (modal.parentElement !== document.body) {
            document.body.appendChild(modal);
        }

        if (window.bootstrap?.Modal) {
            window.bootstrap.Modal.getOrCreateInstance(modal).show();
        } else {
            alert("No se ha encontrado Bootstrap Modal. Comprueba que Bootstrap JS está cargado.");
        }

        updateControls();
    }

    function updateHint(modal) {
        const amount = Number($("#expenseAmount", modal).value) || 0;
        const selected = $$(".expense-person-check:checked", modal);
        const hint = $("#expenseSplitHint", modal);

        if (!selected.length) {
            hint.textContent = "Selecciona al menos una persona.";
            return;
        }

        if ($("#expenseSplitMode", modal).value === "equal") {
            hint.textContent =
                `A cada persona le corresponden ${money(amount / selected.length)}.`;
        } else {
            const sum = selected.reduce((total, check) =>
                total + (
                    Number($(".expense-custom-share", check.closest("label")).value) || 0
                ),
                0
            );

            hint.textContent = `Repartido: ${money(sum)} de ${money(amount)}.`;
        }
    }

    function submitExpense(plan, existing, modal) {
        const description = $("#expenseDescription", modal).value.trim();

        const amount = Math.round(
            (Number($("#expenseAmount", modal).value) || 0) * 100
        ) / 100;

        const date = $("#expenseDate", modal).value;
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
            return fail("Completa el concepto, el importe y la fecha.");
        }

        if (!selected.length) {
            return fail("Selecciona al menos una persona para repartir el gasto.");
        }

        let shares;

        if (mode === "equal") {
            const totalCents = Math.round(amount * 100);
            const base = Math.floor(totalCents / selected.length);

            let remainder = totalCents - base * selected.length;

            shares = selected.map(check => {
                const cents = base + (remainder > 0 ? 1 : 0);

                if (remainder > 0) remainder--;

                return {
                    participantId: check.value,
                    amount: cents / 100
                };
            });
        } else {
            shares = selected.map(check => ({
                participantId: check.value,
                amount: Math.round(
                    (
                        Number(
                            $(".expense-custom-share", check.closest("label")).value
                        ) || 0
                    ) * 100
                ) / 100
            }));

            const sumCents = shares.reduce(
                (sum, share) => sum + Math.round(share.amount * 100),
                0
            );

            if (sumCents !== Math.round(amount * 100)) {
                return fail(
                    `Las cantidades deben sumar exactamente ${money(amount)}. ` +
                    `Actualmente suman ${money(sumCents / 100)}.`
                );
            }
        }

        const data = getData();

        if (!Array.isArray(data.plans)) {
            return fail("No se ha encontrado la lista de planes en el almacenamiento.");
        }

        const target = data.plans.find(
            item => String(item.id) === String(plan.id)
        );

        if (!target) {
            return fail("No se ha encontrado el plan seleccionado.");
        }

        if (!Array.isArray(target.expenses)) {
            target.expenses = [];
        }

        const expense = {
            id: existing?.id || uid(),
            description,
            amount,
            date,
            payerId,
            splitMode: mode,
            shares,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (existing) {
            const index = target.expenses.findIndex(
                item => String(item.id) === String(existing.id)
            );

            if (index < 0) {
                return fail("No se ha encontrado el gasto que intentas editar.");
            }

            target.expenses[index] = expense;
        } else {
            target.expenses.push(expense);
        }

        persist(data);

        window.bootstrap?.Modal.getInstance(modal)?.hide();

        render();
    }

    function deleteExpense(planId, expenseId) {
        const plan = getPlans().find(
            item => String(item.id) === String(planId)
        );

        if (!plan) return;

        const expense = expensesOf(plan).find(
            item => String(item.id) === String(expenseId)
        );

        if (!expense) return;

        if (!confirm(`¿Quieres eliminar el gasto «${expense.description || "Gasto"}»?`)) {
            return;
        }

        const data = getData();

        const target = (data.plans || []).find(
            item => String(item.id) === String(planId)
        );

        if (!target) return;

        target.expenses = expensesOf(target).filter(
            item => String(item.id) !== String(expenseId)
        );

        persist(data);
        render();
    }

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

        document.addEventListener("planea:dataChanged", () => {
            if (
                activePlanId !== "all" &&
                !getPlans().some(plan => String(plan.id) === String(activePlanId))
            ) {
                activePlanId = "all";
            }

            render();
        });

        console.log("PLANEA: módulo de Presupuestos y gastos inicializado.");
    }

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