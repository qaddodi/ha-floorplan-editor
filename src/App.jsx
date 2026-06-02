import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  FolderOpen,
  Grid3X3,
  HelpCircle,
  Keyboard,
  Layers,
  Magnet,
  Maximize2,
  Minus,
  Moon,
  MousePointer2,
  Palette,
  Play,
  Plus,
  Radio,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import * as MDI from "@mdi/js";

const DEFAULT_VIEWBOX = { x: 0, y: 0, width: 1600, height: 900 };

const DEFAULT_SETTINGS = {
  svgPath: "/local/floorplan/floorplan_generated.svg?v=1",
  cssPath: "/local/floorplan/floorplan_generated.css?v=1",
  offHref: "/local/floorplan/lights_off.png",
  onHref: "/local/floorplan/lights_on.png",
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

function stripPngCacheSuffix(value) {
  return String(value || "").replace(/(\.png)\?[^#\s"']*/i, "$1");
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

function defaultEntityForSensorType(sensorType, base) {
  return (sensorType === "temperature" ? "sensor." : "binary_sensor.") + (base || "new_sensor");
}

function shouldRetargetSensorEntity(item) {
  const domain = domainFromEntity(item?.entity || "");
  return ["sensor", "binary_sensor"].includes(domain) && slugFromEntity(item.entity) === item.base;
}

function normalizeTemperatureUnit(unit) {
  const raw = String(unit || "").trim();
  if (!raw) return "";
  if (raw === "F") return "°F";
  if (raw === "C") return "°C";
  return raw;
}

function temperaturePreviewText(item) {
  const value = item?.previewTemperature ?? 72;
  const numeric = Number(value);
  const displayValue = Number.isFinite(numeric) ? formatNumber(Math.round(numeric * 10) / 10) : String(value || "--");
  const unit = normalizeTemperatureUnit(item?.unit || "°");
  return unit ? `${displayValue}${unit.startsWith("°") ? "" : " "}${unit}` : displayValue;
}

function sensorDefaultsForType(sensorType) {
  if (sensorType === "door") return { icon: "mdi:door-closed", idleIcon: "mdi:door-closed", activeIcon: "mdi:door-open", idleText: "Closed", activeText: "Open", trigger: "on" };
  if (sensorType === "sliding_door") return { icon: "mdi:door-sliding", idleIcon: "mdi:door-sliding", activeIcon: "mdi:door-sliding-open", idleText: "Closed", activeText: "Open", trigger: "on" };
  if (sensorType === "window") return { icon: "mdi:window-closed", idleIcon: "mdi:window-closed", activeIcon: "mdi:window-open", idleText: "Closed", activeText: "Open", trigger: "on" };
  if (sensorType === "motion") return { icon: "mdi:motion-sensor", idleIcon: "mdi:motion-sensor", activeIcon: "mdi:motion-sensor", idleText: "Clear", activeText: "Detected", trigger: "on" };
  if (sensorType === "temperature") return { icon: "mdi:thermometer", idleIcon: "mdi:thermometer", activeIcon: "mdi:thermometer", idleText: "72°", activeText: "72°", trigger: "" };
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
    previewTemperature: 72,
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
        previewTemperature: safeNumber((statusElement?.textContent || "").replace(/[^0-9.-]/g, ""), 72),
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
  baseImage.setAttribute("href", stripPngCacheSuffix(settings.offHref || DEFAULT_SETTINGS.offHref));
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
      makeSvgElement(doc, "image", { id: item.base + "_lit", class: "lit-image", href: stripPngCacheSuffix(settings.onHref || DEFAULT_SETTINGS.onHref), x: 0, y: 0, width: formatNumber(width), height: formatNumber(height), preserveAspectRatio: "xMidYMid slice", mask: "url(#" + getMaskId(item) + ")" }),
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
      const idleText = item.kind === "sensor" ? (item.sensorType === "temperature" ? temperaturePreviewText(item) : item.sensorIdleText || "Closed") : item.kind === "camera" ? "CAM" : "Ready";
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
      temperatureText: function(entity, unitOverride) {
        if (!entity || entity.state === undefined || entity.state === null) return 'UNK';
        if (entity.state === 'unavailable') return 'UNAV';
        if (entity.state === 'unknown') return 'UNK';
        var state = String(entity.state);
        var numberValue = Number(state);
        var display = isNaN(numberValue) ? state : String(Math.round(numberValue * 10) / 10);
        var attributes = entity.attributes || {};
        var unit = unitOverride || attributes.unit_of_measurement || attributes.unit || '';
        if (unit === 'F') unit = '°F';
        if (unit === 'C') unit = '°C';
        return unit ? display + (String(unit).charAt(0) === '°' ? '' : ' ') + unit : display;
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
  const isTemperature = item.sensorType === "temperature";
  const statusText = isTemperature
    ? `${open}functions.temperatureText(entity, '${item.unit || ""}')}`
    : `${open}functions.sensorTextLabel.call(functions, entity, '${item.sensorTriggeredValue || "on"}', '${item.sensorIdleText || "Closed"}', '${item.sensorActiveText || "Open"}')}`;
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
            text: ${statusText}`;
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
      <input type="file" multiple accept=".svg,.css,.json,image/png,image/jpeg,image/webp" className="hidden" onChange={handleChange} />
    </label>
  );
}



const THEME_KEY = "floorplan-studio-theme";

const STUDIO_THEME_CSS = `
.floorplan-studio-theme {
  color-scheme: light;
  transition: background-color 160ms ease, color 160ms ease;
}
.floorplan-studio-theme[data-theme="dark"] {
  color-scheme: dark;
  background: #020617 !important;
  color: #e2e8f0 !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-white,
.floorplan-studio-theme[data-theme="dark"] [class~="bg-white/80"],
.floorplan-studio-theme[data-theme="dark"] [class~="bg-white/90"] {
  background-color: rgba(15, 23, 42, 0.96) !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-slate-50 {
  background-color: #0f172a !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-slate-100 {
  background-color: #1e293b !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-slate-200 {
  background-color: #334155 !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-slate-300 {
  background-color: #475569 !important;
}
.floorplan-studio-theme[data-theme="dark"] .border-slate-200,
.floorplan-studio-theme[data-theme="dark"] .border-slate-300 {
  border-color: #334155 !important;
}
.floorplan-studio-theme[data-theme="dark"] .ring-slate-200,
.floorplan-studio-theme[data-theme="dark"] .ring-slate-300 {
  --tw-ring-color: #334155 !important;
}
.floorplan-studio-theme[data-theme="dark"] .text-slate-950,
.floorplan-studio-theme[data-theme="dark"] .text-slate-900,
.floorplan-studio-theme[data-theme="dark"] .text-slate-800,
.floorplan-studio-theme[data-theme="dark"] .text-slate-700 {
  color: #f8fafc !important;
}
.floorplan-studio-theme[data-theme="dark"] .text-slate-600,
.floorplan-studio-theme[data-theme="dark"] .text-slate-500,
.floorplan-studio-theme[data-theme="dark"] .text-slate-400 {
  color: #94a3b8 !important;
}
.floorplan-studio-theme[data-theme="dark"] input,
.floorplan-studio-theme[data-theme="dark"] select,
.floorplan-studio-theme[data-theme="dark"] textarea {
  background-color: #020617 !important;
  border-color: #334155 !important;
  color: #e2e8f0 !important;
}
.floorplan-studio-theme[data-theme="dark"] input::placeholder,
.floorplan-studio-theme[data-theme="dark"] textarea::placeholder {
  color: #64748b !important;
}
.floorplan-studio-theme[data-theme="dark"] .shadow-sm,
.floorplan-studio-theme[data-theme="dark"] .shadow-xl,
.floorplan-studio-theme[data-theme="dark"] .shadow-2xl {
  --tw-shadow-color: rgba(0, 0, 0, 0.45) !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-emerald-50 {
  background-color: rgba(6, 78, 59, 0.30) !important;
}
.floorplan-studio-theme[data-theme="dark"] .text-emerald-900,
.floorplan-studio-theme[data-theme="dark"] .text-emerald-800 {
  color: #a7f3d0 !important;
}
.floorplan-studio-theme[data-theme="dark"] .ring-emerald-200,
.floorplan-studio-theme[data-theme="dark"] .border-emerald-200 {
  --tw-ring-color: rgba(16, 185, 129, 0.35) !important;
  border-color: rgba(16, 185, 129, 0.35) !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-amber-50 {
  background-color: rgba(120, 53, 15, 0.28) !important;
}
.floorplan-studio-theme[data-theme="dark"] .text-amber-950,
.floorplan-studio-theme[data-theme="dark"] .text-amber-900,
.floorplan-studio-theme[data-theme="dark"] .text-amber-800 {
  color: #fde68a !important;
}
.floorplan-studio-theme[data-theme="dark"] .ring-amber-200,
.floorplan-studio-theme[data-theme="dark"] .border-amber-200 {
  --tw-ring-color: rgba(245, 158, 11, 0.35) !important;
  border-color: rgba(245, 158, 11, 0.35) !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-rose-50 {
  background-color: rgba(127, 29, 29, 0.30) !important;
}
.floorplan-studio-theme[data-theme="dark"] .text-rose-950,
.floorplan-studio-theme[data-theme="dark"] .text-rose-800,
.floorplan-studio-theme[data-theme="dark"] .text-rose-700 {
  color: #fecdd3 !important;
}
.floorplan-studio-theme[data-theme="dark"] .ring-rose-200,
.floorplan-studio-theme[data-theme="dark"] .border-rose-200 {
  --tw-ring-color: rgba(244, 63, 94, 0.35) !important;
  border-color: rgba(244, 63, 94, 0.35) !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-sky-100 {
  background-color: rgba(12, 74, 110, 0.55) !important;
}
.floorplan-studio-theme[data-theme="dark"] .text-sky-900 {
  color: #bae6fd !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-violet-100 {
  background-color: rgba(76, 29, 149, 0.50) !important;
}
.floorplan-studio-theme[data-theme="dark"] .text-violet-900 {
  color: #ddd6fe !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-amber-100 {
  background-color: rgba(120, 53, 15, 0.55) !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-rose-100 {
  background-color: rgba(127, 29, 29, 0.50) !important;
}
.floorplan-studio-theme[data-theme="dark"] .bg-emerald-100 {
  background-color: rgba(6, 78, 59, 0.50) !important;
}
.floorplan-studio-theme[data-theme="dark"] [class~="hover:bg-slate-50"]:hover,
.floorplan-studio-theme[data-theme="dark"] [class~="hover:bg-slate-100"]:hover,
.floorplan-studio-theme[data-theme="dark"] [class~="hover:bg-slate-200"]:hover {
  background-color: #1e293b !important;
}
.floorplan-studio-theme[data-theme="dark"] [class~="bg-white/8"] {
  background-color: rgba(255, 255, 255, 0.08) !important;
}
.floorplan-studio-theme[data-theme="dark"] [class~="bg-white/10"] {
  background-color: rgba(255, 255, 255, 0.10) !important;
}
.floorplan-studio-theme[data-theme="dark"] [class~="bg-white/14"] {
  background-color: rgba(255, 255, 255, 0.14) !important;
}
`;

const AUTOSAVE_KEY = "floorplan-studio-draft-v2";
const HISTORY_LIMIT = 80;

const KIND_META = {
  light: { label: "Light", icon: Zap, color: "bg-amber-100 text-amber-900 ring-amber-200" },
  sensor: { label: "Sensor", icon: Radio, color: "bg-sky-100 text-sky-900 ring-sky-200" },
  camera: { label: "Camera", icon: Camera, color: "bg-violet-100 text-violet-900 ring-violet-200" },
  entity: { label: "Other", icon: Plus, color: "bg-slate-100 text-slate-800 ring-slate-200" },
};

const INSPECTOR_TABS = ["basic", "appearance", "behavior", "advanced"];
const OUTPUT_TABS = ["yaml", "svg", "css"];

const SENSOR_PRESETS = [
  { title: "Door sensor", description: "Closed / Open", sensorType: "door" },
  { title: "Window sensor", description: "Closed / Open", sensorType: "window" },
  { title: "Motion sensor", description: "Clear / Detected", sensorType: "motion" },
  { title: "Leak sensor", description: "Dry / Wet", sensorType: "leak" },
  { title: "Temperature sensor", description: "Live value + unit", sensorType: "temperature" },
];

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function isEditableTarget(target) {
  return Boolean(target && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName));
}

function validEntityId(value) {
  return /^[a-z0-9_]+\.[a-z0-9_]+$/.test(String(value || "").trim());
}

function stateSnapshot({ svgText, cssText, offPng, onPng, items, settings }) {
  return {
    svgText,
    cssText,
    offPng,
    onPng,
    items: JSON.parse(JSON.stringify(items || [])),
    settings: { ...(settings || DEFAULT_SETTINGS) },
  };
}

function safeProjectParse(value) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.items)) return null;
    return {
      svgText: parsed.svgText || "",
      cssText: parsed.cssText || "",
      offPng: parsed.offPng || "",
      onPng: parsed.onPng || "",
      items: parsed.items || [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return null;
  }
}

function sanitizeSvgInner(svgText) {
  if (!svgText || typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") return "";
  try {
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const root = doc.querySelector("svg");
    if (!root) return "";
    Array.from(root.querySelectorAll("script, foreignObject")).forEach((node) => node.remove());
    Array.from(root.querySelectorAll("*"))
      .forEach((node) => {
        Array.from(node.getAttributeNames ? node.getAttributeNames() : [])
          .forEach((name) => {
            if (name.toLowerCase().startsWith("on")) node.removeAttribute(name);
          });
      });
    Array.from(root.querySelectorAll("image.lit-image, rect.color-tint, g.floorplan-entity-control, g.lamp-control, g.sensor-control, g.camera-control"))
      .forEach((node) => node.remove());
    return Array.from(root.childNodes).map((node) => new XMLSerializer().serializeToString(node)).join("\n");
  } catch {
    return "";
  }
}

function sampleSvg() {
  return `<svg id="floorplan" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="sample-bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#111827" />
      <stop offset="1" stop-color="#020617" />
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sample-bg)" />
  <rect x="120" y="110" width="600" height="320" rx="24" fill="#1f2937" stroke="#94a3b8" stroke-width="8" />
  <rect x="720" y="110" width="760" height="320" rx="24" fill="#172033" stroke="#94a3b8" stroke-width="8" />
  <rect x="120" y="430" width="430" height="350" rx="24" fill="#1e293b" stroke="#94a3b8" stroke-width="8" />
  <rect x="550" y="430" width="930" height="350" rx="24" fill="#111827" stroke="#94a3b8" stroke-width="8" />
  <text x="420" y="275" fill="#e5e7eb" font-family="system-ui" font-size="42" text-anchor="middle" font-weight="800">Kitchen</text>
  <text x="1100" y="275" fill="#e5e7eb" font-family="system-ui" font-size="42" text-anchor="middle" font-weight="800">Living Room</text>
  <text x="335" y="620" fill="#e5e7eb" font-family="system-ui" font-size="42" text-anchor="middle" font-weight="800">Entry</text>
  <text x="1015" y="620" fill="#e5e7eb" font-family="system-ui" font-size="42" text-anchor="middle" font-weight="800">Bedroom</text>
  <path d="M548 500 C620 520 660 560 670 640" fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" opacity="0.45" />
</svg>`;
}

function validateProject({ items, svgText, cssText, offPng, onPng, settings }) {
  const issues = [];
  const add = (severity, title, detail, uid = "") => issues.push({ id: makeUid(), severity, title, detail, uid });
  if (!svgText && !offPng && !settings.offHref) add("warning", "No floorplan visual loaded", "Import an SVG or set an off image path before exporting.");
  if (!cssText) add("info", "Starter CSS will be generated", "No CSS was imported. The export will include default CSS.");
  if (!items.length) add("warning", "No entities placed", "Add lights, sensors, cameras, or custom entities before exporting.");
  if (!onPng && !settings.onHref && items.some((item) => item.kind === "light")) add("warning", "No lights-on image", "Light glow masks will export, but the on-layer image path is empty.");

  const baseCounts = new Map();
  const nameCounts = new Map();
  items.forEach((item) => {
    const base = String(item.base || "").trim();
    const name = String(item.name || "").trim().toLowerCase();
    baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
    if (name) nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
  });

  items.forEach((item) => {
    if (!String(item.entity || "").trim()) add("error", "Missing entity ID", `${item.name || item.base} needs a Home Assistant entity ID.`, item.uid);
    else if (!validEntityId(item.entity)) add("error", "Invalid entity ID", `${item.entity} should look like light.kitchen_ceiling.`, item.uid);
    if (!String(item.base || "").trim()) add("error", "Missing generated SVG ID", `${item.name || item.entity} needs a generated SVG ID.`, item.uid);
    if (baseCounts.get(item.base) > 1) add("error", "Duplicate generated SVG ID", `${item.base} is used by more than one entity.`, item.uid);
    if (item.kind === "sensor" && item.sensorType !== "temperature" && !String(item.sensorTriggeredValue || "").trim()) add("error", "Sensor active state missing", `${item.name || item.entity} needs an active state value.`, item.uid);
    if (item.kind === "sensor" && item.sensorType === "temperature" && domainFromEntity(item.entity) === "binary_sensor") add("warning", "Temperature entity should use sensor.*", `${item.entity} is a binary sensor. Use a numeric sensor entity so the floorplan can show live temperature.`, item.uid);
    if (item.kind === "light" && (!item.rx || !item.ry)) add("warning", "Light glow is very small", `${item.name || item.entity} has no visible glow area.`, item.uid);
  });

  nameCounts.forEach((count, name) => {
    if (count > 1) add("warning", "Duplicate display name", `More than one entity is named ${titleFromSlug(name)}.`);
  });

  return issues;
}

function StudioButton({ children, icon: Icon, onClick, disabled = false, variant = "secondary", size = "md", title = "", className = "" }) {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold outline-none transition focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-45";
  const sizes = size === "sm" ? "px-2.5 py-1.5 text-xs" : size === "lg" ? "px-4 py-2.5 text-sm" : "px-3 py-2 text-sm";
  const variants = {
    primary: "bg-slate-950 text-white shadow-sm hover:bg-slate-800",
    secondary: "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    darkGhost: "bg-white/8 text-white ring-1 ring-white/10 hover:bg-white/14",
    danger: "bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} className={classNames(base, sizes, variants[variant] || variants.secondary, className)}>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function ToggleChip({ active, children, icon: Icon, onClick, title = "" }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-slate-300",
        active ? "bg-slate-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}

function ModalShell({ title, description, icon: Icon, children, footer, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className={classNames("max-h-[90vh] w-full overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200", wide ? "max-w-5xl" : "max-w-2xl")}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex min-w-0 gap-3">
            {Icon ? <div className="rounded-2xl bg-slate-100 p-3 text-slate-800"><Icon className="h-5 w-5" /></div> : null}
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-950">{title}</h2>
              {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[65vh] overflow-auto p-5">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <div className={classNames("mt-0.5 rounded-xl p-2", toast.type === "error" ? "bg-rose-100 text-rose-700" : toast.type === "warning" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700")}>
              {toast.type === "error" ? <AlertTriangle className="h-4 w-4" /> : toast.type === "warning" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900">{toast.message}</div>
              {toast.detail ? <div className="mt-0.5 text-xs text-slate-500">{toast.detail}</div> : null}
              {toast.actionLabel ? (
                <button type="button" onClick={() => { toast.onAction?.(); onDismiss(toast.id); }} className="mt-2 text-xs font-black text-slate-950 underline underline-offset-4">
                  {toast.actionLabel}
                </button>
              ) : null}
            </div>
            <button type="button" onClick={() => onDismiss(toast.id)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function IssueList({ issues, onSelect }) {
  if (!issues.length) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <div className="flex items-center gap-2 font-black"><CheckCircle2 className="h-4 w-4" /> Ready to export</div>
        <p className="mt-1 text-emerald-800">No blocking errors or warnings were found.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {issues.map((issue) => (
        <button
          type="button"
          key={issue.id}
          onClick={() => issue.uid && onSelect?.(issue.uid)}
          className={classNames(
            "w-full rounded-2xl p-3 text-left ring-1 transition",
            issue.severity === "error" ? "bg-rose-50 text-rose-950 ring-rose-200 hover:bg-rose-100" : issue.severity === "warning" ? "bg-amber-50 text-amber-950 ring-amber-200 hover:bg-amber-100" : "bg-slate-50 text-slate-800 ring-slate-200 hover:bg-slate-100"
          )}
        >
          <div className="flex items-start gap-2">
            {issue.severity === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : issue.severity === "warning" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <div>
              <div className="text-sm font-black">{issue.title}</div>
              <div className="mt-0.5 text-xs opacity-80">{issue.detail}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function StudioField({ label, help, error, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {error ? <span className="block text-xs font-semibold text-rose-700">{error}</span> : help ? <span className="block text-xs text-slate-500">{help}</span> : null}
    </label>
  );
}

function SectionTitle({ icon: Icon, title, aside }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 font-black text-slate-950">{Icon ? <Icon className="h-5 w-5" /> : null}{title}</div>
      {aside}
    </div>
  );
}

function Stepper({ hasVisual, itemCount, issues, exportOpened }) {
  const steps = [
    { label: "Import", done: hasVisual },
    { label: "Place", done: itemCount > 0 },
    { label: "Preview", done: itemCount > 0 },
    { label: "Export", done: exportOpened || (itemCount > 0 && !issues.some((issue) => issue.severity === "error")) },
  ];
  return (
    <div className="hidden items-center gap-2 xl:flex">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-2">
          <div className={classNames("flex h-7 items-center gap-2 rounded-full px-3 text-xs font-black", step.done ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-500")}>
            <span className={classNames("grid h-4 w-4 place-items-center rounded-full text-[10px]", step.done ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700")}>{step.done ? <Check className="h-3 w-3" /> : index + 1}</span>
            {step.label}
          </div>
          {index < steps.length - 1 ? <div className="h-px w-6 bg-slate-200" /> : null}
        </div>
      ))}
    </div>
  );
}

function KindBadge({ kind }) {
  const meta = KIND_META[kind] || KIND_META.entity;
  const Icon = meta.icon;
  return <span className={classNames("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1", meta.color)}><Icon className="h-3 w-3" />{meta.label}</span>;
}

export default function FloorplanEntityEditor() {
  const svgRef = useRef(null);
  const viewportRef = useRef(null);
  const panDragRef = useRef(null);
  const autosaveHydratedRef = useRef(false);

  const [svgText, setSvgText] = useState("");
  const [cssText, setCssText] = useState("");
  const [offPng, setOffPng] = useState("");
  const [onPng, setOnPng] = useState("");
  const [items, setItems] = useState([]);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);

  const [selectedUids, setSelectedUids] = useState([]);
  const selectedUid = selectedUids[0] || "";
  const selected = items.find((item) => item.uid === selectedUid) || null;
  const selectedItems = items.filter((item) => selectedUids.includes(item.uid));

  const [history, setHistory] = useState({ past: [], future: [] });
  const [toasts, setToasts] = useState([]);
  const [layerSearch, setLayerSearch] = useState("");
  const [layerFilter, setLayerFilter] = useState("all");
  const [inspectorTab, setInspectorTab] = useState("basic");
  const [outputTab, setOutputTab] = useState("yaml");
  const [exportOpen, setExportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [drag, setDrag] = useState(null);
  const [canvasMode, setCanvasMode] = useState("select");
  const [zoom, setZoom] = useState(100);
  const [showOnPreview, setShowOnPreview] = useState(true);
  const [showMasks, setShowMasks] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [snapDistance, setSnapDistance] = useState(12);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [availableDraft, setAvailableDraft] = useState(null);
  const [exportTouched, setExportTouched] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    try {
      const saved = window.localStorage?.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // localStorage can be blocked; fall back to system preference.
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  });

  const isDarkMode = theme === "dark";

  const viewBox = useMemo(() => parseViewBox(svgText), [svgText]);
  const previewBase = offPng;
  const previewOn = onPng;
  const generatedSvg = useMemo(() => generateSvg({ originalSvg: svgText, items, viewBox, settings }), [svgText, items, viewBox, settings]);
  const generatedCss = useMemo(() => mergeCss(cssText), [cssText]);
  const generatedYaml = useMemo(() => generateYaml({ items, settings }), [items, settings]);
  const backgroundMarkup = useMemo(() => sanitizeSvgInner(svgText), [svgText]);
  const issues = useMemo(() => validateProject({ items, svgText, cssText, offPng, onPng, settings }), [items, svgText, cssText, offPng, onPng, settings]);
  const blockingExport = issues.some((issue) => issue.severity === "error");
  const hasVisual = Boolean(svgText || offPng || onPng || backgroundMarkup);
  const activeOutput = outputTab === "svg" ? generatedSvg : outputTab === "css" ? generatedCss : generatedYaml;
  const activeFilename = outputTab === "svg" ? "floorplan_generated.svg" : outputTab === "css" ? "floorplan_generated.css" : "floorplan_card_generated.yaml";

  const gridLines = useMemo(() => {
    if (!gridEnabled || gridSize < 4) return [];
    const lines = [];
    for (let x = 0; x <= viewBox.width; x += gridSize) lines.push({ key: "v-" + x, x });
    for (let y = 0; y <= viewBox.height; y += gridSize) lines.push({ key: "h-" + y, y });
    return lines;
  }, [gridEnabled, gridSize, viewBox.width, viewBox.height]);

  const filteredItems = useMemo(() => {
    const q = layerSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (layerFilter !== "all" && item.kind !== layerFilter) return false;
      if (!q) return true;
      return [item.name, item.entity, item.base, item.kind].some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [items, layerSearch, layerFilter]);

  const groupedItems = useMemo(() => {
    const groups = { light: [], sensor: [], camera: [], entity: [] };
    filteredItems.forEach((item) => { (groups[item.kind] || groups.entity).push(item); });
    return groups;
  }, [filteredItems]);

  function currentSnapshot() {
    return stateSnapshot({ svgText, cssText, offPng, onPng, items, settings });
  }

  function applySnapshot(snapshot) {
    setSvgText(snapshot.svgText || "");
    setCssText(snapshot.cssText || "");
    setOffPng(snapshot.offPng || "");
    setOnPng(snapshot.onPng || "");
    setItems(Array.isArray(snapshot.items) ? snapshot.items : []);
    setSettingsState({ ...DEFAULT_SETTINGS, ...(snapshot.settings || {}) });
  }

  function pushToast(message, type = "success", detail = "", actionLabel = "", onAction = null) {
    const id = makeUid();
    setToasts((previous) => [...previous, { id, message, type, detail, actionLabel, onAction }].slice(-4));
    if (!actionLabel) {
      window.setTimeout(() => setToasts((previous) => previous.filter((toast) => toast.id !== id)), 3500);
    }
  }

  function dismissToast(id) {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }

  function shouldToastForCommit(message) {
    return /complete|loaded|created|deleted|duplicated|placed|downloaded|copied|restored|applied|ready/i.test(String(message || ""));
  }

  function commitProject(updater, message = "") {
    const before = currentSnapshot();
    const next = typeof updater === "function" ? updater(before) : { ...before, ...updater };
    setHistory((previous) => ({ past: [...previous.past, before].slice(-HISTORY_LIMIT), future: [] }));
    applySnapshot(next);
    if (shouldToastForCommit(message)) pushToast(message);
  }

  function setSelectedUid(uid) {
    setSelectedUids(uid ? [uid] : []);
  }

  function selectItem(uid, event) {
    if (event?.shiftKey || event?.metaKey || event?.ctrlKey) {
      setSelectedUids((previous) => previous.includes(uid) ? previous.filter((value) => value !== uid) : [...previous, uid]);
    } else {
      setSelectedUids([uid]);
    }
  }

  function undo() {
    setHistory((previous) => {
      if (!previous.past.length) return previous;
      const before = previous.past[previous.past.length - 1];
      const rest = previous.past.slice(0, -1);
      const now = currentSnapshot();
      applySnapshot(before);
      pushToast("Undo complete");
      return { past: rest, future: [now, ...previous.future].slice(0, HISTORY_LIMIT) };
    });
  }

  function redo() {
    setHistory((previous) => {
      if (!previous.future.length) return previous;
      const next = previous.future[0];
      const rest = previous.future.slice(1);
      const now = currentSnapshot();
      applySnapshot(next);
      pushToast("Redo complete");
      return { past: [...previous.past, now].slice(-HISTORY_LIMIT), future: rest };
    });
  }

  function updateItems(updater, message = "Updated") {
    commitProject((snapshot) => ({ ...snapshot, items: typeof updater === "function" ? updater(snapshot.items) : updater }), message);
  }

  function updateSelected(patch, message = "Updated entity") {
    const targetUids = selectedUids.length ? selectedUids : selected ? [selected.uid] : [];
    if (!targetUids.length) return;
    updateItems((previous) => previous.map((item) => targetUids.includes(item.uid) ? { ...item, ...patch } : item), message);
  }

  function updateOne(uid, patch, message = "Updated entity") {
    updateItems((previous) => previous.map((item) => item.uid === uid ? { ...item, ...patch } : item), message);
  }

  function updateSettings(patch, message = "Updated settings") {
    commitProject((snapshot) => ({ ...snapshot, settings: { ...snapshot.settings, ...patch } }), message);
  }

  function makePlacedItem(kind, point, currentItems, preset = {}) {
    const existing = new Set(currentItems.map((item) => item.base));
    const item = defaultItem(kind, viewBox, existing);
    const next = { ...item, cx: Math.round(point.x), cy: Math.round(point.y) };
    if (kind === "sensor") {
      const sensorType = preset.sensorType || "door";
      const defaults = sensorDefaultsForType(sensorType);
      return {
        ...next,
        sensorType,
        icon: defaults.icon,
        sensorIdleIcon: defaults.idleIcon,
        sensorActiveIcon: defaults.activeIcon,
        sensorTriggeredValue: defaults.trigger,
        sensorIdleText: defaults.idleText,
        sensorActiveText: defaults.activeText,
        previewTemperature: sensorType === "temperature" ? 72 : next.previewTemperature,
        entity: defaultEntityForSensorType(sensorType, next.base),
      };
    }
    if (kind === "light" && preset.lightType) return { ...next, lightType: preset.lightType };
    return next;
  }

  function startPlacement(kind, preset = {}) {
    setAddOpen(false);
    setPlacement({ kind, preset, x: viewBox.width / 2, y: viewBox.height / 2 });
    pushToast(`Click the floorplan to place a ${KIND_META[kind]?.label || "entity"}.`, "success", "Press Esc to cancel.");
  }

  function startBlank() {
    setImportOpen(false);
    commitProject({ svgText: createEmptySvg(DEFAULT_VIEWBOX.width, DEFAULT_VIEWBOX.height), cssText: STARTER_CSS, offPng: "", onPng: "", items, settings }, "Blank project created");
  }

  function loadSample() {
    setImportOpen(false);
    const baseSvg = sampleSvg();
    const vb = parseViewBox(baseSvg);
    const baseItems = [];
    const kitchen = { ...defaultItem("light", vb, new Set()), base: "kitchen_ceiling", maskId: "mask-kitchen-ceiling", name: "Kitchen Ceiling", entity: "light.kitchen_ceiling", cx: 420, cy: 250, rx: 260, ry: 170, lightType: "dimmable_color" };
    baseItems.push(kitchen);
    const doorDefaults = sensorDefaultsForType("door");
    baseItems.push({ ...defaultItem("sensor", vb, new Set(baseItems.map((item) => item.base))), base: "front_door", name: "Front Door", entity: "binary_sensor.front_door", cx: 335, cy: 720, sensorType: "door", icon: doorDefaults.icon, sensorIdleIcon: doorDefaults.idleIcon, sensorActiveIcon: doorDefaults.activeIcon, sensorIdleText: doorDefaults.idleText, sensorActiveText: doorDefaults.activeText, previewActive: false });
    const tempDefaults = sensorDefaultsForType("temperature");
    baseItems.push({ ...defaultItem("sensor", vb, new Set(baseItems.map((item) => item.base))), base: "living_room_temperature", name: "Living Room Temperature", entity: "sensor.living_room_temperature", cx: 790, cy: 330, sensorType: "temperature", icon: tempDefaults.icon, sensorIdleIcon: tempDefaults.idleIcon, sensorActiveIcon: tempDefaults.activeIcon, sensorTriggeredValue: "", sensorIdleText: tempDefaults.idleText, sensorActiveText: tempDefaults.activeText, unit: "", previewTemperature: 72.4, previewActive: false });
    baseItems.push({ ...defaultItem("camera", vb, new Set(baseItems.map((item) => item.base))), base: "driveway_camera", name: "Driveway Camera", entity: "camera.driveway", cx: 1300, cy: 720 });
    baseItems.push({ ...defaultItem("entity", vb, new Set(baseItems.map((item) => item.base))), base: "bedroom_fan", name: "Bedroom Fan", entity: "fan.bedroom_fan", cx: 1015, cy: 620, icon: "mdi:fan" });
    commitProject({ svgText: baseSvg, cssText: STARTER_CSS, offPng: "", onPng: "", items: baseItems, settings }, "Sample project loaded");
    setSelectedUids([baseItems[0].uid]);
  }

  async function prepareImport(files) {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;

    for (const file of incoming) {
      const name = lowerName(file.name);
      if (hasEnding(name, ".json")) {
        const text = await readFileAsText(file);
        const project = safeProjectParse(text);
        if (project) {
          setPendingImport({ mode: "project", project, fileName: file.name });
          setImportOpen(true);
          return;
        }
      }
    }

    let nextSvg = "";
    let nextCss = "";
    const images = [];

    for (const file of incoming) {
      const name = lowerName(file.name);
      if (hasEnding(name, ".svg")) nextSvg = await readFileAsText(file);
      else if (hasEnding(name, ".css")) nextCss = await readFileAsText(file);
      else if (file.type.startsWith("image/") || hasAnyNamePart(name, [".png", ".jpg", ".jpeg", ".webp"])) {
        const data = await readFileAsDataUrl(file);
        let role = "extra";
        if (hasAnyNamePart(name, ["lights_off", "night_off", "_off", "-off"])) role = "off";
        else if (hasAnyNamePart(name, ["lights_on", "night_on", "_on", "-on"])) role = "on";
        else if (!images.some((entry) => entry.role === "off")) role = "off";
        else if (!images.some((entry) => entry.role === "on")) role = "on";
        images.push({ id: makeUid(), name: file.name, data, role });
      }
    }

    const parsed = parseItems(nextSvg);
    setPendingImport({ mode: "package", svgText: nextSvg, cssText: nextCss, images, parsed, keepExisting: false });
    setImportOpen(true);
  }

  function confirmImport() {
    if (!pendingImport) return;
    if (pendingImport.mode === "project") {
      applySnapshot(pendingImport.project);
      setHistory({ past: [], future: [] });
      setSelectedUids(pendingImport.project.items?.[0]?.uid ? [pendingImport.project.items[0].uid] : []);
      setImportOpen(false);
      setPendingImport(null);
      pushToast("Editable project restored");
      return;
    }

    const offImage = pendingImport.images.find((image) => image.role === "off")?.data || offPng;
    const onImage = pendingImport.images.find((image) => image.role === "on")?.data || onPng;
    const importedItems = pendingImport.parsed || [];
    const nextItems = pendingImport.keepExisting ? [...items, ...importedItems] : importedItems.length ? importedItems : [];
    commitProject({
      svgText: pendingImport.svgText || svgText,
      cssText: pendingImport.cssText || cssText,
      offPng: offImage,
      onPng: onImage,
      items: nextItems,
      settings,
    }, importedItems.length ? `Import complete. Found ${importedItems.length} editable entities.` : "Import complete. Add entities manually.");
    setSelectedUids(nextItems[0]?.uid ? [nextItems[0].uid] : []);
    setImportOpen(false);
    setPendingImport(null);
  }

  function setPendingImageRole(id, role) {
    setPendingImport((previous) => previous ? { ...previous, images: previous.images.map((image) => image.id === id ? { ...image, role } : role !== "extra" && image.role === role ? { ...image, role: "extra" } : image) } : previous);
  }

  function changeEntity(value) {
    if (!selected) return;
    const kind = kindFromEntity(value);
    const base = slugFromEntity(value);
    if (kind === "sensor") {
      const sensorType = inferSensorType(base, "", value, base);
      const defaults = sensorDefaultsForType(sensorType);
      updateOne(selected.uid, {
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
      }, "Entity ID updated");
    } else {
      updateOne(selected.uid, { entity: value, kind, base, maskId: "mask-" + hyphenate(base) }, "Entity ID updated");
    }
  }

  function changeKind(nextKind) {
    if (!selected) return;
    if (nextKind === "sensor") {
      const defaults = sensorDefaultsForType(selected.sensorType || "door");
      updateOne(selected.uid, { kind: nextKind, entity: defaultEntityForSensorType(selected.sensorType || "door", selected.base), icon: defaults.icon, sensorIdleIcon: defaults.idleIcon, sensorActiveIcon: defaults.activeIcon, sensorTriggeredValue: defaults.trigger, sensorIdleText: defaults.idleText, sensorActiveText: defaults.activeText, previewTemperature: selected.previewTemperature ?? 72, sensorIdleColor: selected.sensorIdleColor || "#FFFFFF", sensorActiveColor: selected.sensorActiveColor || "#FACC15" }, "Entity type changed");
    } else {
      updateOne(selected.uid, { kind: nextKind, entity: entityPrefixForKind(nextKind) + selected.base }, "Entity type changed");
    }
  }

  function deleteSelected() {
    const target = selectedUids.length ? selectedUids : selected ? [selected.uid] : [];
    if (!target.length) return;
    const before = currentSnapshot();
    const names = items.filter((item) => target.includes(item.uid)).map((item) => item.name || item.entity).join(", ");
    commitProject((snapshot) => ({ ...snapshot, items: snapshot.items.filter((item) => !target.includes(item.uid)) }), "");
    setSelectedUids([]);
    pushToast(target.length === 1 ? `${names} deleted.` : `${target.length} entities deleted.`, "warning", "", "Undo", () => applySnapshot(before));
  }

  function duplicateSelected(placeMode = false) {
    const target = selectedUids.length ? selectedUids : selected ? [selected.uid] : [];
    if (!target.length) return;
    const nextCopies = [];
    updateItems((previous) => {
      const existing = new Set(previous.map((item) => item.base));
      previous.filter((item) => target.includes(item.uid)).forEach((item) => {
        let base = item.base + "_copy";
        let count = 2;
        while (existing.has(base)) {
          base = item.base + "_copy_" + count;
          count += 1;
        }
        existing.add(base);
        const copyEntity = item.kind === "sensor" ? defaultEntityForSensorType(item.sensorType || "door", base) : entityPrefixForKind(item.kind) + base;
        const copy = { ...item, uid: makeUid(), base, name: item.name + " Copy", entity: copyEntity, cx: item.cx + 40, cy: item.cy + 40, maskId: "mask-" + hyphenate(base) };
        nextCopies.push(copy);
      });
      return [...previous, ...nextCopies];
    }, target.length === 1 ? "Entity duplicated" : `${target.length} entities duplicated`);
    if (nextCopies.length) setSelectedUids(nextCopies.map((item) => item.uid));
    if (placeMode && nextCopies.length === 1) setPlacement({ kind: nextCopies[0].kind, preset: { duplicateOf: nextCopies[0] }, x: nextCopies[0].cx, y: nextCopies[0].cy });
  }

  function alignSelected(mode) {
    if (selectedItems.length < 2) return;
    const minX = Math.min(...selectedItems.map((item) => item.cx));
    const maxX = Math.max(...selectedItems.map((item) => item.cx));
    const minY = Math.min(...selectedItems.map((item) => item.cy));
    const maxY = Math.max(...selectedItems.map((item) => item.cy));
    const avgX = selectedItems.reduce((sum, item) => sum + item.cx, 0) / selectedItems.length;
    const avgY = selectedItems.reduce((sum, item) => sum + item.cy, 0) / selectedItems.length;
    updateItems((previous) => previous.map((item) => {
      if (!selectedUids.includes(item.uid)) return item;
      if (mode === "left") return { ...item, cx: minX };
      if (mode === "center") return { ...item, cx: Math.round(avgX) };
      if (mode === "right") return { ...item, cx: maxX };
      if (mode === "top") return { ...item, cy: minY };
      if (mode === "middle") return { ...item, cy: Math.round(avgY) };
      if (mode === "bottom") return { ...item, cy: maxY };
      return item;
    }), "Entities aligned");
  }

  function distributeSelected(axis) {
    if (selectedItems.length < 3) return;
    const sorted = [...selectedItems].sort((a, b) => axis === "x" ? a.cx - b.cx : a.cy - b.cy);
    const first = axis === "x" ? sorted[0].cx : sorted[0].cy;
    const last = axis === "x" ? sorted[sorted.length - 1].cx : sorted[sorted.length - 1].cy;
    const step = (last - first) / (sorted.length - 1);
    const values = new Map(sorted.map((item, index) => [item.uid, Math.round(first + step * index)]));
    updateItems((previous) => previous.map((item) => !values.has(item.uid) ? item : axis === "x" ? { ...item, cx: values.get(item.uid) } : { ...item, cy: values.get(item.uid) }), "Entities distributed");
  }

  function applyVisualPreset(preset) {
    updateItems((previous) => previous.map((item) => {
      if (preset === "minimal") return { ...item, tintIntensity: item.kind === "light" ? 0.35 : item.tintIntensity, sensorIdleColor: "#FFFFFF", sensorActiveColor: "#FACC15" };
      if (preset === "warm") return { ...item, tintIntensity: item.kind === "light" ? 0.7 : item.tintIntensity, fallbackKelvin: item.kind === "light" ? 2200 : item.fallbackKelvin, sensorActiveColor: "#F59E0B" };
      if (preset === "contrast") return { ...item, tintIntensity: item.kind === "light" ? 0.5 : item.tintIntensity, sensorIdleColor: "#FFFFFF", sensorActiveColor: "#22D3EE" };
      if (preset === "soft") return { ...item, tintIntensity: item.kind === "light" ? 0.42 : item.tintIntensity, sensorIdleColor: "#D1D5DB", sensorActiveColor: "#FDE68A" };
      return item;
    }), "Visual preset applied");
  }

  function simulateState(mode) {
    updateItems((previous) => previous.map((item) => {
      if (mode === "all_off") return { ...item, previewOn: false, previewActive: false };
      if (mode === "all_on") return { ...item, previewOn: true, previewActive: item.kind === "sensor" && item.sensorType !== "temperature" ? true : item.previewActive };
      if (mode === "open") return { ...item, previewActive: item.kind === "sensor" && ["door", "window", "sliding_door"].includes(item.sensorType) ? true : item.previewActive };
      if (mode === "random") return { ...item, previewOn: item.kind === "light" ? Math.random() > 0.4 : item.previewOn, previewActive: item.kind === "sensor" && item.sensorType !== "temperature" ? Math.random() > 0.55 : item.previewActive, previewTemperature: item.sensorType === "temperature" ? Math.round((66 + Math.random() * 14) * 10) / 10 : item.previewTemperature };
      return { ...item, previewOn: true, previewActive: false };
    }), "Preview state changed");
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

  function snapPoint(x, y, uid = "") {
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

  function beginItemDrag(event, item, type = "move") {
    if (canvasMode !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    selectItem(item.uid, event);
    const point = svgPointFromEvent(event);
    const moveUids = selectedUids.includes(item.uid) && selectedUids.length > 1 ? selectedUids : [item.uid];
    setDrag({ type, uid: item.uid, uids: moveUids, startPoint: point, startItems: items, startSnapshot: currentSnapshot(), guides: [] });
  }

  function beginHandleDrag(event, item, type) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    setSelectedUids([item.uid]);
    setDrag({ type, uid: item.uid, uids: [item.uid], startPoint: svgPointFromEvent(event), startItems: items, startSnapshot: currentSnapshot(), guides: [] });
  }

  function handleCanvasPointerMove(event) {
    const point = svgPointFromEvent(event);
    if (placement) {
      const snapped = snapPoint(point.x, point.y);
      setPlacement((previous) => previous ? { ...previous, x: snapped.x, y: snapped.y, guides: snapped.guides } : previous);
    }
    if (!drag) return;

    if (drag.type === "move") {
      const startItem = drag.startItems.find((item) => item.uid === drag.uid);
      if (!startItem) return;
      let dx = point.x - drag.startPoint.x;
      let dy = point.y - drag.startPoint.y;
      const snapped = drag.uids.length === 1 ? snapPoint(startItem.cx + dx, startItem.cy + dy, drag.uid) : { x: startItem.cx + dx, y: startItem.cy + dy, guides: [] };
      dx = snapped.x - startItem.cx;
      dy = snapped.y - startItem.cy;
      setItems(drag.startItems.map((item) => drag.uids.includes(item.uid) ? { ...item, cx: Math.round(clamp(item.cx + dx, 0, viewBox.width)), cy: Math.round(clamp(item.cy + dy, 0, viewBox.height)) } : item));
      setDrag((previous) => previous ? { ...previous, guides: snapped.guides } : previous);
      return;
    }

    const target = drag.startItems.find((item) => item.uid === drag.uid);
    if (!target) return;
    setItems(drag.startItems.map((item) => {
      if (item.uid !== drag.uid) return item;
      if (drag.type === "glow-x") return { ...item, rx: Math.max(10, Math.round(Math.abs(point.x - item.cx))) };
      if (drag.type === "glow-y") return { ...item, ry: Math.max(10, Math.round(Math.abs(point.y - item.cy))) };
      if (drag.type === "glow-corner") return { ...item, rx: Math.max(10, Math.round(Math.abs(point.x - item.cx))), ry: Math.max(10, Math.round(Math.abs(point.y - item.cy))) };
      if (drag.type === "light-radius") return { ...item, hitR: Math.max(8, Math.round(Math.hypot(point.x - item.cx, point.y - item.cy))) };
      if (drag.type === "resize-card") return { ...item, width: Math.max(30, Math.round(Math.abs(point.x - item.cx) * 2)), height: Math.max(30, Math.round(Math.abs(point.y - item.cy) * 2)) };
      return item;
    }));
  }

  function handleCanvasPointerUp() {
    if (drag?.startSnapshot) {
      setHistory((previous) => ({ past: [...previous.past, drag.startSnapshot].slice(-HISTORY_LIMIT), future: [] }));
    }
    setDrag(null);
  }

  function handleCanvasPointerDown(event) {
    if (placement) {
      event.preventDefault();
      const point = svgPointFromEvent(event);
      const snapped = snapPoint(point.x, point.y);
      if (placement.preset?.duplicateOf) {
        const copy = { ...placement.preset.duplicateOf, cx: Math.round(snapped.x), cy: Math.round(snapped.y) };
        updateItems((previous) => previous.map((item) => item.uid === copy.uid ? copy : item), "Duplicate placed");
        setSelectedUids([copy.uid]);
      } else {
        const item = makePlacedItem(placement.kind, snapped, items, placement.preset);
        updateItems((previous) => [...previous, item], `${KIND_META[placement.kind]?.label || "Entity"} placed`);
        setSelectedUids([item.uid]);
      }
      setPlacement(null);
      return;
    }
    if (!isEditableTarget(event.target)) setSelectedUids([]);
  }

  function handleViewportPointerDown(event) {
    if (canvasMode !== "pan") return;
    panDragRef.current = { x: event.clientX, y: event.clientY, scrollLeft: viewportRef.current?.scrollLeft || 0, scrollTop: viewportRef.current?.scrollTop || 0 };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleViewportPointerMove(event) {
    if (!panDragRef.current || !viewportRef.current) return;
    const dx = event.clientX - panDragRef.current.x;
    const dy = event.clientY - panDragRef.current.y;
    viewportRef.current.scrollLeft = panDragRef.current.scrollLeft - dx;
    viewportRef.current.scrollTop = panDragRef.current.scrollTop - dy;
  }

  function handleViewportPointerUp() {
    panDragRef.current = null;
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      pushToast(`${label} copied to clipboard.`);
    } catch {
      pushToast("Clipboard permission was not available.", "warning", "Use the text area to copy manually.");
    }
  }

  function downloadEditableProject() {
    const payload = {
      __floorplanStudioProject: true,
      version: 2,
      exportedAt: new Date().toISOString(),
      ...currentSnapshot(),
    };
    downloadText("floorplan_studio_project.json", JSON.stringify(payload, null, 2));
    pushToast("Editable project downloaded");
  }

  function downloadAll() {
    downloadText("floorplan_card_generated.yaml", generatedYaml);
    downloadText("floorplan_generated.svg", generatedSvg);
    downloadText("floorplan_generated.css", generatedCss);
    pushToast("Export files downloaded");
  }

  useEffect(() => {
    runSelfTests();
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      const draft = raw ? safeProjectParse(raw) : null;
      if (draft && (draft.items.length || draft.svgText || draft.offPng || draft.onPng)) setAvailableDraft(draft);
    } catch {
      // localStorage can be blocked; ignore.
    }
    autosaveHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!selectedUids.length && items.length) setSelectedUids([items[0].uid]);
    if (selectedUids.some((uid) => !items.some((item) => item.uid === uid))) {
      setSelectedUids(selectedUids.filter((uid) => items.some((item) => item.uid === uid)));
    }
  }, [items, selectedUids]);

  useEffect(() => {
    if (!autosaveHydratedRef.current) return undefined;
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...currentSnapshot(), updatedAt: new Date().toISOString() }));
        setLastSavedAt(new Date());
      } catch {
        // ignore storage quota/private mode errors
      }
    }, 450);
    return () => window.clearTimeout(id);
  }, [svgText, cssText, offPng, onPng, items, settings]);

  useEffect(() => {
    try {
      window.localStorage?.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((value) => value === "dark" ? "light" : "dark");
  }

  useEffect(() => {
    function onKey(event) {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && key === "a") {
        event.preventDefault();
        setSelectedUids(items.map((item) => item.uid));
        return;
      }
      if (event.key === "Escape") {
        setPlacement(null);
        setSelectedUids([]);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedUids.length) {
          event.preventDefault();
          deleteSelected();
        }
        return;
      }
      const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const delta = deltas[event.key];
      if (!delta || !selectedUids.length) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      updateItems((previous) => previous.map((item) => selectedUids.includes(item.uid) ? { ...item, cx: Math.round(clamp(item.cx + delta[0] * step, 0, viewBox.width)), cy: Math.round(clamp(item.cy + delta[1] * step, 0, viewBox.height)) } : item), "Entity moved");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, selectedUids, viewBox.width, viewBox.height, history, selected]);

  const selectedEntityError = selected && selected.entity && !validEntityId(selected.entity) ? "Use domain.entity_name, for example light.kitchen_ceiling." : "";
  const duplicateBase = selected ? items.some((item) => item.uid !== selected.uid && item.base === selected.base) : false;

  return (
    <div data-theme={theme} className="floorplan-studio-theme min-h-screen bg-slate-100 text-slate-950">
      <style>{STUDIO_THEME_CSS}</style>
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm"><Sparkles className="h-5 w-5" /></div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black tracking-tight">Floorplan Studio</div>
              <div className="truncate text-xs text-slate-500">Place Home Assistant entities and export ready-to-use files.</div>
            </div>
          </div>

          <Stepper hasVisual={hasVisual} itemCount={items.length} issues={issues} exportOpened={exportTouched} />

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 lg:block">
              {lastSavedAt ? `Saved locally ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Local autosave on"}
            </div>
            <StudioButton icon={isDarkMode ? Sun : Moon} onClick={toggleTheme} title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>{isDarkMode ? "Light" : "Dark"}</StudioButton>
            <StudioButton icon={Upload} onClick={() => setImportOpen(true)}>Import</StudioButton>
            <StudioButton icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Add entity</StudioButton>
            <StudioButton icon={Undo2} onClick={undo} disabled={!history.past.length}>Undo</StudioButton>
            <StudioButton icon={Redo2} onClick={redo} disabled={!history.future.length}>Redo</StudioButton>
            <StudioButton icon={ShieldCheck} onClick={() => { setExportTouched(true); setExportOpen(true); }} variant={blockingExport ? "secondary" : "success"}>Validate</StudioButton>
            <StudioButton icon={Download} variant="primary" onClick={() => { setExportTouched(true); setExportOpen(true); }}>Export</StudioButton>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-4 p-4 xl:grid-cols-[340px_minmax(620px,1fr)_420px]">
        <aside className="space-y-4 xl:sticky xl:top-[76px] xl:self-start">
          {availableDraft ? (
            <section className="rounded-3xl bg-slate-950 p-4 text-white shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white/10 p-2"><Save className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-black">Local draft found</div>
                  <p className="mt-1 text-sm text-slate-300">Restore your last editable project, or dismiss this prompt.</p>
                  <div className="mt-3 flex gap-2">
                    <StudioButton size="sm" variant="success" onClick={() => { applySnapshot(availableDraft); setSelectedUids(availableDraft.items?.[0]?.uid ? [availableDraft.items[0].uid] : []); setAvailableDraft(null); pushToast("Draft restored"); }}>Restore draft</StudioButton>
                    <StudioButton size="sm" variant="darkGhost" onClick={() => setAvailableDraft(null)}>Dismiss</StudioButton>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionTitle icon={Layers} title="Layers" aside={<span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{items.length}</span>} />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={layerSearch} onChange={(event) => setLayerSearch(event.target.value)} placeholder="Search name, entity ID, or SVG ID" className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["all", "light", "sensor", "camera", "entity"].map((kind) => (
                <button key={kind} type="button" onClick={() => setLayerFilter(kind)} className={classNames("rounded-full px-3 py-1.5 text-xs font-black uppercase transition", layerFilter === kind ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{kind === "all" ? "All" : KIND_META[kind]?.label}</button>
              ))}
            </div>

            {selectedUids.length > 1 ? (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{selectedUids.length} selected</div>
                <div className="flex flex-wrap gap-2">
                  <StudioButton size="sm" onClick={() => alignSelected("left")}>Align left</StudioButton>
                  <StudioButton size="sm" onClick={() => alignSelected("center")}>Center X</StudioButton>
                  <StudioButton size="sm" onClick={() => alignSelected("right")}>Align right</StudioButton>
                  <StudioButton size="sm" onClick={() => alignSelected("top")}>Align top</StudioButton>
                  <StudioButton size="sm" onClick={() => alignSelected("middle")}>Center Y</StudioButton>
                  <StudioButton size="sm" onClick={() => alignSelected("bottom")}>Align bottom</StudioButton>
                  <StudioButton size="sm" onClick={() => distributeSelected("x")}>Distribute X</StudioButton>
                  <StudioButton size="sm" onClick={() => distributeSelected("y")}>Distribute Y</StudioButton>
                </div>
              </div>
            ) : null}

            <div className="mt-4 max-h-[58vh] space-y-4 overflow-auto pr-1">
              {items.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="font-black text-slate-900">No entities yet</div>
                  <p className="mt-1">Add your first light, sensor, camera, or custom entity.</p>
                  <StudioButton className="mt-3" icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Add first entity</StudioButton>
                </div>
              ) : null}

              {Object.entries(groupedItems).map(([kind, group]) => group.length ? (
                <div key={kind}>
                  <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-500">
                    <span>{KIND_META[kind]?.label || kind}s</span>
                    <span>{group.length}</span>
                  </div>
                  <div className="space-y-2">
                    {group.map((item) => {
                      const active = selectedUids.includes(item.uid);
                      const Icon = KIND_META[item.kind]?.icon || Plus;
                      return (
                        <div key={item.uid} className={classNames("rounded-2xl p-2 ring-1 transition", active ? "bg-slate-950 text-white ring-slate-950" : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50")}>
                          <button type="button" onClick={(event) => selectItem(item.uid, event)} className="flex w-full items-center gap-3 text-left">
                            <div className={classNames("grid h-9 w-9 shrink-0 place-items-center rounded-xl", active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700")}><Icon className="h-4 w-4" /></div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-black">{item.name || item.base}</div>
                              <div className={classNames("truncate text-xs", active ? "text-slate-300" : "text-slate-500")}>{item.entity}</div>
                            </div>
                            <KindBadge kind={item.kind} />
                          </button>
                          {active ? (
                            <div className="mt-2 flex gap-2">
                              <StudioButton size="sm" variant="darkGhost" icon={Eye} onClick={() => updateOne(item.uid, { editorHidden: !item.editorHidden }, item.editorHidden ? "Layer shown" : "Layer hidden")}>{item.editorHidden ? "Show" : "Hide"}</StudioButton>
                              <StudioButton size="sm" variant="darkGhost" icon={Copy} onClick={() => { setSelectedUids([item.uid]); duplicateSelected(); }}>Copy</StudioButton>
                              <StudioButton size="sm" variant="danger" icon={Trash2} onClick={() => { setSelectedUids([item.uid]); window.setTimeout(deleteSelected, 0); }}>Delete</StudioButton>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null)}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionTitle icon={Palette} title="Preview states" />
            <div className="grid grid-cols-2 gap-2">
              <StudioButton size="sm" icon={EyeOff} onClick={() => simulateState("all_off")}>All off</StudioButton>
              <StudioButton size="sm" icon={Eye} onClick={() => simulateState("all_on")}>All on</StudioButton>
              <StudioButton size="sm" icon={Play} onClick={() => simulateState("random")}>Randomize</StudioButton>
              <StudioButton size="sm" icon={RotateCcw} onClick={() => simulateState("reset")}>Reset</StudioButton>
              <StudioButton size="sm" className="col-span-2" icon={Wand2} onClick={() => simulateState("open")}>Open doors/windows</StudioButton>
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-3 xl:sticky xl:top-[76px] xl:self-start">
          <section className="overflow-hidden rounded-3xl bg-slate-950 shadow-xl ring-1 ring-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-2">
                <MousePointer2 className="h-4 w-4" />
                <div className="truncate text-sm font-black">Canvas</div>
                <div className="hidden text-xs text-slate-400 md:block">Select, move, resize, preview, and place entities.</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StudioButton size="sm" variant={canvasMode === "select" ? "secondary" : "darkGhost"} icon={MousePointer2} onClick={() => setCanvasMode("select")}>Select</StudioButton>
                <StudioButton size="sm" variant={canvasMode === "pan" ? "secondary" : "darkGhost"} onClick={() => setCanvasMode("pan")}>Pan</StudioButton>
                <StudioButton size="sm" variant="darkGhost" icon={Minus} onClick={() => setZoom((value) => clamp(value - 10, 40, 220))}>Zoom</StudioButton>
                <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white">{zoom}%</div>
                <StudioButton size="sm" variant="darkGhost" icon={Plus} onClick={() => setZoom((value) => clamp(value + 10, 40, 220))}>Zoom</StudioButton>
                <StudioButton size="sm" variant="darkGhost" icon={Maximize2} onClick={() => setZoom(100)}>Fit</StudioButton>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-white/10 bg-slate-900 px-4 py-3">
              <ToggleChip active={gridEnabled} icon={Grid3X3} onClick={() => setGridEnabled(!gridEnabled)}>Grid</ToggleChip>
              <ToggleChip active={snapEnabled} icon={Magnet} onClick={() => setSnapEnabled(!snapEnabled)}>Snap</ToggleChip>
              <ToggleChip active={showLabels} icon={FileCode2} onClick={() => setShowLabels(!showLabels)}>Labels</ToggleChip>
              <ToggleChip active={showMasks} icon={Sparkles} onClick={() => setShowMasks(!showMasks)}>Glow</ToggleChip>
              <ToggleChip active={showControls} icon={MousePointer2} onClick={() => setShowControls(!showControls)}>Controls</ToggleChip>
              <ToggleChip active={showOnPreview} icon={Eye} onClick={() => setShowOnPreview(!showOnPreview)}>On layer</ToggleChip>
              {placement ? <div className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-950">Placement mode: click canvas to place. Esc cancels.</div> : null}
            </div>

            <div
              ref={viewportRef}
              onPointerDown={handleViewportPointerDown}
              onPointerMove={handleViewportPointerMove}
              onPointerUp={handleViewportPointerUp}
              onPointerLeave={handleViewportPointerUp}
              className={classNames("relative max-h-[76vh] overflow-auto bg-slate-950", canvasMode === "pan" ? "cursor-grab active:cursor-grabbing" : "")}
            >
              {!hasVisual && !items.length ? (
                <div className="absolute inset-0 z-10 grid min-h-[560px] place-items-center p-6">
                  <div className="max-w-xl rounded-3xl bg-white p-6 text-center shadow-2xl ring-1 ring-slate-200">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-white"><Sparkles className="h-7 w-7" /></div>
                    <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Build a Home Assistant floorplan</h2>
                    <p className="mt-2 text-sm text-slate-600">Import your SVG/CSS/images, start blank, or load a sample project to see the full workflow.</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <StudioButton icon={Upload} variant="primary" onClick={() => setImportOpen(true)}>Import package</StudioButton>
                      <StudioButton icon={FolderOpen} onClick={startBlank}>Start blank</StudioButton>
                      <StudioButton icon={Play} onClick={loadSample}>Try sample</StudioButton>
                    </div>
                  </div>
                </div>
              ) : null}

              <svg
                ref={svgRef}
                viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
                style={{ width: `${zoom}%`, minWidth: zoom < 100 ? "720px" : undefined }}
                className="mx-auto block h-auto min-h-[560px] touch-none select-none"
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerUp}
                onWheel={(event) => {
                  if (!event.ctrlKey && !event.metaKey) return;
                  event.preventDefault();
                  setZoom((value) => clamp(value + (event.deltaY > 0 ? -8 : 8), 40, 220));
                }}
              >
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

                {previewBase ? <image href={previewBase} x="0" y="0" width={viewBox.width} height={viewBox.height} preserveAspectRatio="xMidYMid slice" /> : backgroundMarkup ? <g dangerouslySetInnerHTML={{ __html: backgroundMarkup }} /> : <rect x="0" y="0" width={viewBox.width} height={viewBox.height} fill="#050912" />}

                {showOnPreview && previewOn ? items.filter((item) => item.kind === "light").map((item) => (
                  <g key={"lit-" + item.uid} opacity={item.previewOn ? 1 : 0.18}>
                    <image href={previewOn} x="0" y="0" width={viewBox.width} height={viewBox.height} preserveAspectRatio="xMidYMid slice" mask={"url(#preview-mask-" + item.uid + ")"} opacity={clamp(item.intensity, 0, 1)} />
                    <rect x="0" y="0" width={viewBox.width} height={viewBox.height} fill={item.lightType === "dimmable_color" ? "rgba(255,170,80,1)" : "rgba(255,201,125,1)"} mask={"url(#preview-mask-" + item.uid + ")"} opacity={clamp(item.tintIntensity, 0, 1)} style={{ mixBlendMode: "color" }} />
                  </g>
                )) : null}

                {gridEnabled && gridSize >= 4 ? (
                  <g opacity="0.16" pointerEvents="none">
                    {gridLines.map((line) => line.x !== undefined ? <line key={line.key} x1={line.x} x2={line.x} y1="0" y2={viewBox.height} stroke="white" strokeWidth="0.6" /> : <line key={line.key} x1="0" x2={viewBox.width} y1={line.y} y2={line.y} stroke="white" strokeWidth="0.6" />)}
                  </g>
                ) : null}

                {showMasks ? items.filter((item) => item.kind === "light" && !item.editorHidden).map((item) => (
                  <ellipse key={"ellipse-" + item.uid} cx={item.cx} cy={item.cy} rx={item.rx} ry={item.ry} fill="rgba(255,190,85,0.08)" stroke={selectedUids.includes(item.uid) ? "rgba(255,236,170,0.95)" : "rgba(255,255,255,0.35)"} strokeWidth={selectedUids.includes(item.uid) ? 3 : 1.3} strokeDasharray="8 8" pointerEvents="none" />
                )) : null}

                {(drag?.guides || placement?.guides || []).map((guide, index) => guide.type === "v" ? <line key={"guide-" + index} x1={guide.x} x2={guide.x} y1="0" y2={viewBox.height} stroke="rgba(99, 210, 255, 0.95)" strokeWidth="3" pointerEvents="none" /> : <line key={"guide-" + index} x1="0" x2={viewBox.width} y1={guide.y} y2={guide.y} stroke="rgba(99, 210, 255, 0.95)" strokeWidth="3" pointerEvents="none" />)}

                {showControls ? items.filter((item) => !item.editorHidden).map((item) => {
                  const selectedNow = selectedUids.includes(item.uid);
                  if (item.kind === "light") {
                    return (
                      <g key={"control-" + item.uid}>
                        <g onPointerDown={(event) => beginItemDrag(event, item, "move")} className="cursor-move">
                          <circle cx={item.cx} cy={item.cy} r={item.hitR} fill={selectedNow ? "rgba(255,210,110,0.30)" : "rgba(255,255,255,0.08)"} stroke={selectedNow ? "rgba(255,236,170,0.95)" : "rgba(230,240,255,0.45)"} strokeWidth={selectedNow ? 4 : 2} />
                          <text x={item.cx} y={item.cy + 5} textAnchor="middle" fontSize="18" fontWeight="800" fill="white" stroke="rgba(0,0,0,0.8)" strokeWidth="4" paintOrder="stroke">{item.lightType === "on_off" ? "ON" : "%"}</text>
                          {showLabels ? <text x={item.cx} y={item.cy + item.hitR + 24} textAnchor="middle" fontSize="16" fontWeight="700" fill="white" stroke="rgba(0,0,0,0.75)" strokeWidth="4" paintOrder="stroke">{item.name}</text> : null}
                        </g>
                        {selectedNow ? (
                          <g>
                            <circle cx={item.cx + item.rx} cy={item.cy} r="12" fill="white" stroke="#0f172a" strokeWidth="4" onPointerDown={(event) => beginHandleDrag(event, item, "glow-x")} className="cursor-ew-resize" />
                            <circle cx={item.cx} cy={item.cy + item.ry} r="12" fill="white" stroke="#0f172a" strokeWidth="4" onPointerDown={(event) => beginHandleDrag(event, item, "glow-y")} className="cursor-ns-resize" />
                            <circle cx={item.cx + item.rx} cy={item.cy + item.ry} r="12" fill="#fde68a" stroke="#0f172a" strokeWidth="4" onPointerDown={(event) => beginHandleDrag(event, item, "glow-corner")} className="cursor-nwse-resize" />
                            <circle cx={item.cx + item.hitR} cy={item.cy} r="9" fill="#bae6fd" stroke="#0f172a" strokeWidth="3" onPointerDown={(event) => beginHandleDrag(event, item, "light-radius")} className="cursor-ew-resize" />
                          </g>
                        ) : null}
                      </g>
                    );
                  }

                  const x = item.cx - item.width / 2;
                  const y = item.cy - item.height / 2;
                  const active = Boolean(item.previewActive);
                  const sensorColor = active ? item.sensorActiveColor || "#FACC15" : item.sensorIdleColor || "#FFFFFF";
                  const tileFill = item.kind === "sensor" ? hexToRgba(sensorColor, selectedNow ? 0.28 : 0.08) : selectedNow ? "rgba(125,190,255,0.30)" : item.kind === "camera" ? "rgba(20,25,40,0.62)" : "rgba(14,22,38,0.56)";
                  const statusText = item.kind === "sensor" ? (item.sensorType === "temperature" ? temperaturePreviewText(item) : active ? item.sensorActiveText || "Open" : item.sensorIdleText || "Closed") : item.kind === "camera" ? "CAM" : item.icon || "Ready";
                  const icon = item.kind === "camera" ? "mdi:cctv" : item.kind === "sensor" ? (item.sensorType === "temperature" ? item.sensorIdleIcon || item.icon || "mdi:thermometer" : active ? item.sensorActiveIcon || item.icon || "mdi:access-point" : item.sensorIdleIcon || item.icon || "mdi:access-point") : item.icon || "mdi:help-circle-outline";
                  return (
                    <g key={"control-" + item.uid}>
                      <g onPointerDown={(event) => beginItemDrag(event, item, "move")} className="cursor-move">
                        <rect x={x} y={y} width={item.width} height={item.height} rx="18" ry="18" fill={tileFill} stroke={item.kind === "sensor" ? sensorColor : selectedNow ? "rgba(248,250,252,0.95)" : "rgba(185,205,255,0.35)"} strokeWidth={selectedNow ? 4 : 2} />
                        <path d={iconPathForType(icon, item.customIconSvg || "")} transform={iconTransform(item.cx, item.cy - 17, 1.65)} fill="currentColor" color={item.kind === "sensor" ? sensorColor : "white"} stroke="none" pointerEvents="none" style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.62))" }} />
                        <text x={item.cx} y={item.cy + 22} textAnchor="middle" fontSize="14" fontWeight="800" fill="white" stroke="rgba(0,0,0,0.82)" strokeWidth="3" paintOrder="stroke">{statusText}</text>
                        {showLabels ? <text x={item.cx} y={item.cy + item.height / 2 + 24} textAnchor="middle" fontSize="15" fontWeight="700" fill="white" stroke="rgba(0,0,0,0.75)" strokeWidth="4" paintOrder="stroke">{item.name}</text> : null}
                      </g>
                      {selectedNow ? <circle cx={item.cx + item.width / 2} cy={item.cy + item.height / 2} r="11" fill="white" stroke="#0f172a" strokeWidth="4" onPointerDown={(event) => beginHandleDrag(event, item, "resize-card")} className="cursor-nwse-resize" /> : null}
                    </g>
                  );
                }) : null}

                {placement ? (
                  <g pointerEvents="none" opacity="0.84">
                    <circle cx={placement.x} cy={placement.y} r="42" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.9)" strokeWidth="3" strokeDasharray="8 8" />
                    <text x={placement.x} y={placement.y + 5} textAnchor="middle" fontSize="16" fontWeight="900" fill="white" stroke="rgba(0,0,0,0.8)" strokeWidth="4" paintOrder="stroke">+ {KIND_META[placement.kind]?.label || "Entity"}</text>
                  </g>
                ) : null}
              </svg>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-slate-900 px-4 py-2 text-xs text-slate-300">
              <div>{selected ? `${selected.name} - x ${formatNumber(selected.cx)} y ${formatNumber(selected.cy)}` : placement ? "Placement mode" : "No selection"}</div>
              <div>ViewBox {formatNumber(viewBox.width)} x {formatNumber(viewBox.height)} - Grid {gridSize}px - Snap {snapEnabled ? "on" : "off"}</div>
            </div>
          </section>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-[76px] xl:self-start">
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionTitle icon={SlidersHorizontal} title="Inspector" aside={<span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{selectedUids.length ? `${selectedUids.length} selected` : `${items.length} entities`}</span>} />

            {selectedItems.length > 1 ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="font-black text-slate-900">Bulk edit</div>
                  <p className="mt-1">Use alignment and distribution tools from Layers, or apply a common visual preset below.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StudioButton size="sm" onClick={() => duplicateSelected()}>Duplicate</StudioButton>
                  <StudioButton size="sm" variant="danger" onClick={deleteSelected}>Delete</StudioButton>
                </div>
              </div>
            ) : selected ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-black">{selected.name || selected.base}</div>
                      <div className="truncate text-xs text-slate-300">{selected.entity}</div>
                    </div>
                    <KindBadge kind={selected.kind} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1">
                  {INSPECTOR_TABS.map((tab) => (
                    <button key={tab} type="button" onClick={() => setInspectorTab(tab)} className={classNames("rounded-xl px-2 py-2 text-xs font-black capitalize transition", inspectorTab === tab ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900")}>{tab}</button>
                  ))}
                </div>

                {inspectorTab === "basic" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <StudioField label="Entity type">
                        <select value={selected.kind} onChange={(event) => changeKind(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200">
                          <option value="light">Light</option>
                          <option value="sensor">Sensor</option>
                          <option value="camera">Camera</option>
                          <option value="entity">Other entity</option>
                        </select>
                      </StudioField>
                      <StudioField label="Display name"><TextInput value={selected.name} onChange={(value) => updateOne(selected.uid, { name: value }, "Name updated")} /></StudioField>
                    </div>
                    <StudioField label="Home Assistant entity ID" help="Used in the generated floorplan rule." error={selectedEntityError}><TextInput value={selected.entity} onChange={changeEntity} placeholder="light.kitchen_ceiling" /></StudioField>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Position and size</div>
                      <div className="grid grid-cols-2 gap-3">
                        <StudioField label="X"><NumberInput value={selected.cx} onChange={(value) => updateOne(selected.uid, { cx: value }, "Position updated")} /></StudioField>
                        <StudioField label="Y"><NumberInput value={selected.cy} onChange={(value) => updateOne(selected.uid, { cy: value }, "Position updated")} /></StudioField>
                        {selected.kind === "light" ? <StudioField label="Click radius"><NumberInput value={selected.hitR} min={5} onChange={(value) => updateOne(selected.uid, { hitR: value }, "Click radius updated")} /></StudioField> : <StudioField label="Width"><NumberInput value={selected.width} min={20} onChange={(value) => updateOne(selected.uid, { width: value }, "Width updated")} /></StudioField>}
                        {selected.kind === "light" ? <StudioField label="Fallback color temp"><NumberInput value={selected.fallbackKelvin} min={1000} max={40000} onChange={(value) => updateOne(selected.uid, { fallbackKelvin: value }, "Fallback color temperature updated")} /></StudioField> : <StudioField label="Height"><NumberInput value={selected.height} min={20} onChange={(value) => updateOne(selected.uid, { height: value }, "Height updated")} /></StudioField>}
                      </div>
                    </div>
                  </div>
                ) : null}

                {inspectorTab === "appearance" ? (
                  <div className="space-y-3">
                    {selected.kind === "light" ? (
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Glow</div>
                        <div className="grid grid-cols-2 gap-3">
                          <StudioField label="Glow width"><NumberInput value={selected.rx} min={1} onChange={(value) => updateOne(selected.uid, { rx: value }, "Glow width updated")} /></StudioField>
                          <StudioField label="Glow height"><NumberInput value={selected.ry} min={1} onChange={(value) => updateOne(selected.uid, { ry: value }, "Glow height updated")} /></StudioField>
                          <StudioField label="Light image opacity"><NumberInput value={selected.intensity} min={0} max={1} step={0.05} onChange={(value) => updateOne(selected.uid, { intensity: value }, "Image opacity updated")} /></StudioField>
                          <StudioField label="Color tint opacity"><NumberInput value={selected.tintIntensity} min={0} max={1} step={0.05} onChange={(value) => updateOne(selected.uid, { tintIntensity: value }, "Tint opacity updated")} /></StudioField>
                        </div>
                      </div>
                    ) : null}

                    {selected.kind === "sensor" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <StudioField label="Inactive icon">
                            <select value={selected.sensorIdleIcon || selected.icon || "mdi:access-point"} onChange={(event) => updateOne(selected.uid, { sensorIdleIcon: event.target.value }, "Sensor icon updated")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500">
                              {SENSOR_ICON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </StudioField>
                          <StudioField label="Active icon">
                            <select value={selected.sensorActiveIcon || selected.icon || "mdi:access-point"} onChange={(event) => updateOne(selected.uid, { sensorActiveIcon: event.target.value }, "Sensor icon updated")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500">
                              {SENSOR_ICON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </StudioField>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <StudioField label="Inactive color">
                            <select value={selected.sensorIdleColor || "#FFFFFF"} onChange={(event) => updateOne(selected.uid, { sensorIdleColor: event.target.value }, "Sensor color updated")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500">
                              {BASIC_COLORS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </StudioField>
                          <StudioField label="Active color">
                            <select value={selected.sensorActiveColor || "#FACC15"} onChange={(event) => updateOne(selected.uid, { sensorActiveColor: event.target.value }, "Sensor color updated")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500">
                              {BASIC_COLORS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </StudioField>
                        </div>
                      </div>
                    ) : selected.kind === "entity" ? (
                      <StudioField label="Icon"><TextInput value={selected.icon} onChange={(value) => updateOne(selected.uid, { icon: value }, "Icon updated")} placeholder="mdi:fan" /></StudioField>
                    ) : null}

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Visual presets</div>
                      <div className="grid grid-cols-2 gap-2">
                        <StudioButton size="sm" onClick={() => applyVisualPreset("minimal")}>Minimal</StudioButton>
                        <StudioButton size="sm" onClick={() => applyVisualPreset("warm")}>Warm</StudioButton>
                        <StudioButton size="sm" onClick={() => applyVisualPreset("contrast")}>High contrast</StudioButton>
                        <StudioButton size="sm" onClick={() => applyVisualPreset("soft")}>Soft glow</StudioButton>
                      </div>
                    </div>
                  </div>
                ) : null}

                {inspectorTab === "behavior" ? (
                  <div className="space-y-3">
                    {selected.kind === "light" ? (
                      <StudioField label="Light behavior">
                        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
                          {[{ label: "On/off", value: "on_off" }, { label: "Dim", value: "dimmable" }, { label: "Color", value: "dimmable_color" }].map((option) => (
                            <button key={option.value} type="button" onClick={() => updateOne(selected.uid, { lightType: option.value }, "Light behavior updated")} className={classNames("rounded-xl px-2 py-2 text-xs font-black", selected.lightType === option.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500")}>{option.label}</button>
                          ))}
                        </div>
                      </StudioField>
                    ) : null}

                    {selected.kind === "sensor" ? (
                      <div className="space-y-3">
                        <StudioField label="Sensor preset">
                          <select value={selected.sensorType || "other"} onChange={(event) => {
                            const sensorType = event.target.value;
                            const defaults = sensorDefaultsForType(sensorType);
                            const nextEntity = shouldRetargetSensorEntity(selected) ? defaultEntityForSensorType(sensorType, selected.base) : selected.entity;
                            updateOne(selected.uid, { sensorType, entity: nextEntity, icon: defaults.icon, sensorIdleIcon: defaults.idleIcon, sensorActiveIcon: defaults.activeIcon, sensorTriggeredValue: defaults.trigger, sensorIdleText: defaults.idleText, sensorActiveText: defaults.activeText, previewTemperature: sensorType === "temperature" ? selected.previewTemperature ?? 72 : selected.previewTemperature }, "Sensor preset applied");
                          }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500">
                            {SENSOR_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </StudioField>
                        {selected.sensorType === "temperature" ? (
                          <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                            <div className="font-black text-slate-900">Live temperature display</div>
                            <p className="mt-1">Generated YAML displays the Home Assistant sensor state and uses <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">entity.attributes.unit_of_measurement</code>. Use the unit override below only if you want to force °F or °C.</p>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <StudioField label="Preview temperature"><NumberInput value={selected.previewTemperature ?? 72} step={0.1} onChange={(value) => updateOne(selected.uid, { previewTemperature: value }, "Preview temperature updated")} /></StudioField>
                              <StudioField label="Unit override"><TextInput value={selected.unit || ""} onChange={(value) => updateOne(selected.uid, { unit: value }, "Unit updated")} placeholder="Blank, °F, or °C" /></StudioField>
                            </div>
                          </div>
                        ) : (
                          <>
                            <StudioField label="Active when state equals" help="This value is compared to the Home Assistant entity state.">
                              <input list="trigger-values" value={selected.sensorTriggeredValue || ""} onChange={(event) => updateOne(selected.uid, { sensorTriggeredValue: event.target.value }, "Sensor active state updated")} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-500" />
                              <datalist id="trigger-values">{TRIGGER_VALUE_OPTIONS.map((value) => <option key={value} value={value} />)}</datalist>
                            </StudioField>
                            <div className="grid grid-cols-2 gap-3">
                              <StudioField label="Inactive label"><TextInput value={selected.sensorIdleText || ""} onChange={(value) => updateOne(selected.uid, { sensorIdleText: value }, "Sensor label updated")} /></StudioField>
                              <StudioField label="Active label"><TextInput value={selected.sensorActiveText || ""} onChange={(value) => updateOne(selected.uid, { sensorActiveText: value }, "Sensor label updated")} /></StudioField>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}

                    {!(selected.kind === "sensor" && selected.sensorType === "temperature") ? <StudioField label="Display unit"><TextInput value={selected.unit || ""} onChange={(value) => updateOne(selected.uid, { unit: value }, "Unit updated")} placeholder="%, °F, °C, lux" /></StudioField> : null}
                    <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                      <div className="font-black text-slate-900">Tap behavior</div>
                      <p className="mt-1">Export currently uses Home Assistant more-info for tap actions. Extend the generator if you need custom services or navigation.</p>
                    </div>
                  </div>
                ) : null}

                {inspectorTab === "advanced" ? (
                  <div className="space-y-3">
                    <StudioField label="Generated SVG ID" help="Advanced: used to create SVG element IDs." error={duplicateBase ? "Another entity already uses this SVG ID." : ""}>
                      <TextInput value={selected.base} onChange={(value) => { const base = slugFromEntity(value); updateOne(selected.uid, { base, maskId: "mask-" + hyphenate(base) }, "Generated SVG ID updated"); }} />
                    </StudioField>
                    <StudioField label="Mask ID"><TextInput value={selected.maskId || getMaskId(selected)} onChange={(value) => updateOne(selected.uid, { maskId: value }, "Mask ID updated")} /></StudioField>
                    <StudioField label="Custom icon SVG/path" help="Paste an SVG path d value or a small SVG containing one path."><TextAreaInput value={selected.customIconSvg || ""} onChange={(value) => updateOne(selected.uid, { customIconSvg: value }, "Custom icon updated")} /></StudioField>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <StudioButton icon={Copy} onClick={() => duplicateSelected()}>Duplicate</StudioButton>
                      <StudioButton variant="danger" icon={Trash2} onClick={deleteSelected}>Delete</StudioButton>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="font-black text-slate-900">Nothing selected</div>
                <p className="mt-1">Select an entity on the floorplan or choose one from Layers.</p>
                <StudioButton className="mt-3" icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>Add entity</StudioButton>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionTitle icon={ShieldCheck} title="Export readiness" aside={<span className={classNames("rounded-full px-2 py-1 text-xs font-black", blockingExport ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800")}>{blockingExport ? "Fix errors" : "Ready"}</span>} />
            <IssueList issues={issues.slice(0, 4)} onSelect={setSelectedUid} />
            {issues.length > 4 ? <button type="button" onClick={() => setExportOpen(true)} className="mt-2 text-xs font-black text-slate-900 underline underline-offset-4">View all {issues.length} checks</button> : null}
          </section>

          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionTitle icon={Settings2} title="Project" />
            <div className="grid grid-cols-2 gap-2">
              <StudioButton size="sm" icon={Save} onClick={downloadEditableProject}>Save project</StudioButton>
              <StudioButton size="sm" icon={Settings2} onClick={() => setSettingsOpen(true)}>Paths</StudioButton>
              <StudioButton size="sm" icon={Keyboard} onClick={() => setShortcutsOpen(true)}>Shortcuts</StudioButton>
              <StudioButton size="sm" icon={Download} onClick={() => setExportOpen(true)}>Output</StudioButton>
            </div>
          </section>
        </aside>
      </div>

      {addOpen ? (
        <ModalShell
          title="Add entity"
          description="Choose an entity type, then click the floorplan to place it."
          icon={Plus}
          onClose={() => setAddOpen(false)}
          wide
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button type="button" onClick={() => startPlacement("light", { lightType: "dimmable_color" })} className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-900"><Zap className="h-6 w-6" /></div>
              <div className="font-black">Light</div>
              <p className="mt-1 text-sm text-slate-600">Control on/off, brightness, color tint, and glow mask.</p>
            </button>
            <button type="button" onClick={() => startPlacement("camera")} className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-900"><Camera className="h-6 w-6" /></div>
              <div className="font-black">Camera</div>
              <p className="mt-1 text-sm text-slate-600">Add a camera marker with a more-info tap action.</p>
            </button>
            <button type="button" onClick={() => startPlacement("entity")} className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-900"><Plus className="h-6 w-6" /></div>
              <div className="font-black">Other entity</div>
              <p className="mt-1 text-sm text-slate-600">Switches, locks, covers, fans, or custom Home Assistant entities.</p>
            </button>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-sky-900"><Radio className="h-6 w-6" /></div>
              <div className="font-black">Sensor presets</div>
              <div className="mt-3 space-y-2">
                {SENSOR_PRESETS.map((preset) => (
                  <button key={preset.sensorType} type="button" onClick={() => startPlacement("sensor", { sensorType: preset.sensorType })} className="w-full rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:bg-slate-950 hover:text-white">
                    <div className="text-sm font-black">{preset.title}</div>
                    <div className="text-xs opacity-70">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {importOpen ? (
        <ModalShell
          title="Import floorplan package"
          description="Drop SVG, CSS, images, or an editable project JSON. Review the mapping before replacing your current project."
          icon={Upload}
          onClose={() => { setImportOpen(false); setPendingImport(null); }}
          wide
          footer={pendingImport ? <>
            <StudioButton onClick={() => { setImportOpen(false); setPendingImport(null); }}>Cancel</StudioButton>
            <StudioButton variant="primary" onClick={confirmImport}>Continue</StudioButton>
          </> : null}
        >
          {!pendingImport ? (
            <div className="space-y-4">
              <MultiFileDrop onFiles={prepareImport} />
              <div className="grid gap-3 md:grid-cols-3">
                <button type="button" onClick={startBlank} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 hover:bg-slate-100"><FolderOpen className="mb-3 h-6 w-6" /><div className="font-black">Start blank</div><p className="mt-1 text-sm text-slate-600">Create an empty 1600 x 900 floorplan.</p></button>
                <button type="button" onClick={loadSample} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 hover:bg-slate-100"><Play className="mb-3 h-6 w-6" /><div className="font-black">Try sample</div><p className="mt-1 text-sm text-slate-600">Load a working demo with light, sensor, camera, and fan.</p></button>
                <button type="button" onClick={downloadEditableProject} className="rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 hover:bg-slate-100"><Save className="mb-3 h-6 w-6" /><div className="font-black">Save current project</div><p className="mt-1 text-sm text-slate-600">Download an editable JSON backup.</p></button>
              </div>
            </div>
          ) : pendingImport.mode === "project" ? (
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-black text-slate-900">Editable project detected</div>
              <p className="mt-1 text-sm text-slate-600">{pendingImport.fileName} contains {pendingImport.project.items.length} entities. Continuing will replace the current editor state.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="text-xs font-black uppercase text-slate-500">SVG</div><div className="mt-1 text-sm font-bold">{pendingImport.svgText ? "Detected" : "Missing"}</div></div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="text-xs font-black uppercase text-slate-500">CSS</div><div className="mt-1 text-sm font-bold">{pendingImport.cssText ? "Detected" : "Starter CSS"}</div></div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="text-xs font-black uppercase text-slate-500">Images</div><div className="mt-1 text-sm font-bold">{pendingImport.images.length}</div></div>
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><div className="text-xs font-black uppercase text-slate-500">Entities</div><div className="mt-1 text-sm font-bold">{pendingImport.parsed.length}</div></div>
              </div>

              {items.length ? (
                <label className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
                  <input type="checkbox" checked={pendingImport.keepExisting} onChange={(event) => setPendingImport((previous) => ({ ...previous, keepExisting: event.target.checked }))} />
                  Keep existing entities and append imported entities
                </label>
              ) : null}

              {pendingImport.images.length ? (
                <div>
                  <div className="mb-2 text-sm font-black text-slate-900">Map image layers</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {pendingImport.images.map((image) => (
                      <div key={image.id} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                        <img src={image.data} alt={image.name} className="h-32 w-full rounded-xl object-cover ring-1 ring-slate-200" />
                        <div className="mt-2 truncate text-sm font-bold">{image.name}</div>
                        <select value={image.role} onChange={(event) => setPendingImageRole(image.id, event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500">
                          <option value="off">Lights-off image</option>
                          <option value="on">Lights-on image</option>
                          <option value="extra">Do not use in preview</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!pendingImport.parsed.length ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="font-black text-slate-900">No editable entities detected</div>
                  <p className="mt-1">You can still import the visual package and add entities manually.</p>
                </div>
              ) : null}
            </div>
          )}
        </ModalShell>
      ) : null}

      {exportOpen ? (
        <ModalShell
          title="Export floorplan"
          description="Validate the project, copy generated code, or download the Home Assistant files."
          icon={Download}
          onClose={() => setExportOpen(false)}
          wide
          footer={<>
            <StudioButton icon={Save} onClick={downloadEditableProject}>Save editable project</StudioButton>
            <StudioButton icon={Copy} onClick={() => copyText(activeOutput, outputTab.toUpperCase())}>Copy {outputTab.toUpperCase()}</StudioButton>
            <StudioButton icon={Download} onClick={() => downloadText(activeFilename, activeOutput)}>Download {outputTab.toUpperCase()}</StudioButton>
            <StudioButton icon={Download} variant="primary" disabled={blockingExport} onClick={downloadAll}>Download package</StudioButton>
          </>}
        >
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <div className="space-y-4">
              <IssueList issues={issues} onSelect={(uid) => { setSelectedUid(uid); setExportOpen(false); }} />
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                <div className="font-black text-slate-900">Expected paths</div>
                <dl className="mt-2 space-y-1 font-mono text-xs">
                  <div><dt className="inline font-bold">SVG: </dt><dd className="inline">{settings.svgPath}</dd></div>
                  <div><dt className="inline font-bold">CSS: </dt><dd className="inline">{settings.cssPath}</dd></div>
                  <div><dt className="inline font-bold">Off: </dt><dd className="inline">{settings.offHref}</dd></div>
                  <div><dt className="inline font-bold">On: </dt><dd className="inline">{settings.onHref}</dd></div>
                </dl>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                <div className="font-black text-slate-900">Install in Home Assistant</div>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>Save SVG and CSS to your floorplan folder.</li>
                  <li>Save lights-on and lights-off images to the same folder.</li>
                  <li>Add the generated YAML to your dashboard card.</li>
                  <li>Refresh Home Assistant after deployment.</li>
                </ol>
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                {OUTPUT_TABS.map((tab) => <StudioButton key={tab} active={String(outputTab === tab)} variant={outputTab === tab ? "primary" : "secondary"} onClick={() => setOutputTab(tab)}>{tab.toUpperCase()}</StudioButton>)}
              </div>
              <textarea readOnly value={activeOutput} className="h-[560px] w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-100 outline-none" />
            </div>
          </div>
        </ModalShell>
      ) : null}

      {settingsOpen ? (
        <ModalShell
          title="Home Assistant paths"
          description="These paths are written into the generated YAML and SVG."
          icon={Settings2}
          onClose={() => setSettingsOpen(false)}
          footer={<StudioButton variant="primary" onClick={() => setSettingsOpen(false)}>Done</StudioButton>}
        >
          <div className="space-y-3">
            <StudioField label="SVG path"><TextInput value={settings.svgPath} onChange={(value) => updateSettings({ svgPath: value }, "SVG path updated")} /></StudioField>
            <StudioField label="CSS path"><TextInput value={settings.cssPath} onChange={(value) => updateSettings({ cssPath: value }, "CSS path updated")} /></StudioField>
            <StudioField label="Off image href"><TextInput value={settings.offHref} onChange={(value) => updateSettings({ offHref: value }, "Off image path updated")} /></StudioField>
            <StudioField label="On image href"><TextInput value={settings.onHref} onChange={(value) => updateSettings({ onHref: value }, "On image path updated")} /></StudioField>
            <StudioField label="Image resource prefix"><TextInput value={settings.imageResourcePrefix} onChange={(value) => updateSettings({ imageResourcePrefix: value }, "Image prefix updated")} /></StudioField>
          </div>
        </ModalShell>
      ) : null}

      {shortcutsOpen ? (
        <ModalShell title="Keyboard shortcuts" icon={Keyboard} onClose={() => setShortcutsOpen(false)} footer={<StudioButton variant="primary" onClick={() => setShortcutsOpen(false)}>Done</StudioButton>}>
          <div className="grid gap-2 text-sm">
            {[
              ["Arrow keys", "Nudge selected entity"],
              ["Shift + Arrow", "Nudge by 10px"],
              ["Cmd/Ctrl + D", "Duplicate selection"],
              ["Delete / Backspace", "Delete selection"],
              ["Cmd/Ctrl + Z", "Undo"],
              ["Cmd/Ctrl + Shift + Z", "Redo"],
              ["Cmd/Ctrl + A", "Select all"],
              ["Esc", "Cancel placement or clear selection"],
              ["Cmd/Ctrl + wheel", "Zoom canvas"],
            ].map(([keys, action]) => (
              <div key={keys} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <kbd className="rounded-lg bg-white px-2 py-1 font-mono text-xs font-black text-slate-900 ring-1 ring-slate-200">{keys}</kbd>
                <span className="text-slate-600">{action}</span>
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
