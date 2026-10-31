# PLANEA

**Organiza. Comparte. Disfruta.**

PLANEA es una aplicación web diseñada para organizar planes, actividades y experiencias de una forma sencilla, visual e intuitiva. Su objetivo es reunir en un mismo espacio todo lo necesario para planificar quedadas, viajes, escapadas, actividades de ocio y cualquier otro tipo de experiencia.

El proyecto apuesta por una interfaz moderna, elegante y adaptable a cualquier dispositivo, ofreciendo herramientas para gestionar planes, controlar presupuestos, descubrir nuevas ideas y conservar un historial de experiencias.

---

## Características principales

### 🏠 Panel de inicio
- Resumen general de la actividad.
- Estadísticas de planes pendientes, confirmados y realizados.
- Visualización del próximo plan.
- Próximos acontecimientos.
- Calendario mensual resumido.
- Actividad reciente.

### 📅 Gestión de planes
- Creación, edición y eliminación de planes.
- Organización por categorías.
- Estados: pendiente, confirmado, realizado y cancelado.
- Fecha, hora, ubicación y enlaces de interés.
- Gestión de participantes.
- Presupuesto estimado.
- Imágenes de portada y notas adicionales.

### 🗓️ Calendario
- Visualización mensual, semanal y en formato agenda.
- Identificación de días con planes.
- Diferenciación visual por categorías.
- Filtros por categoría y estado.

### 🎲 Generador de ideas
- Biblioteca de propuestas para descubrir nuevos planes.
- Filtros por categoría, presupuesto, duración y ubicación interior o exterior.
- Generación de propuestas aleatorias.
- Posibilidad de guardar ideas favoritas.
- Conversión de ideas en planes.

### ⭐ Favoritos
- Colección personal de ideas guardadas.
- Acceso rápido a propuestas interesantes.
- Conversión de favoritos en nuevos planes.

### 💰 Presupuestos y gastos
- Registro de gastos asociados a cada plan.
- Clasificación por conceptos.
- Cálculo del gasto total.
- División equitativa entre participantes.
- Comparación entre presupuesto estimado y gasto real.

### 📖 Historial
- Conservación de los planes realizados.
- Consulta de información, participantes y gastos.
- Registro de fotografías y valoraciones personales.

### ⚙️ Configuración
- Personalización del perfil.
- Preferencias de visualización.
- Exportación e importación de datos.
- Copias de seguridad mediante archivos JSON.
- Restauración de los datos de la aplicación.

---

## Tecnologías utilizadas

El proyecto está desarrollado utilizando tecnologías web:

- **HTML5:** estructura y organización del contenido.
- **CSS3:** diseño visual y adaptación a diferentes dispositivos.
- **JavaScript:** lógica de la aplicación e interactividad.
- **Bootstrap 5:** componentes y herramientas de diseño responsive.
- **Bootstrap Icons:** iconografía.
- **Google Fonts (Inter):** tipografía.
- **LocalStorage:** almacenamiento local de información.
- **IndexedDB:** almacenamiento de imágenes.
- **GitHub Pages:** publicación y alojamiento del proyecto.

---

## Diseño e interfaz

PLANEA utiliza una estética oscura, moderna y minimalista, con el verde esmeralda como color principal.

Entre sus principales características visuales destacan:

- Interfaz adaptable a ordenadores, tablets y móviles.
- Navegación lateral en escritorio.
- Barra de navegación inferior en dispositivos móviles.
- Tarjetas con bordes redondeados y sombras sutiles.
- Animaciones y transiciones suaves.
- Diseño centrado en la claridad y facilidad de uso.

---

## Estructura del proyecto

```text
PLANEA/
│
├── index.html
│
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── components.css
│   │   └── responsive.css
│   │
│   ├── js/
│   │   ├── core/
│   │   │   ├── app.js
│   │   │   ├── router.js
│   │   │   └── storage.js
│   │   │
│   │   ├── modules/
│   │   │   ├── profile.js
│   │   │   └── dashboard.js
│   │   │
│   │   └── utils/
│   │       └── images.js
│   │
│   └── images/
│       └── logo.svg
│
└── README.md
```

La estructura se irá ampliando conforme se incorporen nuevos módulos y funcionalidades.

---

## Almacenamiento de datos

PLANEA utiliza almacenamiento local del navegador:

- **LocalStorage:** guarda los planes, preferencias, perfil, favoritos y demás información.
- **IndexedDB:** almacena las imágenes asociadas a los planes y al perfil.

Actualmente, los datos permanecen en el navegador y dispositivo donde se utiliza la aplicación. No existe sincronización automática entre dispositivos.

La aplicación contempla la exportación e importación de archivos JSON para facilitar las copias de seguridad y el intercambio manual de información.

---

## Instalación y ejecución

PLANEA es una aplicación web que no requiere instalación de dependencias ni configuración de un servidor backend.

Para ejecutarla localmente:

1. Descarga o clona este repositorio.
2. Abre la carpeta del proyecto.
3. Ejecuta `index.html` desde un navegador web.

También puede utilizarse mediante su publicación en GitHub Pages.

---

## Estado del proyecto

**PLANEA se encuentra actualmente en desarrollo.**

La aplicación se está construyendo progresivamente, incorporando y conectando sus diferentes módulos para conseguir una experiencia completa, funcional y coherente.

---

## Autor

Proyecto desarrollado de forma personal como iniciativa de desarrollo web, aplicando conocimientos de HTML, CSS, JavaScript y diseño de interfaces.

**PLANEA — Organiza. Comparte. Disfruta.**
