# Informe de auditoría y corrección de voz — BYNIPO v2

Fecha: 13 de octubre de 2026

## Síntoma reportado

La app mostraba: “No se pudo iniciar la voz. Activa o instala una voz española en los ajustes de texto a voz del dispositivo.”

## Hallazgo técnico

El paquete anterior hacía un solo reintento y podía volver a usar exactamente la misma voz que ya había fallado. También mostraba el mismo texto para distintos fallos (`not-allowed`, `synthesis-unavailable`, `language-unavailable`, `network`, etc.), de modo que el mensaje no señalaba la causa real.

## Cambios en esta versión

1. `speech-tts-fix.js` ahora intenta distintas voces españolas disponibles, prioriza las locales instaladas y evita repetir la misma voz en los reintentos.
2. Si fallan las voces explícitas, pide al sintetizador usar sus voces predeterminadas con distintas etiquetas de idioma y, por último, con el idioma predeterminado del sistema.
3. Si el navegador bloquea el audio por una política de reproducción (`not-allowed`), no realiza reintentos que el navegador volvería a bloquear; muestra una explicación práctica.
4. Los mensajes ahora dependen del error real devuelto por Web Speech API. Se expone `window.__bynipoVoiceErrorMessage` para mantener el mensaje común entre la capa de voz y la interfaz.
5. Android prueba español de México, español de EE. UU., español de España, español genérico y luego el idioma del teléfono. Los fallos de inicialización nativa ya no dejan las solicitudes en espera indefinidamente.
6. Se actualizó el código fuente, el JavaScript web ya empaquetado y la copia Android del mismo recurso. El bundle modificado recibe el nuevo nombre `index-tts-v2.js` para evitar reutilizar el bundle antiguo desde caché. No se cambiaron estilos ni distribución visual.

## Pruebas ejecutadas

- Revisión estática del adaptador y comprobación de sintaxis JavaScript con Node.js.
- Pruebas automatizadas con un motor de voz simulado: se verifican la selección local española, el cambio a voces alternativas y el reporte del error solo cuando fallan los reintentos.
- Comprobación sintáctica del bundle estático y de coincidencia entre copias web/Android.
- Prueba de integridad de los archivos ZIP de distribución.

## Limitación importante

Web Speech API necesita un motor de síntesis que el navegador o el dispositivo exponga. El código puede cambiar de voz y probar alternativas, pero no puede instalar silenciosamente un motor de voz ausente. Si la última causa es `synthesis-unavailable`, hay que activar/instalar un motor de texto a voz en el dispositivo. Si el error es `not-allowed`, se debe iniciar desde una interacción directa en el navegador, no desde una vista previa embebida.

No se afirma haber probado audio físico ni un teléfono real desde este entorno. Tampoco se genera un APK firmado en este paquete; se entrega el proyecto Android Studio actualizado.
