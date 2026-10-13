/*
 * BYNIPO — recuperación de voz web (versión 2).
 * Utiliza exclusivamente los motores de voz que el navegador/dispositivo exponga.
 * No usa cuentas, claves API, servicios de pago ni modifica el diseño de la app.
 * En la aplicación Android se usa el puente TextToSpeech nativo.
 */
(function () {
  'use strict';
  if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') return;
  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') return;

  var synth = window.speechSynthesis;
  if (synth.__bynipoTtsRepairV2) return;
  var originalSpeak = synth.speak.bind(synth);

  var maleHints = ['male', 'hombre', 'mascul', 'jorge', 'pablo', 'diego', 'carlos', 'luis', 'enrique', 'miguel', 'alonso', 'mateo'];
  var femaleHints = ['female', 'mujer', 'femen', 'laura', 'lucia', 'lucía', 'monica', 'mónica', 'sabina', 'elena', 'helena', 'paulina', 'carmen', 'sofia', 'sofía'];
  var latinLocales = ['es-mx', 'es-419', 'es-us', 'es-ni', 'es-gt', 'es-hn', 'es-cr', 'es-pa', 'es-co', 'es-ve', 'es-pe', 'es-ar', 'es-cl', 'es-do', 'es-pr'];

  function getVoices() {
    try { return synth.getVoices() || []; } catch (_) { return []; }
  }

  function isSpanish(voice) {
    var lang = String(voice && voice.lang || '').toLowerCase().replace(/_/g, '-');
    var name = String(voice && voice.name || '').toLowerCase();
    return /^es($|-)/.test(lang) || name.indexOf('spanish') >= 0 || name.indexOf('español') >= 0 || name.indexOf('castellano') >= 0;
  }

  function keyForVoice(voice) {
    if (!voice) return '';
    return [voice.voiceURI || '', voice.name || '', voice.lang || '', String(voice.localService)].join('|').toLowerCase();
  }

  function sortVoices(voices, preferredName) {
    var preferred = String(preferredName || '').toLowerCase();
    var wantsMale = maleHints.some(function (x) { return preferred.indexOf(x) >= 0; }) && !femaleHints.some(function (x) { return preferred.indexOf(x) >= 0; });
    var wantsFemale = femaleHints.some(function (x) { return preferred.indexOf(x) >= 0; });
    return voices.slice().sort(function (a, b) {
      function score(v) {
        var value = 0;
        var lang = String(v.lang || '').toLowerCase().replace(/_/g, '-');
        var name = String(v.name || '').toLowerCase();
        if (v.localService === true) value += 1000;
        else if (v.localService === false) value += 0;
        if (v.default) value += 30;
        if (latinLocales.indexOf(lang) >= 0) value += 35;
        if (lang === 'es-es') value += 10;
        if (wantsMale && maleHints.some(function (x) { return name.indexOf(x) >= 0; })) value += 20;
        if (wantsFemale && femaleHints.some(function (x) { return name.indexOf(x) >= 0; })) value += 20;
        if (wantsMale && femaleHints.some(function (x) { return name.indexOf(x) >= 0; })) value -= 20;
        if (wantsFemale && maleHints.some(function (x) { return name.indexOf(x) >= 0; }) && !femaleHints.some(function (x) { return name.indexOf(x) >= 0; })) value -= 20;
        return value;
      }
      return score(b) - score(a);
    });
  }

  function errorMessage(code) {
    switch (String(code || '').toLowerCase()) {
      case 'not-allowed':
        return 'El navegador bloqueó la reproducción por voz. Abre la aplicación directamente en Chrome o en el navegador habitual y pulsa Leer otra vez; no la abras desde una vista previa de otra aplicación.';
      case 'synthesis-unavailable':
        return 'Este navegador no tiene un motor de voz activo. En Android, activa o instala “Texto a voz de Google” en los ajustes del teléfono y vuelve a abrir la aplicación.';
      case 'language-unavailable':
      case 'voice-unavailable':
        return 'El dispositivo no encontró una voz compatible para leer en español. Activa o descarga una voz española en los ajustes de texto a voz y vuelve a intentarlo.';
      case 'network':
        return 'La voz seleccionada no pudo conectarse. Comprueba Internet o selecciona una voz española instalada en el dispositivo.';
      case 'audio-busy':
        return 'El audio del dispositivo está ocupado. Cierra otras aplicaciones que estén reproduciendo sonido y vuelve a intentarlo.';
      case 'audio-hardware':
        return 'El navegador no pudo acceder a la salida de audio. Comprueba el volumen, los auriculares y los permisos de sonido.';
      case 'text-too-long':
        return 'El motor de voz rechazó un fragmento demasiado largo. Intenta leer un versículo individual.';
      default:
        return 'Probé las voces disponibles, pero el dispositivo no pudo iniciar la lectura. Comprueba que el sonido esté activo y que haya un motor de texto a voz instalado.';
    }
  }

  // React can use this to show a cause-specific message after all voice fallbacks fail.
  window.__bynipoVoiceErrorMessage = errorMessage;

  function showVoiceErrorNotice(code) {
    try {
      var id = 'bynipo-voice-error-notice';
      var old = document.getElementById(id);
      if (old) old.parentNode.removeChild(old);
      var notice = document.createElement('div');
      notice.id = id;
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      notice.textContent = errorMessage(code) + (code ? ' (Detalle: ' + code + ')' : '');
      notice.style.cssText = 'position:fixed;left:16px;right:16px;bottom:18px;z-index:2147483647;max-width:640px;margin:0 auto;padding:14px 16px;border-radius:12px;border:1px solid #d6a548;background:#fff8e6;color:#34220d;box-shadow:0 6px 24px rgba(0,0,0,.24);font:600 14px/1.45 system-ui,sans-serif;text-align:center;';
      document.body.appendChild(notice);
      setTimeout(function () { if (notice.parentNode) notice.parentNode.removeChild(notice); }, 12000);
    } catch (_) {}
  }

  function prepareInitialUtterance(utterance) {
    var voices = getVoices();
    var spanish = sortVoices(voices.filter(isSpanish), utterance.voice && utterance.voice.name);
    var localSpanish = spanish.filter(function (v) { return v.localService !== false; });
    var currentVoice = utterance.voice;
    var currentIsSpanish = currentVoice && isSpanish(currentVoice);
    // Replace a cloud/remote selection with an installed Spanish voice when possible.
    if (localSpanish.length && (!currentVoice || !currentIsSpanish || currentVoice.localService === false)) {
      try { utterance.voice = localSpanish[0]; } catch (_) {}
    } else if (!currentVoice && spanish.length) {
      try { utterance.voice = spanish[0]; } catch (_) {}
    }
    if (utterance.voice && utterance.voice.lang) {
      try { utterance.lang = utterance.voice.lang; } catch (_) {}
    } else if (!utterance.lang) {
      try { utterance.lang = 'es-MX'; } catch (_) {}
    }
  }

  function makeFallbackPlans(original, currentVoiceKey, currentLang) {
    var allVoices = sortVoices(getVoices().filter(isSpanish), original.voice && original.voice.name);
    var plans = [];
    var added = Object.create(null);
    allVoices.forEach(function (voice) {
      var key = keyForVoice(voice);
      if (!key || key === currentVoiceKey || added['voice:' + key]) return;
      added['voice:' + key] = true;
      plans.push({ voice: voice, lang: voice.lang || 'es-MX', key: 'voice:' + key });
    });
    // If voice objects fail, ask the engine for Spanish using its built-in selection.
    ['es-MX', 'es-419', 'es-ES', ''].forEach(function (lang) {
      var key = 'lang:' + lang;
      if (added[key] || (lang && !original.voice && lang === currentLang)) return;
      added[key] = true;
      plans.push({ voice: null, lang: lang, key: key });
    });
    return plans;
  }

  function isRetryable(code) {
    code = String(code || '').toLowerCase();
    return code !== 'canceled' && code !== 'cancelled' && code !== 'interrupted' &&
      code !== 'not-allowed' && code !== 'audio-busy' && code !== 'audio-hardware' &&
      code !== 'text-too-long' && code !== 'invalid-argument';
  }

  function repairedSpeak(utterance) {
    if (!utterance || typeof utterance.text !== 'string') return originalSpeak(utterance);

    prepareInitialUtterance(utterance);
    var originalHandlers = {
      onstart: utterance.onstart,
      onend: utterance.onend,
      onerror: utterance.onerror,
      onboundary: utterance.onboundary,
      onmark: utterance.onmark
    };
    var hasStarted = false;
    var fallbackPlans = null;
    var nextPlan = 0;
    var currentVoiceKey = keyForVoice(utterance.voice);
    var currentLang = String(utterance.lang || '');
    var tried = Object.create(null);
    if (currentVoiceKey) tried['voice:' + currentVoiceKey] = true;
    if (!currentVoiceKey) tried['lang:' + currentLang] = true;

    function callOriginalError(event) {
      var code = event && event.error ? String(event.error) : 'synthesis-failed';
      if (typeof originalHandlers.onerror === 'function') {
        try { originalHandlers.onerror.call(utterance, event || { error: code }); } catch (_) {}
      } else {
        showVoiceErrorNotice(code);
      }
    }

    function startNextFallback(lastEvent) {
      if (!fallbackPlans) fallbackPlans = makeFallbackPlans(utterance, currentVoiceKey, currentLang);
      while (nextPlan < fallbackPlans.length) {
        var plan = fallbackPlans[nextPlan++];
        if (tried[plan.key]) continue;
        tried[plan.key] = true;
        var fallback;
        try {
          fallback = new window.SpeechSynthesisUtterance(utterance.text);
          fallback.rate = Number(utterance.rate) || 1;
          fallback.pitch = Number(utterance.pitch) || 1;
          fallback.volume = typeof utterance.volume === 'number' ? utterance.volume : 1;
          fallback.lang = plan.lang;
          fallback.voice = plan.voice || null;
          if (plan.voice && plan.voice.lang) fallback.lang = plan.voice.lang;
          fallback.onstart = function (event) {
            hasStarted = true;
            if (typeof originalHandlers.onstart === 'function') originalHandlers.onstart.call(utterance, event);
          };
          fallback.onend = function (event) {
            if (typeof originalHandlers.onend === 'function') originalHandlers.onend.call(utterance, event);
          };
          fallback.onboundary = originalHandlers.onboundary || null;
          fallback.onmark = originalHandlers.onmark || null;
          fallback.onerror = function (event) {
            var code = event && event.error ? String(event.error) : 'synthesis-failed';
            if (!hasStarted && isRetryable(code)) {
              startNextFallback(event);
              return;
            }
            callOriginalError(event || { error: code });
          };
          originalSpeak(fallback);
          return;
        } catch (_) {
          // Continue to the next available engine/voice if a fallback cannot be queued.
        }
      }
      callOriginalError(lastEvent || { error: 'synthesis-unavailable' });
    }

    utterance.onstart = function (event) {
      hasStarted = true;
      if (typeof originalHandlers.onstart === 'function') originalHandlers.onstart.call(utterance, event);
    };
    utterance.onerror = function (event) {
      var code = event && event.error ? String(event.error) : 'synthesis-failed';
      if (!hasStarted && isRetryable(code)) {
        startNextFallback(event);
        return;
      }
      callOriginalError(event || { error: code });
    };

    try {
      return originalSpeak(utterance);
    } catch (_) {
      startNextFallback({ error: 'synthesis-failed' });
      return undefined;
    }
  }

  try {
    Object.defineProperty(synth, 'speak', { configurable: true, writable: true, value: repairedSpeak });
    Object.defineProperty(synth, '__bynipoTtsRepairV2', { configurable: false, value: true });
    // Ask the browser for voices; many browsers populate this list asynchronously.
    try { synth.getVoices(); } catch (_) {}
  } catch (_) {
    // If the browser protects the method, keep its native implementation.
  }
})();
