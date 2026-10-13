/*
 * BYNIPO - reparación de lectura por voz para navegadores.
 * Usa la voz gratuita del dispositivo/navegador. No necesita cuentas, claves API ni pagos.
 * Se omite en la app Android, que dispone de su propio puente TextToSpeech.
 */
(function () {
  'use strict';
  if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') return;
  if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') return;

  var synth = window.speechSynthesis;
  if (synth.__bynipoTtsRepairV1) return;

  var originalSpeak = synth.speak.bind(synth);
  var maleHints = ['male', 'hombre', 'mascul', 'jorge', 'pablo', 'diego', 'carlos', 'luis', 'enrique', 'miguel'];
  var femaleHints = ['female', 'mujer', 'femen', 'laura', 'lucia', 'lucía', 'monica', 'mónica', 'sabina', 'elena', 'helena', 'paulina'];

  function includesHint(name, hints) {
    name = String(name || '').toLowerCase();
    return hints.some(function (hint) { return name.indexOf(hint) !== -1; });
  }

  function chooseSpanishVoice(utterance, localOnly) {
    var voices = [];
    try { voices = synth.getVoices() || []; } catch (_) {}
    var spanish = voices.filter(function (voice) {
      return /^es([_-]|$)/i.test(String(voice.lang || ''));
    });
    if (localOnly) spanish = spanish.filter(function (voice) { return voice.localService !== false; });
    if (!spanish.length) return null;

    var selectedName = utterance && utterance.voice ? utterance.voice.name : '';
    var wantsMale = includesHint(selectedName, maleHints) && !includesHint(selectedName, femaleHints);
    var wantsFemale = includesHint(selectedName, femaleHints);
    spanish.sort(function (a, b) {
      function score(voice) {
        var value = 0;
        if (voice.localService) value += 100;
        var lang = String(voice.lang || '').toLowerCase().replace('_', '-');
        if (/^es-(mx|us|419|co|ar|cl|pe|ve|cr|gt|hn|ni|pa|pr|do)/.test(lang)) value += 12;
        var name = String(voice.name || '');
        if (wantsMale && includesHint(name, maleHints)) value += 30;
        if (wantsFemale && includesHint(name, femaleHints)) value += 30;
        if (wantsMale && includesHint(name, femaleHints)) value -= 30;
        if (wantsFemale && includesHint(name, maleHints) && !includesHint(name, femaleHints)) value -= 30;
        return value;
      }
      return score(b) - score(a);
    });
    return spanish[0] || null;
  }

  function setPreferredVoice(utterance, localOnly) {
    var best = chooseSpanishVoice(utterance, localOnly);
    if (best) {
      // Prefer an installed local voice over a cloud voice that may fail offline or on restricted networks.
      if (!utterance.voice || utterance.voice.localService === false || !/^es([_-]|$)/i.test(String(utterance.voice.lang || ''))) {
        try { utterance.voice = best; } catch (_) {}
      }
      try { utterance.lang = (utterance.voice && utterance.voice.lang) || best.lang || 'es-ES'; } catch (_) {}
    } else if (!/^es([_-]|$)/i.test(String(utterance.lang || ''))) {
      // When there is no Spanish voice in the returned list, ask the system to use Spanish anyway.
      try { utterance.lang = 'es-ES'; } catch (_) {}
    }
    return best;
  }

  function showVoiceErrorNotice() {
    try {
      var id = 'bynipo-voice-error-notice';
      var old = document.getElementById(id);
      if (old) return;
      var notice = document.createElement('div');
      notice.id = id;
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      notice.textContent = 'No se pudo iniciar la voz. Activa o instala una voz española en los ajustes de texto a voz del dispositivo y vuelve a intentarlo.';
      notice.style.cssText = 'position:fixed;left:16px;right:16px;bottom:18px;z-index:2147483647;max-width:640px;margin:0 auto;padding:14px 16px;border-radius:12px;border:1px solid #d6a548;background:#fff8e6;color:#34220d;box-shadow:0 6px 24px rgba(0,0,0,.24);font:600 14px/1.45 system-ui,sans-serif;text-align:center;';
      document.body.appendChild(notice);
      setTimeout(function () { if (notice.parentNode) notice.parentNode.removeChild(notice); }, 9000);
    } catch (_) {}
  }

  function repairedSpeak(utterance) {
    if (!utterance || typeof utterance.text !== 'string') return originalSpeak(utterance);
    setPreferredVoice(utterance, true);

    var previousError = utterance.onerror;
    var retryUsed = false;
    utterance.onerror = function (event) {
      var errorName = event && event.error ? String(event.error) : '';
      // Do not retry cancellations or policy blocks; those should be controlled by the user gesture.
      if (!retryUsed && errorName !== 'canceled' && errorName !== 'interrupted' && errorName !== 'not-allowed') {
        retryUsed = true;
        var fallback;
        try {
          fallback = new window.SpeechSynthesisUtterance(utterance.text);
          fallback.rate = utterance.rate || 1;
          fallback.pitch = utterance.pitch || 1;
          fallback.volume = typeof utterance.volume === 'number' ? utterance.volume : 1;
          fallback.lang = 'es-ES';
          setPreferredVoice(fallback, true);
          fallback.onstart = utterance.onstart || null;
          fallback.onend = utterance.onend || null;
          fallback.onmark = utterance.onmark || null;
          fallback.onboundary = utterance.onboundary || null;
          fallback.onerror = function (fallbackEvent) {
            if (typeof previousError === 'function') {
              try { previousError.call(utterance, fallbackEvent); } catch (_) {}
            } else {
              showVoiceErrorNotice();
            }
          };
          originalSpeak(fallback);
          return;
        } catch (_) {
          // Report the original failure to the app if this retry could not be queued.
        }
      }
      if (typeof previousError === 'function') {
        try { previousError.call(utterance, event); } catch (_) {}
      } else {
        showVoiceErrorNotice();
      }
    };

    return originalSpeak(utterance);
  }

  try {
    Object.defineProperty(synth, 'speak', { configurable: true, writable: true, value: repairedSpeak });
    Object.defineProperty(synth, '__bynipoTtsRepairV1', { configurable: false, value: true });
    // Warm the voice list; some browsers fill it asynchronously after page load.
    try { synth.getVoices(); } catch (_) {}
  } catch (_) {
    // If a browser protects the API object, the app keeps using its native implementation.
  }
})();
