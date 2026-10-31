
/* =========================================================
   PLANEA - GESTIÓN DE IMÁGENES
   Archivo: assets/js/utils/images.js
   ========================================================= */

(() => {
    "use strict";

    const DB_NAME = "PLANEA_Images";
    const DB_VERSION = 1;
    const STORE_NAME = "images";

    const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

    const ALLOWED_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    let database = null;

    /* =====================================================
       APERTURA DE BASE DE DATOS
       ===================================================== */

    function openDatabase() {
        return new Promise((resolve, reject) => {

            if (!window.indexedDB) {
                reject(
                    new Error("Este navegador no permite utilizar IndexedDB.")
                );
                return;
            }

            if (database) {
                resolve(database);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = event => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, {
                        keyPath: "id"
                    });
                }
            };

            request.onsuccess = event => {
                database = event.target.result;

                database.onversionchange = () => {
                    database.close();
                    database = null;
                };

                resolve(database);
            };

            request.onerror = () => {
                reject(
                    request.error ||
                    new Error("No se pudo abrir la base de datos de imágenes.")
                );
            };

            request.onblocked = () => {
                reject(
                    new Error("La base de datos está bloqueada por otra pestaña.")
                );
            };
        });
    }

    /* =====================================================
       VALIDACIÓN DE ARCHIVOS
       ===================================================== */

    function validateImage(file) {

        if (!(file instanceof Blob)) {
            throw new Error("El archivo seleccionado no es válido.");
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error(
                "Formato no permitido. Utiliza JPG, PNG, WEBP o GIF."
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            throw new Error(
                "La imagen supera el tamaño máximo permitido de 8 MB."
            );
        }

        if (file.size === 0) {
            throw new Error("La imagen está vacía.");
        }

        return true;
    }

    /* =====================================================
       GUARDAR IMAGEN
       ===================================================== */

    async function saveImage(file, existingId = null) {

        try {
            validateImage(file);

            const db = await openDatabase();

            const imageId = existingId ||
                window.PLANEA_STORAGE.generateId();

            const imageData = {
                id: imageId,
                blob: file,
                type: file.type,
                name: file.name || "imagen",
                size: file.size,
                updatedAt: new Date().toISOString()
            };

            return await new Promise((resolve, reject) => {

                const transaction = db.transaction(
                    STORE_NAME,
                    "readwrite"
                );

                const store = transaction.objectStore(STORE_NAME);

                store.put(imageData);

                transaction.oncomplete = () => {
                    resolve(imageId);
                };

                transaction.onerror = () => {
                    reject(
                        transaction.error ||
                        new Error("No se pudo guardar la imagen.")
                    );
                };

                transaction.onabort = () => {
                    reject(
                        transaction.error ||
                        new Error("El guardado de la imagen fue cancelado.")
                    );
                };
            });

        } catch (error) {
            console.error("PLANEA: Error guardando imagen:", error);
            throw error;
        }
    }

    /* =====================================================
       RECUPERAR IMAGEN
       ===================================================== */

    async function getImage(imageId) {

        if (!imageId) {
            return null;
        }

        try {
            const db = await openDatabase();

            return await new Promise((resolve, reject) => {

                const transaction = db.transaction(
                    STORE_NAME,
                    "readonly"
                );

                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(imageId);

                request.onsuccess = () => {
                    resolve(request.result || null);
                };

                request.onerror = () => {
                    reject(
                        request.error ||
                        new Error("No se pudo recuperar la imagen.")
                    );
                };
            });

        } catch (error) {
            console.error("PLANEA: Error recuperando imagen:", error);
            throw error;
        }
    }

    /* =====================================================
       OBTENER URL DE IMAGEN
       ===================================================== */

    async function getImageURL(imageId) {

        const image = await getImage(imageId);

        if (!image || !image.blob) {
            return null;
        }

        return URL.createObjectURL(image.blob);
    }

    /* =====================================================
       ELIMINAR IMAGEN
       ===================================================== */

    async function deleteImage(imageId) {

        if (!imageId) {
            return false;
        }

        try {
            const db = await openDatabase();

            return await new Promise((resolve, reject) => {

                const transaction = db.transaction(
                    STORE_NAME,
                    "readwrite"
                );

                const store = transaction.objectStore(STORE_NAME);

                store.delete(imageId);

                transaction.oncomplete = () => {
                    resolve(true);
                };

                transaction.onerror = () => {
                    reject(
                        transaction.error ||
                        new Error("No se pudo eliminar la imagen.")
                    );
                };

                transaction.onabort = () => {
                    reject(
                        transaction.error ||
                        new Error("La eliminación de la imagen fue cancelada.")
                    );
                };
            });

        } catch (error) {
            console.error("PLANEA: Error eliminando imagen:", error);
            return false;
        }
    }

    /* =====================================================
       COMPROBAR SI EXISTE UNA IMAGEN
       ===================================================== */

    async function imageExists(imageId) {

        if (!imageId) {
            return false;
        }

        try {
            const image = await getImage(imageId);
            return image !== null;

        } catch (error) {
            return false;
        }
    }

    /* =====================================================
       ELIMINAR TODAS LAS IMÁGENES
       ===================================================== */

    async function clearImages() {

        try {
            const db = await openDatabase();

            return await new Promise((resolve, reject) => {

                const transaction = db.transaction(
                    STORE_NAME,
                    "readwrite"
                );

                const store = transaction.objectStore(STORE_NAME);

                store.clear();

                transaction.oncomplete = () => {
                    resolve(true);
                };

                transaction.onerror = () => {
                    reject(
                        transaction.error ||
                        new Error("No se pudieron eliminar las imágenes.")
                    );
                };
            });

        } catch (error) {
            console.error("PLANEA: Error limpiando imágenes:", error);
            return false;
        }
    }

    /* =====================================================
       API GLOBAL
       ===================================================== */

    window.PLANEA_IMAGES = {
        openDatabase,
        validateImage,
        saveImage,
        getImage,
        getImageURL,
        deleteImage,
        imageExists,
        clearImages,
        MAX_FILE_SIZE,
        ALLOWED_TYPES
    };

    console.log(
        "PLANEA: Sistema de imágenes preparado correctamente."
    );

})();
