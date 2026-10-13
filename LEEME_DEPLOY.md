# Santa Biblia BYNIPO — paquete web estático actualizado

## Actualizar la web publicada en GitHub Pages

1. Descarga este ZIP y extráelo en tu computadora.
2. Abre la carpeta extraída. Debes ver directamente `index.html`, `speech-tts-fix.js`, `assets/` e `icon.svg`.
3. En el repositorio de GitHub donde publicas la web, reemplaza los archivos web anteriores por **todo el contenido extraído**. No subas solamente el ZIP ni solamente `index.html`.
4. Confirma los cambios con **Commit changes**. Espera a que GitHub Pages termine de publicar.
5. Abre la URL de GitHub Pages y actualiza con recarga completa (Ctrl+Shift+R en computadora). En el teléfono, cierra la pestaña anterior y abre nuevamente la URL.

No es necesario ejecutar npm para publicar este paquete estático. Las rutas a recursos son relativas para que funcionen en un repositorio con dirección del tipo `usuario.github.io/nombre-repositorio/`.

## Lectura por voz gratuita

La web usa `speechSynthesis`, el motor de voz del navegador/dispositivo. El archivo `speech-tts-fix.js` prefiere voces españolas locales y hace un segundo intento con la voz predeterminada del sistema si falla la voz elegida. No requiere cuentas, claves API ni pagos. La voz disponible depende del sistema operativo y del navegador; ningún código web puede producir audio si el dispositivo no tiene un motor de voz utilizable.

Si no se oye nada, prueba Chrome o Brave actualizado y comprueba que haya una voz española instalada/activada. En Android, abre Ajustes y busca **Texto a voz**; elige el motor disponible (por ejemplo, el motor de voz de Google) y descarga una voz en español. En Linux de escritorio, asegúrate de que el navegador tenga un motor TTS compatible y una voz española instalada. Después vuelve a cargar la página e inicia la lectura tocando Reproducir.

## Pruebas sugeridas

Abre Génesis 1, pulsa Reproducir, confirma que se escucha el primer versículo y que la lectura continúa al siguiente; prueba también pausa, reanudación, siguiente versículo y detener.

## Importante antes de distribuir

Los capítulos completos se obtienen desde fuentes externas y requieren conexión a Internet. Antes de distribuir públicamente el texto Reina-Valera 1960 y su lectura por voz, confirma que tienes la autorización de uso electrónico necesaria. Consulta la política de permisos de American Bible Society: https://www.americanbible.org/rights-and-permissions/
