
/* =========================================================
   PLANEA - SISTEMA DE ALMACENAMIENTO
   Archivo: assets/js/core/storage.js
   ========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "planeaData";
    const STORAGE_VERSION = 1;

    /* =====================================================
       ESTRUCTURA INICIAL
       ===================================================== */

    function createInitialData() {
        return {
            version: STORAGE_VERSION,

            profile: {
                name: "",
                photo: null,
                createdAt: new Date().toISOString()
            },

            plans: [],

            favorites: [],

            settings: {
                sidebarCollapsed: false,
                theme: "dark",
                reminders: true,
                currency: "EUR"
            },

            activity: [],

            lastUpdated: new Date().toISOString()
        };
    }

    /* =====================================================
       VALIDACIÓN
       ===================================================== */

    function isValidData(data) {
        return (
            data !== null &&
            typeof data === "object" &&
            !Array.isArray(data) &&
            typeof data.version === "number" &&
            typeof data.profile === "object" &&
            data.profile !== null &&
            Array.isArray(data.plans) &&
            Array.isArray(data.favorites) &&
            typeof data.settings === "object" &&
            data.settings !== null &&
            Array.isArray(data.activity)
        );
    }

    /* =====================================================
       LECTURA Y ESCRITURA GENERAL
       ===================================================== */

    function getData() {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);

            if (!storedData) {
                const initialData = createInitialData();
                saveData(initialData);
                return initialData;
            }

            const parsedData = JSON.parse(storedData);

            if (!isValidData(parsedData)) {
                console.error(
                    "PLANEA: La estructura de los datos almacenados no es válida."
                );

                return createInitialData();
            }

            return parsedData;

        } catch (error) {
            console.error("PLANEA: Error al recuperar los datos:", error);
            return createInitialData();
        }
    }

    function saveData(data) {
        if (!isValidData(data)) {
            console.error(
                "PLANEA: No se pueden guardar datos con una estructura inválida."
            );

            return false;
        }

        try {
            data.version = STORAGE_VERSION;
            data.lastUpdated = new Date().toISOString();

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );

            return true;

        } catch (error) {
            if (
                error.name === "QuotaExceededError" ||
                error.name === "NS_ERROR_DOM_QUOTA_REACHED"
            ) {
                console.error(
                    "PLANEA: Se ha superado el espacio disponible de almacenamiento."
                );
            } else {
                console.error(
                    "PLANEA: Error al guardar los datos:",
                    error
                );
            }

            return false;
        }
    }

    function updateSection(section, value) {
        const allowedSections = [
            "profile",
            "plans",
            "favorites",
            "settings",
            "activity"
        ];

        if (!allowedSections.includes(section)) {
            console.error(
                `PLANEA: La sección "${section}" no existe.`
            );

            return false;
        }

        const data = getData();
        data[section] = value;

        return saveData(data);
    }

    /* =====================================================
       PERFIL
       ===================================================== */

    function getProfile() {
        return getData().profile;
    }

    function saveProfile(profile) {
        if (!profile || typeof profile !== "object") {
            return false;
        }

        const currentProfile = getProfile();

        const updatedProfile = {
            ...currentProfile,
            ...profile
        };

        return updateSection("profile", updatedProfile);
    }

    /* =====================================================
       PLANES
       ===================================================== */

    function getPlans() {
        return getData().plans;
    }

    function savePlans(plans) {
        if (!Array.isArray(plans)) {
            return false;
        }

        return updateSection("plans", plans);
    }

    function getPlanById(id) {
        return getPlans().find(plan => plan.id === id) || null;
    }

    function addPlan(plan) {
        if (!plan || typeof plan !== "object") {
            return null;
        }

        const plans = getPlans();

        const newPlan = {
            ...plan,
            id: plan.id || generateId(),
            createdAt: plan.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (plans.some(existing => existing.id === newPlan.id)) {
            console.error("PLANEA: Ya existe un plan con ese identificador.");
            return null;
        }

        plans.push(newPlan);

        if (!savePlans(plans)) {
            return null;
        }

        addActivity(
            "plan_created",
            `Has creado el plan "${newPlan.name || "Sin nombre"}".`,
            newPlan.id
        );

        return newPlan;
    }

    function updatePlan(id, changes) {
        if (!id || !changes || typeof changes !== "object") {
            return false;
        }

        const plans = getPlans();
        const index = plans.findIndex(plan => plan.id === id);

        if (index === -1) {
            return false;
        }

        plans[index] = {
            ...plans[index],
            ...changes,
            id,
            updatedAt: new Date().toISOString()
        };

        return savePlans(plans);
    }

    function deletePlan(id) {
        const plans = getPlans();
        const plan = plans.find(item => item.id === id);

        if (!plan) {
            return false;
        }

        const updatedPlans = plans.filter(item => item.id !== id);

        if (!savePlans(updatedPlans)) {
            return false;
        }

        addActivity(
            "plan_deleted",
            `Has eliminado el plan "${plan.name || "Sin nombre"}".`,
            id
        );

        return true;
    }

    /* =====================================================
       FAVORITOS
       ===================================================== */

    function getFavorites() {
        return getData().favorites;
    }

    function saveFavorites(favorites) {
        if (!Array.isArray(favorites)) {
            return false;
        }

        return updateSection("favorites", favorites);
    }

    function addFavorite(idea) {
        if (!idea || typeof idea !== "object") {
            return false;
        }

        const favorites = getFavorites();

        const favoriteId = idea.id || generateId();

        if (favorites.some(item => item.id === favoriteId)) {
            return false;
        }

        favorites.push({
            ...idea,
            id: favoriteId,
            savedAt: new Date().toISOString()
        });

        return saveFavorites(favorites);
    }

    function removeFavorite(id) {
        const favorites = getFavorites();

        const updatedFavorites = favorites.filter(
            item => item.id !== id
        );

        if (updatedFavorites.length === favorites.length) {
            return false;
        }

        return saveFavorites(updatedFavorites);
    }

    function isFavorite(id) {
        return getFavorites().some(item => item.id === id);
    }

    /* =====================================================
       CONFIGURACIÓN
       ===================================================== */

    function getSettings() {
        return getData().settings;
    }

    function saveSettings(settings) {
        if (!settings || typeof settings !== "object") {
            return false;
        }

        const updatedSettings = {
            ...getSettings(),
            ...settings
        };

        return updateSection("settings", updatedSettings);
    }

    /* =====================================================
       ACTIVIDAD RECIENTE
       ===================================================== */

    function getActivity() {
        return getData().activity;
    }

    function addActivity(type, description, relatedId = null) {
        const activity = getActivity();

        activity.unshift({
            id: generateId(),
            type,
            description,
            relatedId,
            date: new Date().toISOString()
        });

        // Conservamos las últimas 100 actividades.
        return updateSection(
            "activity",
            activity.slice(0, 100)
        );
    }

    function clearActivity() {
        return updateSection("activity", []);
    }

    /* =====================================================
       EXPORTACIÓN E IMPORTACIÓN
       ===================================================== */

    function exportData() {
        const data = getData();

        return JSON.stringify(data, null, 2);
    }

    function importData(jsonData) {
        try {
            const importedData = typeof jsonData === "string"
                ? JSON.parse(jsonData)
                : jsonData;

            if (!isValidData(importedData)) {
                return {
                    success: false,
                    message: "El archivo no contiene una copia válida de PLANEA."
                };
            }

            const normalizedData = {
                ...createInitialData(),
                ...importedData,
                profile: {
                    ...createInitialData().profile,
                    ...importedData.profile
                },
                settings: {
                    ...createInitialData().settings,
                    ...importedData.settings
                }
            };

            const success = saveData(normalizedData);

            return {
                success,
                message: success
                    ? "Los datos se han importado correctamente."
                    : "No se han podido guardar los datos importados."
            };

        } catch (error) {
            console.error("PLANEA: Error al importar los datos:", error);

            return {
                success: false,
                message: "No se ha podido leer el archivo seleccionado."
            };
        }
    }

    /* =====================================================
       RESTABLECIMIENTO
       ===================================================== */

    function clearData() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            return true;

        } catch (error) {
            console.error("PLANEA: Error al borrar los datos:", error);
            return false;
        }
    }

    /* =====================================================
       UTILIDADES
       ===================================================== */

    function generateId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }

        return (
            Date.now().toString(36) +
            Math.random().toString(36).substring(2, 10)
        );
    }

    /* =====================================================
       API GLOBAL DE PLANEA
       ===================================================== */

    window.PLANEA_STORAGE = {
        STORAGE_KEY,

        // Datos generales
        getData,
        saveData,
        updateSection,

        // Perfil
        getProfile,
        saveProfile,

        // Planes
        getPlans,
        savePlans,
        getPlanById,
        addPlan,
        updatePlan,
        deletePlan,

        // Favoritos
        getFavorites,
        saveFavorites,
        addFavorite,
        removeFavorite,
        isFavorite,

        // Configuración
        getSettings,
        saveSettings,

        // Actividad
        getActivity,
        addActivity,
        clearActivity,

        // Copias de seguridad
        exportData,
        importData,
        clearData,

        // Utilidades
        generateId
    };

    // Inicializamos el almacenamiento al cargar PLANEA.
    getData();

    console.log("PLANEA: Sistema de almacenamiento inicializado correctamente.");

})();
