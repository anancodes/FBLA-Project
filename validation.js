/*
 * validation.js
 * Input validation.
 * Syntactic checks: is the input in the right FORMAT? (email shape, 10-digit phone)
 * Semantic checks:  does the input make SENSE? (those live with each form, e.g. no past event dates)
 * showErrors() displays each message next to its field and focuses the first problem.
 */
"use strict";

const V = {
  name: v => !v.trim() ? "Enter your name." : v.trim().length < 2 ? "Name must be at least 2 characters." : "",
  email: v => !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(v.trim()) ? "Enter a valid email, like name@example.org." : "",
  phone: v => { const d = v.replace(/[\s\-().]/g, ""); return d && !/^\d{10}$/.test(d) ? "Phone must be 10 digits, like 555-123-4567." : ""; },
  password: v => v.length < 8 ? "Password must be at least 8 characters." : (!/\d/.test(v) || !/[A-Za-z]/.test(v)) ? "Password needs at least one letter and one number." : "",
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
