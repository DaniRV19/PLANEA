
/* =========================================================
   PLANEA - PARTICIPANTES
   Gestión de personas y vinculación con los planes.
========================================================= */

(() => {
    "use strict";

    let initialized = false;
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
            typeof data.planParticipants !== "object"
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

    function getPlanAssignments(planId) {
        const data = getData();

        return data.planParticipants[String(planId)] || [];
    }

    function getParticipantAssignments(participantId) {
        const data = getData();
        const result = [];

        Object.entries(data.planParticipants).forEach(
            ([planId, assignments]) => {

                const assignment = assignments.find(item =>
                    item.participantId === participantId
                );

                if (!assignment) return;

                const plan = getPlans().find(item =>
                    String(item.id) === String(planId)
                );

                if (plan) {
                    result.push({
                        plan,
                        status: assignment.status || "Pendiente"
                    });
                }
            }
        );

        return result;
    }

    function getInitials(name) {
        return String(name || "?")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join("");
    }

    function showToast(message, type = "success") {
        if (window.PLANEA_APP?.showToast) {
            window.PLANEA_APP.showToast(message, type);
        } else {
            console.log(`[PLANEA] ${message}`);
        }
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

        page.innerHTML = `
            <div id="participantsModuleContainer"></div>
        `;

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

        // La navegación se gestiona desde este módulo.
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
                margin-bottom: 16px;
                overflow-wrap: anywhere;
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
            }

            .participant-assignment-row small {
                color: #94a3b8;
            }

            .participant-assignment-row select {
                max-width: 145px;
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

        const participants = getParticipants();
        const plans = getPlans();

        const totalAssignments = Object.values(
            getData().planParticipants
        ).reduce((total, list) => total + list.length, 0);

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
                    <strong>${participants.length}</strong>
                </div>

                <div class="participant-stat">
                    <span>Planes disponibles</span>
                    <strong>${plans.length}</strong>
                </div>

                <div class="participant-stat">
                    <span>Participaciones asignadas</span>
                    <strong>${totalAssignments}</strong>
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

        renderParticipants();
        bindEvents();
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

        const normalizedSearch = search.trim().toLowerCase();

        const participants = getParticipants()
            .filter(person => {
                return (
                    String(person.name || "")
                        .toLowerCase()
                        .includes(normalizedSearch) ||
                    String(person.phone || "")
                        .toLowerCase()
                        .includes(normalizedSearch)
                );
            })
            .sort((a, b) =>
                a.name.localeCompare(b.name, "es")
            );

        if (participants.length === 0) {
            grid.innerHTML = `
                <div class="participant-empty">

                    <i class="bi bi-people"></i>

                    <h3>
                        ${search
                            ? "No se han encontrado participantes"
                            : "Todavía no tienes participantes"}
                    </h3>

                    <p>
                        ${search
                            ? "Prueba con otro término de búsqueda."
                            : "Añade a tus amigos para empezar a organizar planes juntos."}
                    </p>

                </div>
            `;

            return;
        }

        grid.innerHTML = participants.map(person => {
            const assignments = getParticipantAssignments(person.id);

            const avatar = person.photo
                ? `
                    <img
                        src="${escapeHTML(person.photo)}"
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
                            >
                                <i class="bi bi-calendar-plus"></i>
                            </button>

                            <button
                                type="button"
                                class="participant-icon-btn"
                                data-action="edit"
                                data-id="${escapeHTML(person.id)}"
                                title="Editar participante"
                            >
                                <i class="bi bi-pencil"></i>
                            </button>

                            <button
                                type="button"
                                class="participant-icon-btn"
                                data-action="delete"
                                data-id="${escapeHTML(person.id)}"
                                title="Eliminar participante"
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
                item.id === participantId
            );

            if (!person) return;

            document.getElementById("participantId").value = person.id;
            document.getElementById("participantName").value = person.name || "";
            document.getElementById("participantPhone").value = person.phone || "";
            document.getElementById("participantDescription").value =
                person.description || "";

            if (person.photo) {
                showPhotoPreview(person.photo);
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

        preview.src = source;
        preview.style.display = "block";
        removeButton.classList.remove("d-none");
    }

    async function readPhoto(file) {
        if (!file) return null;

        if (!file.type.startsWith("image/")) {
            throw new Error("El archivo seleccionado no es una imagen.");
        }

        // Evitar fotografías excesivamente grandes en localStorage.
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
            ? data.participants.find(person => person.id === id)
            : null;

        const duplicate = data.participants.find(person =>
            person.id !== id &&
            person.name.trim().toLowerCase() === name.toLowerCase()
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

        if (
            document.getElementById("participantPhotoPreview").style.display
            === "none" &&
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
            const index = data.participants.findIndex(
                person => person.id === id
            );

            data.participants[index] = {
                ...existing,
                ...participant
            };
        } else {
            participant.createdAt = new Date().toISOString();
            data.participants.push(participant);
        }

        saveData(data, {
            action: existing ? "participant_updated" : "participant_created",
            participantId: participant.id
        });

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
            item.id === participantId
        );

        if (!person) return;

        const confirmed = window.confirm(
            `¿Quieres eliminar a ${person.name} de PLANEA? También se eliminarán sus asignaciones a planes.`
        );

        if (!confirmed) return;

        const data = getData();

        data.participants = data.participants.filter(item =>
            item.id !== participantId
        );

        Object.keys(data.planParticipants).forEach(planId => {
            data.planParticipants[planId] =
                data.planParticipants[planId].filter(item =>
                    item.participantId !== participantId
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
            item.id === participantId
        );

        if (!person) return;

        const plans = getPlans();
        const content = document.getElementById(
            "participantPlansContent"
        );

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
        } else {
            const data = getData();

            content.innerHTML = `
                <p class="text-secondary small mb-3">
                    Gestionando los planes de
                    <strong>${escapeHTML(person.name)}</strong>.
                </p>

                ${plans.map(plan => {
                    const planId = String(plan.id);

                    const assignment = (
                        data.planParticipants[planId] || []
                    ).find(item =>
                        item.participantId === participantId
                    );

                    return `
                        <div class="participant-assignment-row">

                            <div>
                                <strong>
                                    ${escapeHTML(plan.name || "Plan sin nombre")}
                                </strong>

                                <small>
                                    ${escapeHTML(plan.date || "Sin fecha")}
                                </small>
                            </div>

                            <select
                                class="form-select form-select-sm"
                                data-assignment-plan="${escapeHTML(planId)}"
                                aria-label="Estado de participación"
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

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("participantPlansModal")
        ).show();
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
            item.participantId === selectedParticipantId
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

        renderParticipants(
            document.getElementById("participantsSearch")?.value || ""
        );
    }

    /* =====================================================
       EVENTOS
    ===================================================== */

    function bindEvents() {
        document.getElementById("addParticipantButton")
            ?.addEventListener("click", () => openParticipantModal());

        document.getElementById("participantForm")
            ?.addEventListener("submit", saveParticipant);

        document.getElementById("participantsSearch")
            ?.addEventListener("input", event => {
                renderParticipants(event.target.value);
            });

        document.getElementById("participantsGrid")
            ?.addEventListener("click", event => {

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

        document.getElementById("participantPhoto")
            ?.addEventListener("change", async event => {

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

        document.getElementById("removeParticipantPhoto")
            ?.addEventListener("click", () => {

                document.getElementById("participantPhoto").value = "";
                clearPhotoPreview();

            });

        document.getElementById("participantPlansContent")
            ?.addEventListener("change", event => {

                const select = event.target.closest(
                    "[data-assignment-plan]"
                );

                if (!select) return;

                updateAssignment(
                    select.dataset.assignmentPlan,
                    select.value
                );
            });
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
