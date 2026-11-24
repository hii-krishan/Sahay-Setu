// Emergency AI Assistant for Sahay-Setu
// Integrates with Google Gemini API and provides authoritative safety fallback guidelines

const EMERGENCY_NUMBERS = [
  "🚨 **National Emergency Helpline**: 112",
  "🚑 **Ambulance**: 108 / 102",
  "🚒 **Fire Services**: 101",
  "👮 **Police**: 100",
  "🌪️ **NDMA Disaster Helpline**: 1800-180-1253 / 1078",
  "👩 **Women Helpline**: 1090"
].join("\n");

const FALLBACK_TOPICS = {
  flood: `### 🌊 Flood Emergency Safety Protocol

**Immediate Actions (If Water is Rising):**
1. **Move to Higher Ground**: Immediately seek higher elevation or upper floors. Do NOT use elevators.
2. **Turn Off Utilities**: Shut off main electrical power switches and gas valves before floodwaters enter.
3. **Never Walk or Drive in Floodwaters**: Just 6 inches (15 cm) of moving water can knock an adult down; 12 inches can sweep away small cars.
4. **Avoid Electrical Hazards**: Stay clear of submerged wiring, fallen power lines, and transformer poles.
5. **Drink Only Safe Water**: Floodwaters are heavily contaminated. Drink only bottled water or water boiled vigorously for at least 1 minute.
6. **Call for Rescue**: If trapped, signal from a high window or roof with a bright cloth or whistle, and dial **112**.

${EMERGENCY_NUMBERS}`,

  earthquake: `### 🌍 Earthquake Safety Protocol

**During the Tremors:**
1. **DROP, COVER, AND HOLD ON**:
   - **DROP** to your hands and knees.
   - Take **COVER** under a sturdy desk or table. If none is available, cover your head and neck with your arms against an interior wall.
   - **HOLD ON** until shaking stops completely.
2. **If Indoors**: Stay inside! Do NOT run outside during shaking (falling glass and masonry cause most casualties). Avoid elevators and exterior windows.
3. **If Outdoors**: Move to an open area away from buildings, power cables, billboards, and bridges.
4. **If Driving**: Pull over to a safe open spot, set the emergency brake, and stay inside the car until shaking ceases.

**After Shaking Stops:**
- Expect aftershocks.
- Check yourself and others for injuries.
- Inspect for gas leaks (if smelled, turn off main valve and evacuate immediately; do not light matches).

${EMERGENCY_NUMBERS}`,

  fire: `### 🔥 Fire & Burn Safety Protocol

**If a Fire Breaks Out:**
1. **Get Out and Stay Out**: Evacuate immediately. Never re-enter a burning building for belongings.
2. **Crawl Low Under Smoke**: Smoke and toxic gases rise. Cleaner, cooler air is near the floor.
3. **Feel Doors Before Opening**: Use the back of your hand. If hot, do NOT open; find an alternative exit.
4. **If Clothes Catch Fire**:
   - **STOP** moving immediately.
   - **DROP** to the ground.
   - **ROLL** over and over to smother the flames.
5. **First Aid for Burns**:
   - Cool minor burns with clean, cool running water for 10–15 minutes.
   - Do NOT apply ice, butter, or oil to burns.
   - Cover with a clean, dry, non-stick sterile bandage.
   - For chemical or electrical fires, use dry powder/CO2 extinguishers, never water.

${EMERGENCY_NUMBERS}`,

  cyclone: `### 🌪️ Cyclone & Severe Storm Protocol

**Before & During the Cyclone:**
1. **Secure Your Home**: Board up or tape windows, secure loose metal sheets and outdoor furniture.
2. **Stay Indoors**: Remain in the strongest part of the house (small interior room, hallway, or under stairwell).
3. **Disconnect Electrical Mains**: Prevent short circuits and electrocution from surges.
4. **Beware the 'Eye of the Storm'**: If winds suddenly drop, do NOT go outside; the calm eye passes quickly followed by destructive reverse winds.
5. **Listen to Official Bulletins**: Follow official IMD/NDMA alerts on battery-powered radios or Sahay-Setu updates.

${EMERGENCY_NUMBERS}`,

  cpr: `### 🩹 CPR & Emergency First-Aid Protocol

**Hands-Only CPR (For Unresponsive Adults Not Breathing):**
1. **Call 112 or 108 immediately** and ask someone to bring an AED if available.
2. **Position**: Place the person on their back on a firm, flat surface.
3. **Hand Placement**: Put the heel of one hand in the center of the chest (between nipples), and interlock your other hand on top.
4. **Compressions**: Push hard and fast (100–120 beats per minute, about 2 inches / 5 cm deep). Allow chest to recoil fully between pumps. Keep going until medical personnel arrive.

**Severe Bleeding:**
- Apply direct, firm pressure with a clean cloth or sterile gauze.
- Do NOT remove soaked cloths; place fresh layers directly on top and continue pressing firmly.

${EMERGENCY_NUMBERS}`,

  kit: `### 🎒 Essential 72-Hour Disaster Survival Kit Checklist

Every Indian household in disaster-prone regions should keep an accessible survival bag:
1. **Water**: At least 3–4 liters per person per day (minimum 3-day supply).
2. **Food**: High-energy, non-perishable items (biscuits, dry fruits, roasted grams, canned foods, baby food).
3. **First-Aid Kit**: Antiseptic liquid (Dettol/Betadine), bandages, ORS sachets, pain relievers, prescription medicines.
4. **Light & Power**: LED flashlight, spare batteries, fully charged power bank, USB charging cables.
5. **Safety Tools**: Whistle (to signal rescuers), pocket multi-tool, dust masks (N95), work gloves.
6. **Important Documents**: Copies of Aadhaar, voter ID, property records, bank details sealed in waterproof plastic pouches.
7. **Hygiene & Sanitation**: Soap, hand sanitizer, sanitary napkins, chlorine water purification tablets.
8. **Cash**: Small denomination paper currency (ATMs and card machines fail during power outages).`
};

function getEmergencyFallbackResponse(query) {
  const q = String(query || "").toLowerCase();

  if (q.includes("flood") || q.includes("water") || q.includes("drown") || q.includes("river")) {
    return FALLBACK_TOPICS.flood;
  }
  if (q.includes("earthquake") || q.includes("tremor") || q.includes("shake") || q.includes("quake")) {
    return FALLBACK_TOPICS.earthquake;
  }
  if (q.includes("fire") || q.includes("burn") || q.includes("smoke") || q.includes("flame")) {
    return FALLBACK_TOPICS.fire;
  }
  if (q.includes("cyclone") || q.includes("storm") || q.includes("hurricane") || q.includes("wind")) {
    return FALLBACK_TOPICS.cyclone;
  }
  if (q.includes("cpr") || q.includes("bleed") || q.includes("first aid") || q.includes("chok") || q.includes("wound")) {
    return FALLBACK_TOPICS.cpr;
  }
  if (q.includes("kit") || q.includes("bag") || q.includes("pack") || q.includes("suppl") || q.includes("prepare")) {
    return FALLBACK_TOPICS.kit;
  }
  if (q.includes("number") || q.includes("helpline") || q.includes("call") || q.includes("phone") || q.includes("police") || q.includes("ambulance")) {
    return `### 📞 National Emergency Helplines in India\n\n${EMERGENCY_NUMBERS}\n\nFor local assistance, you can also submit an emergency report on Sahay-Setu Citizen Portal for rapid dispatch.`;
  }

  return `### 🛡️ Sahay-Setu Emergency Safety Advice

**General Emergency Rules:**
1. **Stay Calm and Assess**: Evaluate immediate hazards (fire, live electric wires, structural instability, rising floodwaters).
2. **Protect Life First**: Evacuate vulnerable individuals (children, pregnant women, elderly, disabled) first.
3. **Emergency Numbers**: Dial **112** (National All-in-One Helpline) or **108** for Ambulance.
4. **Report on Sahay-Setu**: Submit an emergency report through the Citizen Portal for coordinated relief and rescue.
5. **Listen to Official Advisories**: Follow NDMA, IMD, and local district authorities.

${EMERGENCY_NUMBERS}`;
}

async function callGeminiApi(apiKey, message, history = []) {
  const systemPrompt = `You are Sahay-Setu AI, an expert emergency disaster response and safety guide assistant for India.
Your mission is saving lives and minimizing harm during disasters (Floods, Earthquakes, Cyclones, Fires, Landslides, Heatwaves, Building Collapses).
Guidelines:
- Provide clear, calm, prioritized, step-by-step actionable advice.
- Use bullet points, bold headers, and concise language suitable for high-stress situations.
- Mention relevant Indian emergency helplines (112 for All Emergencies, 108 for Ambulance, 101 for Fire, 100 for Police, 1800-180-1253 for NDMA) when appropriate.
- For medical or injury questions, provide immediate first-aid stabilization steps while advising urgent professional medical assistance.
- Keep tone empathetic, calm, and safety-focused.`;

  const contents = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-6)) {
      if (item.text && (item.role === "user" || item.role === "assistant")) {
        contents.push({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: item.text }]
        });
      }
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: `${systemPrompt}\n\nUser Question: ${message.trim()}` }]
  });

  // Fast, active models with immediate availability on Google AI Studio
  const models = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
          }
        }),
        signal: AbortSignal.timeout(12000)
      });

      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return {
          success: true,
          model,
          reply: data.candidates[0].content.parts[0].text
        };
      }

      if (data.error) {
        lastError = data.error.message;
        console.warn(`[Gemini API] ${model} returned ${response.status}: ${data.error.message}`);
        // Only stop if the API key itself is missing or explicitly invalid
        if (/API_KEY_INVALID|API key not valid|consumer has been suspended/i.test(data.error.message)) {
          break;
        }
      }
    } catch (err) {
      lastError = err.message;
      console.warn(`[Gemini API] ${model} network error: ${err.message}`);
    }
  }

  return {
    success: false,
    error: lastError || "Failed to reach Gemini API",
    reply: getEmergencyFallbackResponse(message)
  };
}

module.exports = {
  getEmergencyFallbackResponse,
  callGeminiApi
};
