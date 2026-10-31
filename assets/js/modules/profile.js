
/* =========================================================
   PLANEA - GESTIÓN DEL PERFIL
   Archivo: assets/js/modules/profile.js
   ========================================================= */

(() => {
    "use strict";

    let selectedWelcomePhoto = null;
    let selectedProfilePhoto = null;

    let initialized = false;

    const STORAGE = () => window.PLANEA_STORAGE;
    const IMAGES = () => window.PLANEA_IMAGES;

    /* =====================================================
       ELEMENTOS DEL DOM
       ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }

    /* =====================================================
       UTILIDADES
       ===================================================== */

    function showApplication() {
        const onboarding = getElement("onboardingScreen");
        const app = getElement("app");

        if (onboarding) {
            onboarding.classList.add("d-none");
        }

        if (app) {
            app.classList.remove("d-none");
        }
    }

    function showWelcomeScreen() {
        const onboarding = getElement("onboardingScreen");
        const app = getElement("app");

        if (app) {
            app.classList.add("d-none");
        }

        if (onboarding) {
            onboarding.classList.remove("d-none");
        }
    }

    function showToast(message) {
        if (window.PLANEA_APP) {
            window.PLANEA_APP.showToast(message);
        }
    }

    function previewImage(file, container) {
        if (!file || !container) {
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            container.innerHTML = "";

            const image = document.createElement("img");
            image.src = reader.result;
            image.alt = "Vista previa del perfil";

            container.appendChild(image);
        };

        reader.readAsDataURL(file);
    }

    async function displayAvatar(container, imageId) {
        if (!container) {
            return;
        }

        container.innerHTML = '<i class="bi bi-person-fill"></i>';

        if (!imageId || !IMAGES()) {
            return;
        }

        try {
            const url = await IMAGES().getImageURL(imageId);

            if (!url) {
                return;
            }

            const image = document.createElement("img");
            image.src = url;
            image.alt = "Fotografía de perfil";

            container.innerHTML = "";
            container.appendChild(image);

            container.dataset.imageUrl = url;

        } catch (error) {
            console.error("PLANEA: No se pudo mostrar la fotografía.", error);
        }
    }

    function releasePreview(container) {
        if (!container) {
            return;
        }

        const previousUrl = container.dataset.imageUrl;

        if (previousUrl && previousUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previousUrl);
        }

        delete container.dataset.imageUrl;
    }

    /* =====================================================
       CARGAR PERFIL
       ===================================================== */

    async function loadProfile() {
        if (!STORAGE()) {
            return;
        }

        const profile = STORAGE().getProfile();

        if (!profile || !profile.name) {
            showWelcomeScreen();
            return;
        }

        showApplication();

        const welcomeName = getElement("welcomeUserName");
        const sidebarName = getElement("sidebarUserName");
        const profileName = getElement("profileNameInput");

        if (welcomeName) {
            welcomeName.textContent = profile.name;
        }

        if (sidebarName) {
            sidebarName.textContent = profile.name;
        }

        if (profileName) {
            profileName.value = profile.name;
        }

        await Promise.all([
            displayAvatar(getElement("sidebarAvatar"), profile.photo),
            displayAvatar(getElement("topbarAvatar"), profile.photo),
            displayAvatar(getElement("editProfileAvatar"), profile.photo)
        ]);
    }

    /* =====================================================
       GUARDAR PERFIL
       ===================================================== */

    async function saveProfile(name, photoFile = null) {
        if (!STORAGE()) {
            return false;
        }

        const cleanName = String(name || "").trim();

        if (!cleanName) {
            showToast("Introduce un nombre para continuar.");
            return false;
        }

        const currentProfile = STORAGE().getProfile();

        let photoId = currentProfile.photo || null;

        if (photoFile) {
            try {
                photoId = await IMAGES().saveImage(
                    photoFile,
                    photoId
                );
            } catch (error) {
                showToast(error.message || "No se pudo guardar la fotografía.");
                return false;
            }
        }

        const success = STORAGE().saveProfile({
            name: cleanName,
            photo: photoId
        });

        if (!success) {
            showToast("No se pudieron guardar los datos del perfil.");
            return false;
        }

        await loadProfile();

        return true;
    }

    /* =====================================================
       BIENVENIDA
       ===================================================== */

    function bindWelcomeEvents() {
        const form = getElement("welcomeForm");
        const photoInput = getElement("welcomePhoto");
        const avatar = getElement("welcomeAvatar");

        if (photoInput) {
            photoInput.addEventListener("change", () => {
                const file = photoInput.files[0];

                if (!file) {
                    return;
                }

                try {
                    IMAGES().validateImage(file);
                    selectedWelcomePhoto = file;

                    previewImage(file, avatar);

                } catch (error) {
                    selectedWelcomePhoto = null;
                    photoInput.value = "";
                    showToast(error.message);
                }
            });
        }

        if (form) {
            form.addEventListener("submit", async event => {
                event.preventDefault();

                const nameInput = getElement("welcomeName");
                const button = form.querySelector('button[type="submit"]');

                if (!nameInput) {
                    return;
                }

                if (button) {
                    button.disabled = true;
                }

                const success = await saveProfile(
                    nameInput.value,
                    selectedWelcomePhoto
                );

                if (button) {
                    button.disabled = false;
                }

                if (!success) {
                    return;
                }

                selectedWelcomePhoto = null;

                showApplication();

                if (window.PLANEA_ROUTER) {
                    window.PLANEA_ROUTER.navigateTo("dashboard");
                }

                if (window.PLANEA_DASHBOARD) {
                    window.PLANEA_DASHBOARD.render();
                }

                showToast("¡Bienvenido a PLANEA!");
            });
        }
    }

    /* =====================================================
       EDICIÓN DEL PERFIL
       ===================================================== */

    function bindProfileEvents() {
        const photoInput = getElement("profilePhotoInput");
        const avatar = getElement("editProfileAvatar");

        const saveButton = getElement("saveProfileButton");
        const removeButton = getElement("removeProfilePhoto");

        if (photoInput) {
            photoInput.addEventListener("change", () => {
                const file = photoInput.files[0];

                if (!file) {
                    return;
                }

                try {
                    IMAGES().validateImage(file);

                    selectedProfilePhoto = file;
                    previewImage(file, avatar);

                } catch (error) {
                    selectedProfilePhoto = null;
                    photoInput.value = "";
                    showToast(error.message);
                }
            });
        }

        if (removeButton) {
            removeButton.addEventListener("click", async () => {
                const profile = STORAGE().getProfile();

                if (profile.photo) {
                    const deleted = await IMAGES().deleteImage(profile.photo);

                    if (!deleted) {
                        showToast("No se pudo eliminar la fotografía.");
                        return;
                    }
                }

                STORAGE().saveProfile({
                    photo: null
                });

                selectedProfilePhoto = null;

                if (photoInput) {
                    photoInput.value = "";
                }

                await loadProfile();

                showToast("Fotografía eliminada.");
            });
        }

        if (saveButton) {
            saveButton.addEventListener("click", async () => {
                const nameInput = getElement("profileNameInput");

                if (!nameInput) {
                    return;
                }

                saveButton.disabled = true;

                const success = await saveProfile(
                    nameInput.value,
                    selectedProfilePhoto
                );

                saveButton.disabled = false;

                if (!success) {
                    return;
                }

                selectedProfilePhoto = null;

                if (photoInput) {
                    photoInput.value = "";
                }

                const modalElement = getElement("profileModal");

                if (modalElement && window.bootstrap) {
                    const modal = bootstrap.Modal.getInstance(modalElement);

                    if (modal) {
                        modal.hide();
                    }
                }

                showToast("Perfil actualizado correctamente.");
            });
        }
    }

    /* =====================================================
       INICIALIZACIÓN
       ===================================================== */

    async function init() {
        if (initialized) {
            return;
        }

        initialized = true;

        bindWelcomeEvents();
        bindProfileEvents();

        await loadProfile();

        console.log("PLANEA: Perfil inicializado correctamente.");
    }

    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.PLANEA_PROFILE = {
        init,
        loadProfile,
        saveProfile
    };

})();
