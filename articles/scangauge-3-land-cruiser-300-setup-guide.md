---
title: "ScanGauge 3 Setup Guide for the LandCruiser 300 Series: Gauges, X-Gauge Codes & Trip Functions"
slug: scangauge-3-land-cruiser-300-setup-guide
description: >-
  A complete setup guide for the ScanGauge 3 on the Toyota LandCruiser 300
  Series. The gauges that matter for touring and towing (transmission temp,
  current gear, lockup, EGT, DPF load, intercooler/intake temp, remaining
  fuel), how to add them with automatic and manual X-Gauge, recommended alarm
  thresholds, screen layouts, and every built-in and trip-computer function.
category: How-To Guides
vehicle: LandCruiser 300 Series
tags:
  - ScanGauge 3
  - X-Gauge
  - OBD2
  - setup guide
  - DPF
  - transmission temperature
  - EGT
  - touring
  - towing
related:
  - scangauge-3-land-cruiser-300-review
author: 300 Series Guide
date: 2026-06-15
status: draft
---

# ScanGauge 3 Setup Guide for the LandCruiser 300 Series

This is the companion how-to for our [ScanGauge 3 review](scangauge-3-land-cruiser-300-review.md).
The review covers *why* you'd fit one; this guide covers *how* to set it up on
a 300 Series — the exact gauges to run, how to add them, what alarm
thresholds make sense for touring and towing, and how to use every built-in
and trip-computer function.

> **Read this first — a safety note on codes.** The gauges below are
> **critical to the safe operation** of a 300 Series under load, so they have
> to read *correctly*. The ScanGauge 3 can **auto-detect** most of the
> Toyota-specific gauges for you — that's the method we recommend and the one
> least likely to give a wrong number. Where we list a manual X-Gauge code,
> treat it as a **starting point to verify**, not gospel: X-Gauge codes are
> community/experimental, vary by model year and transmission, and a wrong
> code can show a plausible-but-false reading. Always sanity-check a new gauge
> against a known-good source (see [Verify every new gauge](#step-5-verify-every-new-gauge))
> before you trust it on a hot climb.

The 300 Series touring/towing context here is the **3.3L V6 twin-turbo diesel
(F33A-FTV)** with the **10-speed automatic**. Petrol 300s share most of the
generic gauges but the heat-management gauges below are aimed at the diesel.

---

## Contents

1. [The two kinds of gauge: built-in vs X-Gauge](#the-two-kinds-of-gauge-built-in-vs-x-gauge)
2. [The priority gauges for a 300 Series](#the-priority-gauges-for-a-300-series)
3. [Step 1 — First connection and metric units](#step-1--first-connection-and-metric-units)
4. [Step 2 — Add the X-Gauges automatically (recommended)](#step-2--add-the-x-gauges-automatically-recommended)
5. [Step 3 — Add an X-Gauge manually (if needed)](#step-3--add-an-x-gauge-manually-if-needed)
6. [Step 4 — Build your screens (layouts)](#step-4--build-your-screens-layouts)
7. [Step 5 — Verify every new gauge](#step-5--verify-every-new-gauge)
8. [Recommended alarm thresholds](#recommended-alarm-thresholds)
9. [Built-in gauges reference](#built-in-gauges-reference)
10. [Trip computer and fuel-economy functions](#trip-computer-and-fuel-economy-functions)
11. [Scan tool: reading and clearing codes](#scan-tool-reading-and-clearing-codes)
12. [X-Gauge code reference table](#x-gauge-code-reference-table)
13. [Troubleshooting](#troubleshooting)
14. [Quick-start checklist](#quick-start-checklist)

---

## The two kinds of gauge: built-in vs X-Gauge

The ScanGauge 3 shows two classes of data:

- **Built-in (standard OBD2) gauges** — available the moment you plug in, no
  setup. These come straight off the generic OBD2 data every compliant
  vehicle must provide: coolant temperature, intake air temperature, manifold
  pressure (boost), RPM, road speed, engine load, throttle position, battery
  voltage, and the fuel-economy/trip maths the ScanGauge calculates from them.
- **X-Gauges** — extra, **manufacturer-specific** parameters that aren't in
  the generic OBD2 set. On the 300 these are the good ones: transmission
  fluid temperature, current gear, torque-converter lockup, EGT, DPF soot
  load, and so on. The ScanGauge 3's headline feature is that it can
  **configure these automatically**, where the older ScanGauge II made you
  type long hex strings by hand.

Mapping your requested list to those two classes:

| Gauge you asked for | Where it comes from on the SG3 |
| --- | --- |
| Transmission temperature | **X-Gauge** (auto-detect, or manual code) |
| Current gear | **X-Gauge** (auto-detect, or manual code) |
| Torque-converter lockup status | **X-Gauge** (auto-detect, or manual code) |
| EGT (exhaust gas temperature) | **X-Gauge** (auto-detect, or manual code) |
| DPF soot load / regen status | **X-Gauge** (auto-detect, or manual code) |
| Intercooler / charge-air intake temp | **Built-in IAT** for the standard intake sensor; **X-Gauge** for a dedicated post-intercooler/charge-air sensor |
| Remaining fuel | **Built-in** trip-computer estimate (tank size + fuel used); **X-Gauge/standard PID** for tank-level % *where the 300 reports it* |
| Coolant (water) temperature | **Built-in** |
| Boost / manifold pressure | **Built-in (MAP)** |
| Fuel economy, L/100 km, L/hr, trips | **Built-in** trip computer |

## The priority gauges for a 300 Series

For a touring/towing 300, this is the core set worth getting on screen, in
rough order of "watch this or pay for it later":

1. **Transmission fluid temperature** — the headline gauge. The 10-speed auto
   makes heat when towing heavy in the hot stuff; this is your early warning.
2. **EGT (exhaust gas temperature)** — how hard the engine is actually
   working; key for both engine and DPF health.
3. **Coolant temperature** *(built-in)* — the real number, not the factory
   "centre needle no matter what" gauge.
4. **DPF soot load / regen status** — see when a regen is happening so you
   don't shut down mid-regen and you don't short-trip the filter into trouble.
5. **Current gear** + **torque-converter lockup** — read how the trans is
   behaving on climbs; lockup dropping in and out is what generates trans heat.
6. **Boost / MAP** *(built-in)* — confirm the twin-turbos under load.
7. **Intake / charge-air (intercooler) temperature** — how well the
   intercooler is coping; high charge-air temps rob power and add heat.
8. **Remaining fuel / range** + **instant L/100 km** — trip planning between
   remote fills.

## Step 1 — First connection and metric units

1. Find the OBD2 port — under the dash on the driver's side, up near the
   pedals on the 300 Series.
2. Plug the ScanGauge 3 lead in. It's powered by the port, so no wiring.
3. Route the cable to your mounting spot (the unit can sit up to ~1.8 m / 6 ft
   from the port).
4. On first power-up, let it identify the vehicle.
5. **Set units to Metric** so you get **°C**, **kPa**, **km**, **litres** and
   **L/100 km**. (The SG3 can display English or Metric; the trip computer and
   gauges follow this setting.) Do this before adding gauges so temperatures
   come up in °C.
6. While you're in setup, enter your **tank size** and **fuel price** so the
   trip computer can do remaining-range and cost maths.

## Step 2 — Add the X-Gauges automatically (recommended)

This is the path that makes the SG3 worth the money on a 300:

1. With the engine running, go to the **X-Gauge / Add Gauge** menu.
2. Choose the **automatic / auto-detect** option. The unit interrogates the
   300's modules and presents the manufacturer-specific gauges it found.
3. Add the ones you want from the list — transmission temperature, gear,
   lockup, EGT, DPF, charge-air temp where offered.
4. Repeat to fill out your set. Then arrange them onto screens (Step 4).

Because the SG3 takes **Wi-Fi firmware updates**, the auto-detect list tends
to *improve over time* — if a gauge isn't offered today, re-check after an
update.

> **If a gauge isn't auto-detected:** you have three options, in order of
> preference — (a) update the firmware over Wi-Fi and retry; (b) grab a
> confirmed code from ScanGauge's Toyota X-Gauge list or ScanGauge support;
> (c) use a community-confirmed 200/300-series code from a forum and **verify
> it** (Step 5). Then enter it manually (Step 3).

## Step 3 — Add an X-Gauge manually (if needed)

A manual X-Gauge is four fields. Understanding them helps you verify a code
and convert units:

- **TXD** — *Transmit Data*: the request the ScanGauge sends to the vehicle.
- **RXF** — *Receive Frame*: tells the ScanGauge where in the reply the value
  sits (which bytes, bit length, start position).
- **RXD** — *Receive Data*: the bit position/size to read out of that frame.
- **MTH** — *Math*: the scaling applied — four hex values for
  `× multiplier`, `÷ divisor`, `+/- offset` — which is also how you convert
  **°F → °C** or scale a raw value into real units.

To enter one: **X-Gauge → Add → enter TXD, RXF, RXD, MTH → name it (up to a
few characters, e.g. `TFT`, `EGT`, `GEAR`, `LOCK`, `DPF`, `IAT2`) → set the
units/decimal places → save.**

> **Unit tip:** many published Toyota codes return **°F**. If you want °C,
> either pick the °C version of the code or adjust the **MTH** field to apply
> the F→C conversion. Get the °C version if you can — it's less error-prone.

## Step 4 — Build your screens (layouts)

The SG3 shows up to **9 gauges per screen** and lets you save **multiple
screens**, so build task-specific layouts and swipe between them:

- **Towing screen (the important one):**
  `TransTemp · EGT · Coolant · Boost · Gear · Lockup · ChargeAirTemp · InstL/100 · Speed`
- **DPF / around-town screen:**
  `DPF soot · Regen status · Coolant · EGT · Avg L/100 · Distance · TransTemp`
- **Economy / touring screen:**
  `Instant L/100 · Average L/100 · L/hr · Remaining range · TransTemp · Coolant`
- **Diagnostic screen:** leave room to glance at boost, load, intake temp and
  voltage when chasing something.

Put **TransTemp and EGT in the same eyeline** — they're the two you'll
glance at most on a long grade.

## Step 5 — Verify every new gauge

Do this **once per gauge**, before you rely on it:

- **Cold-start check:** with the engine stone cold, coolant, trans temp,
  intake and charge-air temps should all read close to **ambient**. If a
  "temperature" shows 0, a wildly high number, or doesn't move as things warm
  up, the code or units are wrong.
- **Cross-check the known ones:** compare coolant against the factory
  behaviour, and intake temp against ambient.
- **Behaviour check:** *Gear* should step 1→10 as you drive; *Lockup* should
  toggle locked/unlocked at cruise; *Boost* should rise under throttle; *DPF
  soot* should climb slowly then drop after a regen.
- If a gauge fails the sniff test, re-check the code, the units, and the MTH
  scaling before trusting it.

## Recommended alarm thresholds

The SG3 supports **visual + audible alarms** per gauge. These are sensible
**touring/towing starting points** — set conservatively, then adjust to your
vehicle, your tune and your loads. **Confirm EGT limits and sensor location
with your engine builder/tuner** — pre-turbo and post-turbo EGT read very
differently, and the safe ceiling depends on where the 300's sensor sits.

| Gauge | Caution (amber) | Alarm (back off / stop) | Notes |
| --- | --- | --- | --- |
| Transmission fluid temp | ~100 °C | ~115–120 °C | ATF life drops fast with sustained heat; ease off and let it cool. |
| Coolant temp | ~100 °C | ~107–110 °C | Above the normal operating band = stop climbing/towing. |
| EGT | *engine-specific* | *engine-specific* | **Verify with tuner.** Depends heavily on pre- vs post-turbo sensor. |
| Charge-air / intake temp | high & rising | — | More a "you're working it hard / airflow is poor" signal than a hard limit. |
| DPF soot load | nearing regen threshold | — | Use it to plan a highway run, not as an alarm. |

The point of the alarms is to let you **drive on the gauges' edges instead of
staring at them** — set them, then just watch the road.

## Built-in gauges reference

These need **no setup** — they're available as soon as you plug in (exact
labels are configurable; names shown are typical):

- **RPM** — engine speed
- **Speed** — road speed (km/h)
- **Coolant / Water Temp** — engine coolant temperature (°C)
- **Intake Air Temp (IAT)** — intake air temperature (°C) — on many engines
  this is the post-intercooler/manifold intake sensor, so it doubles as a
  rough **charge-air** reading; add a dedicated charge-air X-Gauge if your
  300 exposes one for a truer intercooler-out figure
- **Manifold Pressure (MAP)** — your **boost** reading (kPa)
- **Engine Load** — calculated load %
- **Throttle Position** — %
- **Ignition Timing** *(petrol)* — degrees
- **Battery / Charging Voltage** — volts
- **Open/Closed Loop**, **Horsepower (calculated)** and other derived gauges

## Trip computer and fuel-economy functions

The SG3 has a full trip computer with **5 sets of trip data** kept in
parallel — so you can run, say, a *Tank* trip, a *Today* trip and a couple of
named trips (a towing leg vs daily driving) at the same time. Across those,
the fuel/economy functions include:

- **Instant fuel economy** — live L/100 km (or km/L), updates as you drive
- **Average fuel economy** — L/100 km for the trip
- **Fuel used** — litres consumed this trip
- **Litres per hour (L/hr)** — handy at idle, slow crawling, or stationary
- **Cost of fuel used** — total $ for the trip (uses your entered fuel price)
- **Cost per km** — running $/km
- **Distance** travelled
- **Trip time** / drive time
- **Max values** captured per trip — e.g. max speed, max RPM, max coolant
  temp, max boost (great for reviewing how hard a climb really was)
- **Remaining fuel / range** — estimated from your **tank size minus fuel
  used**; where the 300 reports tank level over OBD2 you can also add a
  **fuel-level %** gauge, but the tank-size/used method is the reliable one
  on Toyotas that don't expose level cleanly

Set **Metric** units (Step 1) to get everything in **L/100 km, litres, °C and
kPa**. Enter your **tank size** and **fuel price** so range and cost maths
work.

## Scan tool: reading and clearing codes

Beyond gauges, the SG3 is a code reader — genuinely useful on a 300 a long
way from a dealer:

- **Read trouble codes** — both **set** (active) and **pending** codes.
- **Clear codes** — reset a nuisance code after you've understood it. The 300
  has a lot of control modules and can throw codes that don't mean the sky is
  falling; being able to read what it actually is, then clear it, beats
  limping to town guessing.
- The SG3's alarms are separate from this — alarms watch your *gauges*; the
  scan tool watches the *fault-code* system.

> Reading/clearing a code doesn't fix the underlying fault — if a code comes
> straight back, it's telling you something. Use the gauges to investigate.

## X-Gauge code reference table

What to add for each requested parameter, and where to get it. **Prefer
auto-detect (Step 2).** Manual codes are listed as a *verify-first* fallback.

| Parameter | Why it matters on the 300 | How to get it | Code notes |
| --- | --- | --- | --- |
| **Transmission fluid temp** | #1 heat gauge for towing | Auto-detect → else manual | Documented Toyota/Lexus Transmission Temperature (**°F**): `TXD 07E02182`, `RXF 056106820000`, `RXD 3008`, `MTH 00090005FFD8`. Use the °C version or convert via MTH. **Verify on your vehicle.** |
| **Current gear** | See what the 10-speed is doing on climbs | Auto-detect → else manual | Community codes exist for Toyota auto "Gear (#)"; confirmed on 200-series, **verify on the 300**. |
| **Torque-converter lockup** | Lockup cycling = trans heat | Auto-detect → else manual | Community "Converter Lockup (State)" codes (200-series); **verify on the 300**. |
| **EGT** | Engine + DPF health under load | Auto-detect → else manual/support | Get the code that matches your **sensor location** (pre/post turbo). **Set alarm with tuner.** |
| **DPF soot load / regen** | Avoid short-trip DPF issues; don't stop mid-regen | Auto-detect → else manual/support | Look for "DPF soot" / "Regen status" in the auto list first. |
| **Intercooler / charge-air temp** | Intercooler performance, power loss when hot | Built-in **IAT** for the standard intake sensor; X-Gauge for a dedicated charge-air sensor | Confirm which sensor your 300 exposes (Step 5 cold-start check). |
| **Remaining fuel / range** | Remote-touring planning | Built-in trip computer (tank size − fuel used) | Add a fuel-level % X-Gauge only if the 300 reports tank level cleanly. |

> **Where to source confirmed codes:** the auto-detect list on the SG3 first;
> then ScanGauge's Toyota/Lexus X-Gauge list and ScanGauge support; then the
> 200/300-series threads on IH8MUD and the 300 Series Facebook groups, where
> owners post working setups. Treat any forum code as *verify-first*.

## Troubleshooting

- **A gauge reads a flat 0, a silly-high number, or never moves** — wrong
  code or wrong units. Re-check TXD/RXF/RXD/MTH and the unit/decimal setting;
  do the cold-start check.
- **Temperature looks "about double" what it should** — you're likely showing
  **°F** while expecting **°C**. Switch to the °C code or fix the MTH.
- **Gauge isn't in the auto-detect list** — update firmware over Wi-Fi and
  retry; the supported list grows with updates.
- **Fuel range looks wrong** — re-enter the correct **tank size** and reset
  the trip at a known full tank.
- **Nuisance fault code keeps returning after clearing** — that's a real
  signal, not a glitch; investigate with the relevant gauge.
- **Screen too dim / too bright at night** — set the brightness/colour to
  taste; the touchscreen does 16M+ colours so pick something glanceable.

## Quick-start checklist

- [ ] Plug into OBD2 port (driver's side, under dash) and mount the unit
- [ ] Set units to **Metric** (°C, kPa, km, L/100 km)
- [ ] Enter **tank size** and **fuel price**
- [ ] **Auto-detect X-Gauges** and add: TransTemp, EGT, Gear, Lockup, DPF,
      charge-air temp
- [ ] Confirm built-ins: Coolant, IAT, Boost (MAP), Voltage, Load
- [ ] Build a **Towing screen** and an **Economy/Touring screen**
- [ ] **Verify every new gauge** with the cold-start + behaviour checks
- [ ] Set **alarms**: trans temp, coolant, EGT (EGT limit confirmed with tuner)
- [ ] Note how to **read/clear codes** for remote travel

---

*Got a confirmed 300 Series X-Gauge setup — exact gauges plus working
codes/units? Send it through and we'll fold it into this guide's reference
table so the next 300 owner can copy it straight in.*

<!--
SOURCES / RESEARCH NOTES (remove before publishing):
- SG3 built-in gauges, 5 trip sets, up to 9 gauges/screen, metric L/100km, manifold/EGT/IAT, Wi-Fi updates, alarms: scangauge.com.au/scangauge-3; ppdperformance.com.au; bulletproofdiesel.com; Amazon SG3 listing
- X-Gauge structure TXD/RXF/RXD/MTH: scangauge.com/support/x-gauge-commands; ecomodder X-Gauge Commands Repertory; scangauge.com.au/x-gauge-commands
- Documented Toyota/Lexus Transmission Temperature (°F) 07E02182 / 056106820000 / 3008 / 00090005FFD8: scangauge.com/xgauge/transmission-temperature-07e02182-2/
- Gear / converter lockup / converter temp community codes (200-series, "experimental"): IH8MUD + Expedition Portal threads; scangauge.com.au/toyota-x-gauges; scangauge.com.au/blog ATF for Toyota LandCruiser (100/150/200 confirmed)
- ALL X-Gauge codes flagged experimental/verify — confirm on the actual LC300 (F33A-FTV + 10-spd). EGT thresholds intentionally left to tuner (pre/post turbo sensor dependent).
- VERIFY before publishing: confirmed LC300-specific codes & units for each gauge; whether the 300 exposes a dedicated charge-air sensor and a clean fuel-level PID; OBD2 port wording.
-->
