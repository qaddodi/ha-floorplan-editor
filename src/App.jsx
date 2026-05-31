import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Copy,
  Download,
  Eye,
  EyeOff,
  Grid3X3,
  Layers,
  Magnet,
  MousePointer2,
  Plus,
  Radio,
  Save,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import * as MDI from "@mdi/js";

const DEFAULT_VIEWBOX = { x: 0, y: 0, width: 1600, height: 900 };

const DEFAULT_SETTINGS = {
  svgPath: "/local/floorplan/floorplan_generated.svg?v=1",
  cssPath: "/local/floorplan/floorplan_generated.css?v=1",
  offHref: "/local/floorplan/lights_off.png?v=1",
  onHref: "/local/floorplan/lights_on.png?v=1",
  imageResourcePrefix: "/local/floorplan",
};

const BASIC_COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Yellow", value: "#FACC15" },
  { label: "Green", value: "#86EFAC" },
  { label: "Blue", value: "#93C5FD" },
  { label: "Red", value: "#FCA5A5" },
  { label: "Gray", value: "#D1D5DB" },
];

const SENSOR_TYPE_OPTIONS = [
  { label: "Door", value: "door" },
  { label: "Sliding door", value: "sliding_door" },
  { label: "Window", value: "window" },
  { label: "Motion", value: "motion" },
  { label: "Temperature", value: "temperature" },
  { label: "Leak", value: "leak" },
  { label: "Other", value: "other" },
];

const SENSOR_ICON_OPTIONS = [
  { label: "Door closed", value: "mdi:door-closed" },
  { label: "Door open", value: "mdi:door-open" },
  { label: "Sliding door closed", value: "mdi:door-sliding" },
  { label: "Sliding door open", value: "mdi:door-sliding-open" },
  { label: "Window closed", value: "mdi:window-closed" },
  { label: "Window open", value: "mdi:window-open" },
  { label: "Motion sensor", value: "mdi:motion-sensor" },
  { label: "Thermometer", value: "mdi:thermometer" },
  { label: "Water leak", value: "mdi:water-alert" },
  { label: "Camera", value: "mdi:cctv" },
  { label: "Generic sensor", value: "mdi:access-point" },
  { label: "Custom SVG/path", value: "custom" },
];

const TRIGGER_VALUE_OPTIONS = ["on", "open", "true", "detected", "wet", "unlocked"];

const STARTER_CSS = `svg#floorplan {
  width: 100%;
  height: auto;
  display: block;
  background: #050912;
}

.lit-image {
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease-out, filter 180ms ease-out;
}

.color-tint {
  opacity: 0;
  pointer-events: none;
  mix-blend-mode: color;
  transition: opacity 180ms ease-out, fill 180ms ease-out, filter 180ms ease-out;
}

.floorplan-entity-control {
  cursor: pointer;
}

.floorplan-entity-hitbox {
  cursor: pointer;
  pointer-events: all;
  vector-effect: non-scaling-stroke;
  transition: fill 140ms ease-out, stroke 140ms ease-out, filter 140ms ease-out, opacity 140ms ease-out;
}

.lamp-hitbox {
  fill: rgba(255, 255, 255, 0.04);
  stroke: rgba(235, 242, 255, 0.20);
  stroke-width: 0.85;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.48));
}

.lamp-hitbox.on {
  fill: rgba(255, 205, 120, 0.095);
  stroke: rgba(255, 218, 150, 0.36);
}

.sensor-hitbox {
  fill: rgba(255, 255, 255, 0.04);
  stroke: rgba(235, 242, 255, 0.20);
  stroke-width: 0.85;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.48));
}

.camera-hitbox,
.entity-hitbox {
  fill: rgba(18, 22, 36, 0.18);
  stroke: rgba(185, 205, 255, 0.42);
  stroke-width: 1.1;
  filter: drop-shadow(0 2px 7px rgba(0, 0, 0, 0.52));
}

.entity-status-text,
.entity-label-text {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  paint-order: stroke;
  stroke: rgba(2, 5, 12, 0.84);
  stroke-width: 3px;
  stroke-linejoin: round;
  fill: rgba(247, 250, 255, 0.94);
  user-select: none;
}

.entity-status-text {
  font-size: 18px;
  font-weight: 760;
  letter-spacing: 0.035em;
}

.entity-icon-path {
  pointer-events: none;
  fill: currentColor;
  stroke: none;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.62));
}`;

const EXPORT_OVERRIDE_CSS = `/* Floorplan editor export overrides */
.sensor-hitbox {
  fill: rgba(255, 255, 255, 0.04);
  stroke: rgba(235, 242, 255, 0.20);
  stroke-width: 0.85;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.48));
}`;

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHexColor(value, fallback = "#FFFFFF") {
  const raw = String(value || fallback).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  return fallback;
}

function hexToRgba(value, alpha) {
  const hex = normalizeHexColor(value).slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatNumber(value) {
  const n = safeNumber(value, 0);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/0+$/, "").replace(/[.]$/, "");
}

function makeUid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "uid_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function lowerName(name) {
  return String(name || "").toLowerCase();
}

function hasEnding(name, ending) {
  return lowerName(name).endsWith(ending);
}

function hasAnyNamePart(name, parts) {
  const lower = lowerName(name);
  return parts.some((part) => lower.includes(part));
}

function slugFromEntity(value) {
  const raw = String(value || "new_entity")
    .replace("binary_sensor.", "")
    .replace("light.", "")
    .replace("sensor.", "")
    .replace("camera.", "")
    .replace("switch.", "")
    .trim()
    .toLowerCase();

  return raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_") || "new_entity";
}

function titleFromSlug(slug) {
  return String(slug || "Entity")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hyphenate(slug) {
  return String(slug || "entity").split("_").join("-");
}

function getMaskId(item) {
  return item.maskId || "mask-" + hyphenate(item.base);
}

function parseUrlId(value) {
  const text = String(value || "");
  const start = text.indexOf("#");
  const end = text.indexOf(")");
  if (start < 0 || end < 0 || end <= start) return "";
  return text.slice(start + 1, end);
}

function parseViewBox(svgText) {
  if (!svgText || typeof DOMParser === "undefined") return DEFAULT_VIEWBOX;
  try {
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const root = doc.querySelector("svg");
    const vb = root?.getAttribute("viewBox");
    if (vb) {
      const parts = vb.split(/\s|,/).filter(Boolean).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
      }
    }
    return {
      x: 0,
      y: 0,
      width: safeNumber(root?.getAttribute("width"), DEFAULT_VIEWBOX.width),
      height: safeNumber(root?.getAttribute("height"), DEFAULT_VIEWBOX.height),
    };
  } catch {
    return DEFAULT_VIEWBOX;
  }
}

function domainFromEntity(entity) {
  const text = String(entity || "");
  const dot = text.indexOf(".");
  return dot > 0 ? text.slice(0, dot) : "";
}

function kindFromEntity(entity) {
  const domain = domainFromEntity(entity);
  if (domain === "camera") return "camera";
  if (domain === "light") return "light";
  if (domain === "sensor" || domain === "binary_sensor") return "sensor";
  return "entity";
}

function entityPrefixForKind(kind) {
  if (kind === "camera") return "camera.";
  if (kind === "sensor") return "sensor.";
  if (kind === "entity") return "switch.";
  return "light.";
}

function sensorDefaultsForType(sensorType) {
  if (sensorType === "door") return { icon: "mdi:door-closed", idleIcon: "mdi:door-closed", activeIcon: "mdi:door-open", idleText: "Closed", activeText: "Open", trigger: "on" };
  if (sensorType === "sliding_door") return { icon: "mdi:door-sliding", idleIcon: "mdi:door-sliding", activeIcon: "mdi:door-sliding-open", idleText: "Closed", activeText: "Open", trigger: "on" };
  if (sensorType === "window") return { icon: "mdi:window-closed", idleIcon: "mdi:window-closed", activeIcon: "mdi:window-open", idleText: "Closed", activeText: "Open", trigger: "on" };
  if (sensorType === "motion") return { icon: "mdi:motion-sensor", idleIcon: "mdi:motion-sensor", activeIcon: "mdi:motion-sensor", idleText: "Clear", activeText: "Detected", trigger: "on" };
  if (sensorType === "temperature") return { icon: "mdi:thermometer", idleIcon: "mdi:thermometer", activeIcon: "mdi:thermometer", idleText: "Normal", activeText: "Alert", trigger: "on" };
  if (sensorType === "leak") return { icon: "mdi:water-alert", idleIcon: "mdi:water-alert", activeIcon: "mdi:water-alert", idleText: "Dry", activeText: "Wet", trigger: "on" };
  return { icon: "custom", idleIcon: "custom", activeIcon: "custom", idleText: "Normal", activeText: "Triggered", trigger: "on" };
}

function defaultItem(kind, viewBox, existingBases) {
  const seed = kind === "camera" ? "new_camera" : kind === "sensor" ? "new_sensor" : kind === "entity" ? "new_entity" : "new_light";
  let base = seed;
  let count = 2;
  while (existingBases.has(base)) {
    base = seed + "_" + count;
    count += 1;
  }

  const defaults = sensorDefaultsForType("door");
  return {
    uid: makeUid(),
    kind,
    base,
    name: titleFromSlug(base),
    entity: entityPrefixForKind(kind) + base,
    lightType: kind === "light" ? "dimmable_color" : "none",
    cx: Math.round(viewBox.width / 2),
    cy: Math.round(viewBox.height / 2),
    rx: 280,
    ry: 240,
    hitR: kind === "light" ? 52 : 38,
    width: kind === "light" ? 110 : 96,
    height: kind === "light" ? 72 : 84,
    intensity: 0.6,
    tintIntensity: kind === "light" ? 0.56 : 0,
    fallbackKelvin: 2500,
    maskId: "mask-" + hyphenate(base),
    previewOn: true,
    unit: "",
    icon: kind === "camera" ? "mdi:cctv" : kind === "sensor" ? defaults.icon : kind === "entity" ? "mdi:help-circle-outline" : "%",
    sensorIdleIcon: kind === "sensor" ? defaults.idleIcon : "",
    sensorActiveIcon: kind === "sensor" ? defaults.activeIcon : "",
    sensorType: kind === "sensor" ? "door" : "other",
    sensorTriggeredValue: defaults.trigger,
    sensorIdleText: defaults.idleText,
    sensorActiveText: defaults.activeText,
    sensorIdleColor: "#FFFFFF",
    sensorActiveColor: "#FACC15",
    customIconSvg: "",
    previewActive: false,
  };
}

function inferSensorType(id, klass, entity, base) {
  const joined = lowerName(`${id} ${klass} ${entity} ${base}`);
  if (joined.includes("sliding") && joined.includes("door")) return "sliding_door";
  if (joined.includes("door")) return "door";
  if (joined.includes("window")) return "window";
  if (joined.includes("motion") || joined.includes("occupancy")) return "motion";
  if (joined.includes("temperature") || joined.includes("temp")) return "temperature";
  if (joined.includes("leak") || joined.includes("water")) return "leak";
  return "other";
}

function stripKnownSuffixes(id) {
  let base = String(id || "");
  const suffixes = ["_control", "_group", "_sensor", "_camera", "_entity", "_button", "_click", "_status", "_label", "_icon"];
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of suffixes) {
      if (base.endsWith(suffix)) {
        base = base.slice(0, base.length - suffix.length);
        changed = true;
      }
    }
  }
  return base || "entity";
}

function parseTranslate(transform) {
  const text = String(transform || "");
  const match = text.match(/translate\(([^)]+)\)/);
  if (!match) return { x: 0, y: 0 };
  const nums = match[1].replaceAll(",", " ").split(/\s+/).filter(Boolean).map(Number);
  return { x: Number.isFinite(nums[0]) ? nums[0] : 0, y: Number.isFinite(nums[1]) ? nums[1] : 0 };
}

function inferKindFromSvg(id, klass, entity) {
  const joined = lowerName(`${id} ${klass} ${entity}`);
  const entityKind = kindFromEntity(entity);
  if (entityKind !== "entity") return entityKind;
  if (joined.includes("camera")) return "camera";
  if (joined.includes("lamp") || joined.includes("light")) return "light";
  if (joined.includes("sensor") || joined.includes("door") || joined.includes("window") || joined.includes("motion") || joined.includes("occupancy") || joined.includes("contact") || joined.includes("temperature") || joined.includes("humidity") || joined.includes("leak")) return "sensor";
  return "entity";
}

function inferEntityFromBase(base, kind, id, klass) {
  const joined = lowerName(`${id} ${klass} ${base}`);
  if (kind === "camera") return "camera." + base;
  if (kind === "light") return "light." + base;
  if (kind === "sensor") {
    if (joined.includes("door") || joined.includes("window") || joined.includes("motion") || joined.includes("occupancy") || joined.includes("contact") || joined.includes("leak")) return "binary_sensor." + base;
    return "sensor." + base;
  }
  return "switch." + base;
}

function getSvgNumber(el, attr, fallback) {
  if (!el) return fallback;
  return safeNumber(el.getAttribute(attr), fallback);
}

function isProbablyEntityGroup(group) {
  const id = group.getAttribute("id") || "";
  const klass = group.getAttribute("class") || "";
  const dataEntity =
    group.getAttribute("data-entity") ||
    group.getAttribute("entity") ||
    group.getAttribute("data-ha-entity") ||
    group.getAttribute("data-entity-id") ||
    "";

  if (dataEntity) return true;

  const hasDirectEntityParts =
    group.querySelector("[id$='_click']") ||
    group.querySelector("[id$='_status']") ||
    group.querySelector(".lamp-hitbox") ||
    group.querySelector(".sensor-hitbox") ||
    group.querySelector(".camera-hitbox") ||
    group.querySelector(".floorplan-entity-hitbox") ||
    group.querySelector(".door-status-hitbox") ||
    group.querySelector(".door-status-text");

  if (hasDirectEntityParts) return true;

  const joined = lowerName(id + " " + klass);
  const hasEntitySuffix = id.endsWith("_control") || id.endsWith("_group") || id.endsWith("_sensor") || id.endsWith("_camera") || id.endsWith("_entity");
  const hasUsableShape = Boolean(group.querySelector("circle, rect, text, path"));
  if (hasEntitySuffix && hasUsableShape) return true;

  const hasKnownClass = joined.includes("door-status-group") || joined.includes("sensor-control") || joined.includes("camera-control") || joined.includes("lamp-control");
  return Boolean(hasKnownClass && hasUsableShape);
}

function parseItems(svgText) {
  if (!svgText || typeof DOMParser === "undefined") return [];
  const items = [];
  const seen = new Set();

  try {
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const groups = Array.from(doc.querySelectorAll("g"));

    groups.forEach((group, index) => {
      if (!isProbablyEntityGroup(group)) return;

      const id = group.getAttribute("id") || "";
      const klass = group.getAttribute("class") || "";
      const dataEntity = group.getAttribute("data-entity") || group.getAttribute("entity") || group.getAttribute("data-ha-entity") || group.getAttribute("data-entity-id") || "";
      const dataKind = group.getAttribute("data-kind") || "";
      const transform = parseTranslate(group.getAttribute("transform"));
      const clickElement = group.querySelector("[id$='_click']") || group.querySelector(".floorplan-entity-hitbox") || group.querySelector(".lamp-hitbox") || group.querySelector(".door-status-hitbox") || group.querySelector(".sensor-hitbox") || group.querySelector(".camera-hitbox");
      const statusElement = group.querySelector("[id$='_status']") || group.querySelector(".entity-status-text") || group.querySelector(".lamp-status-text") || group.querySelector(".door-status-text");

      let base = stripKnownSuffixes(id);
      if (!base && clickElement) base = stripKnownSuffixes(clickElement.getAttribute("id"));
      if (!base) base = slugFromEntity(dataEntity || "entity_" + (index + 1));
      if (seen.has(base)) return;
      seen.add(base);

      let kind = dataKind || inferKindFromSvg(id, klass, dataEntity);
      if (!["light", "sensor", "camera", "entity"].includes(kind)) kind = "entity";

      const entity = dataEntity || inferEntityFromBase(base, kind, id, klass);
      const circle = clickElement?.tagName?.toLowerCase() === "circle" ? clickElement : group.querySelector("circle");
      const rect = clickElement?.tagName?.toLowerCase() === "rect" ? clickElement : group.querySelector("rect");
      const lit = doc.getElementById(base + "_lit");
      const tint = doc.getElementById(base + "_tint");
      const maskId = parseUrlId(lit?.getAttribute("mask")) || parseUrlId(tint?.getAttribute("mask")) || "mask-" + hyphenate(base);
      const mask = doc.getElementById(maskId);
      const ellipse = mask?.querySelector("ellipse");

      const rectX = getSvgNumber(rect, "x", 0);
      const rectY = getSvgNumber(rect, "y", 0);
      const rectWidth = getSvgNumber(rect, "width", kind === "light" ? 110 : 96);
      const rectHeight = getSvgNumber(rect, "height", kind === "light" ? 72 : 84);
      const circleCx = getSvgNumber(circle, "cx", Number.NaN);
      const circleCy = getSvgNumber(circle, "cy", Number.NaN);
      const ellipseCx = getSvgNumber(ellipse, "cx", Number.NaN);
      const ellipseCy = getSvgNumber(ellipse, "cy", Number.NaN);

      let cx = 120;
      let cy = 120;
      if (Number.isFinite(circleCx) && Number.isFinite(circleCy)) {
        cx = circleCx;
        cy = circleCy;
      } else if (Number.isFinite(ellipseCx) && Number.isFinite(ellipseCy)) {
        cx = ellipseCx;
        cy = ellipseCy;
      } else if (rect) {
        cx = rectX + rectWidth / 2;
        cy = rectY + rectHeight / 2;
      }
      cx += transform.x;
      cy += transform.y;

      const sensorType = kind === "sensor" ? group.getAttribute("data-sensor-type") || inferSensorType(id, klass, entity, base) : "other";
      const defaults = sensorDefaultsForType(sensorType);

      items.push({
        uid: makeUid(),
        kind,
        base,
        name: titleFromSlug(base),
        entity,
        lightType: kind === "light" ? (tint ? "dimmable_color" : "dimmable") : "none",
        cx,
        cy,
        rx: getSvgNumber(ellipse, "rx", 280),
        ry: getSvgNumber(ellipse, "ry", 240),
        hitR: getSvgNumber(circle, "r", kind === "light" ? 52 : 38),
        width: rectWidth,
        height: rectHeight,
        intensity: 0.6,
        tintIntensity: tint ? 0.56 : 0.32,
        fallbackKelvin: 2500,
        maskId,
        previewOn: true,
        unit: group.getAttribute("data-unit") || "",
        icon: group.getAttribute("data-icon") || (kind === "camera" ? "mdi:cctv" : kind === "sensor" ? defaults.icon : kind === "entity" ? "mdi:help-circle-outline" : "%"),
        sensorIdleIcon: group.getAttribute("data-idle-icon") || defaults.idleIcon || defaults.icon,
        sensorActiveIcon: group.getAttribute("data-active-icon") || defaults.activeIcon || defaults.icon,
        sensorType,
        sensorTriggeredValue: group.getAttribute("data-triggered-value") || defaults.trigger,
        sensorIdleText: group.getAttribute("data-idle-text") || defaults.idleText,
        sensorActiveText: group.getAttribute("data-active-text") || defaults.activeText,
        sensorIdleColor: group.getAttribute("data-idle-color") || "#FFFFFF",
        sensorActiveColor: group.getAttribute("data-active-color") || "#FACC15",
        customIconSvg: group.getAttribute("data-custom-icon-svg") || "",
        previewActive: false,
        importedStatusText: statusElement?.textContent?.trim() || "",
      });
    });
  } catch (error) {
    console.warn("Could not parse SVG", error);
  }

  return items;
}

function makeSvgElement(doc, tag, attrs = {}) {
  const el = doc.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) el.setAttribute(key, String(value));
  });
  return el;
}

function extractPathDFromSvgText(svgText) {
  const text = String(svgText || "").trim();
  if (!text) return "";
  const doubleMatch = text.match(/<path[^>]*\sd="([^"]+)"/i);
  if (doubleMatch?.[1]) return doubleMatch[1];
  const singleMatch = text.match(/<path[^>]*\sd='([^']+)'/i);
  if (singleMatch?.[1]) return singleMatch[1];
  if (text.startsWith("M") || text.startsWith("m")) return text;
  return "";
}

function mdiPathForIcon(iconType) {
  const key = String(iconType || "").replace("mdi:", "");
  const paths = {
    "door-closed": MDI.mdiDoorClosed || MDI.mdiDoor,
    "door-open": MDI.mdiDoorOpen || MDI.mdiDoor,
    "door-sliding": MDI.mdiDoorSliding || MDI.mdiDoorSlidingOpen || MDI.mdiDoor,
    "door-sliding-open": MDI.mdiDoorSlidingOpen || MDI.mdiDoorSliding || MDI.mdiDoorOpen,
    "window-closed": MDI.mdiWindowClosed || MDI.mdiWindowClosedVariant || MDI.mdiWindowShutter,
    "window-open": MDI.mdiWindowOpen || MDI.mdiWindowClosed,
    "motion-sensor": MDI.mdiMotionSensor || MDI.mdiRun,
    thermometer: MDI.mdiThermometer,
    "water-alert": MDI.mdiWaterAlert || MDI.mdiWater,
    cctv: MDI.mdiCctv || MDI.mdiCamera,
    "access-point": MDI.mdiAccessPoint || MDI.mdiRadioTower,
    "help-circle-outline": MDI.mdiHelpCircleOutline || MDI.mdiHelpCircle,
  };
  return paths[key] || paths["help-circle-outline"] || "M12,2A10,10 0 1,0 12,22A10,10 0 0,0 12,2Z";
}

function iconPathForType(iconType, customIconSvg = "") {
  if (iconType === "custom") return extractPathDFromSvgText(customIconSvg) || mdiPathForIcon("mdi:help-circle-outline");
  if (String(iconType || "").startsWith("mdi:")) return mdiPathForIcon(iconType);
  return mdiPathForIcon("mdi:help-circle-outline");
}

function iconTransform(cx, cy, scale = 1.65) {
  return `translate(${formatNumber(cx - 12 * scale)} ${formatNumber(cy - 12 * scale)}) scale(${formatNumber(scale)})`;
}

function appendIconPath(doc, group, cx, cy, iconType, color, id, customIconSvg = "") {
  const path = makeSvgElement(doc, "path", {
    id,
    d: iconPathForType(iconType, customIconSvg),
    fill: "currentColor",
    stroke: "none",
    color: color || "#FFFFFF",
    transform: iconTransform(cx, cy, 1.65),
    class: "entity-icon-path mdi-icon-path",
    "pointer-events": "none",
  });
  group.appendChild(path);
}

function appendText(doc, group, attrs, value) {
  const text = makeSvgElement(doc, "text", attrs);
  text.textContent = value;
  group.appendChild(text);
}

function ensureDefs(doc, root) {
  let defs = root.querySelector("defs");
  if (!defs) {
    defs = makeSvgElement(doc, "defs");
    root.insertBefore(defs, root.firstChild);
  }
  if (!defs.querySelector("#lamp-feather")) {
    const gradient = makeSvgElement(doc, "radialGradient", { id: "lamp-feather" });
    [
      ["0%", "white", "1"],
      ["24%", "white", "0.95"],
      ["50%", "white", "0.55"],
      ["76%", "white", "0.18"],
      ["100%", "black", "0"],
    ].forEach(([offset, color, opacity]) => {
      gradient.appendChild(makeSvgElement(doc, "stop", { offset, "stop-color": color, "stop-opacity": opacity }));
    });
    defs.appendChild(gradient);
  }
  return defs;
}

function createEmptySvg(width, height) {
  return `<svg id="floorplan" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatNumber(width)} ${formatNumber(height)}" preserveAspectRatio="xMidYMid meet"><defs></defs></svg>`;
}

function cleanManagedNodes(root, defs) {
  Array.from(root.querySelectorAll("image.lit-image, rect.color-tint, g.floorplan-entity-control, g.lamp-control, g.sensor-control, g.camera-control")).forEach((node) => node.remove());
  Array.from(defs.querySelectorAll("mask")).forEach((mask) => {
    const id = mask.getAttribute("id") || "";
    const managed = id.startsWith("mask-") && Boolean(mask.querySelector("ellipse"));
    if (managed) mask.remove();
  });
}

function generateSvg({ originalSvg, items, viewBox, settings }) {
  const width = viewBox.width || DEFAULT_VIEWBOX.width;
  const height = viewBox.height || DEFAULT_VIEWBOX.height;
  const parser = new DOMParser();
  const doc = parser.parseFromString(originalSvg?.trim() || createEmptySvg(width, height), "image/svg+xml");
  const fallback = parser.parseFromString(createEmptySvg(width, height), "image/svg+xml");
  const root = doc.querySelector("svg") || fallback.querySelector("svg");

  root.setAttribute("id", "floorplan");
  root.setAttribute("viewBox", `0 0 ${formatNumber(width)} ${formatNumber(height)}`);
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const defs = ensureDefs(doc, root);
  cleanManagedNodes(root, defs);

  let baseImage = root.querySelector("#base-lights-off") || root.querySelector("image");
  if (!baseImage) {
    baseImage = makeSvgElement(doc, "image", { id: "base-lights-off" });
    root.insertBefore(baseImage, defs.nextSibling);
  }
  baseImage.setAttribute("id", "base-lights-off");
  baseImage.setAttribute("href", settings.offHref || DEFAULT_SETTINGS.offHref);
  baseImage.setAttribute("x", "0");
  baseImage.setAttribute("y", "0");
  baseImage.setAttribute("width", formatNumber(width));
  baseImage.setAttribute("height", formatNumber(height));
  baseImage.setAttribute("preserveAspectRatio", "xMidYMid slice");

  items.filter((item) => item.kind === "light").forEach((item) => {
    const mask = makeSvgElement(doc, "mask", {
      id: getMaskId(item),
      maskUnits: "userSpaceOnUse",
      x: 0,
      y: 0,
      width: formatNumber(width),
      height: formatNumber(height),
    });
    mask.appendChild(makeSvgElement(doc, "rect", { x: 0, y: 0, width: formatNumber(width), height: formatNumber(height), fill: "black" }));
    mask.appendChild(makeSvgElement(doc, "ellipse", { cx: formatNumber(item.cx), cy: formatNumber(item.cy), rx: formatNumber(item.rx), ry: formatNumber(item.ry), fill: "url(#lamp-feather)" }));
    defs.appendChild(mask);
  });

  const anchor = baseImage.nextSibling;
  items.filter((item) => item.kind === "light").forEach((item) => {
    root.insertBefore(
      makeSvgElement(doc, "image", { id: item.base + "_lit", class: "lit-image", href: settings.onHref || DEFAULT_SETTINGS.onHref, x: 0, y: 0, width: formatNumber(width), height: formatNumber(height), preserveAspectRatio: "xMidYMid slice", mask: "url(#" + getMaskId(item) + ")" }),
      anchor
    );
  });
  items.filter((item) => item.kind === "light").forEach((item) => {
    root.insertBefore(
      makeSvgElement(doc, "rect", { id: item.base + "_tint", class: "color-tint", x: 0, y: 0, width: formatNumber(width), height: formatNumber(height), fill: "rgb(255,159,70)", mask: "url(#" + getMaskId(item) + ")" }),
      anchor
    );
  });

  items.forEach((item) => {
    const group = makeSvgElement(doc, "g", {
      id: item.base + "_control",
      class: "floorplan-entity-control " + item.kind + "-control unknown",
      "data-entity": item.entity,
      "data-kind": item.kind,
      "data-icon": item.icon,
      "data-idle-icon": item.sensorIdleIcon || "",
      "data-active-icon": item.sensorActiveIcon || "",
      "data-unit": item.unit || "",
      "data-sensor-type": item.sensorType || "",
      "data-triggered-value": item.sensorTriggeredValue || "",
      "data-idle-text": item.sensorIdleText || "",
      "data-active-text": item.sensorActiveText || "",
      "data-idle-color": item.sensorIdleColor || "",
      "data-active-color": item.sensorActiveColor || "",
      "data-custom-icon-svg": item.customIconSvg || "",
    });

    if (item.kind === "light") {
      group.appendChild(makeSvgElement(doc, "circle", { id: item.base + "_click", class: "floorplan-entity-hitbox lamp-hitbox unknown", cx: formatNumber(item.cx), cy: formatNumber(item.cy), r: formatNumber(item.hitR || 52) }));
      appendText(doc, group, { id: item.base + "_status", class: "entity-status-text", x: formatNumber(item.cx), y: formatNumber(item.cy) }, "…");
    } else {
      const x = item.cx - item.width / 2;
      const y = item.cy - item.height / 2;
      const hitboxClass = item.kind === "camera" ? "floorplan-entity-hitbox camera-hitbox unknown" : item.kind === "sensor" ? "floorplan-entity-hitbox sensor-hitbox unknown" : "floorplan-entity-hitbox entity-hitbox unknown";
      const idleText = item.kind === "sensor" ? item.sensorIdleText || "Closed" : item.kind === "camera" ? "CAM" : "Ready";
      group.appendChild(makeSvgElement(doc, "rect", { id: item.base + "_click", class: hitboxClass, x: formatNumber(x), y: formatNumber(y), width: formatNumber(item.width), height: formatNumber(item.height), rx: 18, ry: 18 }));

      if (item.kind === "sensor") {
        appendIconPath(doc, group, item.cx, item.cy - 15, item.sensorIdleIcon || item.icon || "mdi:access-point", item.sensorIdleColor || "#FFFFFF", item.base + "_icon_idle", item.customIconSvg || "");
        appendIconPath(doc, group, item.cx, item.cy - 15, item.sensorActiveIcon || item.icon || "mdi:access-point", item.sensorActiveColor || "#FACC15", item.base + "_icon_active", item.customIconSvg || "");
      } else {
        appendIconPath(doc, group, item.cx, item.cy - 15, item.kind === "camera" ? "mdi:cctv" : item.icon || "mdi:help-circle-outline", "#FFFFFF", item.base + "_icon", item.customIconSvg || "");
      }
      appendText(doc, group, { id: item.base + "_status", class: "entity-status-text", x: formatNumber(item.cx), y: formatNumber(item.cy + 22) }, idleText);
    }

    root.appendChild(group);
  });

  return new XMLSerializer().serializeToString(root);
}

function yamlFunctions() {
  return `    >
    var clamp = function(value, min, max) {
      value = Number(value);
      if (isNaN(value)) value = min;
      return Math.min(max, Math.max(min, value));
    };

    var hexToRgba = function(hex, alpha) {
      hex = String(hex || '#FFFFFF').replace('#', '');
      if (hex.length !== 6) hex = 'FFFFFF';
      var r = parseInt(hex.substring(0, 2), 16);
      var g = parseInt(hex.substring(2, 4), 16);
      var b = parseInt(hex.substring(4, 6), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) { r = 255; g = 255; b = 255; }
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    };

    var kelvinToRgb = function(kelvin) {
      var temp = clamp(kelvin || 2500, 1000, 40000) / 100;
      var red, green, blue;
      if (temp <= 66) {
        red = 255;
        green = 99.4708025861 * Math.log(temp) - 161.1195681661;
        blue = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
      } else {
        red = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
        green = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
        blue = 255;
      }
      return [Math.round(clamp(red, 0, 255)), Math.round(clamp(green, 0, 255)), Math.round(clamp(blue, 0, 255))];
    };

    var hsToRgb = function(h, s) {
      h = ((Number(h || 0) % 360) + 360) % 360;
      s = clamp(s || 0, 0, 100) / 100;
      var v = 1;
      var c = v * s;
      var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      var m = v - c;
      var r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    };

    var getBrightnessRatio = function(entity, isDimmable) {
      if (!entity || entity.state !== 'on') return 0;
      if (!isDimmable) return 1;
      var brightness = entity.attributes && entity.attributes.brightness;
      if (brightness === undefined || brightness === null || brightness === '') return 1;
      return clamp(Number(brightness) / 255, 0, 1);
    };

    var getRgb = function(entity, fallbackKelvin) {
      var attributes = entity && entity.attributes ? entity.attributes : {};
      fallbackKelvin = fallbackKelvin || 2500;
      if (Array.isArray(attributes.rgb_color) && attributes.rgb_color.length >= 3) return attributes.rgb_color;
      if (Array.isArray(attributes.hs_color) && attributes.hs_color.length >= 2) return hsToRgb(attributes.hs_color[0], attributes.hs_color[1]);
      if (attributes.color_temp_kelvin) return kelvinToRgb(attributes.color_temp_kelvin);
      if (attributes.color_temp) return kelvinToRgb(1000000 / Number(attributes.color_temp));
      return kelvinToRgb(fallbackKelvin);
    };

    return {
      litStyle: function(entity, maxOpacity, isDimmable) {
        maxOpacity = clamp(maxOpacity || 0.60, 0, 1);
        var ratio = getBrightnessRatio(entity, isDimmable);
        var opacity = entity && entity.state === 'on' ? clamp(0.10 + ratio * (maxOpacity - 0.10), 0, maxOpacity) : 0;
        return 'opacity: ' + opacity + '; filter: saturate(' + (100 + ratio * 8) + '%) brightness(0.92);';
      },
      tintStyle: function(entity, fallbackKelvin, maxOpacity, colorMode, isDimmable) {
        if (!entity || entity.state !== 'on' || colorMode === 'none') return 'opacity: 0;';
        maxOpacity = clamp(maxOpacity || 0.38, 0, 1);
        var ratio = getBrightnessRatio(entity, isDimmable);
        var rgb = colorMode === 'ha' ? getRgb(entity, fallbackKelvin || 2500) : kelvinToRgb(fallbackKelvin || 2500);
        var max = Math.max(rgb[0], rgb[1], rgb[2]);
        var min = Math.min(rgb[0], rgb[1], rgb[2]);
        var colorfulness = max === 0 ? 0 : (max - min) / max;
        var opacity = clamp(0.10 + ratio * (maxOpacity - 0.10) + colorfulness * 0.10, 0, maxOpacity);
        return 'opacity: ' + opacity + '; fill: rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + '); filter: saturate(' + (108 + ratio * 22) + '%) brightness(0.95);';
      },
      entityClass: function(entity, baseClass) {
        var state = entity && entity.state ? entity.state : 'unknown';
        return baseClass + ' ' + state;
      },
      isTriggered: function(entity, triggeredValue) {
        if (!entity || entity.state === undefined || entity.state === null) return false;
        var state = String(entity.state).toLowerCase();
        var wanted = String(triggeredValue || 'on').toLowerCase();
        return state === wanted;
      },
      sensorStyle: function(entity, triggeredValue, idleColor, activeColor) {
        var active = this.isTriggered(entity, triggeredValue);
        var color = active ? (activeColor || '#FACC15') : (idleColor || '#FFFFFF');
        var fillOpacity = active ? 0.095 : 0.04;
        var strokeOpacity = active ? 0.36 : 0.20;
        return 'fill: ' + hexToRgba(color, fillOpacity) + '; stroke: ' + hexToRgba(color, strokeOpacity) + '; stroke-width: 0.85; filter: drop-shadow(0 1px 4px rgba(0,0,0,0.48));';
      },
      sensorIconStyle: function(entity, triggeredValue, idleColor, activeColor, showWhenActive) {
        var active = this.isTriggered(entity, triggeredValue);
        var visible = showWhenActive ? active : !active;
        var color = showWhenActive ? (activeColor || '#FACC15') : (idleColor || '#FFFFFF');
        return 'opacity: ' + (visible ? '1' : '0') + '; color: ' + color + '; fill: currentColor; stroke: none; filter: drop-shadow(0 0 5px ' + hexToRgba(color, 0.30) + ');';
      },
      sensorTextStyle: function() {
        return 'fill: rgba(247,250,255,0.94); stroke: rgba(2,5,12,0.84); stroke-width: 3px; paint-order: stroke;';
      },
      lightText: function(entity, isDimmable) {
        if (!entity || !entity.state) return 'UNK';
        if (entity.state === 'unavailable') return 'UNAV';
        if (entity.state === 'unknown') return 'UNK';
        if (entity.state !== 'on') return 'OFF';
        var attributes = entity.attributes || {};
        if (isDimmable && attributes.brightness !== undefined && attributes.brightness !== null && attributes.brightness !== '') return Math.round(clamp(Number(attributes.brightness) / 255, 0, 1) * 100) + '%';
        return 'ON';
      },
      sensorTextLabel: function(entity, triggeredValue, idleText, activeText) {
        if (!entity || entity.state === undefined || entity.state === null) return 'UNK';
        if (entity.state === 'unavailable') return 'UNAV';
        if (entity.state === 'unknown') return 'UNK';
        return this.isTriggered(entity, triggeredValue) ? (activeText || 'Triggered') : (idleText || 'Normal');
      },
      cameraText: function(entity) {
        if (!entity || !entity.state) return 'CAM';
        if (entity.state === 'unavailable') return 'UNAV';
        if (entity.state === 'recording') return 'REC';
        if (entity.state === 'streaming') return 'LIVE';
        return 'CAM';
      }
    };`;
}

function lightRule(item) {
  const open = "${";
  const isDimmable = item.lightType !== "on_off";
  const colorMode = item.lightType === "dimmable_color" ? "ha" : "fixed";
  return `    - entity: ${item.entity}
      element: ${item.base}_control
      tap_action:
        action: call-service
        service: homeassistant.toggle
        service_data:
          entity_id: ${item.entity}
      hold_action:
        action: more-info
        entity: ${item.entity}
      state_action:
        - action: call-service
          service: floorplan.style_set
          service_data:
            element: ${item.base}_lit
            style: ${open}functions.litStyle(entity, ${clamp(item.intensity, 0, 1).toFixed(2)}, ${isDimmable})}
        - action: call-service
          service: floorplan.style_set
          service_data:
            element: ${item.base}_tint
            style: ${open}functions.tintStyle(entity, ${Math.round(item.fallbackKelvin)}, ${clamp(item.tintIntensity, 0, 1).toFixed(2)}, '${colorMode}', ${isDimmable})}
        - action: call-service
          service: floorplan.class_set
          service_data:
            element: ${item.base}_click
            class: ${open}functions.entityClass(entity, 'floorplan-entity-hitbox lamp-hitbox')}
        - action: call-service
          service: floorplan.text_set
          service_data:
            element: ${item.base}_status
            text: ${open}functions.lightText(entity, ${isDimmable})}`;
}

function sensorRule(item) {
  const open = "${";
  return `    - entity: ${item.entity}
      element: ${item.base}_control
      tap_action:
        action: more-info
        entity: ${item.entity}
      state_action:
        - action: call-service
          service: floorplan.style_set
          service_data:
            element: ${item.base}_click
            style: ${open}functions.sensorStyle.call(functions, entity, '${item.sensorTriggeredValue || "on"}', '${item.sensorIdleColor || "#FFFFFF"}', '${item.sensorActiveColor || "#FACC15"}')}
        - action: call-service
          service: floorplan.style_set
          service_data:
            element: ${item.base}_icon_idle
            style: ${open}functions.sensorIconStyle.call(functions, entity, '${item.sensorTriggeredValue || "on"}', '${item.sensorIdleColor || "#FFFFFF"}', '${item.sensorActiveColor || "#FACC15"}', false)}
        - action: call-service
          service: floorplan.style_set
          service_data:
            element: ${item.base}_icon_active
            style: ${open}functions.sensorIconStyle.call(functions, entity, '${item.sensorTriggeredValue || "on"}', '${item.sensorIdleColor || "#FFFFFF"}', '${item.sensorActiveColor || "#FACC15"}', true)}
        - action: call-service
          service: floorplan.style_set
          service_data:
            element: ${item.base}_status
            style: ${open}functions.sensorTextStyle()}
        - action: call-service
          service: floorplan.text_set
          service_data:
            element: ${item.base}_status
            text: ${open}functions.sensorTextLabel.call(functions, entity, '${item.sensorTriggeredValue || "on"}', '${item.sensorIdleText || "Closed"}', '${item.sensorActiveText || "Open"}')}`;
}

function cameraRule(item) {
  const open = "${";
  return `    - entity: ${item.entity}
      element: ${item.base}_control
      tap_action:
        action: more-info
        entity: ${item.entity}
      state_action:
        - action: call-service
          service: floorplan.class_set
          service_data:
            element: ${item.base}_click
            class: ${open}functions.entityClass(entity, 'floorplan-entity-hitbox camera-hitbox')}
        - action: call-service
          service: floorplan.text_set
          service_data:
            element: ${item.base}_status
            text: ${open}functions.cameraText(entity)}`;
}

function genericRule(item) {
  const open = "${";
  return `    - entity: ${item.entity}
      element: ${item.base}_control
      tap_action:
        action: more-info
        entity: ${item.entity}
      state_action:
        - action: call-service
          service: floorplan.class_set
          service_data:
            element: ${item.base}_click
            class: ${open}functions.entityClass(entity, 'floorplan-entity-hitbox entity-hitbox')}
        - action: call-service
          service: floorplan.text_set
          service_data:
            element: ${item.base}_status
            text: ${open}functions.sensorTextLabel(entity, 'on', 'Ready', 'On')}`;
}

function generateYaml({ items, settings }) {
  const rules = items
    .map((item) => item.kind === "light" ? lightRule(item) : item.kind === "camera" ? cameraRule(item) : item.kind === "sensor" ? sensorRule(item) : genericRule(item))
    .join("\n");

  return `type: custom:floorplan-card
card_mod:
  style: |
    ha-card {
      overflow: hidden;
      border-radius: var(--ha-card-border-radius, 12px);
      contain: paint;
    }
    ha-card > * {
      overflow: hidden;
    }
config:
  image: ${settings.svgPath || DEFAULT_SETTINGS.svgPath}
  stylesheet: ${settings.cssPath || DEFAULT_SETTINGS.cssPath}
  image_resource_prefix: ${settings.imageResourcePrefix || DEFAULT_SETTINGS.imageResourcePrefix}
  console_log_level: info
  functions: |
${yamlFunctions()}
  rules:
${rules}
`;
}

function mergeCss(originalCss) {
  const css = String(originalCss || "").trim();
  if (!css) return STARTER_CSS;
  const hasNeeded = css.includes("floorplan-entity-hitbox") && css.includes("lit-image") && css.includes("color-tint");
  const baseCss = hasNeeded ? css : css + "\n\n/* Added by the visual floorplan entity editor */\n" + STARTER_CSS;
  return baseCss.includes("Floorplan editor export overrides") ? baseCss : baseCss + "\n\n" + EXPORT_OVERRIDE_CSS;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function runSelfTests() {
  const tests = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const test = (name, fn) => {
    try {
      fn();
      tests.push({ name, pass: true });
    } catch (error) {
      tests.push({ name, pass: false, error });
    }
  };

  test("kindFromEntity supports domains", () => {
    assert(kindFromEntity("light.a") === "light", "light failed");
    assert(kindFromEntity("sensor.a") === "sensor", "sensor failed");
    assert(kindFromEntity("binary_sensor.a") === "sensor", "binary sensor failed");
    assert(kindFromEntity("camera.a") === "camera", "camera failed");
    assert(kindFromEntity("switch.a") === "entity", "generic failed");
  });

  test("MDI icon helpers return paths", () => {
    assert(iconPathForType("mdi:door-closed").length > 10, "door icon missing");
    assert(iconPathForType("mdi:door-open").length > 10, "door open icon missing");
    assert(extractPathDFromSvgText('<svg><path d="M1 2 L3 4" /></svg>') === "M1 2 L3 4", "custom SVG extraction failed");
  });

  test("parseItems ignores decorative groups", () => {
    const svg = '<svg viewBox="0 0 100 100"><g id="decorative_group"><path d="M0 0 L10 10"/></g></svg>';
    assert(parseItems(svg).length === 0, "decorative group should not import");
  });

  const failed = tests.filter((item) => !item.pass);
  if (failed.length) console.warn("Floorplan editor self-tests failed", failed);
  else console.info("Floorplan editor self-tests passed", tests.map((item) => item.name));
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SmallButton({ children, onClick, icon: Icon, active = false, disabled = false, title = "" }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={
        "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold shadow-sm transition " +
        (active ? "bg-slate-950 text-white" : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50") +
        (disabled ? " cursor-not-allowed opacity-45" : "")
      }
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function NumberInput({ value, onChange, min, max, step = 1 }) {
  const [draft, setDraft] = useState(String(Number.isFinite(Number(value)) ? value : ""));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(String(Number.isFinite(Number(value)) ? value : ""));
  }, [value]);

  function commit(nextDraft = draft) {
    if (nextDraft === "" || nextDraft === "-" || nextDraft === ".") return;
    let next = Number(nextDraft);
    if (!Number.isFinite(next)) return;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (next !== value) onChange(next);
  }

  function updateDraft(nextDraft) {
    setDraft(nextDraft);
    if (nextDraft === "" || nextDraft === "-" || nextDraft === ".") return;
    const next = Number(nextDraft);
    if (Number.isFinite(next) && next !== value) onChange(next);
  }

  return (
    <input
      type="number"
      value={draft}
      min={min}
      max={max}
      step={step}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={() => { focusedRef.current = false; commit(); }}
      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
      onChange={(event) => updateDraft(event.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
    />
  );
}

function TextInput({ value, onChange, placeholder = "" }) {
  const [draft, setDraft] = useState(value || "");
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(value || "");
  }, [value]);

  function commit(nextDraft = draft) {
    if (nextDraft !== (value || "")) onChange(nextDraft);
  }

  return (
    <input
      value={draft}
      placeholder={placeholder}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={() => { focusedRef.current = false; commit(); }}
      onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
      onChange={(event) => setDraft(event.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
    />
  );
}

function TextAreaInput({ value, onChange, placeholder = "" }) {
  const [draft, setDraft] = useState(value || "");
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(value || "");
  }, [value]);

  return (
    <textarea
      value={draft}
      placeholder={placeholder}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={() => { focusedRef.current = false; onChange(draft); }}
      onChange={(event) => setDraft(event.target.value)}
      className="h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
    />
  );
}

function MultiFileDrop({ onFiles }) {
  async function handleChange(event) {
    const input = event.currentTarget;
    const files = Array.from(input?.files || []);
    try {
      if (files.length) await onFiles(files);
    } finally {
      if (input) input.value = "";
    }
  }

  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/80 p-4 shadow-sm transition hover:border-slate-500 hover:bg-white">
      <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 group-hover:bg-slate-900 group-hover:text-white">
        <Upload className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-slate-800">One-step package import</div>
        <div className="text-xs text-slate-500">Select SVG, CSS, lights-off image, and lights-on image together</div>
      </div>
      <input type="file" multiple accept=".svg,.css,image/png,image/jpeg,image/webp" className="hidden" onChange={handleChange} />
    </label>
  );
}

export default function FloorplanEntityEditor() {
  const svgRef = useRef(null);
  const [svgText, setSvgText] = useState("");
  const [cssText, setCssText] = useState("");
  const [offPng, setOffPng] = useState("");
  const [onPng, setOnPng] = useState("");
  const [items, setItems] = useState([]);
  const [selectedUid, setSelectedUid] = useState("");
  const [showOnPreview, setShowOnPreview] = useState(true);
  const [showMasks, setShowMasks] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [snapDistance, setSnapDistance] = useState(12);
  const [activeTab, setActiveTab] = useState("yaml");
  const [message, setMessage] = useState("Import a package or add entities manually. YAML is generated automatically.");
  const [drag, setDrag] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const viewBox = useMemo(() => parseViewBox(svgText), [svgText]);
  const selected = items.find((item) => item.uid === selectedUid) || null;
  const generatedCss = useMemo(() => mergeCss(cssText), [cssText]);
  const activeOutput = useMemo(() => {
    if (activeTab === "svg") return generateSvg({ originalSvg: svgText, items, viewBox, settings });
    if (activeTab === "css") return generatedCss;
    return generateYaml({ items, settings });
  }, [activeTab, svgText, items, viewBox, settings, generatedCss]);
  const activeFilename = activeTab === "svg" ? "floorplan_generated.svg" : activeTab === "css" ? "floorplan_generated.css" : "floorplan_card_generated.yaml";

  useEffect(() => {
    runSelfTests();
  }, []);

  useEffect(() => {
    if (!selectedUid && items.length) setSelectedUid(items[0].uid);
  }, [items, selectedUid]);

  async function importPackage(files) {
    let nextSvg = svgText;
    let nextCss = cssText;
    let nextOff = offPng;
    let nextOn = onPng;
    const imageFiles = [];

    for (const file of files) {
      const name = lowerName(file.name);
      if (hasEnding(name, ".svg")) nextSvg = await readFileAsText(file);
      else if (hasEnding(name, ".css")) nextCss = await readFileAsText(file);
      else if (file.type.startsWith("image/") || hasAnyNamePart(name, [".png", ".jpg", ".jpeg", ".webp"])) imageFiles.push(file);
    }

    for (const file of imageFiles) {
      const name = lowerName(file.name);
      const data = await readFileAsDataUrl(file);
      if (hasAnyNamePart(name, ["lights_off", "night_off", "_off", "-off"])) nextOff = data;
      else if (hasAnyNamePart(name, ["lights_on", "night_on", "_on", "-on"])) nextOn = data;
      else if (!nextOff) nextOff = data;
      else if (!nextOn) nextOn = data;
    }

    setSvgText(nextSvg);
    setCssText(nextCss);
    setOffPng(nextOff);
    setOnPng(nextOn);

    const parsed = parseItems(nextSvg);
    if (parsed.length) {
      setItems(parsed);
      setSelectedUid(parsed[0].uid);
      setMessage(`Imported package and found ${parsed.length} editable entities. YAML was generated automatically.`);
    } else {
      setMessage("Imported package. No tagged entities were found, so add lights, sensors, or cameras manually.");
    }
  }

  function updateSelected(patch) {
    if (!selected) return;
    setItems((previous) => previous.map((item) => item.uid === selected.uid ? { ...item, ...patch } : item));
  }

  function addItem(kind) {
    const existing = new Set(items.map((item) => item.base));
    const item = defaultItem(kind, viewBox, existing);
    setItems((previous) => [...previous, item]);
    setSelectedUid(item.uid);
  }

  function deleteSelected() {
    if (!selected) return;
    setItems((previous) => previous.filter((item) => item.uid !== selected.uid));
    setSelectedUid("");
  }

  function duplicateSelected() {
    if (!selected) return;
    const existing = new Set(items.map((item) => item.base));
    let base = selected.base + "_copy";
    let count = 2;
    while (existing.has(base)) {
      base = selected.base + "_copy_" + count;
      count += 1;
    }
    const copy = { ...selected, uid: makeUid(), base, name: selected.name + " Copy", entity: entityPrefixForKind(selected.kind) + base, cx: selected.cx + 40, cy: selected.cy + 40, maskId: "mask-" + hyphenate(base) };
    setItems((previous) => [...previous, copy]);
    setSelectedUid(copy.uid);
  }

  function changeEntity(value) {
    if (!selected) return;
    const kind = kindFromEntity(value);
    const base = slugFromEntity(value);
    if (kind === "sensor") {
      const sensorType = inferSensorType(base, "", value, base);
      const defaults = sensorDefaultsForType(sensorType);
      updateSelected({
        entity: value,
        kind,
        base,
        maskId: "mask-" + hyphenate(base),
        sensorType,
        icon: defaults.icon,
        sensorIdleIcon: defaults.idleIcon,
        sensorActiveIcon: defaults.activeIcon,
        sensorTriggeredValue: defaults.trigger,
        sensorIdleText: defaults.idleText,
        sensorActiveText: defaults.activeText,
        sensorIdleColor: selected.sensorIdleColor || "#FFFFFF",
        sensorActiveColor: selected.sensorActiveColor || "#FACC15",
      });
    } else {
      updateSelected({ entity: value, kind, base, maskId: "mask-" + hyphenate(base) });
    }
  }

  function svgPointFromEvent(event) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function snapPoint(x, y, uid) {
    let sx = x;
    let sy = y;
    const guides = [];
    if (snapEnabled && gridEnabled && gridSize > 0) {
      sx = Math.round(sx / gridSize) * gridSize;
      sy = Math.round(sy / gridSize) * gridSize;
    }
    if (snapEnabled) {
      items.forEach((item) => {
        if (item.uid === uid) return;
        if (Math.abs(sx - item.cx) <= snapDistance) {
          sx = item.cx;
          guides.push({ type: "v", x: item.cx });
        }
        if (Math.abs(sy - item.cy) <= snapDistance) {
          sy = item.cy;
          guides.push({ type: "h", y: item.cy });
        }
      });
    }
    return { x: clamp(sx, 0, viewBox.width), y: clamp(sy, 0, viewBox.height), guides };
  }

  function onPointerMove(event) {
    if (!drag) return;
    const point = svgPointFromEvent(event);
    const snapped = snapPoint(point.x - drag.offsetX, point.y - drag.offsetY, drag.uid);
    setItems((previous) => previous.map((item) => item.uid === drag.uid ? { ...item, cx: Math.round(snapped.x), cy: Math.round(snapped.y) } : item));
    setDrag((previous) => previous ? { ...previous, guides: snapped.guides } : previous);
  }

  function onPointerUp() {
    setDrag(null);
  }

  useEffect(() => {
    function onKey(event) {
      if (!selected) return;
      const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const delta = deltas[event.key];
      if (!delta) return;
      const target = event.target;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const snapped = snapPoint(selected.cx + delta[0] * step, selected.cy + delta[1] * step, selected.uid);
      updateSelected({ cx: Math.round(snapped.x), cy: Math.round(snapped.y) });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, items, snapEnabled, gridEnabled, gridSize, snapDistance]);

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(label + " copied to clipboard.");
    } catch {
      setMessage("Clipboard permission was not available. Use the text area to copy manually.");
    }
  }

  const previewBase = offPng || settings.offHref;
  const previewOn = onPng || settings.onHref;
  const gridLines = useMemo(() => {
    if (!gridEnabled || gridSize < 4) return [];
    const lines = [];
    for (let x = 0; x <= viewBox.width; x += gridSize) lines.push({ key: "v-" + x, x });
    for (let y = 0; y <= viewBox.height; y += gridSize) lines.push({ key: "h-" + y, y });
    return lines;
  }, [gridEnabled, gridSize, viewBox.width, viewBox.height]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 text-slate-900">
      <div className="mx-auto max-w-[1900px] space-y-4">
        <header className="rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-slate-200 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500"><Sparkles className="h-4 w-4" /> Generic floorplan entity editor</div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Visual editor for lights, sensors, cameras, SVG, CSS, PNG layers, and YAML</h1>
              <p className="mt-1 max-w-4xl text-sm text-slate-600">Import the visual package once, add or edit entities on the central preview, and generate the Home Assistant YAML automatically.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SmallButton icon={Zap} onClick={() => addItem("light")}>Add light</SmallButton>
              <SmallButton icon={Radio} onClick={() => addItem("sensor")}>Add sensor</SmallButton>
              <SmallButton icon={Camera} onClick={() => addItem("camera")}>Add camera</SmallButton>
              <SmallButton icon={Plus} onClick={() => addItem("entity")}>Add entity</SmallButton>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[330px_minmax(720px,1fr)_430px]">
          <aside className="space-y-4 2xl:sticky 2xl:top-4 2xl:self-start">
            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-center gap-2 font-black text-slate-900"><Layers className="h-5 w-5" /> Import</div>
              <div className="space-y-3">
                <MultiFileDrop onFiles={importPackage} />
                <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{message}</div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-center gap-2 font-black text-slate-900"><Settings2 className="h-5 w-5" /> Editor settings</div>
              <div className="grid grid-cols-2 gap-3">
                <SmallButton icon={Magnet} active={snapEnabled} onClick={() => setSnapEnabled(!snapEnabled)}>Snap</SmallButton>
                <SmallButton icon={Grid3X3} active={gridEnabled} onClick={() => setGridEnabled(!gridEnabled)}>Grid</SmallButton>
                <Field label="Grid size"><NumberInput value={gridSize} min={2} max={100} onChange={setGridSize} /></Field>
                <Field label="Snap distance"><NumberInput value={snapDistance} min={0} max={80} onChange={setSnapDistance} /></Field>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <SmallButton active={showOnPreview} onClick={() => setShowOnPreview(!showOnPreview)}>On</SmallButton>
                <SmallButton active={showMasks} onClick={() => setShowMasks(!showMasks)}>Glow</SmallButton>
                <SmallButton active={showControls} onClick={() => setShowControls(!showControls)}>Controls</SmallButton>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-center gap-2 font-black text-slate-900"><Save className="h-5 w-5" /> Output paths</div>
              <div className="space-y-3">
                <Field label="SVG path"><TextInput value={settings.svgPath} onChange={(value) => setSettings((previous) => ({ ...previous, svgPath: value }))} /></Field>
                <Field label="CSS path"><TextInput value={settings.cssPath} onChange={(value) => setSettings((previous) => ({ ...previous, cssPath: value }))} /></Field>
                <Field label="Off image href"><TextInput value={settings.offHref} onChange={(value) => setSettings((previous) => ({ ...previous, offHref: value }))} /></Field>
                <Field label="On image href"><TextInput value={settings.onHref} onChange={(value) => setSettings((previous) => ({ ...previous, onHref: value }))} /></Field>
              </div>
            </section>
          </aside>

          <main className="rounded-3xl bg-slate-950 p-3 shadow-xl ring-1 ring-slate-800 2xl:sticky 2xl:top-4 2xl:self-start">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2 text-white">
              <div className="flex items-center gap-2 text-sm font-bold"><MousePointer2 className="h-4 w-4" /> Central live preview. Select an entity and edit it in the inspector on the right.</div>
              <div className="text-xs text-slate-300">ViewBox {formatNumber(viewBox.width)} × {formatNumber(viewBox.height)}</div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-slate-900 shadow-inner ring-1 ring-white/10">
              <svg ref={svgRef} viewBox={`0 0 ${viewBox.width} ${viewBox.height}`} className="h-auto max-h-[78vh] w-full touch-none select-none" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
                <defs>
                  <radialGradient id="preview-feather">
                    <stop offset="0%" stopColor="white" stopOpacity="1" />
                    <stop offset="24%" stopColor="white" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="white" stopOpacity="0.55" />
                    <stop offset="76%" stopColor="white" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="black" stopOpacity="0" />
                  </radialGradient>
                  {items.filter((item) => item.kind === "light").map((item) => (
                    <mask key={"mask-" + item.uid} id={"preview-mask-" + item.uid} maskUnits="userSpaceOnUse" x="0" y="0" width={viewBox.width} height={viewBox.height}>
                      <rect x="0" y="0" width={viewBox.width} height={viewBox.height} fill="black" />
                      <ellipse cx={item.cx} cy={item.cy} rx={item.rx} ry={item.ry} fill="url(#preview-feather)" />
                    </mask>
                  ))}
                </defs>

                {previewBase ? <image href={previewBase} x="0" y="0" width={viewBox.width} height={viewBox.height} preserveAspectRatio="xMidYMid slice" /> : <rect x="0" y="0" width={viewBox.width} height={viewBox.height} fill="#050912" />}

                {showOnPreview && previewOn ? items.filter((item) => item.kind === "light").map((item) => (
                  <g key={"lit-" + item.uid} opacity={item.previewOn ? 1 : 0.25}>
                    <image href={previewOn} x="0" y="0" width={viewBox.width} height={viewBox.height} preserveAspectRatio="xMidYMid slice" mask={"url(#preview-mask-" + item.uid + ")"} opacity={clamp(item.intensity, 0, 1)} />
                    <rect x="0" y="0" width={viewBox.width} height={viewBox.height} fill={item.lightType === "dimmable_color" ? "rgba(255,170,80,1)" : "rgba(255,201,125,1)"} mask={"url(#preview-mask-" + item.uid + ")"} opacity={clamp(item.tintIntensity, 0, 1)} style={{ mixBlendMode: "color" }} />
                  </g>
                )) : null}

                {gridEnabled && gridSize >= 4 ? (
                  <g opacity="0.16" pointerEvents="none">
                    {gridLines.map((line) => line.x !== undefined ? <line key={line.key} x1={line.x} x2={line.x} y1="0" y2={viewBox.height} stroke="white" strokeWidth="0.6" /> : <line key={line.key} x1="0" x2={viewBox.width} y1={line.y} y2={line.y} stroke="white" strokeWidth="0.6" />)}
                  </g>
                ) : null}

                {showMasks ? items.filter((item) => item.kind === "light").map((item) => (
                  <ellipse key={"ellipse-" + item.uid} cx={item.cx} cy={item.cy} rx={item.rx} ry={item.ry} fill="rgba(255,190,85,0.08)" stroke={selectedUid === item.uid ? "rgba(255,236,170,0.95)" : "rgba(255,255,255,0.35)"} strokeWidth={selectedUid === item.uid ? 3 : 1.3} strokeDasharray="8 8" pointerEvents="none" />
                )) : null}

                {drag?.guides?.map((guide, index) => guide.type === "v" ? <line key={"guide-" + index} x1={guide.x} x2={guide.x} y1="0" y2={viewBox.height} stroke="rgba(99, 210, 255, 0.95)" strokeWidth="3" pointerEvents="none" /> : <line key={"guide-" + index} x1="0" x2={viewBox.width} y1={guide.y} y2={guide.y} stroke="rgba(99, 210, 255, 0.95)" strokeWidth="3" pointerEvents="none" />)}

                {showControls ? items.map((item) => {
                  const selectedNow = selectedUid === item.uid;
                  const startDrag = (event) => {
                    event.preventDefault();
                    event.currentTarget?.setPointerCapture?.(event.pointerId);
                    setSelectedUid(item.uid);
                    const point = svgPointFromEvent(event);
                    setDrag({ uid: item.uid, offsetX: point.x - item.cx, offsetY: point.y - item.cy, guides: [] });
                  };

                  if (item.kind === "light") {
                    return (
                      <g key={"control-" + item.uid} onPointerDown={startDrag} className="cursor-move">
                        <circle cx={item.cx} cy={item.cy} r={item.hitR} fill={selectedNow ? "rgba(255,210,110,0.28)" : "rgba(255,255,255,0.08)"} stroke={selectedNow ? "rgba(255,236,170,0.95)" : "rgba(230,240,255,0.45)"} strokeWidth={selectedNow ? 4 : 2} />
                        <text x={item.cx} y={item.cy + 5} textAnchor="middle" fontSize="18" fontWeight="800" fill="white" stroke="rgba(0,0,0,0.8)" strokeWidth="4" paintOrder="stroke">{item.lightType === "on_off" ? "ON" : "%"}</text>
                        <text x={item.cx} y={item.cy + item.hitR + 24} textAnchor="middle" fontSize="16" fontWeight="700" fill="white" stroke="rgba(0,0,0,0.75)" strokeWidth="4" paintOrder="stroke">{item.name}</text>
                      </g>
                    );
                  }

                  const x = item.cx - item.width / 2;
                  const y = item.cy - item.height / 2;
                  const active = Boolean(item.previewActive);
                  const sensorColor = active ? item.sensorActiveColor || "#FACC15" : item.sensorIdleColor || "#FFFFFF";
                  const tileFill = item.kind === "sensor" ? hexToRgba(sensorColor, selectedNow ? 0.28 : 0.08) : selectedNow ? "rgba(125,190,255,0.30)" : item.kind === "camera" ? "rgba(20,25,40,0.62)" : "rgba(14,22,38,0.56)";
                  const textFill = "white";
                  const statusText = item.kind === "sensor" ? (active ? item.sensorActiveText || "Open" : item.sensorIdleText || "Closed") : item.kind === "camera" ? "CAM" : "Ready";
                  const icon = item.kind === "camera" ? "mdi:cctv" : item.kind === "sensor" ? (active ? item.sensorActiveIcon || item.icon || "mdi:access-point" : item.sensorIdleIcon || item.icon || "mdi:access-point") : item.icon || "mdi:help-circle-outline";

                  return (
                    <g key={"control-" + item.uid} onPointerDown={startDrag} className="cursor-move">
                      <rect x={x} y={y} width={item.width} height={item.height} rx="18" ry="18" fill={tileFill} stroke={item.kind === "sensor" ? sensorColor : selectedNow ? "rgba(30,41,59,0.95)" : "rgba(15,23,42,0.35)"} strokeWidth={selectedNow ? 4 : 2} />
                      <path d={iconPathForType(icon, item.customIconSvg || "")} transform={iconTransform(item.cx, item.cy - 17, 1.65)} fill="currentColor" color={item.kind === "sensor" ? sensorColor : textFill} stroke="none" pointerEvents="none" style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.62))" }} />
                      <text x={item.cx} y={item.cy + 22} textAnchor="middle" fontSize="14" fontWeight="800" fill={textFill} stroke="rgba(0,0,0,0.82)" strokeWidth="3" paintOrder="stroke">{statusText}</text>
                    </g>
                  );
                }) : null}
              </svg>
            </div>
          </main>

          <aside className="space-y-4 2xl:sticky 2xl:top-4 2xl:self-start">
            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-black text-slate-900"><SlidersHorizontal className="h-5 w-5" /> Inspector</div>
                <div className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{items.length} entities</div>
              </div>

              {selected ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Kind">
                      <select
                        value={selected.kind}
                        onChange={(event) => {
                          const nextKind = event.target.value;
                          if (nextKind === "sensor") {
                            const defaults = sensorDefaultsForType(selected.sensorType || "door");
                            updateSelected({ kind: nextKind, entity: entityPrefixForKind(nextKind) + selected.base, icon: defaults.icon, sensorIdleIcon: defaults.idleIcon, sensorActiveIcon: defaults.activeIcon, sensorTriggeredValue: defaults.trigger, sensorIdleText: defaults.idleText, sensorActiveText: defaults.activeText, sensorIdleColor: selected.sensorIdleColor || "#FFFFFF", sensorActiveColor: selected.sensorActiveColor || "#FACC15" });
                          } else {
                            updateSelected({ kind: nextKind, entity: entityPrefixForKind(nextKind) + selected.base });
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
                      >
                        <option value="light">Light</option>
                        <option value="sensor">Sensor</option>
                        <option value="camera">Camera</option>
                        <option value="entity">Other entity</option>
                      </select>
                    </Field>
                    <Field label="Name"><TextInput value={selected.name} onChange={(value) => updateSelected({ name: value })} /></Field>
                  </div>

                  <Field label="Entity"><TextInput value={selected.entity} onChange={changeEntity} placeholder="light.example, sensor.example, camera.example" /></Field>
                  <Field label="SVG base ID"><TextInput value={selected.base} onChange={(value) => updateSelected({ base: slugFromEntity(value), maskId: "mask-" + hyphenate(slugFromEntity(value)) })} /></Field>

                  {selected.kind === "light" ? (
                    <Field label="Light type">
                      <select value={selected.lightType} onChange={(event) => updateSelected({ lightType: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400">
                        <option value="on_off">On/off only</option>
                        <option value="dimmable">Dimmable, fixed warm tint</option>
                        <option value="dimmable_color">Dimmable and colorable</option>
                      </select>
                    </Field>
                  ) : null}

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Position and size</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="X"><NumberInput value={selected.cx} onChange={(value) => updateSelected({ cx: value })} /></Field>
                      <Field label="Y"><NumberInput value={selected.cy} onChange={(value) => updateSelected({ cy: value })} /></Field>
                      {selected.kind === "light" ? <Field label="Click radius"><NumberInput value={selected.hitR} min={5} onChange={(value) => updateSelected({ hitR: value })} /></Field> : <Field label="Width"><NumberInput value={selected.width} min={20} onChange={(value) => updateSelected({ width: value })} /></Field>}
                      {selected.kind === "light" ? <Field label="Fallback K"><NumberInput value={selected.fallbackKelvin} min={1000} max={40000} onChange={(value) => updateSelected({ fallbackKelvin: value })} /></Field> : <Field label="Height"><NumberInput value={selected.height} min={20} onChange={(value) => updateSelected({ height: value })} /></Field>}
                    </div>
                  </div>

                  {selected.kind === "light" ? (
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Glow</div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Glow rx"><NumberInput value={selected.rx} min={1} onChange={(value) => updateSelected({ rx: value })} /></Field>
                        <Field label="Glow ry"><NumberInput value={selected.ry} min={1} onChange={(value) => updateSelected({ ry: value })} /></Field>
                      </div>
                      <Field label={"White layer intensity " + Math.round(selected.intensity * 100) + "%"}>
                        <input type="range" min="0" max="1" step="0.01" value={selected.intensity} onChange={(event) => updateSelected({ intensity: Number(event.target.value) })} className="w-full" />
                      </Field>
                      <Field label={"Tint intensity " + Math.round(selected.tintIntensity * 100) + "%"}>
                        <input type="range" min="0" max="1" step="0.01" value={selected.tintIntensity} onChange={(event) => updateSelected({ tintIntensity: Number(event.target.value) })} className="w-full" />
                      </Field>
                    </div>
                  ) : selected.kind === "sensor" ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Sensor type">
                          <select
                            value={selected.sensorType || "door"}
                            onChange={(event) => {
                              const sensorType = event.target.value;
                              const defaults = sensorDefaultsForType(sensorType);
                              updateSelected({
                                sensorType,
                                icon: defaults.icon,
                                sensorIdleIcon: defaults.idleIcon,
                                sensorActiveIcon: defaults.activeIcon,
                                sensorTriggeredValue: defaults.trigger,
                                sensorIdleText: defaults.idleText,
                                sensorActiveText: defaults.activeText,
                              });
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400"
                          >
                            {SENSOR_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </Field>
                        <Field label="Closed/idle icon">
                          <select value={selected.sensorIdleIcon || selected.icon || "mdi:door-closed"} onChange={(event) => updateSelected({ sensorIdleIcon: event.target.value, icon: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400">
                            {SENSOR_ICON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </Field>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Open/active icon">
                          <select value={selected.sensorActiveIcon || selected.icon || "mdi:door-open"} onChange={(event) => updateSelected({ sensorActiveIcon: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400">
                            {SENSOR_ICON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </Field>
                        <Field label="Preview state">
                          <select value={selected.previewActive ? "active" : "idle"} onChange={(event) => updateSelected({ previewActive: event.target.value === "active" })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400">
                            <option value="idle">Idle</option>
                            <option value="active">Triggered</option>
                          </select>
                        </Field>
                      </div>

                      {(selected.sensorIdleIcon === "custom" || selected.sensorActiveIcon === "custom" || selected.icon === "custom") ? (
                        <Field label="Custom SVG path or SVG text">
                          <TextAreaInput value={selected.customIconSvg || ""} onChange={(value) => updateSelected({ customIconSvg: value })} placeholder="Paste an SVG <path d='...'> or just the path d value" />
                        </Field>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Triggered when state is">
                          <select value={selected.sensorTriggeredValue || "on"} onChange={(event) => updateSelected({ sensorTriggeredValue: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400">
                            {TRIGGER_VALUE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                          </select>
                        </Field>
                        <Field label="Unit override"><TextInput value={selected.unit} onChange={(value) => updateSelected({ unit: value })} /></Field>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Idle text"><TextInput value={selected.sensorIdleText || ""} onChange={(value) => updateSelected({ sensorIdleText: value })} /></Field>
                        <Field label="Active text"><TextInput value={selected.sensorActiveText || ""} onChange={(value) => updateSelected({ sensorActiveText: value })} /></Field>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Idle color">
                          <select value={selected.sensorIdleColor || "#FFFFFF"} onChange={(event) => updateSelected({ sensorIdleColor: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400">
                            {BASIC_COLORS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </Field>
                        <Field label="Active color">
                          <select value={selected.sensorActiveColor || "#FACC15"} onChange={(event) => updateSelected({ sensorActiveColor: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400">
                            {BASIC_COLORS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </Field>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Icon label"><TextInput value={selected.icon} onChange={(value) => updateSelected({ icon: value })} /></Field>
                      <Field label="Unit override"><TextInput value={selected.unit} onChange={(value) => updateSelected({ unit: value })} /></Field>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <SmallButton icon={Copy} onClick={duplicateSelected}>Duplicate</SmallButton>
                    <SmallButton icon={Trash2} onClick={deleteSelected}>Delete</SmallButton>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Select an entity in the preview or add a new one.</div>
              )}
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 font-black text-slate-900">Entity list</div>
              <div className="max-h-52 space-y-2 overflow-auto pr-1">
                {items.map((item) => (
                  <button key={item.uid} onClick={() => setSelectedUid(item.uid)} className={"w-full rounded-2xl p-3 text-left transition " + (selectedUid === item.uid ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-800 hover:bg-slate-100")}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-black">{item.name}</div>
                      <div className={"rounded-full px-2 py-1 text-[10px] font-black uppercase " + (selectedUid === item.uid ? "bg-white/15 text-white" : "bg-white text-slate-500")}>{item.kind}</div>
                    </div>
                    <div className={"truncate text-xs " + (selectedUid === item.uid ? "text-slate-300" : "text-slate-500")}>{item.entity}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex flex-wrap gap-2">
                {["yaml", "svg", "css"].map((key) => <SmallButton key={key} active={activeTab === key} onClick={() => setActiveTab(key)}>{key.toUpperCase()}</SmallButton>)}
              </div>
              <div className="mb-2 flex gap-2">
                <SmallButton icon={Copy} onClick={() => copyText(activeOutput, activeTab.toUpperCase())}>Copy</SmallButton>
                <SmallButton
                  icon={Download}
                  onClick={() => {
                    const fresh = activeTab === "svg" ? generateSvg({ originalSvg: svgText, items, viewBox, settings }) : activeTab === "css" ? mergeCss(cssText) : generateYaml({ items, settings });
                    downloadText(activeFilename, fresh);
                  }}
                >
                  Download
                </SmallButton>
              </div>
              <textarea readOnly value={activeOutput} className="h-[340px] w-full rounded-2xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 outline-none" />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
