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

  // Special init per section
  if (name === 'ngo') initNGODashboard();
}

function toggleMenu() {
  const navLinks = document.getElementById('navLinks');
  navLinks.classList.toggle('open');
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
  if (tab === 'nearby') loadReliefResources();
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

const API_BASE_URL = (window.API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');




async function saveCitizenData(kind, payload) {
  const protectedKinds = ["help", "volunteers", "donations"];
  const requiresAuth = protectedKinds.includes(kind);
  const client = window.supabase;

  let accessToken = "";

  if (requiresAuth) {
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
    throw new Error(
      response.status === 401
        ? "Your session expired. Please sign in again."
        : result.message || "Unable to save your submission."
    );
  }

  return result;
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
    <div style="text-align:center; padding: 8px 0;">
      <div style="font-size: 3.5rem; margin-bottom: 12px;">✅</div>
      <h2 style="font-family: Space Grotesk, sans-serif; font-size: 1.4rem; margin-bottom: 8px;">Emergency Report Submitted!</h2>
      <div style="background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.25); border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 4px;">Your Request ID</div>
        <div style="font-family: Space Grotesk, sans-serif; font-size: 1.6rem; font-weight: 800; color: #fb923c;">${reqId}</div>
      </div>
      <p style="color: #8892a4; font-size: 0.88rem; margin-bottom: 8px;">
        Your report for <strong style="color:#f1f5f9;">${escapeHTML(type)}</strong> at <strong style="color:#f1f5f9;">${escapeHTML(loc)}</strong> has been received and saved.
      </p>
      <p style="color: #8892a4; font-size: 0.82rem;">Severity: <span style="color:#fb923c; font-weight:700; text-transform:uppercase;">${severity.value}</span></p>
      <p style="font-size: 0.8rem; color: #64748b; margin-top: 14px;">Our verification team will review and coordinate with NGOs & Government authorities immediately.</p>
      <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
        <button onclick="showCitizenTab('track'); closeModal();" class="btn btn-primary" style="padding:10px 20px; font-size:0.85rem;">📊 Track Status</button>
        <button onclick="closeModal()" class="btn btn-secondary" style="padding:10px 20px; font-size:0.85rem;">Close</button>
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
    <div style="text-align:center; padding: 8px 0;">
      <div style="font-size: 3.5rem; margin-bottom: 12px;">🆘</div>
      <h2 style="font-family: Space Grotesk, sans-serif; font-size: 1.4rem; margin-bottom: 8px;">Help Request Submitted!</h2>
      <div style="background: rgba(37,99,235,0.1); border: 1px solid rgba(37,99,235,0.25); border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 4px;">Your Request ID</div>
        <div style="font-family: Space Grotesk, sans-serif; font-size: 1.6rem; font-weight: 800; color: #60a5fa;">${reqId}</div>
      </div>
      <p style="color: #8892a4; font-size: 0.88rem;">Hi <strong style="color:#f1f5f9;">${escapeHTML(name)}</strong>, your help request for <strong style="color:#f1f5f9;">${escapeHTML(loc)}</strong> is now being processed.</p>
      <p style="font-size: 0.8rem; color: #64748b; margin-top: 12px;">Nearby NGOs will be notified. You can track your request using the ID above.</p>
      <button onclick="closeModal()" class="btn btn-primary" style="margin-top:20px; padding:10px 24px;">Got it!</button>
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
    availability: document.getElementById('vol-avail').value
  });

  openModal(`
    <div style="text-align:center; padding: 8px 0;">
      <div style="font-size: 3.5rem; margin-bottom: 12px;">👐</div>
      <h2 style="font-family: Space Grotesk, sans-serif; font-size: 1.4rem; margin-bottom: 8px;">Welcome, Volunteer!</h2>
      <p style="color: #8892a4; font-size: 0.88rem; margin-bottom: 16px;">
        Thank you, <strong style="color:#f1f5f9;">${escapeHTML(name)}</strong>! You've been registered as a Sahay-Setu volunteer.
      </p>
      <div style="background: rgba(22,163,74,0.1); border: 1px solid rgba(22,163,74,0.25); border-radius: 12px; padding: 16px; margin: 16px 0; font-size:0.85rem; color:#86efac;">
        🎉 You are now part of 12,400+ volunteers helping disaster-affected communities across India.
      </div>
      <p style="font-size: 0.8rem; color: #64748b;">You'll receive SMS/email notifications when volunteers are needed in your area.</p>
      <button onclick="closeModal()" class="btn btn-success" style="margin-top:20px; padding:10px 24px;">Start Volunteering 🙏</button>
    </div>
  `);
  form.reset();
  } catch (error) {
    showToast(`⚠️ ${error.message}`, 'error');
  } finally {
    submitButton.disabled = false;
  }
}

async function processDonation() {
  const amount = Number(document.getElementById('custom-amount').value);
  const to = document.getElementById('donate-to').value;
  if (!Number.isFinite(amount) || amount < 10) { showToast('Enter a donation amount of at least ₹10.', 'error'); return; }
  const button = document.querySelector('#citizen-tab-donate .btn-warning');
  button.disabled = true;
  try {
  const saved = await saveCitizenData('donations', {
    amount, currency: 'INR', destination: to,
    donorName: document.getElementById('donor-name').value.trim(),
    panLastFour: document.getElementById('donor-pan').value.trim().slice(-4)
  });

  openModal(`
    <div style="text-align:center; padding: 8px 0;">
      <div style="font-size: 3.5rem; margin-bottom: 12px;">💛</div>
      <h2 style="font-family: Space Grotesk, sans-serif; font-size: 1.4rem; margin-bottom: 8px;">Donation Intent Saved</h2>
      <div style="background: rgba(217,119,6,0.1); border: 1px solid rgba(217,119,6,0.25); border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 4px;">Donation Amount</div>
        <div style="font-family: Space Grotesk, sans-serif; font-size: 2rem; font-weight: 800; color: #fbbf24;">₹${amount.toLocaleString('en-IN')}</div>
        <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 4px;">${escapeHTML(to)}</div>
      </div>
      <p style="color: #8892a4; font-size: 0.85rem;">Your pledge has been recorded. Payment processing and tax receipts are not enabled yet.</p>
      <p style="font-size: 0.75rem; color: #64748b; margin-top: 10px;">Record saved · Reference: ${escapeHTML(saved.record._id || 'recorded')}</p>
      <button onclick="closeModal()" class="btn btn-warning" style="margin-top:20px; padding:10px 24px;">Close</button>
    </div>
  `);
  } catch (error) {
    showToast(`⚠️ ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

function issueAlert(e) {
  e.preventDefault();
  const title = document.getElementById('alert-title').value;
  const area = document.getElementById('alert-area').value;
  const sev = document.querySelector('input[name="alert-sev"]:checked');

  if (!sev) {
    showToast('⚠️ Please select a severity level.', 'error');
    return;
  }

  openModal(`
    <div style="text-align:center; padding: 8px 0;">
      <div style="font-size: 3.5rem; margin-bottom: 12px;">📢</div>
      <h2 style="font-family: Space Grotesk, sans-serif; font-size: 1.4rem; margin-bottom: 8px;">Alert Issued Successfully!</h2>
      <div style="background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25); border-radius: 12px; padding: 16px; margin: 16px 0; text-align:left;">
        <div style="font-weight:700; margin-bottom:4px;">🚨 ${title}</div>
        <div style="font-size:0.8rem; color:#94a3b8;">Area: ${area}</div>
        <div style="font-size:0.8rem; color:#f87171; margin-top:4px; text-transform:uppercase; font-weight:700;">Severity: ${sev.value}</div>
      </div>
      <p style="color: #8892a4; font-size: 0.85rem;">Alert has been broadcast to all NGOs, District Authorities, and citizens in the affected area.</p>
      <button onclick="closeModal()" class="btn btn-emergency" style="margin-top:20px; padding:10px 24px;">Done</button>
    </div>
  `);
  e.target.reset();
}

/* ============================================================
   REQUEST ACTIONS
   ============================================================ */

function acceptRequest(id) {
  openModal(`
    <div style="text-align:center; padding: 8px 0;">
      <div style="font-size: 3rem; margin-bottom: 12px;">✅</div>
      <h3 style="font-family: Space Grotesk, sans-serif; font-size: 1.2rem; margin-bottom: 8px;">Request ${id} Accepted</h3>
      <p style="color: #8892a4; font-size: 0.88rem; margin-bottom: 20px;">Assign volunteers and resources to this request.</p>
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px; text-align:left;">
        <div class="form-group">
          <label style="font-size:0.8rem; color:#8892a4; font-weight:600; display:block; margin-bottom:6px;">Assign Volunteer</label>
          <select style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;color:#f1f5f9;width:100%;font-size:0.85rem;">
            <option>Priya Sharma — Patna</option>
            <option>Ravi Mehta — Bhubaneswar</option>
            <option>Amit Kumar — Patna</option>
          </select>
        </div>
        <div class="form-group">
          <label style="font-size:0.8rem; color:#8892a4; font-weight:600; display:block; margin-bottom:6px;">ETA</label>
          <select style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;color:#f1f5f9;width:100%;font-size:0.85rem;">
            <option>30 minutes</option>
            <option>1 hour</option>
            <option>2 hours</option>
            <option>4 hours</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button onclick="showToast('✅ Request ${id} accepted & volunteer assigned!', 'success'); closeModal();" class="btn btn-success" style="padding:10px 20px; font-size:0.85rem;">Confirm Assignment</button>
        <button onclick="closeModal()" class="btn btn-secondary" style="padding:10px 20px; font-size:0.85rem;">Cancel</button>
      </div>
    </div>
  `);
}

function showAddResource() {
  openModal(`
    <div>
      <h3 style="font-family: Space Grotesk, sans-serif; font-size: 1.2rem; margin-bottom: 16px;">📦 Add Resource</h3>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label style="font-size:0.8rem;color:#8892a4;font-weight:600;display:block;margin-bottom:6px;">Resource Type</label>
          <select id="new-res-type" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:#f1f5f9;width:100%;">
            <option>🍱 Food Packets</option>
            <option>💧 Water (Litres)</option>
            <option>💊 Medicine Kits</option>
            <option>🏠 Shelter Kits</option>
            <option>👕 Clothing Bundles</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label style="font-size:0.8rem;color:#8892a4;font-weight:600;display:block;margin-bottom:6px;">Quantity</label>
          <input type="number" id="new-res-qty" placeholder="Enter quantity..." style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:#f1f5f9;width:100%;" />
        </div>
        <div class="form-group">
          <label style="font-size:0.8rem;color:#8892a4;font-weight:600;display:block;margin-bottom:6px;">Source / Donor</label>
          <input type="text" placeholder="e.g. TCS CSR Fund, Government Allocation..." style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:#f1f5f9;width:100%;" />
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
          <button onclick="showToast('📦 Resource added to inventory!', 'success'); closeModal();" class="btn btn-primary" style="padding:10px 20px; font-size:0.85rem;">Add Resource</button>
          <button onclick="closeModal()" class="btn btn-secondary" style="padding:10px 20px; font-size:0.85rem;">Cancel</button>
        </div>
      </div>
    </div>
  `);
}

function showCreateCamp() {
  openModal(`
    <div>
      <h3 style="font-family: Space Grotesk, sans-serif; font-size: 1.2rem; margin-bottom: 16px;">⛺ Create Relief Camp</h3>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label style="font-size:0.8rem;color:#8892a4;font-weight:600;display:block;margin-bottom:6px;">Camp Name</label>
          <input type="text" placeholder="e.g. Flood Relief Camp — Patna" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:#f1f5f9;width:100%;" />
        </div>
        <div class="form-group">
          <label style="font-size:0.8rem;color:#8892a4;font-weight:600;display:block;margin-bottom:6px;">Location / Address</label>
          <input type="text" placeholder="Full address..." style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:#f1f5f9;width:100%;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label style="font-size:0.8rem;color:#8892a4;font-weight:600;display:block;margin-bottom:6px;">Capacity (beds)</label>
            <input type="number" placeholder="e.g. 200" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:#f1f5f9;width:100%;" />
          </div>
          <div class="form-group">
            <label style="font-size:0.8rem;color:#8892a4;font-weight:600;display:block;margin-bottom:6px;">Disaster Type</label>
            <select style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px;color:#f1f5f9;width:100%;">
              <option>🌊 Flood</option><option>🌪️ Cyclone</option><option>🔥 Fire</option><option>🌍 Earthquake</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
          <button onclick="showToast('⛺ Relief camp created successfully!', 'success'); closeModal();" class="btn btn-success" style="padding:10px 20px; font-size:0.85rem;">Create Camp</button>
          <button onclick="closeModal()" class="btn btn-secondary" style="padding:10px 20px; font-size:0.85rem;">Cancel</button>
        </div>
      </div>
    </div>
  `);
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
  showToast('🔍 Filters applied to requests.', 'success');
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
      `http://localhost:5000/api/requests/${encodeURIComponent(id)}`
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
      ["Location", record.location],
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
  const id = escapeHTML(record.requestId);
  const type = escapeHTML(record.type || (record.helpTypes || []).join(', ') || 'Help request');
  const status = escapeHTML(record.status || 'Submitted');
  const location = escapeHTML(record.location || 'Location not provided');
  const created = record.createdAt ? new Date(record.createdAt).toLocaleString('en-IN') : '';
  const card = document.createElement('div');
  card.className = 'req-card';
  card.innerHTML = `<div class="req-id">${id}</div><div class="req-type">${type}</div><div class="req-loc">📍 ${location}</div><div class="req-status in-progress">${status.toUpperCase()}</div><div class="req-note">Submitted ${escapeHTML(created)}</div>`;
  list.prepend(card);
}

async function loadReliefResources() {
  try {
    const location = document.getElementById('nearby-loc')?.value.trim() || '';
    const response = await fetch(`${API_BASE_URL}/relief-resources${location ? `?location=${encodeURIComponent(location)}` : ''}`);
    const result = await response.json();
    if (!response.ok || !result.success || !result.resources.length) return;
    const grid = document.getElementById('nearbyGrid');
    grid.innerHTML = result.resources.map(resource => {
      const type = escapeHTML(String(resource.type || 'other').toLowerCase());
      return `<div class="nearby-card" data-type="${type}"><div class="nearby-badge ${type}">${escapeHTML(resource.label || resource.type || 'Relief')}</div><h4>${escapeHTML(resource.name)}</h4><p class="nearby-dist">📍 ${escapeHTML(resource.location)}${resource.distance ? ` · ${escapeHTML(resource.distance)}` : ''}</p><p>${escapeHTML(resource.details || '')}</p><div class="nearby-meta"><span class="status-open">${escapeHTML(resource.status || 'AVAILABLE')}</span></div></div>`;
    }).join('');
    const active = document.querySelector('#citizen-tab-nearby .filter-pill.active');
    if (active) filterNearby(active.textContent.includes('Food') ? 'food' : active.textContent.includes('Water') ? 'water' : active.textContent.includes('Shelter') ? 'shelter' : active.textContent.includes('Medical') ? 'medical' : 'all', active);
  } catch (error) {
    console.warn('Could not load database relief resources:', error.message);
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
   DONATION AMOUNT
   ============================================================ */

function setAmount(amount) {
  document.getElementById('custom-amount').value = amount;
  document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
  event.target.classList.add('selected');
}

/* ============================================================
   NGO LIVE CLOCK
   ============================================================ */

function initNGODashboard() {
  const clock = document.getElementById('ngoLiveTime');
  if (!clock) return;

  function tick() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  }
  tick();
  if (!window._ngoClock) {
    window._ngoClock = setInterval(tick, 1000);
  }
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
   SIMULATED LIVE DATA UPDATES
   ============================================================ */

function startLiveUpdates() {
  // Periodically update active request counts to simulate live data
  setInterval(() => {
    const badge = document.querySelector('.nav-alert-badge span:last-child');
    if (badge) {
      const counts = ['3 Active Alerts', '4 Active Alerts', '3 Active Alerts', '5 Active Alerts'];
      badge.textContent = counts[Math.floor(Math.random() * counts.length)];
    }
  }, 15000);
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

  // Show home section by default
  showSection('home');

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

  console.log('%c🌉 Sahay-Setu — Disaster Relief Platform', 'color:#f97316;font-size:16px;font-weight:bold;');
  console.log('%cRight Help → Right Person → Right Place → Right Time', 'color:#8892a4;font-size:12px;');
});

/* ============================================================
   PREVENT DEFAULT LINK BEHAVIOR GLOBALLY WHERE NEEDED
   ============================================================ */

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href="#"]');
  if (link) e.preventDefault();
});
