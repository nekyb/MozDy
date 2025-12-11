<div align="center">

# <img src="https://api.iconify.design/material-symbols:smart-toy-outline.svg?height=48&color=%23FF5722" valign="middle"> MozDy API
### *El Robín Hood de las búsquedas web*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Status-Operational-blue.svg)]()

> ¿Cansado de pagar por APIs de búsqueda o lidiar con límites ridículos? **MozDy** está aquí para salvarte el día. 🚀

[Ver Demo en Vivo](http://localhost:3000) · [Reportar Bug](https://github.com/tuusuario/mozdy/issues) · [Pedir Feature](https://github.com/tuusuario/mozdy/issues)

</div>

---

## <img src="https://api.iconify.design/material-symbols:help-outline.svg?height=24&color=%23FF5722" valign="middle"> ¿Qué es esto?

Imagina tener el poder de **Google**, **Bing** y **DuckDuckGo** en la palma de tu mano, pero:
- <img src="https://api.iconify.design/material-symbols:money-off.svg?height=16&color=%235F6368" valign="middle"> **Gratis**: Sin tarjetas de crédito.
- <img src="https://api.iconify.design/material-symbols:security.svg?height=16&color=%235F6368" valign="middle"> **Privado**: No guardamos nada. Lo que buscas es cosa tuya.
- <img src="https://api.iconify.design/material-symbols:speed.svg?height=16&color=%235F6368" valign="middle"> **Rápido**: Tan rápido que ni te dará tiempo a parpadear.
- <img src="https://api.iconify.design/material-symbols:palette-outline.svg?height=16&color=%235F6368" valign="middle"> **Bonito**: Respuestas en JSON limpio y ordenado, con favicons, metadatos y todo lo que te gusta.

Básicamente, es como si Firefox tuviera un hijo con una API REST supervitaminada.

---

## <img src="https://api.iconify.design/material-symbols:bolt.svg?height=24&color=%23FF5722" valign="middle"> Quick Start (Para impacientes)

¿Quieres verlo funcionando YA? Solo necesitas 2 minutos.

### 1. Clónalo (o descárgalo)
```bash
git clone https://github.com/tuusuario/mozdy.git
cd MozDy
```

### 2. Instálalo y corre
```bash
npm install && npm start
```

¡Y listo! Abre `http://localhost:3000` en tu navegador. Vas a ver una página de inicio tan bonita que querrás llorar.

---

## <img src="https://api.iconify.design/material-symbols:terminal.svg?height=24&color=%23FF5722" valign="middle"> ¿Cómo se usa?

Es más fácil que prepararse un cereal. Aquí tienes los superpoderes disponibles:

### <img src="https://api.iconify.design/material-symbols:public.svg?height=20&color=%234285F4" valign="middle"> Búsqueda Web (La clásica)
Busca lo que quieras, donde quieras.
```http
GET /api/search?q=gatos+graciosos&engine=google
```

### <img src="https://api.iconify.design/material-symbols:image-outline.svg?height=20&color=%234285F4" valign="middle"> Imágenes (Para tus memes)
Encuentra imágenes en alta calidad. Puedes filtrar por color y tamaño (porque el tamaño importa... en las imágenes).
```http
GET /api/search/images?q=wallpaper+4k&color=blue
```

### <img src="https://api.iconify.design/material-symbols:newspaper.svg?height=20&color=%234285F4" valign="middle"> Noticias (Mantente informado)
¿Qué está pasando en el mundo? Entérate aquí.
```http
GET /api/search/news?q=tecnología
```

### <img src="https://api.iconify.design/material-symbols:layers-outline.svg?height=20&color=%234285F4" valign="middle"> Multi-Motor (El modo Dios)
¿Por qué elegir uno cuando puedes tenerlos todos? Busca en TODOS los motores a la vez.
```http
GET /api/search/multi?q=programación
```

---

## <img src="https://api.iconify.design/material-symbols:settings-suggest-outline.svg?height=24&color=%23FF5722" valign="middle"> Configuración Avanzada

¿Eres un hacker de la terminal? También puedes configurar cosas:

| Variable | Por defecto | ¿Qué hace? |
|----------|-------------|------------|
| `PORT` | `3000` | El puerto donde vive la magia. |
| `NODE_ENV` | `development` | Pon `production` cuando vayas en serio. |

---

## <img src="https://api.iconify.design/material-symbols:volunteer-activism-outline.svg?height=24&color=%23FF5722" valign="middle"> Contribuye

Este proyecto es **Open Source** y vive gracias a gente guapa como tú.
- ¿Encontraste un bug? <img src="https://api.iconify.design/material-symbols:bug-report-outline.svg?height=16&color=%235F6368" valign="middle"> Abre un issue.
- ¿Tienes una idea millonaria? <img src="https://api.iconify.design/material-symbols:lightbulb-outline.svg?height=16&color=%235F6368" valign="middle"> Manda un PR.
- ¿Simplemente te gusta? <img src="https://api.iconify.design/material-symbols:star-outline.svg?height=16&color=%235F6368" valign="middle"> Dale una estrella al repo (es gratis y nos hace felices).

---

<div align="center">

Hecho con <img src="https://api.iconify.design/material-symbols:favorite.svg?height=16&color=red" valign="middle">, <img src="https://api.iconify.design/material-symbols:coffee.svg?height=16&color=brown" valign="middle"> y muchas horas de depuración por **Soblend Team**.

*Disclaimer: Úsalo con responsabilidad. No nos hacemos responsables si creas el próximo Skynet.* <img src="https://api.iconify.design/material-symbols:smart-toy-outline.svg?height=16&color=%235F6368" valign="middle">

</div>
