# WTWT Movie Explorer — Frontend

Aplicación web para explorar un catálogo de películas, series y anime, crear propuestas y compartir valoraciones. Está desarrollada con HTML, CSS y JavaScript nativo; la autenticación y los datos del catálogo dependen de una API externa al frontend.

## Funcionalidades

- Registro e inicio de sesión, con navegación según el rol del usuario.
- Exploración de títulos, categorías e información visual como pósteres y banners.
- Gestión de títulos y categorías, revisión de propuestas y acciones administrativas.
- Interfaz de reseñas, calificaciones y comentarios.

## Estructura del proyecto

```text
index.html                 Página de inicio de sesión
assets/                    Recursos estáticos
src/
  Js/                      Lógica de autenticación, sesión, catálogo y administración
  css/                     Estilos de inicio de sesión, catálogo y administración
  html/
    registro.html          Formulario de registro
    peliculas.html         Catálogo y experiencia de usuario
    admin.html             Panel administrativo
```

Los módulos JavaScript más relevantes son `api.js` (comunicación HTTP y errores), `session.js` (token y usuario actual), `peliculas.js` (catálogo e interacción con títulos), y `admin.js`/`admin-panel.js` (herramientas administrativas). `config.js` define la URL base de la API.

## Requisitos y ejecución

Se necesita un navegador moderno y el backend disponible en `http://localhost:3000/api/v1` (configurado en `src/Js/config.js`). Como las páginas usan módulos ES, deben servirse por HTTP y no abrirse directamente desde el sistema de archivos.

Desde la raíz del proyecto, inicia un servidor estático:

```bash
python -m http.server 5500
```

Abre `http://localhost:5500/index.html`. También puedes usar la extensión **Live Server** de VS Code. Para cambiar el endpoint del backend, actualiza `API_BASE` en `src/Js/config.js`.

No hay `package.json` ni scripts de npm configurados; no se requiere instalar dependencias para servir el frontend.

## Ramas

- **`main`**: rama principal de referencia; contiene la integración base del proyecto.
- **`dev`**: rama de integración y desarrollo activo. En ella se han incorporado mejoras recientes de catálogo e imágenes.
- **Ramas de trabajo**: se utilizan para desarrollar o corregir funcionalidades antes de integrarlas. Entre las existentes están `crud_peliculas`, `vista_usuario`, `vista_admin` y `fix/diagnostico-conexion`, enfocadas respectivamente en el CRUD de títulos, la vista de usuario, la administración visual y el diagnóstico de conexión.

Flujo recomendado: crear una rama de trabajo desde `dev`, integrar los cambios en `dev` y promover a `main` cuando estén listos. Verifica la rama actual con `git branch --show-current` y cambia de rama con `git switch <rama>`.
