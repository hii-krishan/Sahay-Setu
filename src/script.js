/* ============================================================
   SAHAY-SETU — app.js
   All interactions, navigation, and animations
   ============================================================ */

'use strict';

/* ============================================================
   NAVIGATION
   ============================================================ */

function showSection(name) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  // Remove active nav links
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  // Show target section
  const target = document.getElementById('section-' + name);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Activate nav link
  const navLink = document.getElementById('nav-' + name);
  if (navLink) navLink.classList.add('active');

  // Close hamburger menu if open
  const navLinks = document.getElementById('navLinks');
  navLinks.classList.remove('open');
  document.getElementById('hamburger')?.setAttribute('aria-expanded', 'false');

  // Special init per section
  if (name === 'ngo') checkNgoAuth();
  if (name === 'government') checkGovAuth();
}

function toggleMenu() {
  const navLinks = document.getElementById('navLinks');
  const isOpen = navLinks.classList.toggle('open');
  document.getElementById('hamburger')?.setAttribute('aria-expanded', String(isOpen));
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

/* ============================================================
   TAB SWITCHING — Citizen
   ============================================================ */

function showCitizenTab(tab) {
  document.querySelectorAll('#section-citizen .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#section-citizen .sub-tab').forEach(t => t.classList.remove('active'));

  const content = document.getElementById('citizen-tab-' + tab);
  const btn = document.getElementById('ctab-' + tab);
  if (content) content.classList.add('active');
  if (btn) btn.classList.add('active');
}

/* ============================================================
   TAB SWITCHING — NGO
   ============================================================ */

function showNGOTab(tab) {
  document.querySelectorAll('#section-ngo .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#section-ngo .sub-tab').forEach(t => t.classList.remove('active'));

  const content = document.getElementById('ngo-tab-' + tab);
  const btn = document.getElementById('ntab-' + tab);
  if (content) content.classList.add('active');
  if (btn) btn.classList.add('active');

  const user = window.getCurrentAuthUser?.();
  if (user && user.app_metadata?.role === 'ngo') {
    if (!window._ngoLoadedOnce) {
      loadNGODashboard();
    }
  }
}

/* ============================================================
   TAB SWITCHING — Government
   ============================================================ */

function showGovTab(tab) {
  document.querySelectorAll('#section-government .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#section-government .sub-tab').forEach(t => t.classList.remove('active'));

  const content = document.getElementById('gov-tab-' + tab);
  const btn = document.getElementById('gtab-' + tab);
  if (content) content.classList.add('active');
  if (btn) btn.classList.add('active');
  if (tab === 'alerts') loadGovernmentAlerts();
  if (tab === 'ngos') loadGovernmentNGOs();
  if (tab === 'operations') loadGovernmentOperations();
  if (tab === 'analytics') loadGovernmentAnalytics();
}

/* ============================================================
   DISASTER GUIDE
   ============================================================ */

function showDisasterGuide(type, btn) {
  document.querySelectorAll('.disaster-guide').forEach(g => g.classList.remove('active'));
  document.querySelectorAll('.dis-btn').forEach(b => b.classList.remove('active'));

  const guide = document.getElementById('guide-' + type);
  if (guide) guide.classList.add('active');
  if (btn) btn.classList.add('active');
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

let toastTimer = null;

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

const API_BASE_URL = (window.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5001/api')).replace(/\/$/, '');

async function loadApprovedOrganizationOptions() {
  const selects = [document.getElementById('vol-ngo'), document.getElementById('donate-ngo')].filter(Boolean);
  if (!selects.length) return;
  try {
    const response = await fetch(`${API_BASE_URL}/public/ngos`);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load approved NGOs.');
    for (const select of selects) select.innerHTML = '<option value="">No organization selected</option>' + (result.organizations || []).map(ngo =>
      `<option value="${escapeHTML(ngo.publicId)}">${escapeHTML(ngo.organizationName)} — ${escapeHTML(ngo.location)}</option>`
    ).join('');
  } catch (error) {
    for (const select of selects) select.innerHTML = '<option value="">Organization list unavailable</option>';
    console.warn('Approved NGO list unavailable:', error.message);
  }
}




async function saveCitizenData(kind, payload) {
  const protectedKinds = ["help", "volunteers", "donations"];
  const requiresAuth = protectedKinds.includes(kind);
  const client = window.supabase;
  const demoSession = localStorage.getItem('sahaySetuDemoSession');

  let accessToken = "";

  if (requiresAuth) {
    if (demoSession) {
      return {
        success: true,
        requestId: `SS-DEMO-${Date.now().toString(36).toUpperCase()}`,
        demo: true
      };
    }
    if (!client) {
      throw new Error("Authentication is loading. Please try again.");
    }

    const {
      data: { session },
      error
    } = await client.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("Please sign in before continuing.");
    }

    accessToken = session.access_token;
  }

  const headers = {
    "Content-Type": "application/json"
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/citizen/${kind}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
  } catch (_error) {
    throw new Error(
      "Cannot reach the Sahay-Setu server. Please try again."
    );
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    if (response.status === 401 && requiresAuth) await clearExpiredLocalSession(client);
    throw new Error(
      response.status === 401
        ? "Your session expired. Please sign in again."
        : result.message || "Unable to save your submission."
    );
  }

  return result;
}

async function authorizedApi(path, options = {}) {
  const client = window.supabase;
  const demoSession = localStorage.getItem('sahaySetuDemoSession');
  let token = '';

  if (demoSession) {
    try {
      const parsed = JSON.parse(demoSession);
      token = parsed?.app_metadata?.role === 'ngo' ? 'DEMO_NGO_TOKEN' : 'DEMO_GOVERNMENT_TOKEN';
    } catch {
      token = 'DEMO_GOVERNMENT_TOKEN';
    }
  }

  if (!token && client) {
    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (!error && session?.access_token) token = session.access_token;
    } catch (_e) {}
  }

  if (!token && demoSession) {
    token = 'DEMO_GOVERNMENT_TOKEN';
  }

  if (!token) throw new Error('Please sign in with your authorized account.');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });

  const result = await response.json().catch(() => ({}));

  if (response.status === 401 && client && !demoSession) {
    await clearExpiredLocalSession(client);
  }

  if (!response.ok || !result.success) throw new Error(result.message || 'The request could not be completed.');
  return result;
}

async function clearExpiredLocalSession(client) {
  try { await client.auth.signOut({ scope: 'local' }); }
  catch (error) { console.warn('Could not clear the expired local session:', error.message); }
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

/* ============================================================
   MODAL
   ============================================================ */

function openModal(html) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = html;
  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

/* ============================================================
   FORM SUBMISSIONS
   ============================================================ */

async function submitReport(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  const type = document.getElementById('rep-type').value;
  const loc = document.getElementById('rep-location').value;
  const severity = document.querySelector('input[name="severity"]:checked');

  if (!severity) {
    showToast('⚠️ Please select a severity level.', 'error');
    return;
  }

  submitButton.disabled = true;
  try {
  const saved = await saveCitizenData('reports', {
    name: document.getElementById('rep-name').value.trim(),
    phone: document.getElementById('rep-phone').value.trim(),
    type, location: loc, severity: severity.value,
    peopleAffected: Number(document.getElementById('rep-affected').value) || null,
    injuries: document.getElementById('rep-injuries').value,
    description: document.getElementById('rep-desc').value.trim(),
    alternateContact: document.getElementById('rep-contact').value.trim()
  });
  const reqId = saved.requestId;

  openModal(`
    <div class="submission-success-card">
      <div class="success-icon-badge">
        <span class="success-check-mark">✓</span>
      </div>
      <h2 class="success-modal-title">Emergency Report Submitted!</h2>
      <p class="success-modal-desc">Your emergency report has been saved and routed to the central response dispatch queue.</p>

      <div class="request-id-container">
        <span class="request-id-heading">YOUR EMERGENCY TRACKING ID</span>
        <div class="request-id-display-row">
          <span class="request-id-token" id="modalReqIdDisplay">${escapeHTML(reqId)}</span>
          <button type="button" class="btn-copy-token" onclick="copyModalReqId('${escapeHTML(reqId)}', this)" aria-label="Copy request ID">
            📋 Copy ID
          </button>
        </div>
      </div>

      <div class="submission-details-table">
        <div class="details-row">
          <span class="details-key">Disaster Type</span>
          <span class="details-val highlight-val">${escapeHTML(type)}</span>
        </div>
        <div class="details-row">
          <span class="details-key">Location / Address</span>
          <span class="details-val">${escapeHTML(loc)}</span>
        </div>
        <div class="details-row">
          <span class="details-key">Reported Severity</span>
          <span class="badge ${String(severity.value).toLowerCase()}">${String(severity.value).toUpperCase()}</span>
        </div>
        <div class="details-row">
          <span class="details-key">Initial Status</span>
          <span class="badge low">Submitted (Under Review)</span>
        </div>
      </div>

      <div class="submission-tip-alert">
        <span class="tip-icon">ℹ️</span>
        <span class="tip-text"><strong>Keep this Request ID</strong> to check live dispatch and rescue status in the <em>Track Status</em> tab.</span>
      </div>

      <div class="modal-btn-row">
        <button type="button" onclick="showCitizenTab('track'); const tid=document.getElementById('track-id'); if(tid){tid.value='${escapeHTML(reqId)}'; trackRequest();} closeModal();" class="btn btn-primary">
          📊 Track Status
        </button>
        <button type="button" onclick="closeModal()" class="btn btn-secondary">
          Close Window
        </button>
      </div>
    </div>
  `);

  form.reset();
  } catch (error) {
    showToast(`⚠️ ${error.message}`, 'error');
  } finally {
    submitButton.disabled = false;
  }
}

async function submitHelpRequest(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  const types = [...form.querySelectorAll('.help-type-grid input:checked')].map(input => input.value);
  if (!types.length) { showToast('Please select at least one type of help.', 'error'); return; }
  const name = document.getElementById('req-name').value;
  const loc = document.getElementById('req-loc').value;
  submitButton.disabled = true;
  try {
  const saved = await saveCitizenData('help', {
    name: name.trim(), location: loc.trim(), helpTypes: types,
    people: Number(document.getElementById('req-people').value) || 1,
    urgency: document.getElementById('req-urgent').value,
    details: document.getElementById('req-details').value.trim()
  });
  const reqId = saved.requestId;

  openModal(`
    <div class="submission-success-card">
      <div class="success-icon-badge">
        <span class="success-check-mark">🆘</span>
      </div>
      <h2 class="success-modal-title">Help Request Submitted!</h2>
      <p class="success-modal-desc">Hi <strong>${escapeHTML(name)}</strong>, your relief request has been safely recorded for field teams.</p>

      <div class="request-id-container">
        <span class="request-id-heading">YOUR HELP REQUEST TRACKING ID</span>
        <div class="request-id-display-row">
          <span class="request-id-token" id="modalReqIdDisplay">${escapeHTML(reqId)}</span>
          <button type="button" class="btn-copy-token" onclick="copyModalReqId('${escapeHTML(reqId)}', this)" aria-label="Copy request ID">
            📋 Copy ID
          </button>
        </div>
      </div>

      <div class="submission-details-table">
        <div class="details-row">
          <span class="details-key">Applicant</span>
          <span class="details-val">${escapeHTML(name)}</span>
        </div>
        <div class="details-row">
          <span class="details-key">Location</span>
          <span class="details-val">${escapeHTML(loc)}</span>
        </div>
        <div class="details-row">
          <span class="details-key">Required Assistance</span>
          <span class="details-val highlight-val">${escapeHTML(types.join(', '))}</span>
        </div>
        <div class="details-row">
          <span class="details-key">Status</span>
          <span class="badge low">Submitted</span>
        </div>
      </div>

      <div class="submission-tip-alert">
        <span class="tip-icon">ℹ️</span>
        <span class="tip-text">Keep this Request ID to check for relief dispatch progress and NGO updates.</span>
      </div>

      <div class="modal-btn-row">
        <button type="button" onclick="showCitizenTab('track'); const tid=document.getElementById('track-id'); if(tid){tid.value='${escapeHTML(reqId)}'; trackRequest();} closeModal();" class="btn btn-primary">
          📊 Track Status
        </button>
        <button type="button" onclick="closeModal()" class="btn btn-secondary">
          Close Window
        </button>
      </div>
    </div>
  `);
  form.reset();
  } catch (error) {
    showToast(`⚠️ ${error.message}`, 'error');
  } finally {
    submitButton.disabled = false;
  }
}

async function submitVolunteer(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  const name = document.getElementById('vol-name').value;
  const skillLabels = [...form.querySelectorAll('.help-type-grid input:checked')].map(input => input.nextElementSibling.textContent.trim());
  submitButton.disabled = true;
  try {
  await saveCitizenData('volunteers', {
    name: name.trim(), age: Number(document.getElementById('vol-age').value),
    phone: document.getElementById('vol-phone').value.trim(), email: document.getElementById('vol-email').value.trim(),
    location: document.getElementById('vol-location').value.trim(), skills: skillLabels,
    availability: document.getElementById('vol-avail').value,
    organizationId: document.getElementById('vol-ngo')?.value || undefined
  });

  openModal(`
    <div class="submission-success-card">
      <div class="success-icon-badge">
        <span class="success-check-mark">👐</span>
      </div>
      <h2 class="success-modal-title">Welcome, Volunteer!</h2>
      <p class="success-modal-desc">Thank you, <strong>${escapeHTML(name)}</strong>! You've been officially registered as a Sahay-Setu community volunteer.</p>

      <div class="submission-details-table">
        <div class="details-row">
          <span class="details-key">Volunteer Name</span>
          <span class="details-val">${escapeHTML(name)}</span>
        </div>
        <div class="details-row">
          <span class="details-key">Registered Skills</span>
          <span class="details-val highlight-val">${escapeHTML(skillLabels.join(', ') || 'General relief')}</span>
        </div>
        <div class="details-row">
          <span class="details-key">Status</span>
          <span class="badge low">Active Volunteer</span>
        </div>
      </div>

      <div class="submission-tip-alert">
        <span class="tip-icon">🎉</span>
        <span class="tip-text">Your volunteer profile has been registered. Field coordinators may contact you during community relief missions.</span>
      </div>

      <div class="modal-btn-row">
        <button type="button" onclick="closeModal()" class="btn btn-primary">
          Continue 🙏
        </button>
      </div>
    </div>
  `);
  form.reset();
  } catch (error) {
    showToast(`⚠️ ${error.message}`, 'error');
  } finally {
    submitButton.disabled = false;
  }
}

function processDonation() {
  showToast('Please contribute directly via the official Government and NGO portals linked in the Relief Funds directory.', 'info');
}

async function issueAlert(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const severity = form.querySelector('input[name="alert-sev"]:checked');
  if (!severity) { showToast('Please select a severity level.', 'error'); return; }
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await authorizedApi('/government/alerts', { method: 'POST', body: JSON.stringify({
      title: document.getElementById('alert-title').value.trim(),
      area: document.getElementById('alert-area').value.trim(),
      severity: severity.value,
      type: document.getElementById('alert-type').value,
      population: Number(document.getElementById('alert-pop').value) || 0,
      message: document.getElementById('alert-msg').value.trim()
    }) });
    form.reset();
    showToast('Alert saved as active.', 'success');
    await loadGovernmentAlerts();
  } catch (error) { showToast(error.message, 'error'); }
  finally { button.disabled = false; }
}
function showNGOApplicationForm() {
  openModal(`<h2>Apply for NGO Verification</h2><p>Submit your organization's legal registration details for review by disaster management authorities.</p><form id="ngoApplicationForm" class="modal-form"><label>Organization name<input name="organizationName" maxlength="160" required></label><label>Operating location<input name="location" maxlength="160" required></label><label>Registration number<input name="registrationNumber" maxlength="80" required></label><label>Specialties (comma separated)<input name="specialties" maxlength="300" required></label><button class="btn btn-primary" type="submit">Submit application</button></form>`);
  document.getElementById('ngoApplicationForm').addEventListener('submit', submitNGOApplication);
}

async function submitNGOApplication(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  const values = new FormData(form);
  try {
    const result = await authorizedApi('/ngo/applications', { method: 'POST', body: JSON.stringify({ organizationName: values.get('organizationName'), location: values.get('location'), registrationNumber: values.get('registrationNumber'), specialties: String(values.get('specialties')).split(',').map(value => value.trim()).filter(Boolean) }) });
    closeModal(); showToast(`NGO application submitted (${result.status}).`, 'success');
  } catch (error) { showToast(error.message, 'error'); }
  finally { button.disabled = false; }
}

async function loadGovernmentNGOs() {
  const body = document.getElementById('governmentNgoApplicationsBody');
  if (!body) return;
  body.innerHTML = '<tr><td colspan="7">Loading NGO applications…</td></tr>';
  try {
    const result = await authorizedApi('/government/ngos');
    const applications = result.applications || [];
    body.innerHTML = applications.map(application => {
      const isPending = application.status === 'Pending';
      const isApproved = application.status === 'Approved';

      let actionButtons = '';
      if (isPending) {
        actionButtons = `
          <div class="ngo-action-btn-group">
            <button type="button" class="btn-sm btn-accept" data-ngo-application="${escapeHTML(application._id)}" data-review-status="Approved">Approve</button>
            <button type="button" class="btn-sm btn-reject" data-ngo-application="${escapeHTML(application._id)}" data-review-status="Rejected">Reject</button>
          </div>
        `;
      } else if (isApproved) {
        actionButtons = `
          <div class="ngo-action-btn-group">
            <span class="status-reviewed-tag">Approved</span>
            <button type="button" class="btn-sm btn-subtle-reject" data-ngo-application="${escapeHTML(application._id)}" data-review-status="Rejected" title="Revoke and Reject">Reject</button>
          </div>
        `;
      } else {
        actionButtons = `
          <div class="ngo-action-btn-group">
            <span class="status-reviewed-tag rejected">Rejected</span>
            <button type="button" class="btn-sm btn-subtle-approve" data-ngo-application="${escapeHTML(application._id)}" data-review-status="Approved" title="Re-approve application">Approve</button>
          </div>
        `;
      }

      return `<tr>
        <td><strong>${escapeHTML(application.organizationName)}</strong></td>
        <td>${escapeHTML(application.location)}</td>
        <td>${escapeHTML(Array.isArray(application.specialties) ? application.specialties.join(', ') : application.specialties || '')}</td>
        <td><code>${escapeHTML(application.registrationNumber || '—')}</code></td>
        <td>${application.createdAt ? escapeHTML(new Date(application.createdAt).toLocaleDateString('en-IN')) : '—'}</td>
        <td><span class="badge ${isPending ? 'medium' : isApproved ? 'low' : 'critical'}">${escapeHTML(application.status)}</span></td>
        <td>${actionButtons}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="7">No NGO applications have been submitted.</td></tr>';

    body.onclick = async event => {
      const button = event.target.closest('[data-ngo-application]');
      if (!button) return;
      const appId = button.dataset.ngoApplication;
      const reviewStatus = button.dataset.reviewStatus;
      button.disabled = true;
      const originalText = button.textContent;
      button.textContent = 'Updating...';
      try {
        await authorizedApi(`/government/ngos/${encodeURIComponent(appId)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: reviewStatus })
        });
        showToast(`NGO application marked ${reviewStatus} successfully.`, 'success');
        await loadGovernmentNGOs();
      } catch (error) {
        button.disabled = false;
        button.textContent = originalText;
        showToast(error.message, 'error');
      }
    };
  } catch (error) {
    console.warn('Government NGO list lookup error:', error.message);
    body.innerHTML = `<tr><td colspan="7" class="request-empty-state">Unable to load NGO applications: ${escapeHTML(error.message)}</td></tr>`;
  }
}

function renderGovernmentBars(id, entries, labelKey, valueKey) {
  const target = document.getElementById(id); if (!target) return;
  if (!entries?.length) { target.textContent = 'No data is available yet.'; return; }
  const max = Math.max(1, ...entries.map(entry => Number(entry[valueKey]) || 0));
  target.innerHTML = entries.map(entry => { const value = Math.max(0, Number(entry[valueKey]) || 0); const width = Math.min(100, value / max * 100); return `<div class="bc-item"><span>${escapeHTML(entry[labelKey])}</span><div class="bc-bar" style="width:${width}%"><span>${escapeHTML(value)}</span></div></div>`; }).join('');
}

async function loadGovernmentAnalytics() {
  const ids = ['govReportTypeChart', 'govStatusChart', 'govRegionsChart', 'govResourceChart', 'govMonthlyChart'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = 'Loading live data…'; });
  try {
    const { analytics } = await authorizedApi('/government/analytics');
    renderGovernmentBars('govReportTypeChart', analytics.reportTypes, 'type', 'count');
    renderGovernmentBars('govStatusChart', analytics.statuses, 'status', 'count');
    renderGovernmentBars('govRegionsChart', analytics.regions, 'region', 'count');
    renderGovernmentBars('govResourceChart', (analytics.resources || []).map(item => ({ type: item.type, available: item.available })), 'type', 'available');
    renderGovernmentBars('govMonthlyChart', analytics.monthly, 'month', 'count');
  } catch (error) {
    renderGovernmentBars('govReportTypeChart', [{ type: 'Flood', count: 14 }, { type: 'Medical', count: 9 }, { type: 'Cyclone', count: 7 }, { type: 'Fire', count: 4 }], 'type', 'count');
    renderGovernmentBars('govStatusChart', [{ status: 'Submitted', count: 8 }, { status: 'In Progress', count: 12 }, { status: 'Resolved', count: 14 }], 'status', 'count');
    renderGovernmentBars('govRegionsChart', [{ region: 'Bihar', count: 11 }, { region: 'Odisha', count: 8 }, { region: 'Maharashtra', count: 7 }, { region: 'Uttarakhand', count: 5 }], 'region', 'count');
    renderGovernmentBars('govResourceChart', [{ type: 'Food packets', available: 720 }, { type: 'Water', available: 4200 }, { type: 'First-aid kits', available: 145 }], 'type', 'available');
    renderGovernmentBars('govMonthlyChart', [{ month: 'Aug', count: 8 }, { month: 'Sep', count: 13 }, { month: 'Oct', count: 21 }], 'month', 'count');
    console.warn('Government analytics unavailable; showing demo data:', error.message);
  }
}

async function loadGovernmentOperations() {
  const grid = document.getElementById('governmentOperationsGrid'); if (!grid) return;
  grid.innerHTML = '<p class="request-empty-state">Loading live operations…</p>';
  try {
    const data = await authorizedApi('/government/operations');
    const items = [
      ...(data.alerts || []).map(alert => ({ title: alert.title, location: alert.area, status: alert.severity || alert.status, kind: 'Active alert' })),
      ...(data.reports || []).map(item => ({ title: `${item.type} · ${item.requestId}`, location: item.location, status: item.status, kind: 'Emergency report' })),
      ...(data.requests || []).map(item => ({ title: `${item.type} · ${item.requestId}`, location: item.location, status: item.status, kind: 'Help request' })),
      ...(data.camps || []).map(camp => ({ title: camp.name, location: camp.location, status: camp.status, kind: `${camp.disasterType || 'Relief'} camp · capacity ${camp.capacity ?? 'unknown'}` }))
    ];
    const resources = data.resourceSummary || { total: 0, available: 0 };
    grid.innerHTML = `<div class="op-card"><div class="op-header"><h4>Resource inventory</h4><span class="badge low">LIVE</span></div><div class="op-meta"><span>Total: ${escapeHTML(resources.total)}</span><span>Available: ${escapeHTML(resources.available)}</span></div></div>` + (items.map(item => `<div class="op-card"><div class="op-header"><h4>${escapeHTML(item.title)}</h4><span class="badge medium">${escapeHTML(item.status)}</span></div><div class="op-meta"><span>${escapeHTML(item.kind)}</span><span>${escapeHTML(item.location || 'Location not provided')}</span></div></div>`).join('') || '<p class="request-empty-state">No active reports, requests, camps, or alerts are recorded.</p>');
  } catch (error) {
    const items = [...MOCK_DATA.alerts.map(alert => ({ title: alert.title, location: alert.area, status: alert.severity, kind: 'Active alert' })), ...MOCK_DATA.camps.map(camp => ({ title: camp.name, location: camp.location, status: camp.status, kind: 'Relief camp' }))];
    grid.innerHTML = `<div class="op-card"><div class="op-header"><h4>Resource inventory</h4><span class="badge low">DEMO</span></div><div class="op-meta"><span>Total: 7,200</span><span>Available: 5,065</span></div></div>` + items.map(item => `<div class="op-card"><div class="op-header"><h4>${escapeHTML(item.title)}</h4><span class="badge medium">${escapeHTML(item.status)}</span></div><div class="op-meta"><span>${escapeHTML(item.kind)}</span><span>${escapeHTML(item.location)}</span></div></div>`).join('');
    console.warn('Government operations unavailable; showing demo data:', error.message);
  }
}

/* ============================================================
   REQUEST ACTIONS
   ============================================================ */

function acceptRequest(id) {
  updateNGORequestStatus(id, 'In Progress');
}

function showAddResource() {
  openModal(`
    <div class="modal-form-wrap">
      <h3 class="modal-heading">📦 Add Relief Resource</h3>
      <div class="modal-form-fields">
        <div class="form-group">
          <label for="new-res-type">Resource Type / Category</label>
          <select id="new-res-type" class="enhanced-select" onchange="const c = document.getElementById('new-res-custom-wrap'); if(c) c.style.display = (this.value === 'Other' ? 'block' : 'none');">
            <option value="🍱 Food Packets">🍱 Food Packets</option>
            <option value="💧 Water (Litres)">💧 Water (Litres)</option>
            <option value="💊 Medicine Kits">💊 Medicine Kits</option>
            <option value="🏠 Shelter Kits">🏠 Shelter Kits</option>
            <option value="👕 Clothing Bundles">👕 Clothing Bundles</option>
            <option value="Other">Other (Custom item)</option>
          </select>
        </div>
        <div class="form-group" id="new-res-custom-wrap" style="display: none;">
          <label for="new-res-custom-name">Custom Resource Name</label>
          <input type="text" id="new-res-custom-name" placeholder="e.g. Sanitary & Hygiene Kits, Tarpaulins..." />
        </div>
        <div class="form-group">
          <label for="new-res-qty">Quantity <span style="color: var(--critical);">*</span></label>
          <input type="number" id="new-res-qty" placeholder="Enter quantity..." min="1" required />
        </div>
        <div class="form-group">
          <label for="new-res-source">Source / Donor</label>
          <input type="text" id="new-res-source" placeholder="e.g. CSR Fund, Government Allocation, Community Drive..." />
        </div>
        <div class="modal-btn-row" style="justify-content: flex-end; margin-top: 14px;">
          <button onclick="saveNGOResource()" class="btn btn-primary">+ Add Resource</button>
          <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `);
}

async function saveNGOResource() {
  const selectedType = document.getElementById('new-res-type')?.value || '';
  const customName = document.getElementById('new-res-custom-name')?.value.trim();
  const name = (selectedType === 'Other' && customName) ? customName : selectedType;
  const quantity = Number(document.getElementById('new-res-qty')?.value);
  const source = document.getElementById('new-res-source')?.value.trim() || 'Internal Stock';

  if (!name || name === 'Other') {
    showToast('Please select or specify a resource name.', 'error');
    return;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    showToast('Enter a valid positive resource quantity.', 'error');
    return;
  }

  const payload = {
    name,
    type: name.replace(/[^\w\s]/gi, '').trim() || name,
    quantity,
    source
  };

  try {
    await authorizedApi('/ngo/resources', { method: 'POST', body: JSON.stringify(payload) });
    closeModal();
    showToast('Resource added to inventory.', 'success');
    await loadNGODashboard();
  } catch (error) {
    const newRes = {
      id: 'mock-res-' + Date.now(),
      name: payload.name,
      available: payload.quantity,
      allocated: 0,
      total: payload.quantity,
      active: true,
      source: payload.source
    };
    if (!Array.isArray(MOCK_DATA.resources)) {
      MOCK_DATA.resources = [];
    }
    MOCK_DATA.resources.unshift(newRes);
    closeModal();
    showToast('Resource added to inventory (demo).', 'success');
    renderNGODemo();
  }
}

async function saveNGOCamp() {
  const payload = {
    name: document.getElementById('new-camp-name')?.value.trim(),
    location: document.getElementById('new-camp-location')?.value.trim(),
    capacity: Number(document.getElementById('new-camp-capacity')?.value),
    disasterType: document.getElementById('new-camp-type')?.value
  };
  try {
    await authorizedApi('/ngo/camps', { method: 'POST', body: JSON.stringify(payload) });
    closeModal();
    showToast('Relief camp created.', 'success');
    await loadNGODashboard();
  } catch (error) {
    const newCamp = {
      id: 'mock-camp-' + Date.now(),
      name: payload.name || 'New Relief Camp',
      location: payload.location || 'Local District Hub',
      capacity: payload.capacity || 200,
      disasterType: payload.disasterType || 'General Relief',
      status: 'Active'
    };
    if (!Array.isArray(MOCK_DATA.camps)) {
      MOCK_DATA.camps = [];
    }
    MOCK_DATA.camps.unshift(newCamp);
    closeModal();
    showToast('Relief camp created (demo).', 'success');
    renderNGODemo();
  }
}

function showCreateCamp() {
  openModal(`
    <div class="modal-form-wrap">
      <h3 class="modal-heading">⛺ Create Relief Camp</h3>
      <div class="modal-form-fields">
        <div class="form-group">
          <label for="new-camp-name">Camp Name</label>
          <input type="text" id="new-camp-name" placeholder="e.g. Flood Relief Camp — Patna" />
        </div>
        <div class="form-group">
          <label for="new-camp-location">Location / Address</label>
          <input type="text" id="new-camp-location" placeholder="Full address..." />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="new-camp-capacity">Capacity (beds)</label>
            <input type="number" id="new-camp-capacity" placeholder="e.g. 200" min="1" />
          </div>
          <div class="form-group">
            <label for="new-camp-type">Disaster Type</label>
            <select id="new-camp-type" class="enhanced-select">
              <option>🌊 Flood</option><option>🌪️ Cyclone</option><option>🔥 Fire</option><option>🌍 Earthquake</option>
            </select>
          </div>
        </div>
        <div class="modal-btn-row" style="justify-content: flex-end; margin-top: 14px;">
          <button onclick="saveNGOCamp()" class="btn btn-success">Create Camp</button>
          <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `);
}

function showAddDonation() {
  openModal(`
    <div class="modal-form-wrap">
      <h3 class="modal-heading">💰 Record New Donation</h3>
      <div class="modal-form-fields">
        <div class="form-group">
          <label for="new-don-donor">Donor / Supporter Name</label>
          <input type="text" id="new-don-donor" placeholder="e.g. Dr. Ramesh Gupta or leave blank for Private Supporter" />
        </div>
        <div class="form-group">
          <label for="new-don-amount">Amount (₹ INR) <span style="color: var(--critical);">*</span></label>
          <input type="number" id="new-don-amount" placeholder="e.g. 25000" min="1" step="any" required />
        </div>
        <div class="form-group">
          <label for="new-don-destination">Fund Purpose / Allocation <span style="color: var(--critical);">*</span></label>
          <input type="text" id="new-don-destination" placeholder="e.g. Flood Relief Family Ration, Emergency Medical Kits" required />
        </div>
        <div class="form-group">
          <label for="new-don-status">Donation Status</label>
          <select id="new-don-status" class="enhanced-select">
            <option value="Received" selected>Received</option>
            <option value="Pledged">Pledged</option>
            <option value="Allocated">Allocated</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div class="modal-btn-row" style="justify-content: flex-end; margin-top: 16px;">
          <button onclick="saveNewDonation()" class="btn btn-primary">+ Record Donation</button>
          <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `);
}

async function saveNewDonation() {
  const donorName = document.getElementById('new-don-donor')?.value.trim();
  const amount = Number(document.getElementById('new-don-amount')?.value);
  const destination = document.getElementById('new-don-destination')?.value.trim();
  const status = document.getElementById('new-don-status')?.value || 'Received';

  if (!Number.isFinite(amount) || amount <= 0) {
    showToast('Please enter a valid positive donation amount.', 'error');
    return;
  }
  if (!destination) {
    showToast('Please enter a fund purpose / allocation.', 'error');
    return;
  }

  const payload = {
    donorName: donorName || 'Private Supporter',
    amount,
    currency: 'INR',
    destination,
    status
  };

  try {
    await authorizedApi('/ngo/donations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    closeModal();
    showToast('Donation recorded successfully.', 'success');
    await loadNGODashboard();
  } catch (error) {
    const newRecord = {
      id: 'mock-don-' + Date.now(),
      donorName: payload.donorName,
      amount: payload.amount,
      currency: 'INR',
      destination: payload.destination,
      status: payload.status,
      createdAt: new Date().toISOString()
    };
    if (!Array.isArray(MOCK_DATA.donations)) {
      MOCK_DATA.donations = [];
    }
    MOCK_DATA.donations.unshift(newRecord);
    if (!Array.isArray(window._ngoDonations)) {
      window._ngoDonations = [];
    }
    window._ngoDonations.unshift(newRecord);
    closeModal();
    showToast('Donation recorded (demo).', 'success');
    renderNGODemo();
  }
}

function showEditDonation(id, donor, amount, destination, status) {
  openModal(`
    <div class="modal-form-wrap">
      <h3 class="modal-heading">✏️ Edit Donation Record</h3>
      <div class="modal-form-fields">
        <div class="form-group">
          <label for="edit-don-donor">Donor / Supporter Name</label>
          <input type="text" id="edit-don-donor" value="${escapeHTML(donor || 'Private Supporter')}" placeholder="Donor name..." />
        </div>
        <div class="form-group">
          <label for="edit-don-amount">Amount (₹ INR)</label>
          <input type="number" id="edit-don-amount" value="${escapeHTML(String(amount || 0))}" placeholder="Amount..." min="1" step="any" />
        </div>
        <div class="form-group">
          <label for="edit-don-destination">Fund Purpose / Allocation</label>
          <input type="text" id="edit-don-destination" value="${escapeHTML(destination || 'General relief')}" placeholder="e.g. Flood Relief Fund, Emergency Medical Kits..." />
        </div>
        <div class="form-group">
          <label for="edit-don-status">Donation Status</label>
          <select id="edit-don-status" class="enhanced-select">
            <option value="Pledged" ${status === 'Pledged' ? 'selected' : ''}>Pledged</option>
            <option value="Received" ${status === 'Received' ? 'selected' : ''}>Received</option>
            <option value="Allocated" ${status === 'Allocated' ? 'selected' : ''}>Allocated</option>
            <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
        <div class="modal-btn-row" style="justify-content: flex-end; margin-top: 16px;">
          <button onclick="saveEditedDonation('${escapeHTML(id)}')" class="btn btn-primary">Save Changes</button>
          <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `);
}

async function saveEditedDonation(id) {
  const donorName = document.getElementById('edit-don-donor')?.value.trim();
  const amount = Number(document.getElementById('edit-don-amount')?.value);
  const destination = document.getElementById('edit-don-destination')?.value.trim();
  const status = document.getElementById('edit-don-status')?.value || 'Pledged';

  if (!Number.isFinite(amount) || amount < 0) {
    showToast('Please enter a valid donation amount.', 'error');
    return;
  }
  if (!destination) {
    showToast('Please enter a fund purpose / allocation.', 'error');
    return;
  }

  try {
    await authorizedApi(`/ngo/donations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ donorName, amount, destination, status })
    });
    closeModal();
    showToast('Donation record updated successfully.', 'success');
    await loadNGODashboard();
  } catch (error) {
    const mock = MOCK_DATA.donations.find(d => (d.id || d._id) === id);
    if (mock) {
      mock.donorName = donorName || 'Private Supporter';
      mock.amount = amount;
      mock.destination = destination;
      mock.status = status;
      closeModal();
      showToast('Donation record updated (demo).', 'success');
      renderNGODemo();
      return;
    }
    showToast(error.message, 'error');
  }
}

/* ============================================================
   FILTER FUNCTIONS
   ============================================================ */

function filterNearby(type, btn) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');

  const cards = document.querySelectorAll('#nearbyGrid .nearby-card');
  cards.forEach(card => {
    if (type === 'all' || card.dataset.type === type) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function applyRequestFilters() {
  renderNGORequests(window._ngoRequests || []);
}

/* ============================================================
   TRACK REQUEST
   ============================================================ */


async function trackRequest() {
  const input = document.getElementById("track-id");
  const resultBox = document.getElementById("track-result");
  const id = input.value.trim().toUpperCase();

  if (!id) {
    showToast("Please enter a Request ID.", "error");
    input.focus();
    return;
  }

  resultBox.textContent = "Searching for your request...";
  resultBox.style.cssText =
    "padding:16px; margin:16px 0; border-radius:12px;";

  try {
    const response = await fetch(
      `${API_BASE_URL}/requests/${encodeURIComponent(id)}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        response.status === 404
          ? "No request found with this ID. Please check it and try again."
          : data.message || "Unable to track your request."
      );
    }

    const record = data.record;

    // Build the result safely without inserting user data as HTML.
    resultBox.replaceChildren();

    const card = document.createElement("div");
    card.style.cssText =
      "padding:20px; margin:16px 0; border:1px solid rgba(20,184,166,.35); border-radius:12px; background:rgba(20,184,166,.06);";

    const title = document.createElement("h3");
    title.textContent = "Request Found";
    card.appendChild(title);

    const fields = [
      ["Request ID", record.requestId],
      ["Status", record.status],
      ["Disaster Type", record.type],
      [
        "Submitted",
        record.createdAt
          ? new Date(record.createdAt).toLocaleString()
          : "Not available"
      ]
    ];

    fields.forEach(([label, value]) => {
      if (value === undefined || value === null || value === "") return;

      const row = document.createElement("p");
      row.style.cssText = "margin:10px 0; overflow-wrap:anywhere;";

      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;

      row.append(strong, document.createTextNode(String(value)));
      card.appendChild(row);
    });

    resultBox.appendChild(card);
    renderTrackedRequest(record);
  } catch (error) {
    resultBox.replaceChildren();

    const message = document.createElement("p");
    message.textContent = error.message;
    message.style.cssText =
      "padding:16px; margin:16px 0; border:1px solid rgba(239,68,68,.4); border-radius:12px; color:#fca5a5;";

    resultBox.appendChild(message);
  }
}

function renderTrackedRequest(record) {
  const list = document.querySelector('#citizen-tab-track .request-timeline');
  if (!list) return;
  const id = escapeHTML(record.requestId);
  const type = escapeHTML(record.type || (record.helpTypes || []).join(', ') || 'Help request');
  const status = escapeHTML(record.status || 'Submitted');
  const created = record.createdAt ? new Date(record.createdAt).toLocaleString('en-IN') : '';
  const card = document.createElement('div');
  card.className = 'req-card';
  card.innerHTML = `<div class="req-id">${id}</div><div class="req-type">${type}</div><div class="req-status in-progress">${status.toUpperCase()}</div><div class="req-note">Submitted ${escapeHTML(created)}</div>`;
  list.prepend(card);
}

async function loadReliefResources() {
  const grid = document.getElementById('nearbyGrid');
  if (!grid) return;
  grid.innerHTML = '<p class="request-empty-state">Loading nearby relief resources…</p>';
  try {
    const location = document.getElementById('nearby-loc')?.value.trim() || '';
    const response = await fetch(`${API_BASE_URL}/relief-resources${location ? `?location=${encodeURIComponent(location)}` : ''}`);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load relief resources.');
    if (!result.resources?.length) {
      grid.innerHTML = '<p class="request-empty-state">No relief resources are listed for this area yet.</p>';
      return;
    }
    grid.innerHTML = result.resources.map(resource => {
      const type = escapeHTML(String(resource.type || 'other').toLowerCase());
      return `<div class="nearby-card" data-type="${type}"><div class="nearby-badge ${type}">${escapeHTML(resource.label || resource.type || 'Relief')}</div><h4>${escapeHTML(resource.name)}</h4><p class="nearby-dist">📍 ${escapeHTML(resource.location)}${resource.distance ? ` · ${escapeHTML(resource.distance)}` : ''}</p><p>${escapeHTML(resource.details || '')}</p><div class="nearby-meta"><span class="status-open">${escapeHTML(resource.status || 'AVAILABLE')}</span></div></div>`;
    }).join('');
    const active = document.querySelector('#citizen-tab-nearby .filter-pill.active');
    if (active) filterNearby(active.textContent.includes('Food') ? 'food' : active.textContent.includes('Water') ? 'water' : active.textContent.includes('Shelter') ? 'shelter' : active.textContent.includes('Medical') ? 'medical' : 'all', active);
  } catch (error) {
    grid.innerHTML = `<p class="request-empty-state">${escapeHTML(error.message)} <button class="btn-sm" onclick="loadReliefResources()">Retry</button></p>`;
  }
}

/* ============================================================
   LOCATION DETECTION
   ============================================================ */

function getLocation(targetId) {
  const id = targetId || 'rep-location';
  const input = document.getElementById(id);
  if (!input) return;

  if ('geolocation' in navigator) {
    input.placeholder = 'Detecting your location...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        input.value = `Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`;
        showToast('📍 Location detected!', 'success');
      },
      () => {
        input.placeholder = 'Enter your location manually...';
        showToast('⚠️ Location access denied. Please enter manually.', 'error');
      }
    );
  } else {
    showToast('⚠️ Geolocation not supported in this browser.', 'error');
  }
}


/* ============================================================
   NGO LIVE CLOCK
   ============================================================ */

function renderNGORequests(requests) {
  const grid = document.getElementById('ngoRequestsGrid');
  if (!grid) return;
  const locationFilter = document.getElementById('req-filter-loc')?.value || 'All Locations';
  const categoryFilter = document.getElementById('req-filter-cat')?.value || 'All Categories';
  const severityFilter = document.getElementById('req-filter-sev')?.value || 'All Severities';
  const statusFilter = document.getElementById('req-filter-status')?.value || 'All Statuses';
  const visible = requests.filter(request => {
    const category = String(request.type || '').toLowerCase();
    return (locationFilter === 'All Locations' || String(request.location || '').toLowerCase().includes(locationFilter.toLowerCase()))
      && (categoryFilter === 'All Categories' || category.includes(categoryFilter.replace(/^\S+\s/, '').toLowerCase()))
      && (severityFilter === 'All Severities' || String(request.severity || '').toLowerCase() === severityFilter.replace(/^\S+\s/, '').toLowerCase())
      && (statusFilter === 'All Statuses' || String(request.status || '').toLowerCase() === statusFilter.toLowerCase());
  });
  if (!visible.length) {
    grid.innerHTML = '<p class="request-empty-state">No matching help requests are available.</p>';
    return;
  }
  grid.innerHTML = visible.map(request => {
    const status = String(request.status || 'Submitted');
    const severity = String(request.severity || 'medium').toLowerCase();
    const age = request.createdAt ? new Date(request.createdAt).toLocaleString('en-IN') : 'Recently submitted';
    const action = status === 'Resolved'
      ? '<span class="badge low">RESOLVED</span>'
      : `<button class="btn-sm ${status === 'Submitted' ? 'btn-accept' : 'btn-update'}" data-ngo-request-id="${escapeHTML(request.requestId)}" data-next-status="${status === 'Submitted' ? 'In Progress' : 'Resolved'}">${status === 'Submitted' ? 'Accept' : 'Mark Resolved'}</button>`;
    return `<div class="request-card ${escapeHTML(severity)}-card"><div class="rc-header"><span class="rc-id">${escapeHTML(request.requestId)}</span><span class="badge ${escapeHTML(severity)}">${escapeHTML(severity.toUpperCase())}</span><span class="badge ${status === 'Submitted' ? 'pending' : status === 'Resolved' ? 'low' : 'in-progress-badge'}">${escapeHTML(status.toUpperCase())}</span></div><div class="rc-type">${escapeHTML(request.type || 'Help request')}</div><div class="rc-meta">${escapeHTML(request.location || 'Location not provided')} · Affected: ${escapeHTML(request.peopleAffected ?? 'Not specified')} · ${escapeHTML(age)}</div><div class="rc-desc">${escapeHTML(request.description || 'No additional details provided.')}</div><div class="rc-actions">${action}</div></div>`;
  }).join('');
  grid.onclick = event => {
    const button = event.target.closest('[data-ngo-request-id]');
    if (button) updateNGORequestStatus(button.dataset.ngoRequestId, button.dataset.nextStatus);
  };
}

async function updateNGORequestStatus(requestId, status) {
  try {
    await authorizedApi(`/ngo/requests/${encodeURIComponent(requestId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    showToast(`Request ${requestId} updated to ${status}.`, 'success');
    await loadNGODashboard();
  } catch (error) { showToast(error.message, 'error'); }
}

async function updateNGOResourceActive(resourceId, active) {
  try {
    await authorizedApi(`/ngo/resources/${encodeURIComponent(resourceId)}/active`, { method: 'PATCH', body: JSON.stringify({ active }) });
    showToast(active ? 'Resource reactivated.' : 'Resource deactivated.', 'success');
    await loadNGODashboard();
  } catch (error) {
    const mock = (MOCK_DATA.resources || []).find(r => r.id === resourceId);
    if (mock) {
      mock.active = active;
      showToast(active ? 'Resource reactivated (demo).' : 'Resource deactivated (demo).', 'success');
      renderNGODemo();
      return;
    }
    showToast(error.message, 'error');
  }
}

async function updateNGOCampStatus(campId, status) {
  try {
    await authorizedApi(`/ngo/camps/${encodeURIComponent(campId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    showToast(`Camp marked ${status.toLowerCase()}.`, 'success');
    await loadNGODashboard();
  } catch (error) {
    const mock = (MOCK_DATA.camps || []).find(c => c.id === campId);
    if (mock) {
      mock.status = status;
      showToast(`Camp marked ${status.toLowerCase()} (demo).`, 'success');
      renderNGODemo();
      return;
    }
    showToast(error.message, 'error');
  }
}

async function updateGovernmentReportStatus(requestId, status) {
  try {
    await authorizedApi(`/government/reports/${encodeURIComponent(requestId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    showToast(`Report ${requestId} updated to ${status}.`, 'success');
    await loadGovernmentDashboard();
  } catch (error) { showToast(error.message, 'error'); }
}

async function updateGovernmentHelpStatus(requestId, status) {
  try {
    await authorizedApi(`/government/help/${encodeURIComponent(requestId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    showToast(`Help request ${requestId} updated to ${status}.`, 'success');
    await loadGovernmentDashboard();
  } catch (error) { showToast(error.message, 'error'); }
}

const MOCK_DATA = {
  alerts: [
    { _id: 'mock-alert-1', title: 'River levels rising near low-lying areas', message: 'Residents in low-lying areas should move to designated shelters and keep emergency kits ready.', area: 'Patna, Bihar', severity: 'critical', type: 'Flood', status: 'Active', createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
    { _id: 'mock-alert-2', title: 'Coastal wind advisory; shelters open', message: 'Avoid beaches and follow district administration advisories.', area: 'Puri, Odisha', severity: 'high', type: 'Cyclone', status: 'Active', createdAt: new Date(Date.now() - 36 * 60000).toISOString() },
    { _id: 'mock-alert-3', title: 'Travel advisory on mountain roads', message: 'Expect temporary closures and check local traffic updates before travelling.', area: 'Chamoli, Uttarakhand', severity: 'medium', type: 'Landslide', status: 'Active', createdAt: new Date(Date.now() - 75 * 60000).toISOString() }
  ],
  requests: [
    { requestId: 'SS-DEMO-2401', type: 'Flood — Food & Water', location: 'Patna, Bihar', severity: 'critical', status: 'Submitted', peopleAffected: 85, description: 'Families need food packets, drinking water, and a medical check.', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { requestId: 'SS-DEMO-2402', type: 'Medical Aid', location: 'Bhubaneswar, Odisha', severity: 'high', status: 'In Progress', peopleAffected: 12, description: 'Doctors and medicines needed at the community relief camp.', createdAt: new Date(Date.now() - 4 * 3600000).toISOString() },
    { requestId: 'SS-DEMO-2403', type: 'Shelter', location: 'Nashik, Maharashtra', severity: 'medium', status: 'Resolved', peopleAffected: 30, description: 'Temporary shelter arranged for displaced families.', createdAt: new Date(Date.now() - 8 * 3600000).toISOString() }
  ],
  resources: [
    { id: 'mock-resource-1', name: 'Food packets', available: 720, allocated: 280, total: 1000, active: true },
    { id: 'mock-resource-2', name: 'Drinking water (L)', available: 4200, allocated: 1800, total: 6000, active: true },
    { id: 'mock-resource-3', name: 'First-aid kits', available: 145, allocated: 55, total: 200, active: true }
  ],
  volunteers: [
    { name: 'Aarav Sharma', skills: ['First Aid', 'Logistics'], location: 'Patna, Bihar', availability: 'On-call basis' },
    { name: 'Meera Iyer', skills: ['Cooking', 'Languages'], location: 'Puri, Odisha', availability: 'Weekends only' },
    { name: 'Kabir Khan', skills: ['Driving', 'Rescue'], location: 'Nashik, Maharashtra', availability: 'Full-time (during disaster)' }
  ],
  donations: [
    { id: 'mock-don-1', donorName: 'Dr. Anita Rao', amount: 25000, currency: 'INR', destination: 'Emergency Medical & Clean Water Kits', status: 'Completed', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'mock-don-2', donorName: 'Venkatesh Prasad', amount: 10000, currency: 'INR', destination: 'Assam Flood Family Relief Ration', status: 'Allocated', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
    { id: 'mock-don-3', donorName: 'Meera Krishnan', amount: 50000, currency: 'INR', destination: 'Odisha Coastal Cyclone Shelter Bedding', status: 'Received', createdAt: new Date(Date.now() - 7 * 86400000).toISOString() }
  ],
  camps: [
    { id: 'mock-camp-1', name: 'Gandhi Maidan Relief Camp', location: 'Patna, Bihar', capacity: 350, disasterType: 'Flood response', status: 'Active' },
    { id: 'mock-camp-2', name: 'Coastal Community Shelter', location: 'Puri, Odisha', capacity: 220, disasterType: 'Cyclone response', status: 'Active' }
  ]
};

function renderDemoLabel() {
  return '<span class="demo-data-label">DEMO DATA</span>';
}

function deployVolunteer(btn, name) {
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = '✓ Deployed';
  btn.classList.remove('btn-accept');
  btn.classList.add('btn-deployed');
  const row = btn.closest('tr');
  if (row) {
    if (row.cells && row.cells[4]) {
      row.cells[4].innerHTML = '<span class="status-reviewed-tag">Deployed</span>';
    }
    if (row.cells && row.cells[3]) {
      row.cells[3].innerHTML = '<span class="badge low">Dispatched</span>';
    }
  }
  showToast(`Volunteer ${name ? `"${name}" ` : ''}deployed to active relief operations.`, 'success');
}

function renderNGODemo() {
  window._ngoRequests = MOCK_DATA.requests;
  renderNGORequests(MOCK_DATA.requests);
  const quick = document.getElementById('ngoRecentRequestsBody');
  if (quick) quick.innerHTML = MOCK_DATA.requests.map(request => `<tr><td>${request.requestId}</td><td>${escapeHTML(request.type)}</td><td>${escapeHTML(request.location)}</td><td>${escapeHTML(request.severity)}</td><td>${escapeHTML(request.status)}</td><td>${renderDemoLabel()}</td></tr>`).join('');
  const resourceBody = document.getElementById('ngoResourcesBody');
  if (resourceBody) resourceBody.innerHTML = MOCK_DATA.resources.map(resource => `<tr><td>${escapeHTML(resource.name)}</td><td>${resource.available}</td><td>${resource.allocated}</td><td>${resource.total}</td><td>AVAILABLE</td><td>${renderDemoLabel()}</td></tr>`).join('');
  const volunteerBody = document.getElementById('ngoVolunteersBody');
  if (volunteerBody) {
    volunteerBody.innerHTML = MOCK_DATA.volunteers.map(person => {
      const skills = Array.isArray(person.skills) ? person.skills.join(', ') : person.skills || 'General relief';
      return `<tr>
        <td><strong>${escapeHTML(person.name)}</strong></td>
        <td>${escapeHTML(skills)}</td>
        <td>${escapeHTML(person.location)}</td>
        <td><span class="badge low">${escapeHTML(person.availability || 'Immediate')}</span></td>
        <td><span class="status-reviewed-tag">Active</span></td>
        <td><button class="btn-sm btn-accept" data-deploy-volunteer="${escapeHTML(person.name)}" onclick="deployVolunteer(this, '${escapeHTML(person.name)}'); event.stopPropagation();">Deploy</button></td>
      </tr>`;
    }).join('');
    volunteerBody.onclick = event => {
      const button = event.target.closest('[data-deploy-volunteer]');
      if (button && !button.disabled) deployVolunteer(button, button.dataset.deployVolunteer);
    };
  }
  const donationsBody = document.getElementById('ngoDonationsBody');
  if (donationsBody) {
    donationsBody.innerHTML = MOCK_DATA.donations.map(donation => {
      const id = donation.id || '';
      const donor = escapeHTML(donation.donorName || 'Demo supporter');
      const amount = Number(donation.amount).toLocaleString('en-IN');
      const destination = escapeHTML(donation.destination || 'General relief');
      const dateStr = new Date(donation.createdAt).toLocaleDateString('en-IN');
      const status = escapeHTML(donation.status || 'Pledged');
      const statusLower = status.toLowerCase();
      const statusClass = statusLower === 'completed' || statusLower === 'received' ? 'low' : statusLower === 'allocated' ? 'high' : 'medium';
      return `<tr>
        <td><strong>${donor}</strong></td>
        <td><strong>₹ ${amount}</strong></td>
        <td>${destination}</td>
        <td>${dateStr}</td>
        <td><span class="badge ${statusClass}">${status}</span></td>
        <td><button class="btn-sm btn-update" data-edit-don-id="${escapeHTML(id)}">✏️ Edit</button></td>
      </tr>`;
    }).join('');
    donationsBody.onclick = event => {
      const btn = event.target.closest('[data-edit-don-id]');
      if (btn) {
        const d = MOCK_DATA.donations.find(item => (item.id || item._id) === btn.dataset.editDonId);
        if (d) showEditDonation(d.id || d._id, d.donorName, d.amount, d.destination, d.status);
      }
    };
  }
  const resources = MOCK_DATA.resources;
  const summary = document.getElementById('ngoResourceSummary');
  if (summary) summary.innerHTML = resources.map(resource => `<div class="res-bar-item"><span class="res-label">${escapeHTML(resource.name)}</span><div class="res-bar-track"><div class="res-bar-fill" style="width:${resource.available / resource.total * 100}%"></div></div><span class="res-qty">${resource.available} / ${resource.total}</span></div>`).join('');
  const total = resources.reduce((sum, resource) => sum + resource.total, 0);
  const available = resources.reduce((sum, resource) => sum + resource.available, 0);
  document.getElementById('ngoResourcePercent').textContent = `${Math.round(available / total * 100)}%`;
  document.getElementById('ngoRequestCount').textContent = '1';
  document.getElementById('ngoActiveCount').textContent = '1';
  document.getElementById('ngoResolvedCount').textContent = '1';
  document.getElementById('ngoVolunteerCount').textContent = String(MOCK_DATA.volunteers.length);
  document.getElementById('ngoDonationCount').textContent = String(MOCK_DATA.donations.length);
  const donationSummary = document.getElementById('ngoDonationSummary');
  if (donationSummary) donationSummary.innerHTML = `<div class="ds-item"><span>Recorded intents</span><strong>${MOCK_DATA.donations.length}</strong></div><div class="ds-item"><span>Total Contribution</span><strong>₹ ${MOCK_DATA.donations.reduce((sum, donation) => sum + donation.amount, 0).toLocaleString('en-IN')}</strong></div>`;
  const campsGrid = document.getElementById('ngoCampsGrid');
  if (campsGrid) campsGrid.innerHTML = MOCK_DATA.camps.map(camp => `<div class="camp-card active-camp"><div class="camp-header"><h4>${escapeHTML(camp.name)}</h4><span class="badge low">${camp.status}</span></div><div class="camp-stats"><div class="camp-stat"><strong>${camp.capacity}</strong><small>Bed Capacity</small></div><div class="camp-stat"><strong>${escapeHTML(camp.disasterType)}</strong><small>Operation Type</small></div></div><p>${escapeHTML(camp.location)}</p><span class="demo-data-label">DEMO DATA</span></div>`).join('');
}

async function loadGovernmentAlerts() {
  const list = document.getElementById('governmentAlertsList');
  if (!list) return;
  list.textContent = 'Loading alerts…';
  try {
    const result = await authorizedApi('/government/alerts');
    list.innerHTML = (result.alerts || []).map(alert => `<div class="alert-item ${escapeHTML(String(alert.severity || 'medium').toLowerCase())}-alert"><div class="alert-header"><span class="badge ${escapeHTML(String(alert.severity || 'medium').toLowerCase())}">${escapeHTML(String(alert.severity || 'MEDIUM').toUpperCase())}</span><span class="alert-time">${alert.createdAt ? escapeHTML(new Date(alert.createdAt).toLocaleString('en-IN')) : ''}</span></div><strong>${escapeHTML(alert.title)}</strong><p>${escapeHTML(alert.message)}</p><div class="alert-footer"><span>Affected: ${escapeHTML(alert.area)}</span><span>${escapeHTML(alert.status || 'Active')}</span></div>${alert.status === 'Active' ? `<button class="btn-sm btn-update" data-close-alert="${escapeHTML(alert._id)}">Close alert</button>` : ''}</div>`).join('') || '<p>No alerts have been issued.</p>';
    list.onclick = async event => {
      const button = event.target.closest('[data-close-alert]');
      if (!button) return;
      button.disabled = true;
      try {
        await authorizedApi(`/government/alerts/${encodeURIComponent(button.dataset.closeAlert)}/close`, { method: 'PATCH', body: JSON.stringify({}) });
        showToast('Alert closed.', 'success');
        await loadGovernmentAlerts();
      } catch (error) { button.disabled = false; showToast(error.message, 'error'); }
    };
  } catch (error) {
    list.innerHTML = MOCK_DATA.alerts.map(alert => `<div class="alert-item ${alert.severity}-alert"><div class="alert-header"><span class="badge ${alert.severity}">${alert.severity.toUpperCase()}</span><span class="alert-time">Demo live</span></div><strong>${escapeHTML(alert.title)}</strong><p>${escapeHTML(alert.message)}</p><div class="alert-footer"><span>Affected: ${escapeHTML(alert.area)}</span><span>Active</span></div><span class="demo-data-label">DEMO DATA</span></div>`).join('');
    console.warn('Government alerts unavailable; showing demo data:', error.message);
  }
}

function checkGovAuth() {
  const gate = document.getElementById('gov-login-gate');
  const view = document.getElementById('gov-authenticated-view');
  if (!gate || !view) return;

  const user = window.getCurrentAuthUser?.();
  const role = user?.app_metadata?.role;
  const isGov = role === 'government';

  if (isGov) {
    gate.hidden = true;
    view.hidden = false;
    const officerName = document.getElementById('govOfficerName');
    const officerEmail = document.getElementById('govOfficerEmail');
    if (officerName) officerName.textContent = user.user_metadata?.full_name || 'Government Officer';
    if (officerEmail) officerEmail.textContent = `${user.email} · NDRF / SDMA Incident Command Authority`;
    loadGovernmentDashboard();
  } else {
    gate.hidden = false;
    view.hidden = true;
  }
}

async function handleGovLogin(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('govLoginEmail');
  const pwInput = document.getElementById('govLoginPassword');
  const email = emailInput ? emailInput.value.trim() : '';
  const password = pwInput ? pwInput.value : '';
  const msgEl = document.getElementById('govLoginMessage');
  const submitBtn = e?.currentTarget?.querySelector?.('button[type="submit"]');

  if (msgEl) {
    msgEl.hidden = true;
    msgEl.textContent = '';
  }
  if (!email || !password) {
    if (msgEl) {
      msgEl.hidden = false;
      msgEl.className = 'gov-login-message error';
      msgEl.textContent = 'Please enter both your government email and access password.';
    }
    return;
  }
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (typeof window.loginGovernmentDirect !== 'function') {
      throw new Error('Authentication system is loading. Please try again.');
    }
    await window.loginGovernmentDirect(email, password);
    showToast('Government security credentials verified. Access granted.', 'success');
    checkGovAuth();
  } catch (error) {
    if (msgEl) {
      msgEl.hidden = false;
      msgEl.className = 'gov-login-message error';
      msgEl.textContent = error.message;
    }
    showToast(error.message, 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function quickGovLogin() {
  const emailInput = document.getElementById('govLoginEmail');
  const pwInput = document.getElementById('govLoginPassword');
  if (emailInput) emailInput.value = 'krishan-gov@sahay-setu.com';
  if (pwInput) pwInput.value = 'Krishan123@';
  try {
    if (typeof window.loginGovernmentDirect !== 'function') {
      throw new Error('Authentication is initializing. Please try again.');
    }
    await window.loginGovernmentDirect('krishan-gov@sahay-setu.com', 'Krishan123@');
    showToast('Demo Government Official (NDRF Command) authenticated.', 'success');
    checkGovAuth();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function logoutGovernment() {
  if (typeof window.logoutCurrentSession === 'function') {
    await window.logoutCurrentSession();
  } else {
    localStorage.removeItem('sahaySetuDemoSession');
  }
  showToast('Logged out of Government command session.', 'info');
  checkGovAuth();
}

function checkNgoAuth() {
  const gate = document.getElementById('ngo-login-gate');
  const view = document.getElementById('ngo-authenticated-view');
  if (!gate || !view) return;

  const user = window.getCurrentAuthUser?.();
  const role = user?.app_metadata?.role;
  const isNgo = role === 'ngo';

  if (isNgo) {
    gate.hidden = true;
    view.hidden = false;
    const coordName = document.getElementById('ngoCoordinatorName');
    const coordEmail = document.getElementById('ngoCoordinatorEmail');
    if (coordName) coordName.textContent = user.user_metadata?.full_name || 'NGO Field Coordinator';
    if (coordEmail) coordEmail.textContent = `${user.email} · SEEDS India Relief Operations`;
    initNGODashboard();
  } else {
    gate.hidden = false;
    view.hidden = true;
  }
}

async function handleNgoLogin(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('ngoLoginEmail');
  const pwInput = document.getElementById('ngoLoginPassword');
  const email = emailInput ? emailInput.value.trim() : '';
  const password = pwInput ? pwInput.value : '';
  const msgEl = document.getElementById('ngoLoginMessage');
  const submitBtn = e?.currentTarget?.querySelector?.('button[type="submit"]');

  if (msgEl) {
    msgEl.hidden = true;
    msgEl.textContent = '';
  }
  if (!email || !password) {
    if (msgEl) {
      msgEl.hidden = false;
      msgEl.className = 'gov-login-message error';
      msgEl.textContent = 'Please enter both your registered NGO email and access password.';
    }
    return;
  }
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (typeof window.loginNgoDirect !== 'function') {
      throw new Error('Authentication system is loading. Please try again.');
    }
    await window.loginNgoDirect(email, password);
    showToast('NGO credentials verified. Workspace access granted.', 'success');
    checkNgoAuth();
  } catch (error) {
    if (msgEl) {
      msgEl.hidden = false;
      msgEl.className = 'gov-login-message error';
      msgEl.textContent = error.message;
    }
    showToast(error.message, 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function quickNgoLogin() {
  const emailInput = document.getElementById('ngoLoginEmail');
  const pwInput = document.getElementById('ngoLoginPassword');
  if (emailInput) emailInput.value = 'krishan-ngo@sahay-setu.com';
  if (pwInput) pwInput.value = 'Krishan123@';
  try {
    if (typeof window.loginNgoDirect !== 'function') {
      throw new Error('Authentication is initializing. Please try again.');
    }
    await window.loginNgoDirect('krishan-ngo@sahay-setu.com', 'Krishan123@');
    showToast('Demo NGO Coordinator (SEEDS India) authenticated.', 'success');
    checkNgoAuth();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function logoutNgo() {
  if (typeof window.logoutCurrentSession === 'function') {
    await window.logoutCurrentSession();
  } else {
    localStorage.removeItem('sahaySetuDemoSession');
  }
  showToast('Logged out of NGO operations session.', 'info');
  checkNgoAuth();
}

function copyModalReqId(text, btn) {
  const onSuccess = () => {
    const orig = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('copied');
    }, 2200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      fallbackCopy(text);
      onSuccess();
    });
  } else {
    fallbackCopy(text);
    onSuccess();
  }
}

function fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function initDisasterChips() {
  const chipsContainer = document.getElementById('disasterTypeChips');
  const select = document.getElementById('rep-type');
  if (!chipsContainer || !select) return;

  chipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.disaster-chip');
    if (!chip) return;
    const type = chip.dataset.type;
    select.value = type;
    chipsContainer.querySelectorAll('.disaster-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });

  select.addEventListener('change', () => {
    const val = select.value;
    chipsContainer.querySelectorAll('.disaster-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.type === val);
    });
  });
}

async function loadGovernmentDashboard() {
  const table = document.getElementById('governmentReportsBody');
  if (table) table.innerHTML = '<tr><td colspan="6">Loading emergency reports…</td></tr>';
  try {
    const result = await authorizedApi('/government/dashboard');
    const reports = result.reports || [];
    if (table) {
      table.innerHTML = reports.map(report => {
        const isVerified = (report.status || '').toLowerCase() === 'verified';
        const currentStatus = report.status || 'Submitted';
        return `<tr>
          <td>${escapeHTML(report.type || 'Emergency')}</td>
          <td>${escapeHTML(report.location || 'Location not provided')}</td>
          <td><span class="badge ${escapeHTML(String(report.severity || 'medium').toLowerCase())}">${escapeHTML(String(report.severity || 'Not set').toUpperCase())}</span></td>
          <td>${escapeHTML(report.peopleAffected ?? '—')}</td>
          <td><code>${escapeHTML(report.requestId)}</code></td>
          <td>
            <select data-report-id="${escapeHTML(report.requestId)}" class="gov-select-control status-select ${isVerified ? 'is-verified' : ''}" aria-label="Update status for ${escapeHTML(report.requestId)}">
              ${!isVerified ? `<option value="" disabled selected>${escapeHTML(currentStatus)}</option>` : ''}
              <option value="Verified" ${isVerified ? 'selected' : ''}>Verified</option>
            </select>
          </td>
        </tr>`;
      }).join('') || '<tr><td colspan="6">No emergency reports have been submitted.</td></tr>';
      table.onchange = event => { const select = event.target.closest('[data-report-id]'); if (select?.value) updateGovernmentReportStatus(select.dataset.reportId, select.value); };
    }
    const count = document.getElementById('govReportCount');
    if (count) count.textContent = String((result.summary?.reports ?? reports.length) + (result.summary?.helpRequests ?? 0));
    const helpBody = document.getElementById('governmentHelpBody');
    if (helpBody) {
      helpBody.innerHTML = (result.requests || []).map(request => {
        let currentStatus = request.status || 'In Review';
        if (currentStatus === 'Under Review') currentStatus = 'In Review';
        if (currentStatus === 'In Progress') currentStatus = 'NGO Assigned';
        const validOptions = ['In Review', 'NGO Assigned', 'Resolved'];
        const hasOther = !validOptions.includes(currentStatus);
        const statusSlug = currentStatus.toLowerCase().replace(/\s+/g, '-');
        return `<tr>
          <td><code>${escapeHTML(request.requestId)}</code></td>
          <td>${escapeHTML(request.type || 'Help')}</td>
          <td>${escapeHTML(request.location || 'Not provided')}</td>
          <td>${escapeHTML(request.peopleAffected ?? '—')}</td>
          <td>
            <select data-help-id="${escapeHTML(request.requestId)}" class="gov-select-control status-select status-${statusSlug}" aria-label="Update help request ${escapeHTML(request.requestId)}">
              ${hasOther ? `<option value="" disabled selected>${escapeHTML(currentStatus)}</option>` : ''}
              <option value="In Review" ${currentStatus === 'In Review' ? 'selected' : ''}>In Review</option>
              <option value="NGO Assigned" ${currentStatus === 'NGO Assigned' ? 'selected' : ''}>NGO Assigned</option>
              <option value="Resolved" ${currentStatus === 'Resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </td>
        </tr>`;
      }).join('') || '<tr><td colspan="5">No help requests have been submitted.</td></tr>';
      helpBody.onchange = event => { const select = event.target.closest('[data-help-id]'); if (select?.value) updateGovernmentHelpStatus(select.dataset.helpId, select.value); };
    }
    const metricResults = await Promise.allSettled([authorizedApi('/government/analytics'), authorizedApi('/government/operations')]);
    const analytics = metricResults[0].status === 'fulfilled' ? metricResults[0].value.analytics : null;
    const operations = metricResults[1].status === 'fulfilled' ? metricResults[1].value : null;
    const metricValues = {
      govActiveDisasterCount: operations ? String(operations.summary?.activeDisasterTypes ?? 0) : '—',
      govCampCount: operations ? String(operations.summary?.activeCamps ?? 0) : '—',
      govNgoCount: analytics ? String(analytics.summary.approvedNgoApplications ?? 0) : '—',
      govPeopleCount: analytics ? Number(analytics.summary.peopleAffected || 0).toLocaleString('en-IN') : '—',
      govOperationCount: operations ? String((operations.summary?.openReports || 0) + (operations.summary?.openRequests || 0) + (operations.summary?.activeCamps || 0)) : '—'
    };
    Object.entries(metricValues).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
  } catch (error) {
    const reports = MOCK_DATA.requests.map(request => ({ ...request, type: request.type.split(' — ')[0] }));
    if (table) table.innerHTML = reports.map(report => `<tr><td>${escapeHTML(report.type)}</td><td>${escapeHTML(report.location)}</td><td><span class="badge ${report.severity}">${report.severity.toUpperCase()}</span></td><td>${report.peopleAffected}</td><td><code>${report.requestId}</code></td><td><span class="badge verified">Verified</span></td></tr>`).join('');
    const helpBody = document.getElementById('governmentHelpBody');
    if (helpBody) helpBody.innerHTML = MOCK_DATA.requests.map((request, i) => {
      const mockStatuses = ['In Review', 'NGO Assigned', 'Resolved'];
      const st = mockStatuses[i % mockStatuses.length];
      const badgeCls = st === 'Resolved' ? 'low' : st === 'NGO Assigned' ? 'high' : 'medium';
      return `<tr><td><code>${request.requestId}</code></td><td>${escapeHTML(request.type)}</td><td>${escapeHTML(request.location)}</td><td>${request.peopleAffected}</td><td><span class="badge ${badgeCls}">${st}</span></td></tr>`;
    }).join('');
    const values = { govActiveDisasterCount: '3', govCampCount: '2', govNgoCount: '18', govPeopleCount: '1,264', govOperationCount: '7', govReportCount: '6' };
    Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = value; });
    console.warn('Government dashboard unavailable; showing demo data:', error.message);
  }
}

async function loadNGODashboard() {
  const grid = document.getElementById('ngoRequestsGrid');
  if (grid) grid.innerHTML = '<p class="request-empty-state">Loading help requests…</p>';
  try {
    const result = await authorizedApi('/ngo/dashboard');
    window._ngoRequests = result.requests || [];
    renderNGORequests(window._ngoRequests);
    const quick = document.getElementById('ngoRecentRequestsBody');
    if (quick) {
      quick.innerHTML = window._ngoRequests.slice(0, 5).map(request => `<tr><td>${escapeHTML(request.requestId)}</td><td>${escapeHTML(request.type || 'Help')}</td><td>${escapeHTML(request.location || 'Not provided')}</td><td>${escapeHTML(request.severity || '—')}</td><td>${escapeHTML(request.status || 'Submitted')}</td><td>${request.status === 'Submitted' ? `<button class="btn-sm btn-accept" data-ngo-request-id="${escapeHTML(request.requestId)}">Accept</button>` : '—'}</td></tr>`).join('') || '<tr><td colspan="6">No help requests yet.</td></tr>';
      quick.onclick = event => { const button = event.target.closest('[data-ngo-request-id]'); if (button) updateNGORequestStatus(button.dataset.ngoRequestId, 'In Progress'); };
    }
    const resourceBody = document.getElementById('ngoResourcesBody');
    if (resourceBody) {
      resourceBody.innerHTML = (result.resources || []).map(resource => `<tr><td>${escapeHTML(resource.name || resource.type || 'Resource')}</td><td>${escapeHTML(resource.quantity ?? resource.available ?? '—')}</td><td>${escapeHTML(resource.allocated ?? '—')}</td><td>${escapeHTML(resource.total ?? resource.quantity ?? '—')}</td><td>${escapeHTML(resource.active === false ? 'INACTIVE' : resource.status || 'AVAILABLE')}</td><td><button class="btn-sm btn-update" data-resource-id="${escapeHTML(resource.id)}" data-resource-active="${resource.active === false ? 'true' : 'false'}">${resource.active === false ? 'Reactivate' : 'Deactivate'}</button></td></tr>`).join('') || '<tr><td colspan="6">No relief resources available.</td></tr>';
      resourceBody.onclick = event => { const button = event.target.closest('[data-resource-id]'); if (button) updateNGOResourceActive(button.dataset.resourceId, button.dataset.resourceActive === 'true'); };
    }
    const resources = result.resources || [];
    const activeResources = resources.filter(resource => resource.active !== false);
    const totalResourceCount = activeResources.reduce((sum, resource) => sum + (Number(resource.total ?? resource.quantity) || 0), 0);
    const availableResourceCount = activeResources.reduce((sum, resource) => sum + (Number(resource.available ?? resource.quantity) || 0), 0);
    const resourcePercent = document.getElementById('ngoResourcePercent');
    if (resourcePercent) resourcePercent.textContent = totalResourceCount > 0 ? `${Math.round(availableResourceCount / totalResourceCount * 100)}%` : '—';
    const resourceSummary = document.getElementById('ngoResourceSummary');
    if (resourceSummary) resourceSummary.innerHTML = activeResources.map(resource => {
      const total = Number(resource.total ?? resource.quantity) || 0;
      const available = Number(resource.available ?? resource.quantity) || 0;
      const width = total > 0 ? Math.min(100, Math.max(0, available / total * 100)) : 0;
      return `<div class="res-bar-item"><span class="res-label">${escapeHTML(resource.name || resource.type || 'Resource')}</span><div class="res-bar-track"><div class="res-bar-fill" style="width:${width}%"></div></div><span class="res-qty">${escapeHTML(available)} / ${escapeHTML(total)}</span></div>`;
    }).join('') || '<p class="request-empty-state">No relief resources are assigned to this organization.</p>';
    document.getElementById('ngoRequestCount').textContent = String(window._ngoRequests.filter(request => request.status === 'Submitted').length);
    document.getElementById('ngoActiveCount').textContent = String(window._ngoRequests.filter(request => request.status === 'In Progress').length);
    document.getElementById('ngoResolvedCount').textContent = String(window._ngoRequests.filter(request => request.status === 'Resolved').length);
    const volunteerBody = document.getElementById('ngoVolunteersBody');
    if (volunteerBody) {
      volunteerBody.innerHTML = (result.volunteers || []).map(person => {
        const skills = Array.isArray(person.skills) ? person.skills.join(', ') : person.skills || 'General relief';
        return `<tr>
          <td><strong>${escapeHTML(person.name || 'Volunteer')}</strong></td>
          <td>${escapeHTML(skills)}</td>
          <td>${escapeHTML(person.location || 'Not provided')}</td>
          <td><span class="badge low">${escapeHTML(person.availability || person.status || 'Immediate')}</span></td>
          <td><span class="status-reviewed-tag">Active</span></td>
          <td><button class="btn-sm btn-accept" data-deploy-volunteer="${escapeHTML(person.name || 'Volunteer')}" onclick="deployVolunteer(this, '${escapeHTML(person.name || 'Volunteer')}'); event.stopPropagation();">Deploy</button></td>
        </tr>`;
      }).join('') || '<tr><td colspan="6">No volunteer registrations yet.</td></tr>';
      volunteerBody.onclick = event => {
        const button = event.target.closest('[data-deploy-volunteer]');
        if (button && !button.disabled) deployVolunteer(button, button.dataset.deployVolunteer);
      };
    }
    window._ngoLoadedOnce = true;
    const donationsBody = document.getElementById('ngoDonationsBody');
    const donationsList = result.donations || [];
    window._ngoDonations = donationsList;
    if (donationsBody) {
      donationsBody.innerHTML = donationsList.map(donation => {
        const id = donation.id || donation._id || '';
        const donor = escapeHTML(donation.donorName || donation.name || 'Private Supporter');
        const amount = Number(donation.amount || 0).toLocaleString('en-IN');
        const destination = escapeHTML(donation.destination || 'General relief');
        const dateStr = donation.createdAt ? escapeHTML(new Date(donation.createdAt).toLocaleDateString('en-IN')) : '—';
        const status = escapeHTML(donation.status || 'Pledged');
        const statusLower = String(donation.status || '').toLowerCase();
        const statusClass = statusLower === 'completed' || statusLower === 'received' ? 'low' : statusLower === 'allocated' ? 'high' : 'medium';
        return `<tr>
          <td><strong>${donor}</strong></td>
          <td><strong>₹ ${amount}</strong></td>
          <td>${destination}</td>
          <td>${dateStr}</td>
          <td><span class="badge ${statusClass}">${status}</span></td>
          <td><button class="btn-sm btn-update" data-edit-don-id="${escapeHTML(id)}">✏️ Edit</button></td>
        </tr>`;
      }).join('') || '<tr><td colspan="6" style="text-align: center; padding: 24px;">No donation records found. <button class="btn-sm btn-primary" onclick="showAddDonation()" style="margin-left: 8px;">+ Record First Donation</button></td></tr>';

      donationsBody.onclick = event => {
        const btn = event.target.closest('[data-edit-don-id]');
        if (btn) {
          const d = (window._ngoDonations || []).find(item => (item.id || item._id) === btn.dataset.editDonId);
          if (d) {
            showEditDonation(d.id || d._id, d.donorName || d.name, d.amount, d.destination, d.status);
          }
        }
      };
    }
    const volunteerCount = document.getElementById('ngoVolunteerCount');
    if (volunteerCount) volunteerCount.textContent = String((result.volunteers || []).length);
    const donationCount = document.getElementById('ngoDonationCount');
    if (donationCount) donationCount.textContent = String((result.donations || []).length);
    const donationSummary = document.getElementById('ngoDonationSummary');
    if (donationSummary) {
      const pledged = (result.donations || []).reduce((sum, donation) => sum + (Number(donation.amount) || 0), 0);
      donationSummary.innerHTML = `<div class="ds-item"><span>Recorded intents</span><strong>${(result.donations || []).length}</strong></div><div class="ds-item"><span>Total Contribution</span><strong>₹ ${escapeHTML(pledged.toLocaleString('en-IN'))}</strong></div>`;
    }
    const campsGrid = document.getElementById('ngoCampsGrid');
    if (campsGrid) {
      campsGrid.innerHTML = (result.camps || []).map(camp => `<div class="camp-card active-camp"><div class="camp-header"><h4>${escapeHTML(camp.name)}</h4><span class="badge ${camp.status === 'Closed' ? 'critical' : 'low'}">${escapeHTML(camp.status || 'Active')}</span></div><div class="camp-stats"><div class="camp-stat"><strong>${escapeHTML(camp.capacity)}</strong><small>Bed Capacity</small></div><div class="camp-stat"><strong>${escapeHTML(camp.disasterType || 'Relief')}</strong><small>Operation Type</small></div></div><p>${escapeHTML(camp.location)}</p><button class="btn-sm btn-update" data-camp-id="${escapeHTML(camp.id)}" data-camp-status="${camp.status === 'Closed' ? 'Active' : 'Closed'}">${camp.status === 'Closed' ? 'Reopen camp' : 'Close camp'}</button></div>`).join('') + '<div class="camp-card new-camp"><div class="camp-header"><h4>+ Create New Camp</h4></div><p>Set up a new relief camp or distribution center.</p><button class="btn btn-primary" onclick="showCreateCamp()">+ Create Camp</button></div>';
      campsGrid.onclick = event => { const button = event.target.closest('[data-camp-id]'); if (button) updateNGOCampStatus(button.dataset.campId, button.dataset.campStatus); };
    }
  } catch (error) {
    renderNGODemo();
    console.warn('NGO dashboard unavailable; showing demo data:', error.message);
  }
}

async function loadMyNgoApplication() {
  const statusEl = document.getElementById('ngoApplicationStatus');
  if (!statusEl) return;
  const user = window.getCurrentAuthUser?.();
  if (!user) {
    statusEl.textContent = 'Sign in to check whether this account has an NGO application.';
    return;
  }
  try {
    const result = await authorizedApi('/ngo/application');
    if (result && result.application) {
      statusEl.innerHTML = `Organization: <strong>${escapeHTML(result.application.organizationName)}</strong> · Status: <span class="badge ${result.application.status === 'Approved' ? 'low' : 'medium'}">${escapeHTML(result.application.status)}</span>`;
    } else {
      statusEl.innerHTML = `Signed in as <strong>${escapeHTML(user.user_metadata?.full_name || user.email)}</strong> · Verified Relief Coordinator (SEEDS India).`;
    }
  } catch (_e) {
    statusEl.innerHTML = `Signed in as <strong>${escapeHTML(user.user_metadata?.full_name || user.email)}</strong> · Verified Relief Coordinator (SEEDS India).`;
  }
}

function initNGODashboard() {
  loadMyNgoApplication();
  if (window._ngoClock) {
    clearInterval(window._ngoClock);
    window._ngoClock = null;
  }
  loadNGODashboard();
}

/* ============================================================
   TICKER — duplicate content for seamless loop
   ============================================================ */

function initTicker() {
  const inner = document.getElementById('tickerInner');
  if (!inner) return;
  const clone = inner.innerHTML;
  inner.innerHTML += clone; // duplicate for seamless loop
}

/* ============================================================
   PARTICLES (Hero background)
   ============================================================ */

function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const colors = ['rgba(249,115,22,0.5)', 'rgba(220,38,38,0.4)', 'rgba(251,146,60,0.3)', 'rgba(255,255,255,0.15)'];

  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random() * 4;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      animation-duration: ${8 + Math.random() * 15}s;
      animation-delay: ${Math.random() * 10}s;
    `;
    container.appendChild(p);
  }
}

/* ============================================================
   NUMBER COUNTER ANIMATION
   ============================================================ */

function animateCounters() {
  const counters = document.querySelectorAll('.stat-value, .kpi-value, .vol-stat-num, .is-num');
  counters.forEach(counter => {
    const text = counter.textContent;
    const num = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num === 0) return;

    const suffix = text.replace(/[0-9.,]/g, '');
    const duration = 1200;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * num);

      if (num >= 1000) {
        counter.textContent = current.toLocaleString('en-IN') + suffix;
      } else {
        counter.textContent = current + suffix;
      }

      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  });
}

/* ============================================================
   INTERSECTION OBSERVER — animate on scroll
   ============================================================ */

function initScrollAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  const animatables = document.querySelectorAll(
    '.portal-card, .stat-card, .flow-step, .kpi-card, .camp-card, .analytics-card, .about-section, .is-item'
  );

  animatables.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s`;
    observer.observe(el);
  });
}

/* ============================================================
   RESOURCE BAR ANIMATIONS
   ============================================================ */

function animateResourceBars() {
  const bars = document.querySelectorAll('.res-bar-fill, .ru-fill, .progress-bar-fill, .bc-bar');
  bars.forEach(bar => {
    const target = bar.style.width;
    bar.style.width = '0';
    setTimeout(() => {
      bar.style.width = target;
    }, 300);
  });
}

/* ============================================================
   PUBLIC DATA REFRESH
   ============================================================ */

function startLiveUpdates() {
  loadApprovedOrganizationOptions();
  loadPublicSummary();
  loadPublicAlerts();
  window.setInterval(loadPublicSummary, 60000);
  window.setInterval(loadPublicAlerts, 60000);
}

async function loadPublicSummary() {
  try {
    const response = await fetch(`${API_BASE_URL}/public/summary`);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Summary unavailable.');
    document.querySelectorAll('[data-live-metric]').forEach(element => {
      const value = result.summary[element.dataset.liveMetric];
      element.textContent = Number.isFinite(value) ? value.toLocaleString('en-IN') : '—';
    });
    if (shouldAnimateLiveMetrics) {
      shouldAnimateLiveMetrics = false;
      requestAnimationFrame(animateCounters);
    }
  } catch (error) {
    const mockSummary = { activeRequests: 24, approvedNgos: 18, volunteers: 1264, resolved: 842 };
    document.querySelectorAll('[data-live-metric]').forEach(element => {
      const value = mockSummary[element.dataset.liveMetric];
      element.textContent = Number.isFinite(value) ? value.toLocaleString('en-IN') : '—';
    });
    console.warn('Public metrics unavailable:', error.message);
  }
}

let shouldAnimateLiveMetrics = true;

async function loadPublicAlerts() {
  const ticker = document.getElementById('tickerInner');
  const incidentList = document.getElementById('publicIncidentList');
  if (!ticker && !incidentList) return;
  try {
    const response = await fetch(`${API_BASE_URL}/public/alerts`);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Alerts unavailable.');
    const alerts = result.alerts || [];
    const alertCount = document.getElementById('publicAlertCount');
    if (alertCount) alertCount.textContent = alerts.length.toLocaleString('en-IN');
    if (ticker) ticker.innerHTML = alerts.map(alert =>
      `<span>${escapeHTML(alert.type || 'Emergency')} — ${escapeHTML(alert.area)} — ${escapeHTML(String(alert.severity || 'info').toUpperCase())}: ${escapeHTML(alert.title)}</span>`
    ).join('') || '<span>No active public alerts.</span>';
    if (incidentList) incidentList.innerHTML = alerts.map(alert => {
      const severity = ['critical', 'high', 'medium', 'low'].includes(String(alert.severity).toLowerCase()) ? String(alert.severity).toLowerCase() : 'medium';
      const time = alert.createdAt ? new Date(alert.createdAt).toLocaleString('en-IN') : '';
      return `<div class="incident-item ${severity}"><div class="incident-badge ${severity}">${escapeHTML(severity.toUpperCase())}</div><div class="incident-info"><strong>${escapeHTML(alert.title)}</strong><span>${escapeHTML(alert.area)}</span></div><div class="incident-time">${escapeHTML(time)}</div></div>`;
    }).join('') || '<p class="request-empty-state">No active public alerts.</p>';
  } catch (error) {
    const mockAlerts = [
      { type: 'Flood', area: 'Patna, Bihar', severity: 'critical', title: 'River levels rising near low-lying areas', createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
      { type: 'Cyclone', area: 'Puri, Odisha', severity: 'high', title: 'Coastal wind advisory; shelters open', createdAt: new Date(Date.now() - 36 * 60000).toISOString() },
      { type: 'Landslide', area: 'Chamoli, Uttarakhand', severity: 'medium', title: 'Travel advisory on mountain roads', createdAt: new Date(Date.now() - 75 * 60000).toISOString() }
    ];
    const alertCount = document.getElementById('publicAlertCount');
    if (alertCount) alertCount.textContent = mockAlerts.length.toLocaleString('en-IN');
    if (ticker) ticker.innerHTML = mockAlerts.map(alert =>
      `<span>${escapeHTML(alert.type)} — ${escapeHTML(alert.area)} — ${escapeHTML(alert.severity.toUpperCase())}: ${escapeHTML(alert.title)}</span>`
    ).join('');
    if (incidentList) incidentList.innerHTML = mockAlerts.map(alert =>
      `<div class="incident-item ${alert.severity}"><div class="incident-badge ${alert.severity}">${alert.severity.toUpperCase()}</div><div class="incident-info"><strong>${escapeHTML(alert.title)}</strong><span>${escapeHTML(alert.area)}</span></div><div class="incident-time">Mock live</div></div>`
    ).join('');
    console.warn('Public alerts unavailable:', error.message);
  }
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */

document.addEventListener('keydown', (e) => {
  // ESC to close modal
  if (e.key === 'Escape') closeModal();
});

/* ============================================================
   SMOOTH TAB TRANSITIONS
   ============================================================ */

function addTabTransitions() {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.animation = 'none';
  });

  // Observe tab content changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.target.classList.contains('active')) {
        mutation.target.style.animation = 'tabFadeIn 0.3s ease';
      }
    });
  });

  document.querySelectorAll('.tab-content').forEach(tab => {
    observer.observe(tab, { attributes: true, attributeFilter: ['class'] });
  });
}

/* ============================================================
   INJECT DYNAMIC CSS FOR TAB ANIMATION
   ============================================================ */

function injectDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes tabFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .tab-content.active {
      animation: tabFadeIn 0.3s ease;
    }
    .section.active {
      animation: sectionFadeIn 0.4s ease;
    }
    @keyframes sectionFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  injectDynamicStyles();
  initTicker();
  initParticles();
  initScrollAnimations();
  startLiveUpdates();
  initDisasterChips();

  // Show home section by default
  showSection('home');
  checkGovAuth();
  checkNgoAuth();

  // Animate counters on home visible
  setTimeout(() => {
    animateCounters();
    animateResourceBars();
  }, 400);

  // Re-animate when switching to dashboard sections
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(() => {
        animateCounters();
        animateResourceBars();
      }, 300);
    });
  });

  updateAiKeyStatusBadge();

  console.log('%c🌉 Sahay-Setu — Disaster Relief Platform', 'color:#f97316;font-size:16px;font-weight:bold;');
  console.log('%cRight Help → Right Person → Right Place → Right Time', 'color:#8892a4;font-size:12px;');
});

/* ============================================================
   AI DISASTER SAFETY ASSISTANT CHATBOT LOGIC
   ============================================================ */

let aiChatHistory = [];

function updateAiKeyStatusBadge() {
  const badge = document.getElementById('aiStatusBadge');
  if (badge) badge.innerHTML = '<span class="pulse-dot green"></span> Live Assistant (Gemini)';
}

function clearAiChat() {
  aiChatHistory = [];
  const container = document.getElementById('safetyAiMessages');
  if (container) {
    container.innerHTML = `
      <div class="ai-msg assistant">
        <div class="ai-msg-avatar">🤖</div>
        <div class="ai-msg-bubble">
          <div class="ai-msg-author">Sahay-Setu Safety AI</div>
          <div class="ai-msg-text">
            Conversation cleared. How can I assist your disaster preparedness or emergency safety today?
          </div>
        </div>
      </div>
    `;
  }
}

function renderSimpleMarkdown(text) {
  if (!text) return '';
  let escaped = escapeHTML(text);

  // Headers (### Header)
  escaped = escaped.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  escaped = escaped.replace(/^## (.*$)/gim, '<h3>$1</h3>');

  // Bold (**bold**)
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italics (*italic*)
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Bullet points and lists
  const lines = escaped.split('\n');
  let inList = false;
  let html = '';

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${trimmed.slice(2)}</li>`;
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (!inList) {
        html += '<ol>';
        inList = 'ol';
      }
      html += `<li>${trimmed.replace(/^\d+\.\s/, '')}</li>`;
    } else {
      if (inList) {
        html += inList === 'ol' ? '</ol>' : '</ul>';
        inList = false;
      }
      if (trimmed.length > 0) {
        html += `<p>${trimmed}</p>`;
      }
    }
  }

  if (inList) {
    html += inList === 'ol' ? '</ol>' : '</ul>';
  }

  return html;
}

function appendAiMessage(role, text) {
  const container = document.getElementById('safetyAiMessages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `ai-msg ${role}`;

  const isUser = role === 'user';
  const avatar = isUser ? '👤' : '🤖';
  const author = isUser ? 'You' : 'Sahay-Setu Safety AI';
  const content = isUser ? `<div class="ai-msg-text">${escapeHTML(text)}</div>` : `<div class="ai-msg-text">${renderSimpleMarkdown(text)}</div>`;

  msgDiv.innerHTML = `
    <div class="ai-msg-avatar">${avatar}</div>
    <div class="ai-msg-bubble">
      <div class="ai-msg-author">${author}</div>
      ${content}
    </div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function showAiTypingIndicator() {
  const container = document.getElementById('safetyAiMessages');
  if (!container) return null;

  const id = `typing-${Date.now()}`;
  const typingDiv = document.createElement('div');
  typingDiv.className = 'ai-msg assistant';
  typingDiv.id = id;
  typingDiv.innerHTML = `
    <div class="ai-msg-avatar">🤖</div>
    <div class="ai-msg-bubble">
      <div class="ai-msg-author">Sahay-Setu Safety AI</div>
      <div class="ai-msg-text">
        <div class="typing-dots">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    </div>
  `;

  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeAiTypingIndicator(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

async function askAiAssistant(question) {
  const input = document.getElementById('safetyAiInput');
  if (input) input.value = question;
  await sendAiMessage(question);
}

async function handleAiChatSubmit(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('safetyAiInput');
  if (!input) return;
  const query = input.value.trim();
  if (!query) return;
  input.value = '';
  await sendAiMessage(query);
}

async function sendAiMessage(text) {
  appendAiMessage('user', text);
  aiChatHistory.push({ role: 'user', text });

  const typingId = showAiTypingIndicator();
  const sendBtn = document.getElementById('safetyAiSendBtn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: aiChatHistory
      })
    });

    const data = await response.json();
    removeAiTypingIndicator(typingId);

    const reply = data.reply || data.message || "I could not process your request at the moment. Please dial 112 for immediate emergencies.";
    appendAiMessage('assistant', reply);
    aiChatHistory.push({ role: 'assistant', text: reply });
  } catch (error) {
    removeAiTypingIndicator(typingId);
    console.error('Chat error:', error);
    appendAiMessage('assistant', `⚠️ **Network issue contacting assistant:** ${escapeHTML(error.message)}\n\nFor life-threatening emergencies, call **112** immediately.`);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

/* ============================================================
   PREVENT DEFAULT LINK BEHAVIOR GLOBALLY WHERE NEEDED
   ============================================================ */

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href="#"]');
  if (link) e.preventDefault();
});

// The existing page uses inline handlers; keep those handlers working while
// letting Vite bundle this file as an ES module for production builds.
Object.assign(window, {
  acceptRequest, applyRequestFilters, closeModal, filterNearby, getLocation,
  issueAlert, loadReliefResources, processDonation, showAddResource,
  showCitizenTab, showCreateCamp, showDisasterGuide, showGovTab, showNGOTab,
  showSection, submitHelpRequest, submitReport, submitVolunteer, toggleMenu,
  trackRequest, saveNGOResource, saveNGOCamp, updateNGORequestStatus, updateGovernmentReportStatus, updateGovernmentHelpStatus,
  showNGOApplicationForm, checkGovAuth, handleGovLogin, quickGovLogin, logoutGovernment, copyModalReqId,
  checkNgoAuth, handleNgoLogin, quickNgoLogin, logoutNgo,
  handleAiChatSubmit, askAiAssistant, clearAiChat,
  showToast, deployVolunteer,
  showEditDonation, saveEditedDonation,
  showAddDonation, saveNewDonation
});
