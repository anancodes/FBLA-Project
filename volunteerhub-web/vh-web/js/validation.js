/*
 * validation.js
 * Input validation.
 * Syntactic checks: is the input in the right FORMAT? (email shape, 10-digit phone)
 * Semantic checks:  does the input make SENSE? (those live with each form, e.g. no past event dates)
 * showErrors() displays each message next to its field and focuses the first problem.
 */
"use strict";

const V = {
  text: (value, label, min, max, multiline = false) => {
    const length = [...value].length;
    const controls = multiline ? /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/ : /[\x00-\x1F\x7F]/;
    if (length < min) return `Enter at least ${min} characters for ${label}.`;
    if (length > max) return `Keep ${label} to ${max.toLocaleString()} characters.`;
    return controls.test(value) ? "Remove unsupported control characters." : "";
  },
  name: v => V.text(v.trim(), "your name", 2, 80),
  email: v => v.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "Enter a valid email, like name@example.org." : "",
  phone: v => { const d = v.replace(/[\s\-().]/g, ""); return v.length > 30 || (d && !/^\d{10}$/.test(d)) ? "Phone must be 10 digits, like 555-123-4567." : ""; },
  password: (v, live) => {
    const length = [...v].length;
    if (length > 128) return "Use no more than 128 characters.";
    if (length < (live ? 15 : 8)) return live ? "Use at least 15 characters." : "Use at least 8 characters.";
    return "";
  },
};
function showErrors(form, errs, prefix = "e-"){
  form.querySelectorAll(".ferr").forEach(el => el.textContent = "");
  form.querySelectorAll("[aria-invalid]").forEach(el => el.removeAttribute("aria-invalid"));
  let first = null;
  Object.entries(errs).forEach(([k, msg]) => {
    if (!msg) return;
    const slot = form.querySelector(`#${prefix}${k}`); if (slot) slot.textContent = msg;
    const inp = form.querySelector(`[name="${k}"]`); if (inp){ inp.setAttribute("aria-invalid", "true"); if (!first) first = inp; }
  });
  if (first) first.focus();
  return !first;
}
