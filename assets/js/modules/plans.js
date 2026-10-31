
/* =========================================================
   PLANEA - MÓDULO MIS PLANES
   Gestión de planes, categorías, estados e imágenes.
========================================================= */

(() => {
    "use strict";

    const STORAGE = window.PLANEA_STORAGE;
    const IMAGES = window.PLANEA_IMAGES;

    const MODULE = {
        container: null,
        modal: null,
        modalInstance: null,

        editingId: null,
        selectedImage: null,
        removeExistingImage: false,
        previewObjectURL: null,

        currentFilters: {
            search: "",
            category: "all",
            status: "all"
        },

        categories: [
            "Gastronomía",
            "Ocio",
            "Viajes",
            "Deporte",
            "Cultura",
            "Naturaleza",
            "Otros"
        ],

        statuses: [
            "Pendiente",
            "Confirmado",
            "Realizado",
            "Cancelado"
        ],

        categoryIcons: {
            "Gastronomía": "bi-cup-hot",
            "Ocio": "bi-controller",
            "Viajes": "bi-airplane",
            "Deporte": "bi-dribbble",
            "Cultura": "bi-palette",
            "Naturaleza": "bi-tree",
            "Otros": "bi-stars"
        },

        statusClasses: {
            "Pendiente": "warning",
            "Confirmado": "success",
            "Realizado": "primary",
            "Cancelado": "secondary"
        },

        /* =====================================================
           INICIALIZACIÓN
        ===================================================== */

        async init() {
            if (!STORAGE || !IMAGES) {
                console.error(
                    "PLANEA: faltan dependencias del módulo Mis planes."
                );
                return;
            }

            this.container = document.getElementById(
                "plansModuleContainer"
            );

            if (!this.container) {
                console.error(
                    "PLANEA: no se encuentra plansModuleContainer."
                );
                return;
            }

            this.renderLayout();
            this.createModal();
            this.bindEvents();

            await this.renderPlans();

            console.log(
                "PLANEA: módulo Mis planes inicializado correctamente."
            );
        },

        /* =====================================================
           ESTRUCTURA PRINCIPAL
        ===================================================== */

        renderLayout() {
            this.container.innerHTML = `
                <div class="plans-module">

                    <div class="d-flex flex-column flex-lg-row
                                justify-content-between align-items-lg-center
                                gap-3 mb-4">

                        <div>
                            <h2 class="fw-bold mb-1">Mis planes</h2>

                            <p class="text-secondary mb-0">
                                Organiza tus próximas experiencias.
                            </p>
                        </div>

                        <button class="btn btn-success"
                                id="createPlanButton">

                            <i class="bi bi-plus-lg me-2"></i>
                            Crear nuevo plan

                        </button>

                    </div>

                    <!-- ESTADÍSTICAS -->

                    <div class="row g-3 mb-4">

                        <div class="col-6 col-xl-3">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body">

                                    <span class="text-secondary small">
                                        Total de planes
                                    </span>

                                    <h3 class="fw-bold mt-2 mb-0"
                                        id="plansTotalCount">0</h3>

                                </div>
                            </div>
                        </div>

                        <div class="col-6 col-xl-3">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body">

                                    <span class="text-secondary small">
                                        Pendientes
                                    </span>

                                    <h3 class="fw-bold mt-2 mb-0"
                                        id="plansPendingCount">0</h3>

                                </div>
                            </div>
                        </div>

                        <div class="col-6 col-xl-3">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body">

                                    <span class="text-secondary small">
                                        Confirmados
                                    </span>

                                    <h3 class="fw-bold mt-2 mb-0"
                                        id="plansConfirmedCount">0</h3>

                                </div>
                            </div>
                        </div>

                        <div class="col-6 col-xl-3">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body">

                                    <span class="text-secondary small">
                                        Realizados
                                    </span>

                                    <h3 class="fw-bold mt-2 mb-0"
                                        id="plansCompletedCount">0</h3>

                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- FILTROS -->

                    <div class="card border-0 shadow-sm mb-4">
                        <div class="card-body">

                            <div class="row g-3">

                                <div class="col-12 col-lg-5">

                                    <div class="input-group">

                                        <span class="input-group-text">
                                            <i class="bi bi-search"></i>
                                        </span>

                                        <input type="search"
                                               class="form-control"
                                               id="plansSearch"
                                               placeholder="Buscar planes...">

                                    </div>

                                </div>

                                <div class="col-6 col-lg-3">

                                    <select class="form-select"
                                            id="plansCategoryFilter">

                                        <option value="all">
                                            Todas las categorías
                                        </option>

                                        ${this.categories.map(category => `
                                            <option value="${this.escapeHTML(category)}">
                                                ${this.escapeHTML(category)}
                                            </option>
                                        `).join("")}

                                    </select>

                                </div>

                                <div class="col-6 col-lg-3">

                                    <select class="form-select"
                                            id="plansStatusFilter">

                                        <option value="all">
                                            Todos los estados
                                        </option>

                                        ${this.statuses.map(status => `
                                            <option value="${status}">
                                                ${status}
                                            </option>
                                        `).join("")}

                                    </select>

                                </div>

                                <div class="col-12 col-lg-1">

                                    <button class="btn btn-outline-secondary w-100"
                                            id="clearPlansFilters"
                                            title="Limpiar filtros">

                                        <i class="bi bi-arrow-counterclockwise"></i>

                                    </button>

                                </div>

                            </div>

                        </div>
                    </div>

                    <!-- LISTADO -->

                    <div class="d-flex justify-content-between
                                align-items-center mb-3">

                        <h5 class="fw-semibold mb-0">
                            Tus experiencias
                        </h5>

                        <span class="text-secondary small"
                              id="plansResultsCount">
                            0 planes
                        </span>

                    </div>

                    <div class="row g-4" id="plansGrid"></div>

                </div>
            `;
        },

        /* =====================================================
           MODAL
           Se coloca directamente en BODY para evitar
           problemas de superposición con el fondo oscuro.
        ===================================================== */

        getModalHTML() {
            return `
                <div class="modal fade"
                     id="planModal"
                     tabindex="-1"
                     aria-labelledby="planModalTitle"
                     aria-hidden="true">

                    <div class="modal-dialog modal-lg modal-dialog-centered
                                modal-dialog-scrollable">

                        <div class="modal-content">

                            <div class="modal-header">

                                <div>
                                    <h5 class="modal-title fw-bold"
                                        id="planModalTitle">
                                        Crear nuevo plan
                                    </h5>

                                    <p class="text-secondary small mb-0">
                                        Completa la información de tu experiencia.
                                    </p>
                                </div>

                                <button type="button"
                                        class="btn-close"
                                        data-bs-dismiss="modal"
                                        aria-label="Cerrar">
                                </button>

                            </div>

                            <form id="planForm">

                                <div class="modal-body">

                                    <div class="row g-3">

                                        <div class="col-12">

                                            <label class="form-label">
                                                Nombre del plan *
                                            </label>

                                            <input type="text"
                                                   class="form-control"
                                                   id="planName"
                                                   maxlength="100"
                                                   placeholder="Ej. Cena con amigos"
                                                   required>

                                        </div>

                                        <div class="col-md-6">

                                            <label class="form-label">
                                                Categoría *
                                            </label>

                                            <select class="form-select"
                                                    id="planCategory"
                                                    required>

                                                <option value="">
                                                    Selecciona una categoría
                                                </option>

                                                ${this.categories.map(category => `
                                                    <option value="${this.escapeHTML(category)}">
                                                        ${this.escapeHTML(category)}
                                                    </option>
                                                `).join("")}

                                            </select>

                                        </div>

                                        <div class="col-md-6">

                                            <label class="form-label">
                                                Estado
                                            </label>

                                            <select class="form-select"
                                                    id="planStatus">

                                                ${this.statuses.map(status => `
                                                    <option value="${status}">
                                                        ${status}
                                                    </option>
                                                `).join("")}

                                            </select>

                                        </div>

                                        <div class="col-md-6">

                                            <label class="form-label">
                                                Fecha
                                            </label>

                                            <input type="date"
                                                   class="form-control"
                                                   id="planDate">

                                        </div>

                                        <div class="col-md-6">

                                            <label class="form-label">
                                                Hora
                                            </label>

                                            <input type="time"
                                                   class="form-control"
                                                   id="planTime">

                                        </div>

                                        <div class="col-md-6">

                                            <label class="form-label">
                                                Ubicación
                                            </label>

                                            <input type="text"
                                                   class="form-control"
                                                   id="planLocation"
                                                   maxlength="150"
                                                   placeholder="¿Dónde tendrá lugar?">

                                        </div>

                                        <div class="col-md-6">

                                            <label class="form-label">
                                                Enlace de ubicación
                                            </label>

                                            <input type="url"
                                                   class="form-control"
                                                   id="planMapsUrl"
                                                   placeholder="https://maps.google.com/...">

                                        </div>

                                        <div class="col-md-6">

                                            <label class="form-label">
                                                Presupuesto estimado (€)
                                            </label>

                                            <input type="number"
                                                   class="form-control"
                                                   id="planBudget"
                                                   min="0"
                                                   step="0.01"
                                                   placeholder="0,00">

                                        </div>

                                        <div class="col-md-6">

                                            <label class="form-label">
                                                Duración aproximada
                                            </label>

                                            <input type="text"
                                                   class="form-control"
                                                   id="planDuration"
                                                   maxlength="60"
                                                   placeholder="Ej. 2 horas">

                                        </div>

                                        <div class="col-12">

                                            <label class="form-label">
                                                Participantes
                                            </label>

                                            <textarea class="form-control"
                                                      id="planParticipants"
                                                      rows="2"
                                                      placeholder="Escribe los nombres separados por comas..."></textarea>

                                            <div class="form-text">
                                                Separa los participantes mediante comas.
                                            </div>

                                        </div>

                                        <div class="col-12">

                                            <label class="form-label">
                                                Descripción
                                            </label>

                                            <textarea class="form-control"
                                                      id="planDescription"
                                                      rows="3"
                                                      maxlength="1000"
                                                      placeholder="Cuéntanos un poco más sobre el plan..."></textarea>

                                        </div>

                                        <div class="col-12">

                                            <label class="form-label">
                                                Notas adicionales
                                            </label>

                                            <textarea class="form-control"
                                                      id="planNotes"
                                                      rows="2"
                                                      placeholder="Detalles que quieras recordar..."></textarea>

                                        </div>

                                        <div class="col-12">

                                            <label class="form-label">
                                                Imagen de portada
                                            </label>

                                            <input type="file"
                                                   class="form-control"
                                                   id="planImage"
                                                   accept="image/png,image/jpeg,image/webp,image/gif">

                                            <div class="form-text">
                                                Formatos JPG, PNG, WEBP o GIF.
                                                Tamaño máximo: 8 MB.
                                            </div>

                                            <div id="planImagePreview"
                                                 class="mt-3">
                                            </div>

                                        </div>

                                    </div>

                                </div>

                                <div class="modal-footer">

                                    <button type="button"
                                            class="btn btn-outline-secondary"
                                            data-bs-dismiss="modal">
                                        Cancelar
                                    </button>

                                    <button type="submit"
                                            class="btn btn-success"
                                            id="savePlanButton">

                                        <i class="bi bi-check-lg me-2"></i>
                                        Guardar plan

                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>

                </div>
            `;
        },

        createModal() {
            // Eliminar una posible instancia anterior
            const previousModal = document.getElementById("planModal");

            if (previousModal) {
                const previousInstance =
                    window.bootstrap?.Modal?.getInstance(previousModal);

                previousInstance?.dispose();
                previousModal.remove();
            }

            // Crear el modal fuera de cualquier contenedor de la aplicación
            document.body.insertAdjacentHTML(
                "beforeend",
                this.getModalHTML()
            );

            this.modal = document.getElementById("planModal");

            if (window.bootstrap?.Modal) {
                this.modalInstance =
                    window.bootstrap.Modal.getOrCreateInstance(this.modal);
            }
        },

        /* =====================================================
           EVENTOS
        ===================================================== */

        bindEvents() {

            // Eventos de la interfaz principal
            this.container.addEventListener("click", async event => {

                const createButton =
                    event.target.closest("#createPlanButton");

                if (createButton) {
                    this.openCreateModal();
                    return;
                }

                const editButton =
                    event.target.closest("[data-edit-plan]");

                if (editButton) {
                    await this.openEditModal(
                        editButton.dataset.editPlan
                    );
                    return;
                }

                const deleteButton =
                    event.target.closest("[data-delete-plan]");

                if (deleteButton) {
                    await this.deletePlan(
                        deleteButton.dataset.deletePlan
                    );
                    return;
                }

                const clearButton =
                    event.target.closest("#clearPlansFilters");

                if (clearButton) {
                    this.clearFilters();
                }

            });

            // Buscador
            this.container.addEventListener("input", event => {

                if (event.target.id === "plansSearch") {
                    this.currentFilters.search =
                        event.target.value.trim();

                    this.renderPlans();
                }

            });

            // Selectores de filtros
            this.container.addEventListener("change", event => {

                if (event.target.id === "plansCategoryFilter") {
                    this.currentFilters.category =
                        event.target.value;

                    this.renderPlans();
                }

                if (event.target.id === "plansStatusFilter") {
                    this.currentFilters.status =
                        event.target.value;

                    this.renderPlans();
                }

            });

            // Eventos del modal: se escuchan en el propio modal,
            // ya que ahora está fuera de plansModuleContainer.

            this.modal.addEventListener("submit", async event => {

                if (event.target.id === "planForm") {
                    event.preventDefault();
                    await this.savePlan();
                }

            });

            this.modal.addEventListener("change", event => {

                if (event.target.id === "planImage") {
                    this.handleImageSelection(
                        event.target.files[0]
                    );
                }

            });

            this.modal.addEventListener("click", event => {

                if (event.target.closest("#removePlanImage")) {
                    this.removeSelectedImage();
                }

            });

            // Al cerrar el modal, limpiar su estado temporal
            this.modal.addEventListener("hidden.bs.modal", () => {
                this.selectedImage = null;
                this.revokePreviewURL();
            });

            // Actualizar al entrar en Mis planes
            document.addEventListener("planea:viewChanged", event => {

                if (event.detail?.view === "plans") {
                    this.renderPlans();
                }

            });

            // Actualizar cuando cambien los datos
            document.addEventListener("planea:dataChanged", () => {
                this.renderPlans();
            });

        },

        /* =====================================================
           OBTENER Y FILTRAR PLANES
        ===================================================== */

        getPlans() {
            return STORAGE.getPlans() || [];
        },

        getFilteredPlans() {

            let plans = [...this.getPlans()];

            const search =
                this.currentFilters.search.toLowerCase();

            if (search) {
                plans = plans.filter(plan => {

                    const searchableText = [
                        plan.name,
                        plan.category,
                        plan.description,
                        plan.location
                    ].join(" ").toLowerCase();

                    return searchableText.includes(search);
                });
            }

            if (this.currentFilters.category !== "all") {
                plans = plans.filter(plan =>
                    plan.category === this.currentFilters.category
                );
            }

            if (this.currentFilters.status !== "all") {
                plans = plans.filter(plan =>
                    plan.status === this.currentFilters.status
                );
            }

            return plans.sort((a, b) => {

                const dateA = a.date || "9999-99-99";
                const dateB = b.date || "9999-99-99";

                return dateA.localeCompare(dateB);

            });

        },

        /* =====================================================
           RENDERIZADO
        ===================================================== */

        async renderPlans() {

            if (!this.container) return;

            const plans = this.getPlans();
            const filteredPlans = this.getFilteredPlans();

            this.updateStatistics(plans);

            const grid =
                this.container.querySelector("#plansGrid");

            const results =
                this.container.querySelector("#plansResultsCount");

            if (!grid) return;

            results.textContent =
                `${filteredPlans.length} ${filteredPlans.length === 1 ? "plan" : "planes"}`;

            if (filteredPlans.length === 0) {

                const hasFilters =
                    this.currentFilters.search ||
                    this.currentFilters.category !== "all" ||
                    this.currentFilters.status !== "all";

                grid.innerHTML = `
                    <div class="col-12">

                        <div class="text-center py-5">

                            <div class="mb-3">
                                <i class="bi ${hasFilters
                                    ? "bi-search"
                                    : "bi-calendar-heart"}"
                                   style="font-size:3rem;
                                          color:var(--primary,#16A36A);">
                                </i>
                            </div>

                            <h5 class="fw-semibold">
                                ${hasFilters
                                    ? "No se han encontrado planes"
                                    : "Todavía no tienes planes"}
                            </h5>

                            <p class="text-secondary mb-0">
                                ${hasFilters
                                    ? "Prueba a modificar los filtros de búsqueda."
                                    : "Utiliza el botón «Crear nuevo plan» para añadir tu primera experiencia."}
                            </p>

                        </div>

                    </div>
                `;

                return;
            }

            const cards = await Promise.all(
                filteredPlans.map(plan =>
                    this.createPlanCard(plan)
                )
            );

            grid.innerHTML = cards.join("");

        },

        updateStatistics(plans) {

            const counts = {
                total: plans.length,

                pending: plans.filter(
                    plan => plan.status === "Pendiente"
                ).length,

                confirmed: plans.filter(
                    plan => plan.status === "Confirmado"
                ).length,

                completed: plans.filter(
                    plan => plan.status === "Realizado"
                ).length
            };

            this.setText("plansTotalCount", counts.total);
            this.setText("plansPendingCount", counts.pending);
            this.setText("plansConfirmedCount", counts.confirmed);
            this.setText("plansCompletedCount", counts.completed);

        },

        async createPlanCard(plan) {

            let imageHTML = `
                <div class="d-flex align-items-center justify-content-center
                            bg-body-secondary"
                     style="height:190px;">

                    <i class="bi ${this.categoryIcons[plan.category] || "bi-stars"}"
                       style="font-size:3rem;opacity:.35;">
                    </i>

                </div>
            `;

            if (plan.imageId) {

                try {
                    const imageURL =
                        await IMAGES.getImageURL(plan.imageId);

                    if (imageURL) {
                        imageHTML = `
                            <img src="${imageURL}"
                                 class="w-100"
                                 alt="${this.escapeHTML(plan.name)}"
                                 style="height:190px;object-fit:cover;">
                        `;
                    }

                } catch (error) {
                    console.warn(
                        "No se pudo cargar la imagen del plan.",
                        error
                    );
                }

            }

            const statusClass =
                this.statusClasses[plan.status] || "secondary";

            return `
                <div class="col-12 col-md-6 col-xl-4">

                    <article class="card h-100 border-0 shadow-sm overflow-hidden">

                        <div class="position-relative">

                            ${imageHTML}

                            <span class="badge bg-${statusClass}
                                         position-absolute top-0 end-0 m-3">

                                ${this.escapeHTML(
                                    plan.status || "Pendiente"
                                )}

                            </span>

                        </div>

                        <div class="card-body d-flex flex-column">

                            <div class="d-flex align-items-center gap-2 mb-2">

                                <i class="bi ${this.categoryIcons[plan.category] || "bi-stars"}
                                          text-success"></i>

                                <span class="small text-secondary">
                                    ${this.escapeHTML(plan.category || "Otros")}
                                </span>

                            </div>

                            <h5 class="fw-bold mb-2">
                                ${this.escapeHTML(plan.name)}
                            </h5>

                            <p class="text-secondary small mb-3">
                                ${this.escapeHTML(
                                    plan.description ||
                                    "Sin descripción adicional."
                                )}
                            </p>

                            <div class="small text-secondary mb-3">

                                ${plan.date ? `
                                    <div class="mb-2">
                                        <i class="bi bi-calendar3 me-2"></i>
                                        ${this.formatDate(plan.date)}
                                    </div>
                                ` : ""}

                                ${plan.time ? `
                                    <div class="mb-2">
                                        <i class="bi bi-clock me-2"></i>
                                        ${this.escapeHTML(plan.time)}
                                    </div>
                                ` : ""}

                                ${plan.location ? `
                                    <div class="mb-2">
                                        <i class="bi bi-geo-alt me-2"></i>
                                        ${this.escapeHTML(plan.location)}
                                    </div>
                                ` : ""}

                                ${Number(plan.estimatedBudget) > 0 ? `
                                    <div class="mb-2">
                                        <i class="bi bi-wallet2 me-2"></i>
                                        ${this.formatCurrency(plan.estimatedBudget)}
                                    </div>
                                ` : ""}

                                ${plan.participants?.length ? `
                                    <div>
                                        <i class="bi bi-people me-2"></i>
                                        ${plan.participants.length}
                                        ${plan.participants.length === 1
                                            ? "participante"
                                            : "participantes"}
                                    </div>
                                ` : ""}

                            </div>

                            <div class="mt-auto pt-3 border-top
                                        d-flex justify-content-between gap-2">

                                <button class="btn btn-sm btn-outline-secondary flex-fill"
                                        data-edit-plan="${this.escapeHTML(plan.id)}">

                                    <i class="bi bi-pencil me-1"></i>
                                    Editar

                                </button>

                                <button class="btn btn-sm btn-outline-danger"
                                        data-delete-plan="${this.escapeHTML(plan.id)}"
                                        aria-label="Eliminar plan">

                                    <i class="bi bi-trash"></i>

                                </button>

                            </div>

                        </div>

                    </article>

                </div>
            `;

        },

        /* =====================================================
           CREAR PLAN
        ===================================================== */

        openCreateModal() {

            this.editingId = null;
            this.selectedImage = null;
            this.removeExistingImage = false;

            this.revokePreviewURL();

            const form =
                document.getElementById("planForm");

            form.reset();

            document.getElementById("planModalTitle").textContent =
                "Crear nuevo plan";

            document.getElementById("savePlanButton").innerHTML =
                '<i class="bi bi-check-lg me-2"></i>Guardar plan';

            this.renderImagePreview(null);

            this.showModal();

        },

        /* =====================================================
           EDITAR PLAN
        ===================================================== */

        async openEditModal(id) {

            const plan = STORAGE.getPlanById(id);

            if (!plan) {
                this.showToast(
                    "No se ha encontrado el plan.",
                    "danger"
                );
                return;
            }

            this.editingId = id;
            this.selectedImage = null;
            this.removeExistingImage = false;

            this.revokePreviewURL();

            document.getElementById("planForm").reset();

            document.getElementById("planModalTitle").textContent =
                "Editar plan";

            document.getElementById("savePlanButton").innerHTML =
                '<i class="bi bi-check-lg me-2"></i>Guardar cambios';

            this.setInputValue("planName", plan.name);
            this.setInputValue("planCategory", plan.category);
            this.setInputValue("planStatus", plan.status);
            this.setInputValue("planDate", plan.date);
            this.setInputValue("planTime", plan.time);
            this.setInputValue("planLocation", plan.location);
            this.setInputValue("planMapsUrl", plan.mapsUrl);
            this.setInputValue("planBudget", plan.estimatedBudget);
            this.setInputValue("planDuration", plan.duration);

            this.setInputValue(
                "planParticipants",
                (plan.participants || []).join(", ")
            );

            this.setInputValue("planDescription", plan.description);
            this.setInputValue("planNotes", plan.notes);

            await this.loadExistingImage(plan.imageId);

            this.showModal();

        },

        /* =====================================================
           GUARDAR PLAN
        ===================================================== */

        async savePlan() {

            const saveButton =
                document.getElementById("savePlanButton");

            const name = this.getInputValue("planName");
            const category = this.getInputValue("planCategory");

            if (!name || !category) {
                this.showToast(
                    "El nombre y la categoría son obligatorios.",
                    "warning"
                );
                return;
            }

            const budget = Number(
                this.getInputValue("planBudget") || 0
            );

            if (!Number.isFinite(budget) || budget < 0) {
                this.showToast(
                    "Introduce un presupuesto válido.",
                    "warning"
                );
                return;
            }

            const participants = this.getInputValue("planParticipants")
                .split(",")
                .map(name => name.trim())
                .filter(Boolean);

            const existingPlan = this.editingId
                ? STORAGE.getPlanById(this.editingId)
                : null;

            const oldImageId = existingPlan?.imageId || null;

            let imageId = this.removeExistingImage
                ? null
                : oldImageId;

            saveButton.disabled = true;

            try {

                // Guardar una nueva imagen si se ha seleccionado
                if (this.selectedImage) {

                    const validation =
                        IMAGES.validateImage(this.selectedImage);

                    if (!validation.valid) {
                        throw new Error(validation.message);
                    }

                    imageId = await IMAGES.saveImage(
                        this.selectedImage,
                        imageId
                    );

                }

                const plan = {

                    ...(existingPlan || {}),

                    id: this.editingId || STORAGE.generateId(),

                    name,
                    category,

                    status:
                        this.getInputValue("planStatus") || "Pendiente",

                    date: this.getInputValue("planDate"),
                    time: this.getInputValue("planTime"),

                    location: this.getInputValue("planLocation"),
                    mapsUrl: this.getInputValue("planMapsUrl"),

                    estimatedBudget: budget,
                    duration: this.getInputValue("planDuration"),

                    participants,

                    description:
                        this.getInputValue("planDescription"),

                    notes: this.getInputValue("planNotes"),

                    imageId,

                    expenses: existingPlan?.expenses || [],

                    createdAt:
                        existingPlan?.createdAt ||
                        new Date().toISOString(),

                    updatedAt: new Date().toISOString()

                };

                const plans = this.getPlans();

                if (this.editingId) {

                    const index = plans.findIndex(
                        item => item.id === this.editingId
                    );

                    if (index === -1) {
                        throw new Error(
                            "No se ha encontrado el plan."
                        );
                    }

                    plans[index] = plan;

                    STORAGE.savePlans(plans);

                    STORAGE.addActivity(
                        "plan_updated",
                        `Has actualizado el plan "${name}".`,
                        plan.id
                    );

                } else {

                    plans.push(plan);

                    STORAGE.savePlans(plans);

                    STORAGE.addActivity(
                        "plan_created",
                        `Has creado el plan "${name}".`,
                        plan.id
                    );

                }

                // Si se ha eliminado o sustituido una imagen,
                // borrar la antigua cuando ya no se utiliza.
                if (
                    oldImageId &&
                    oldImageId !== imageId
                ) {
                    await IMAGES.deleteImage(oldImageId);
                }

                this.hideModal();

                this.editingId = null;
                this.selectedImage = null;
                this.removeExistingImage = false;

                await this.renderPlans();

                if (window.PLANEA_APP?.notifyDataChanged) {
                    window.PLANEA_APP.notifyDataChanged({
                        type: "plan_saved",
                        planId: plan.id
                    });
                }

                this.showToast(
                    "Plan guardado correctamente.",
                    "success"
                );

            } catch (error) {

                console.error(
                    "PLANEA: error guardando el plan.",
                    error
                );

                this.showToast(
                    error.message ||
                    "No se ha podido guardar el plan.",
                    "danger"
                );

            } finally {

                saveButton.disabled = false;

            }

        },

        /* =====================================================
           ELIMINAR PLAN
        ===================================================== */

        async deletePlan(id) {

            const plan = STORAGE.getPlanById(id);

            if (!plan) return;

            const confirmed = window.confirm(
                `¿Seguro que quieres eliminar "${plan.name}"?\n\nEsta acción no se puede deshacer.`
            );

            if (!confirmed) return;

            try {

                const plans = this.getPlans().filter(
                    item => item.id !== id
                );

                STORAGE.savePlans(plans);

                if (plan.imageId) {
                    await IMAGES.deleteImage(plan.imageId);
                }

                STORAGE.addActivity(
                    "plan_deleted",
                    `Has eliminado el plan "${plan.name}".`,
                    id
                );

                await this.renderPlans();

                if (window.PLANEA_APP?.notifyDataChanged) {
                    window.PLANEA_APP.notifyDataChanged({
                        type: "plan_deleted",
                        planId: id
                    });
                }

                this.showToast(
                    "Plan eliminado correctamente.",
                    "success"
                );

            } catch (error) {

                console.error(
                    "PLANEA: error eliminando el plan.",
                    error
                );

                this.showToast(
                    "No se ha podido eliminar el plan.",
                    "danger"
                );

            }

        },

        /* =====================================================
           IMÁGENES
        ===================================================== */

        async handleImageSelection(file) {

            if (!file) return;

            const validation = IMAGES.validateImage(file);

            if (!validation.valid) {

                this.showToast(
                    validation.message,
                    "warning"
                );

                document.getElementById("planImage").value = "";
                return;

            }

            this.selectedImage = file;
            this.removeExistingImage = false;

            this.revokePreviewURL();

            this.previewObjectURL =
                URL.createObjectURL(file);

            this.renderImagePreview(this.previewObjectURL);

        },

        async loadExistingImage(imageId) {

            if (!imageId) {
                this.renderImagePreview(null);
                return;
            }

            try {

                const url = await IMAGES.getImageURL(imageId);

                this.renderImagePreview(url);

            } catch (error) {

                console.warn(
                    "No se ha podido recuperar la portada.",
                    error
                );

                this.renderImagePreview(null);

            }

        },

        renderImagePreview(url) {

            const preview =
                document.getElementById("planImagePreview");

            if (!preview) return;

            if (!url) {

                preview.innerHTML = `
                    <div class="text-secondary small">
                        No hay ninguna imagen seleccionada.
                    </div>
                `;

                return;

            }

            preview.innerHTML = `
                <div class="position-relative"
                     style="max-width:320px;">

                    <img src="${url}"
                         alt="Vista previa de la portada"
                         class="img-fluid rounded-3"
                         style="width:100%;
                                max-height:180px;
                                object-fit:cover;">

                    <button type="button"
                            class="btn btn-danger btn-sm
                                   position-absolute top-0 end-0 m-2"
                            id="removePlanImage"
                            aria-label="Quitar imagen">

                        <i class="bi bi-x-lg"></i>

                    </button>

                </div>
            `;

        },

        removeSelectedImage() {

            this.selectedImage = null;
            this.removeExistingImage = true;

            const input =
                document.getElementById("planImage");

            if (input) {
                input.value = "";
            }

            this.revokePreviewURL();
            this.renderImagePreview(null);

        },

        revokePreviewURL() {

            if (this.previewObjectURL) {
                URL.revokeObjectURL(this.previewObjectURL);
                this.previewObjectURL = null;
            }

        },

        /* =====================================================
           FILTROS
        ===================================================== */

        clearFilters() {

            this.currentFilters = {
                search: "",
                category: "all",
                status: "all"
            };

            this.setInputValue("plansSearch", "");
            this.setInputValue("plansCategoryFilter", "all");
            this.setInputValue("plansStatusFilter", "all");

            this.renderPlans();

        },

        /* =====================================================
           UTILIDADES
        ===================================================== */

        showModal() {

            if (!this.modal || !window.bootstrap?.Modal) {
                this.showToast(
                    "No se ha podido abrir el formulario.",
                    "danger"
                );
                return;
            }

            this.modalInstance =
                window.bootstrap.Modal.getOrCreateInstance(
                    this.modal
                );

            this.modalInstance.show();

        },

        hideModal() {

            if (this.modalInstance) {
                this.modalInstance.hide();
            }

        },

        showToast(message, type = "success") {

            if (window.PLANEA_APP?.showToast) {
                window.PLANEA_APP.showToast(message, type);
                return;
            }

            console.log(`[PLANEA] ${message}`);

        },

        setText(id, value) {

            const element = document.getElementById(id);

            if (element) {
                element.textContent = value;
            }

        },

        setInputValue(id, value) {

            const element = document.getElementById(id);

            if (element) {
                element.value = value ?? "";
            }

        },

        getInputValue(id) {

            return document
                .getElementById(id)
                ?.value
                ?.trim() || "";

        },

        formatDate(date) {

            if (!date) return "";

            const parsed = new Date(`${date}T00:00:00`);

            if (Number.isNaN(parsed.getTime())) {
                return date;
            }

            return parsed.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });

        },

        formatCurrency(amount) {

            return new Intl.NumberFormat("es-ES", {
                style: "currency",
                currency: "EUR"
            }).format(amount);

        },

        escapeHTML(value) {

            return String(value ?? "").replace(
                /[&<>"']/g,
                character => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                })[character]
            );

        }

    };

    // Exponer módulo
    window.PLANEA_PLANS = MODULE;

})();
