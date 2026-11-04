
/* =========================================================
   PLANEA - PARTICIPANTES
   Gestión de personas y vinculación con los planes.
========================================================= */

(() => {
    "use strict";

    let initialized = false;
    let eventsBound = false;
    let selectedParticipantId = null;

    const STORAGE = () => window.PLANEA_STORAGE;

    /* =====================================================
       UTILIDADES
    ===================================================== */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function createId() {
        return "participant_" +
            Date.now() + "_" +
            Math.random().toString(36).slice(2, 9);
    }

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLocaleLowerCase("es")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function getData() {
        const storage = STORAGE();

        if (!storage) {
            throw new Error("PLANEA_STORAGE no está disponible.");
        }

        const data = storage.getData() || {};

        if (!Array.isArray(data.participants)) {
            data.participants = [];
        }

        if (
            !data.planParticipants ||
            typeof data.planParticipants !== "object" ||
            Array.isArray(data.planParticipants)
        ) {
            data.planParticipants = {};
        }

        return data;
    }

    function saveData(data, detail = {}) {
        STORAGE().saveData(data);

        document.dispatchEvent(
            new CustomEvent("planea:dataChanged", {
                detail: {
                    source: "participants",
                    ...detail,
                    timestamp: new Date().toISOString()
                }
            })
        );
    }

    function getParticipants() {
        return getData().participants;
    }

    function getPlans() {
        return STORAGE().getPlans() || [];
    }

    function getParticipantAssignments(participantId) {
        const data = getData();
        const plans = getPlans();
        const result = [];

        Object.entries(data.planParticipants).forEach(
            ([planId, assignments]) => {

                if (!Array.isArray(assignments)) return;

                const assignment = assignments.find(item =>
                    String(item.participantId) === String(participantId)
                );

                if (!assignment) return;

                const plan = plans.find(item =>
                    String(item.id) === String(planId)
                );

                if (plan) {
                    result.push({
                        plan,
                        status: assignment.status || "Pendiente",
                        updatedAt: assignment.updatedAt || null
                    });
                }
            }
        );

        return result.sort((a, b) =>
            String(a.plan.date || "").localeCompare(
                String(b.plan.date || "")
            )
        );
    }

    function getInitials(name) {
        return String(name || "?")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("");
    }

    function getSafePhoto(photo) {
        if (typeof photo !== "string" || !photo.trim()) {
            return null;
        }

        const source = photo.trim();

        if (
            /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(source) ||
            /^https?:\/\//i.test(source)
        ) {
            return source;
        }

        return null;
    }

    function showToast(message, type = "success") {
        if (window.PLANEA_APP?.showToast) {
            window.PLANEA_APP.showToast(message, type);
        } else {
            console.log(`[PLANEA] ${message}`);
        }
    }

    function getAssignmentStats(assignments) {
        return {
            total: assignments.length,
            confirmed: assignments.filter(item =>
                item.status === "Confirmado"
            ).length,
            pending: assignments.filter(item =>
                item.status === "Pendiente"
            ).length,
            rejected: assignments.filter(item =>
                item.status === "Rechazado"
            ).length
        };
    }

    /* =====================================================
       ESTRUCTURA DE LA PÁGINA
    ===================================================== */

    function createPage() {
        let page = document.querySelector(
            '[data-page="participants"]'
        );

        if (!page) {
            const calendarPage = document.querySelector(
                '[data-page="calendar"]'
            );

            if (!calendarPage || !calendarPage.parentElement) {
                throw new Error(
                    "No se encuentra la estructura de páginas de PLANEA."
                );
            }

            page = document.createElement("section");
            page.dataset.page = "participants";
            page.className = "d-none";

            calendarPage.parentElement.insertBefore(
                page,
                calendarPage.nextSibling
            );
        }

        if (!page.querySelector("#participantsModuleContainer")) {
            page.innerHTML = `
                <div id="participantsModuleContainer"></div>
            `;
        }

        return page;
    }

    function createNavigationLink() {
        if (
            document.querySelector('[data-view="participants"]')
        ) {
            return;
        }

        const calendarLink = document.querySelector(
            '[data-view="calendar"]'
        );

        if (!calendarLink) {
            console.warn(
                "PLANEA: no se ha encontrado el enlace del Calendario."
            );
            return;
        }

        const link = calendarLink.cloneNode(true);

        link.dataset.view = "participants";
        link.setAttribute("href", "#");

        link.innerHTML = `
            <i class="bi bi-people"></i>
            <span>Participantes</span>
        `;

        link.classList.remove("active");

        calendarLink.parentElement.insertBefore(
            link,
            calendarLink.nextSibling
        );

        link.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            window.PLANEA_ROUTER?.navigateTo("participants");
        });
    }

    /* =====================================================
       ESTILOS
    ===================================================== */

    function injectStyles() {
        if (document.getElementById("planea-participants-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "planea-participants-styles";

        style.textContent = `
            #participantsModuleContainer {
                color: var(--text-primary, #f1f5f9);
            }

            .participants-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                margin-bottom: 28px;
                flex-wrap: wrap;
            }

            .participants-header h2 {
                font-size: 1.65rem;
                font-weight: 700;
                margin-bottom: 6px;
            }

            .participants-header p {
                color: var(--text-secondary, #94a3b8);
                margin: 0;
            }

            .participants-summary {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 16px;
                margin-bottom: 26px;
            }

            .participant-stat {
                background: var(--card-bg, #151d19);
                border: 1px solid var(--border-color, #26332c);
                border-radius: 15px;
                padding: 19px;
            }

            .participant-stat span {
                display: block;
                color: var(--text-secondary, #94a3b8);
                font-size: .85rem;
                margin-bottom: 8px;
            }

            .participant-stat strong {
                font-size: 1.7rem;
                font-weight: 700;
            }

            .participants-toolbar {
                display: flex;
                gap: 12px;
                margin-bottom: 22px;
            }

            .participants-search {
                flex: 1;
                min-width: 0;
                background: var(--card-bg, #151d19);
                border: 1px solid var(--border-color, #26332c);
                color: var(--text-primary, #f1f5f9);
                border-radius: 11px;
                padding: 12px 15px;
                outline: none;
            }

            .participants-search:focus {
                border-color: #16a36a;
                box-shadow: 0 0 0 3px rgba(22,163,106,.12);
            }

            .participants-search::placeholder {
                color: #84918a;
            }

            .participants-grid {
                display: grid;
                grid-template-columns: repeat(
                    auto-fill,
                    minmax(245px, 1fr)
                );
                gap: 17px;
            }

            .participant-card {
                background: var(--card-bg, #151d19);
                border: 1px solid var(--border-color, #26332c);
                border-radius: 16px;
                padding: 20px;
                transition: border-color .2s, transform .2s;
            }

            .participant-card:hover {
                border-color: rgba(22,163,106,.55);
                transform: translateY(-2px);
            }

            .participant-card-top {
                display: flex;
                align-items: center;
                gap: 13px;
                margin-bottom: 16px;
            }

            .participant-avatar {
                width: 53px;
                height: 53px;
                flex-shrink: 0;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                background: rgba(22,163,106,.15);
                color: #42d392;
                font-weight: 700;
                font-size: 1.05rem;
            }

            .participant-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .participant-card h3 {
                font-size: 1rem;
                font-weight: 650;
                margin: 0 0 4px;
                overflow-wrap: anywhere;
            }

            .participant-card small {
                color: var(--text-secondary, #94a3b8);
            }

            .participant-description {
                color: var(--text-secondary, #94a3b8);
                font-size: .88rem;
                min-height: 39px;
                margin-bottom: 12px;
                overflow-wrap: anywhere;
            }

            .participant-assignment-summary {
                display: flex;
                flex-wrap: wrap;
                gap: 7px;
                margin-bottom: 15px;
            }

            .participant-status {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 8px;
                border-radius: 20px;
                font-size: .72rem;
                font-weight: 600;
            }

            .participant-status.confirmed {
                background: rgba(22,163,106,.14);
                color: #42d392;
            }

            .participant-status.pending {
                background: rgba(234,179,8,.12);
                color: #eab308;
            }

            .participant-status.rejected {
                background: rgba(239,68,68,.12);
                color: #f87171;
            }

            .participant-card-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding-top: 13px;
                border-top: 1px solid var(--border-color, #26332c);
            }

            .participant-plan-count {
                color: var(--text-secondary, #94a3b8);
                font-size: .82rem;
            }

            .participant-actions {
                display: flex;
                gap: 7px;
            }

            .participant-icon-btn {
                width: 34px;
                height: 34px;
                border: 1px solid var(--border-color, #26332c);
                border-radius: 9px;
                background: transparent;
                color: var(--text-secondary, #94a3b8);
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .participant-icon-btn:hover {
                color: #42d392;
                border-color: #16a36a;
            }

            .participant-primary-btn {
                background: #16a36a;
                color: #fff;
                border: 0;
                border-radius: 10px;
                padding: 11px 17px;
                font-weight: 600;
                transition: background .2s;
            }

            .participant-primary-btn:hover {
                background: #128454;
                color: #fff;
            }

            .participant-empty {
                text-align: center;
                padding: 55px 20px;
                background: var(--card-bg, #151d19);
                border: 1px dashed var(--border-color, #34443a);
                border-radius: 16px;
                grid-column: 1 / -1;
            }

            .participant-empty i {
                display: block;
                font-size: 2.3rem;
                color: #16a36a;
                margin-bottom: 14px;
            }

            .participant-empty h3 {
                font-size: 1.1rem;
                margin-bottom: 7px;
            }

            .participant-empty p {
                color: var(--text-secondary, #94a3b8);
                margin: 0;
            }

            .participants-modal .modal-content {
                background: #151d19;
                color: #f1f5f9;
                border: 1px solid #2b3b31;
                border-radius: 16px;
            }

            .participants-modal .modal-header,
            .participants-modal .modal-footer {
                border-color: #2b3b31;
            }

            .participants-modal .btn-close {
                filter: invert(1);
            }

            .participants-modal .form-control,
            .participants-modal .form-select {
                background-color: #0e1511;
                color: #f1f5f9;
                border-color: #34443a;
            }

            .participants-modal .form-control:focus,
            .participants-modal .form-select:focus {
                border-color: #16a36a;
                box-shadow: 0 0 0 3px rgba(22,163,106,.12);
            }

            .participants-modal .form-label {
                color: #dce5df;
                font-size: .9rem;
                font-weight: 550;
            }

            .participant-photo-preview {
                width: 68px;
                height: 68px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid #16a36a;
                display: none;
                margin-top: 10px;
            }

            .participant-assignment-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 0;
                border-bottom: 1px solid #2b3b31;
            }

            .participant-assignment-row:last-child {
                border-bottom: 0;
            }

            .participant-assignment-row strong {
                display: block;
                font-size: .9rem;
                overflow-wrap: anywhere;
            }

            .participant-assignment-row small {
                color: #94a3b8;
            }

            .participant-assignment-row select {
                max-width: 145px;
                flex-shrink: 0;
            }

            .participant-plan-cancelled {
                color: #f87171;
                font-size: .72rem;
                margin-top: 3px;
                display: block;
            }

            @media (max-width: 700px) {
                .participants-summary {
                    grid-template-columns: 1fr;
                    gap: 10px;
                }

                .participant-stat {
                    padding: 15px;
                }

                .participants-header {
                    align-items: flex-start;
                }

                .participants-header .participant-primary-btn {
                    width: 100%;
                }

                .participants-toolbar {
                    flex-direction: column;
                }

                .participants-grid {
                    grid-template-columns: 1fr;
                }

                .participant-assignment-row {
                    align-items: flex-start;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================================
       ESTRUCTURA VISUAL
    ===================================================== */

    function renderLayout() {
        const container = document.getElementById(
            "participantsModuleContainer"
        );

        if (!container) return;

        // La estructura se crea una sola vez para no destruir
        // los modales cada vez que se actualizan los datos.
        if (container.dataset.initialized !== "true") {
            container.innerHTML = `
                <div class="participants-header">

                    <div>
                        <h2>Participantes</h2>
                        <p>
                            Organiza a las personas con las que compartes tus planes.
                        </p>
                    </div>

                    <button
                        type="button"
                        class="participant-primary-btn"
                        id="addParticipantButton"
                    >
                        <i class="bi bi-person-plus me-2"></i>
                        Añadir participante
                    </button>

                </div>

                <div class="participants-summary">

                    <div class="participant-stat">
                        <span>Personas registradas</span>
                        <strong id="participantsTotal">0</strong>
                    </div>

                    <div class="participant-stat">
                        <span>Planes disponibles</span>
                        <strong id="participantsPlansTotal">0</strong>
                    </div>

                    <div class="participant-stat">
                        <span>Participaciones asignadas</span>
                        <strong id="participantsAssignmentsTotal">0</strong>
                    </div>

                </div>

                <div class="participants-toolbar">

                    <input
                        type="search"
                        class="participants-search"
                        id="participantsSearch"
                        placeholder="Buscar por nombre o teléfono..."
                        aria-label="Buscar participantes"
                    >

                </div>

                <div class="participants-grid" id="participantsGrid"></div>

                ${renderModals()}
            `;

            container.dataset.initialized = "true";
        }

        updateSummary();

        renderParticipants(
            document.getElementById("participantsSearch")?.value || ""
        );

        bindEvents();
    }

    function updateSummary() {
        const participants = getParticipants();
        const plans = getPlans();

        const totalAssignments = Object.values(
            getData().planParticipants
        ).reduce((total, list) => {
            return total + (Array.isArray(list) ? list.length : 0);
        }, 0);

        const totalElement = document.getElementById(
            "participantsTotal"
        );

        const plansElement = document.getElementById(
            "participantsPlansTotal"
        );

        const assignmentsElement = document.getElementById(
            "participantsAssignmentsTotal"
        );

        if (totalElement) {
            totalElement.textContent = participants.length;
        }

        if (plansElement) {
            plansElement.textContent = plans.length;
        }

        if (assignmentsElement) {
            assignmentsElement.textContent = totalAssignments;
        }
    }

    function renderModals() {
        return `
            <!-- MODAL CREAR / EDITAR -->

            <div
                class="modal fade participants-modal"
                id="participantModal"
                tabindex="-1"
                aria-hidden="true"
            >
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">

                        <form id="participantForm">

                            <div class="modal-header">
                                <h5
                                    class="modal-title"
                                    id="participantModalTitle"
                                >
                                    Nuevo participante
                                </h5>

                                <button
                                    type="button"
                                    class="btn-close"
                                    data-bs-dismiss="modal"
                                    aria-label="Cerrar"
                                ></button>
                            </div>

                            <div class="modal-body">

                                <input
                                    type="hidden"
                                    id="participantId"
                                >

                                <div class="mb-3">
                                    <label
                                        for="participantName"
                                        class="form-label"
                                    >
                                        Nombre *
                                    </label>

                                    <input
                                        type="text"
                                        class="form-control"
                                        id="participantName"
                                        maxlength="70"
                                        required
                                        placeholder="Nombre y apellidos"
                                    >
                                </div>

                                <div class="mb-3">
                                    <label
                                        for="participantPhone"
                                        class="form-label"
                                    >
                                        Teléfono
                                    </label>

                                    <input
                                        type="tel"
                                        class="form-control"
                                        id="participantPhone"
                                        maxlength="25"
                                        placeholder="Teléfono de contacto"
                                    >
                                </div>

                                <div class="mb-3">
                                    <label
                                        for="participantDescription"
                                        class="form-label"
                                    >
                                        Descripción
                                    </label>

                                    <textarea
                                        class="form-control"
                                        id="participantDescription"
                                        rows="3"
                                        maxlength="250"
                                        placeholder="Información adicional..."
                                    ></textarea>
                                </div>

                                <div class="mb-2">
                                    <label
                                        for="participantPhoto"
                                        class="form-label"
                                    >
                                        Fotografía
                                    </label>

                                    <input
                                        type="file"
                                        class="form-control"
                                        id="participantPhoto"
                                        accept="image/*"
                                    >

                                    <img
                                        id="participantPhotoPreview"
                                        class="participant-photo-preview"
                                        alt="Vista previa de la fotografía"
                                    >

                                    <button
                                        type="button"
                                        class="btn btn-sm btn-outline-secondary mt-2 d-none"
                                        id="removeParticipantPhoto"
                                    >
                                        Quitar fotografía
                                    </button>
                                </div>

                            </div>

                            <div class="modal-footer">

                                <button
                                    type="button"
                                    class="btn btn-outline-secondary"
                                    data-bs-dismiss="modal"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    class="participant-primary-btn"
                                >
                                    Guardar participante
                                </button>

                            </div>

                        </form>

                    </div>
                </div>
            </div>

            <!-- MODAL ASIGNAR PLANES -->

            <div
                class="modal fade participants-modal"
                id="participantPlansModal"
                tabindex="-1"
                aria-hidden="true"
            >
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">

                        <div class="modal-header">
                            <h5 class="modal-title">
                                Gestionar planes
                            </h5>

                            <button
                                type="button"
                                class="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Cerrar"
                            ></button>
                        </div>

                        <div
                            class="modal-body"
                            id="participantPlansContent"
                        ></div>

                        <div class="modal-footer">

                            <button
                                type="button"
                                class="btn btn-outline-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cerrar
                            </button>

                        </div>

                    </div>
                </div>
            </div>
        `;
    }

    /* =====================================================
       TARJETAS DE PARTICIPANTES
    ===================================================== */

    function renderParticipants(search = "") {
        const grid = document.getElementById("participantsGrid");

        if (!grid) return;

        const normalizedSearch = normalizeText(search);

        const participants = getParticipants()
            .filter(person => {
                const name = normalizeText(person.name);
                const phone = normalizeText(person.phone);

                return (
                    name.includes(normalizedSearch) ||
                    phone.includes(normalizedSearch)
                );
            })
            .sort((a, b) =>
                String(a.name || "").localeCompare(
                    String(b.name || ""),
                    "es",
                    { sensitivity: "base" }
                )
            );

        if (participants.length === 0) {
            grid.innerHTML = `
                <div class="participant-empty">

                    <i class="bi bi-people"></i>

                    <h3>
                        ${normalizedSearch
                            ? "No se han encontrado participantes"
                            : "Todavía no tienes participantes"}
                    </h3>

                    <p>
                        ${normalizedSearch
                            ? "Prueba con otro término de búsqueda."
                            : "Añade a tus amigos para empezar a organizar planes juntos."}
                    </p>

                </div>
            `;

            return;
        }

        grid.innerHTML = participants.map(person => {
            const assignments = getParticipantAssignments(person.id);
            const stats = getAssignmentStats(assignments);
            const safePhoto = getSafePhoto(person.photo);

            const avatar = safePhoto
                ? `
                    <img
                        src="${escapeHTML(safePhoto)}"
                        alt="${escapeHTML(person.name)}"
                    >
                `
                : escapeHTML(getInitials(person.name));

            return `
                <article class="participant-card">

                    <div class="participant-card-top">

                        <div class="participant-avatar">
                            ${avatar}
                        </div>

                        <div>
                            <h3>${escapeHTML(person.name)}</h3>

                            <small>
                                ${person.phone
                                    ? escapeHTML(person.phone)
                                    : "Sin teléfono"}
                            </small>
                        </div>

                    </div>

                    <p class="participant-description">
                        ${escapeHTML(
                            person.description || "Sin descripción adicional."
                        )}
                    </p>

                    <div class="participant-assignment-summary">

                        ${stats.confirmed > 0 ? `
                            <span class="participant-status confirmed">
                                <i class="bi bi-check-circle"></i>
                                ${stats.confirmed} confirmados
                            </span>
                        ` : ""}

                        ${stats.pending > 0 ? `
                            <span class="participant-status pending">
                                <i class="bi bi-clock"></i>
                                ${stats.pending} pendientes
                            </span>
                        ` : ""}

                        ${stats.rejected > 0 ? `
                            <span class="participant-status rejected">
                                <i class="bi bi-x-circle"></i>
                                ${stats.rejected} rechazados
                            </span>
                        ` : ""}

                    </div>

                    <div class="participant-card-footer">

                        <span class="participant-plan-count">
                            <i class="bi bi-calendar-event me-1"></i>
                            ${assignments.length}
                            ${assignments.length === 1 ? "plan" : "planes"}
                        </span>

                        <div class="participant-actions">

                            <button
                                type="button"
                                class="participant-icon-btn"
                                data-action="assign"
                                data-id="${escapeHTML(person.id)}"
                                title="Gestionar planes"
                                aria-label="Gestionar planes de ${escapeHTML(person.name)}"
                            >
                                <i class="bi bi-calendar-plus"></i>
                            </button>

                            <button
                                type="button"
                                class="participant-icon-btn"
                                data-action="edit"
                                data-id="${escapeHTML(person.id)}"
                                title="Editar participante"
                                aria-label="Editar ${escapeHTML(person.name)}"
                            >
                                <i class="bi bi-pencil"></i>
                            </button>

                            <button
                                type="button"
                                class="participant-icon-btn"
                                data-action="delete"
                                data-id="${escapeHTML(person.id)}"
                                title="Eliminar participante"
                                aria-label="Eliminar ${escapeHTML(person.name)}"
                            >
                                <i class="bi bi-trash"></i>
                            </button>

                        </div>

                    </div>

                </article>
            `;
        }).join("");
    }

    /* =====================================================
       MODAL DE PARTICIPANTE
    ===================================================== */

    function openParticipantModal(participantId = null) {
        const form = document.getElementById("participantForm");

        if (!form) return;

        form.reset();

        document.getElementById("participantId").value = "";

        document.getElementById("participantModalTitle").textContent =
            participantId ? "Editar participante" : "Nuevo participante";

        clearPhotoPreview();

        if (participantId) {
            const person = getParticipants().find(item =>
                String(item.id) === String(participantId)
            );

            if (!person) return;

            document.getElementById("participantId").value = person.id;
            document.getElementById("participantName").value =
                person.name || "";

            document.getElementById("participantPhone").value =
                person.phone || "";

            document.getElementById("participantDescription").value =
                person.description || "";

            const safePhoto = getSafePhoto(person.photo);

            if (safePhoto) {
                showPhotoPreview(safePhoto);
            }
        }

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("participantModal")
        ).show();
    }

    function clearPhotoPreview() {
        const preview = document.getElementById(
            "participantPhotoPreview"
        );

        const removeButton = document.getElementById(
            "removeParticipantPhoto"
        );

        if (preview) {
            preview.src = "";
            preview.style.display = "none";
        }

        if (removeButton) {
            removeButton.classList.add("d-none");
        }
    }

    function showPhotoPreview(source) {
        const preview = document.getElementById(
            "participantPhotoPreview"
        );

        const removeButton = document.getElementById(
            "removeParticipantPhoto"
        );

        if (!preview || !removeButton) return;

        preview.src = source;
        preview.style.display = "block";
        removeButton.classList.remove("d-none");
    }

    async function readPhoto(file) {
        if (!file) return null;

        if (!file.type.startsWith("image/")) {
            throw new Error("El archivo seleccionado no es una imagen.");
        }

        if (file.size > 2 * 1024 * 1024) {
            throw new Error(
                "La fotografía no puede superar los 2 MB."
            );
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);

            reader.onerror = () => reject(
                new Error("No se ha podido leer la fotografía.")
            );

            reader.readAsDataURL(file);
        });
    }

    async function saveParticipant(event) {
        event.preventDefault();

        const id = document.getElementById("participantId").value;

        const name = document.getElementById("participantName")
            .value.trim();

        const phone = document.getElementById("participantPhone")
            .value.trim();

        const description = document.getElementById(
            "participantDescription"
        ).value.trim();

        const photoInput = document.getElementById("participantPhoto");

        if (!name) {
            showToast("Introduce el nombre del participante.", "danger");
            return;
        }

        const data = getData();

        const existing = id
            ? data.participants.find(person =>
                String(person.id) === String(id)
            )
            : null;

        const normalizedName = normalizeText(name);

        const duplicate = data.participants.find(person =>
            String(person.id) !== String(id) &&
            normalizeText(person.name) === normalizedName
        );

        if (duplicate) {
            showToast(
                "Ya existe un participante con ese nombre.",
                "danger"
            );
            return;
        }

        let photo = existing?.photo || null;

        try {
            if (photoInput.files[0]) {
                photo = await readPhoto(photoInput.files[0]);
            }
        } catch (error) {
            showToast(error.message, "danger");
            return;
        }

        const preview = document.getElementById(
            "participantPhotoPreview"
        );

        // Si se ha quitado la fotografía, se elimina también del registro.
        if (
            preview?.style.display === "none" &&
            !photoInput.files[0]
        ) {
            photo = null;
        }

        const participant = {
            id: id || createId(),
            name,
            phone,
            description,
            photo,
            updatedAt: new Date().toISOString()
        };

        if (existing) {
            const index = data.participants.findIndex(person =>
                String(person.id) === String(id)
            );

            data.participants[index] = {
                ...existing,
                ...participant
            };
        } else {
            participant.createdAt = new Date().toISOString();
            data.participants.push(participant);
        }

        try {
            saveData(data, {
                action: existing
                    ? "participant_updated"
                    : "participant_created",
                participantId: participant.id
            });
        } catch (error) {
            console.error("PLANEA: error al guardar participante.", error);
            showToast(
                "No se ha podido guardar el participante. Comprueba el espacio disponible.",
                "danger"
            );
            return;
        }

        bootstrap.Modal.getInstance(
            document.getElementById("participantModal")
        )?.hide();

        renderLayout();

        showToast(
            existing
                ? "Participante actualizado correctamente."
                : "Participante añadido correctamente."
        );
    }

    /* =====================================================
       ELIMINAR PARTICIPANTE
    ===================================================== */

    function deleteParticipant(participantId) {
        const person = getParticipants().find(item =>
            String(item.id) === String(participantId)
        );

        if (!person) return;

        const confirmed = window.confirm(
            `¿Quieres eliminar a ${person.name} de PLANEA? También se eliminarán sus asignaciones a planes.`
        );

        if (!confirmed) return;

        const data = getData();

        data.participants = data.participants.filter(item =>
            String(item.id) !== String(participantId)
        );

        Object.keys(data.planParticipants).forEach(planId => {
            const assignments = data.planParticipants[planId];

            if (!Array.isArray(assignments)) {
                delete data.planParticipants[planId];
                return;
            }

            data.planParticipants[planId] = assignments.filter(item =>
                String(item.participantId) !== String(participantId)
            );

            if (data.planParticipants[planId].length === 0) {
                delete data.planParticipants[planId];
            }
        });

        saveData(data, {
            action: "participant_deleted",
            participantId
        });

        renderLayout();

        showToast("Participante eliminado correctamente.");
    }

    /* =====================================================
       ASIGNACIÓN DE PLANES
    ===================================================== */

    function openAssignments(participantId) {
        selectedParticipantId = participantId;

        const person = getParticipants().find(item =>
            String(item.id) === String(participantId)
        );

        if (!person) return;

        renderAssignmentsContent(person);

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("participantPlansModal")
        ).show();
    }

    function renderAssignmentsContent(person) {
        const plans = getPlans();

        const content = document.getElementById(
            "participantPlansContent"
        );

        if (!content) return;

        if (plans.length === 0) {
            content.innerHTML = `
                <div class="participant-empty">
                    <i class="bi bi-calendar-x"></i>
                    <h3>No hay planes disponibles</h3>
                    <p>
                        Crea primero un plan en el apartado Mis planes.
                    </p>
                </div>
            `;

            return;
        }

        const data = getData();

        const sortedPlans = [...plans].sort((a, b) =>
            String(a.date || "").localeCompare(String(b.date || ""))
        );

        content.innerHTML = `
            <p class="text-secondary small mb-3">
                Gestionando los planes de
                <strong>${escapeHTML(person.name)}</strong>.
            </p>

            ${sortedPlans.map(plan => {
                const planId = String(plan.id);

                const assignments = data.planParticipants[planId] || [];

                const assignment = assignments.find(item =>
                    String(item.participantId) === String(selectedParticipantId)
                );

                const isCancelled = normalizeText(plan.status) === "cancelado";

                return `
                    <div class="participant-assignment-row">

                        <div>
                            <strong>
                                ${escapeHTML(plan.name || "Plan sin nombre")}
                            </strong>

                            <small>
                                ${escapeHTML(plan.date || "Sin fecha")}
                            </small>

                            ${isCancelled ? `
                                <span class="participant-plan-cancelled">
                                    Plan cancelado
                                </span>
                            ` : ""}
                        </div>

                        <select
                            class="form-select form-select-sm"
                            data-assignment-plan="${escapeHTML(planId)}"
                            aria-label="Estado de participación en ${escapeHTML(plan.name || "el plan")}"
                        >
                            <option
                                value="No asignado"
                                ${!assignment ? "selected" : ""}
                            >
                                No asignado
                            </option>

                            <option
                                value="Pendiente"
                                ${assignment?.status === "Pendiente" ? "selected" : ""}
                            >
                                Pendiente
                            </option>

                            <option
                                value="Confirmado"
                                ${assignment?.status === "Confirmado" ? "selected" : ""}
                            >
                                Confirmado
                            </option>

                            <option
                                value="Rechazado"
                                ${assignment?.status === "Rechazado" ? "selected" : ""}
                            >
                                Rechazado
                            </option>

                        </select>

                    </div>
                `;
            }).join("")}
        `;
    }

    function updateAssignment(planId, status) {
        if (!selectedParticipantId) return;

        const data = getData();
        const key = String(planId);

        if (!Array.isArray(data.planParticipants[key])) {
            data.planParticipants[key] = [];
        }

        const assignments = data.planParticipants[key];

        const index = assignments.findIndex(item =>
            String(item.participantId) === String(selectedParticipantId)
        );

        if (status === "No asignado") {
            if (index !== -1) {
                assignments.splice(index, 1);
            }
        } else if (index === -1) {
            assignments.push({
                participantId: selectedParticipantId,
                status,
                updatedAt: new Date().toISOString()
            });
        } else {
            assignments[index] = {
                ...assignments[index],
                status,
                updatedAt: new Date().toISOString()
            };
        }

        if (assignments.length === 0) {
            delete data.planParticipants[key];
        }

        saveData(data, {
            action: "participant_assignment_updated",
            participantId: selectedParticipantId,
            planId: key
        });

        updateSummary();

        renderParticipants(
            document.getElementById("participantsSearch")?.value || ""
        );

        showToast(
            status === "No asignado"
                ? "Participación eliminada."
                : "Participación actualizada."
        );
    }

    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {
        if (eventsBound) return;

        const addButton = document.getElementById(
            "addParticipantButton"
        );

        const form = document.getElementById("participantForm");

        const search = document.getElementById("participantsSearch");

        const grid = document.getElementById("participantsGrid");

        const photoInput = document.getElementById("participantPhoto");

        const removePhotoButton = document.getElementById(
            "removeParticipantPhoto"
        );

        const assignmentsContent = document.getElementById(
            "participantPlansContent"
        );

        addButton?.addEventListener("click", () => {
            openParticipantModal();
        });

        form?.addEventListener("submit", saveParticipant);

        search?.addEventListener("input", event => {
            renderParticipants(event.target.value);
        });

        grid?.addEventListener("click", event => {
            const button = event.target.closest("[data-action]");

            if (!button) return;

            const id = button.dataset.id;
            const action = button.dataset.action;

            if (action === "edit") {
                openParticipantModal(id);
            }

            if (action === "delete") {
                deleteParticipant(id);
            }

            if (action === "assign") {
                openAssignments(id);
            }
        });

        photoInput?.addEventListener("change", async event => {
            const file = event.target.files[0];

            if (!file) return;

            try {
                const photo = await readPhoto(file);
                showPhotoPreview(photo);
            } catch (error) {
                event.target.value = "";
                showToast(error.message, "danger");
            }
        });

        removePhotoButton?.addEventListener("click", () => {
            photoInput.value = "";
            clearPhotoPreview();
        });

        assignmentsContent?.addEventListener("change", event => {
            const select = event.target.closest(
                "[data-assignment-plan]"
            );

            if (!select) return;

            updateAssignment(
                select.dataset.assignmentPlan,
                select.value
            );
        });

        eventsBound = true;
    }

    /* =====================================================
       RENDER E INICIALIZACIÓN
    ===================================================== */

    function render() {
        const page = document.querySelector(
            '[data-page="participants"]'
        );

        if (!page) return;

        if (page.classList.contains("d-none")) return;

        renderLayout();
    }

    function init() {
        if (initialized) return;

        if (!STORAGE()) {
            throw new Error(
                "PLANEA_STORAGE no está disponible para Participantes."
            );
        }

        initialized = true;

        createPage();
        createNavigationLink();
        injectStyles();
        renderLayout();

        document.addEventListener("planea:viewChanged", event => {
            if (event.detail?.view === "participants") {
                renderLayout();
            }
        });

        document.addEventListener("planea:dataChanged", event => {
            if (event.detail?.source !== "participants") {
                render();
            }
        });

        console.log(
            "PLANEA: módulo Participantes inicializado correctamente."
        );
    }

    /* =====================================================
       API GLOBAL
    ===================================================== */

    window.PLANEA_PARTICIPANTS = {
        init,
        render,
        getParticipants,
        getParticipantAssignments,
        openParticipantModal,
        openAssignments
    };

})();
