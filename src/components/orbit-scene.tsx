import { useEffect, useRef, useState, type RefObject } from "react";
import type { BufferGeometry, Material, Object3D, WebGLRenderer } from "three";
import type { WorldLandPolygon } from "@/lib/world-geodata";

type Three = typeof import("three");
type SceneState = "idle" | "loading" | "ready" | "failed";
type Point = readonly [number, number];
type Pose = {
  at: number;
  earth: readonly [number, number, number];
  earthScale: number;
  camera: readonly [number, number, number];
  satellite: readonly [number, number, number];
  satelliteScale: number;
};

const POSES: readonly Pose[] = [
  {
    at: 0,
    earth: [-1.8, -3.8, -2.7],
    earthScale: 1.65,
    camera: [0, 0.15, 11.5],
    satellite: [2.45, 0.55, 1.1],
    satelliteScale: 1.05,
  },
  {
    at: 0.13,
    earth: [4.2, -0.1, -0.5],
    earthScale: 1.73,
    camera: [0, 0.05, 11.1],
    satellite: [5.5, 1.75, -2.8],
    satelliteScale: 0.34,
  },
  {
    at: 0.28,
    earth: [3.25, -0.15, -0.4],
    earthScale: 1.48,
    camera: [0, 0, 11.4],
    satellite: [8, 2.5, -6],
    satelliteScale: 0,
  },
  {
    at: 0.44,
    earth: [0, 0, 0],
    earthScale: 1.2,
    camera: [0.15, 0.12, 11.3],
    satellite: [8, 3, -6],
    satelliteScale: 0,
  },
  {
    at: 0.6,
    earth: [0, 0.05, 0],
    earthScale: 1.15,
    camera: [-0.12, 0.05, 11.8],
    satellite: [8, 3, -6],
    satelliteScale: 0,
  },
  {
    at: 0.79,
    earth: [0, 0, -0.5],
    earthScale: 0.72,
    camera: [0, 0, 13],
    satellite: [8, 3, -6],
    satelliteScale: 0,
  },
  {
    at: 1,
    earth: [0, -0.1, -0.8],
    earthScale: 0.62,
    camera: [0, 0, 13.4],
    satellite: [8, 3, -6],
    satelliteScale: 0,
  },
];

// The first eight chapters retain the satellite and whole-globe camera path.
// The last two use the same scrubbed playhead for the geographic handoff.
const GLOBE_STORY_END = 0.76;
const THAILAND = { lon: 101, lat: 15.5 };

function phase(progress: number, start: number, end: number) {
  const value = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return value * value * (3 - 2 * value);
}

function random(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function inside(lon: number, lat: number, polygon: readonly Point[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a[1] > lat !== b[1] > lat && lon < ((b[0] - a[0]) * (lat - a[1])) / (b[1] - a[1]) + a[0])
      result = !result;
  }
  return result;
}

function onLand(lon: number, lat: number, land: readonly WorldLandPolygon[]) {
  return land.some(({ bounds: [west, south, east, north], rings }) => {
    if (lon < west || lon > east || lat < south || lat > north) return false;
    // Even/odd rings retain lakes and other holes from the original shapefile.
    let result = false;
    for (const ring of rings) if (inside(lon, lat, ring)) result = !result;
    return result;
  });
}

function globePoint(three: Three, lon: number, lat: number, radius: number) {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;
  return new three.Vector3(
    radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.cos(theta),
  );
}

function createEarth(three: Three, mobile: boolean, land: readonly WorldLandPolygon[]) {
  const frame = new three.Group();
  const globe = new three.Group();
  frame.add(globe);
  const radius = 2.4;
  const sphere = new three.SphereGeometry(radius, mobile ? 48 : 64, mobile ? 32 : 48);
  const sphereMaterial = new three.MeshPhongMaterial({
    color: 0x020812,
    specular: 0x0b4166,
    shininess: 16,
    transparent: true,
  });
  globe.add(new three.Mesh(sphere, sphereMaterial));

  const points: number[] = [];
  const colors: number[] = [];
  const details: number[] = [];
  const rand = random(4739);
  const count = mobile ? 15000 : 27000;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lon = (((i * golden * 180) / Math.PI + 180) % 360) - 180;
    if (!onLand(lon, lat, land)) continue;
    const point = globePoint(three, lon, lat, radius + 0.018);
    points.push(point.x, point.y, point.z);
    const light = 0.4 + rand() * 0.6;
    colors.push(0.27 * light, 0.42 * light, 0.55 * light);
    details.push(0);
  }
  // A slightly clearer dotted coastline keeps the quiet land field legible.
  // It shares the same draw call and shader as the rest of the continents.
  for (const { rings } of land)
    for (const polygon of rings) {
      polygon.forEach((from, i) => {
        const to = polygon[(i + 1) % polygon.length]!;
        const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 1.4));
        for (let step = 0; step < steps; step++) {
          const mix = step / steps;
          const point = globePoint(
            three,
            from[0] + (to[0] - from[0]) * mix,
            from[1] + (to[1] - from[1]) * mix,
            radius + 0.02,
          );
          points.push(point.x, point.y, point.z);
          colors.push(0.33, 0.47, 0.58);
          details.push(0);
        }
      });
    }
  // A small regional level of detail appears only during the close approach.
  // It uses the same real land mask, muted palette and single point draw call.
  const detailStep = mobile ? 0.4 : 0.3;
  for (let lat = 3; lat <= 23; lat += detailStep) {
    for (let lon = 93; lon <= 109; lon += detailStep) {
      if (!onLand(lon, lat, land)) continue;
      const point = globePoint(three, lon, lat, radius + 0.018);
      points.push(point.x, point.y, point.z);
      const light = 0.4 + rand() * 0.6;
      colors.push(0.27 * light, 0.42 * light, 0.55 * light);
      details.push(1);
    }
  }
  const geometry = new three.BufferGeometry();
  geometry.setAttribute("position", new three.Float32BufferAttribute(points, 3));
  geometry.setAttribute("pointColor", new three.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("pointDetail", new three.Float32BufferAttribute(details, 1));
  const landMaterial = new three.ShaderMaterial({
    uniforms: {
      pointSize: { value: mobile ? 0.055 : 0.065 },
      fadeOpacity: { value: 1 },
      detailOpacity: { value: 0 },
    },
    vertexShader: `attribute vec3 pointColor;attribute float pointDetail;varying vec3 vColor;varying float vDetail;uniform float pointSize;
      void main(){vColor=pointColor;vDetail=pointDetail;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=clamp(pointSize*(300.0/-mv.z),0.8,3.2);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vColor;varying float vDetail;uniform float fadeOpacity;uniform float detailOpacity;
      void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;float a=1.0-smoothstep(0.12,0.5,d);gl_FragColor=vec4(vColor,a*0.9*fadeOpacity*mix(1.0,detailOpacity,vDetail));}`,
    transparent: true,
    depthWrite: false,
    blending: three.AdditiveBlending,
  });
  const continents = new three.Points(geometry, landMaterial);
  continents.renderOrder = 1;
  globe.add(continents);

  const gridMaterial = new three.LineBasicMaterial({
    color: 0x246db2,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  for (const lat of [-60, -30, 0, 30, 60]) {
    const vertices = Array.from({ length: 128 }, (_, i) =>
      globePoint(three, (i / 128) * 360, lat, radius + 0.008),
    );
    globe.add(new three.LineLoop(new three.BufferGeometry().setFromPoints(vertices), gridMaterial));
  }
  for (let lon = 0; lon < 180; lon += 30) {
    const vertices = Array.from({ length: 128 }, (_, i) => {
      const angle = (i / 128) * Math.PI * 2;
      return new three.Vector3(
        (radius + 0.008) * Math.cos(angle) * Math.sin((lon * Math.PI) / 180),
        (radius + 0.008) * Math.sin(angle),
        (radius + 0.008) * Math.cos(angle) * Math.cos((lon * Math.PI) / 180),
      );
    });
    globe.add(new three.LineLoop(new three.BufferGeometry().setFromPoints(vertices), gridMaterial));
  }

  const atmosphere = new three.ShaderMaterial({
    uniforms: { fadeOpacity: { value: 1 } },
    vertexShader: `varying vec3 vNormal;varying vec3 vView;
      void main(){vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.0);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vNormal;varying vec3 vView;uniform float fadeOpacity;
      void main(){float rim=pow(1.0-max(dot(normalize(vNormal),normalize(vView)),0.0),3.5);gl_FragColor=vec4(0.03,0.37,0.78,rim*0.68*fadeOpacity);}`,
    transparent: true,
    depthWrite: false,
    blending: three.AdditiveBlending,
  });
  const glow = new three.Mesh(
    new three.SphereGeometry(radius * 1.018, mobile ? 48 : 64, 40),
    atmosphere,
  );
  glow.renderOrder = 2;
  frame.add(glow);

  const orbitMaterial = new three.LineBasicMaterial({
    color: 0x237ed2,
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
  });
  for (const [r, x, z] of [
    [3.05, 1.16, 0.24],
    [3.35, 1.04, -0.35],
  ]) {
    const vertices = Array.from(
      { length: 160 },
      (_, i) =>
        new three.Vector3(
          Math.cos((i / 160) * Math.PI * 2) * r!,
          Math.sin((i / 160) * Math.PI * 2) * r!,
          0,
        ),
    );
    const orbit = new three.LineLoop(
      new three.BufferGeometry().setFromPoints(vertices),
      orbitMaterial,
    );
    orbit.rotation.set(x!, 0.05, z!);
    frame.add(orbit);
  }
  return {
    frame,
    globe,
    setFade: (opacity: number, focus: number) => {
      frame.visible = opacity > 0.001;
      sphereMaterial.opacity = opacity;
      landMaterial.uniforms["fadeOpacity"]!.value = opacity;
      landMaterial.uniforms["detailOpacity"]!.value = focus;
      atmosphere.uniforms["fadeOpacity"]!.value = opacity;
      gridMaterial.opacity = 0.12 * opacity * (1 - focus * 0.7);
      orbitMaterial.opacity = 0.17 * opacity * (1 - focus);
    },
  };
}

function createSatellite(three: Three) {
  const satellite = new three.Group();
  const aluminum = new three.MeshStandardMaterial({
    color: 0x31475a,
    metalness: 0.8,
    roughness: 0.45,
  });
  const darkMetal = new three.MeshStandardMaterial({
    color: 0x162635,
    metalness: 0.76,
    roughness: 0.4,
  });
  const gold = new three.MeshStandardMaterial({ color: 0x544e3c, metalness: 0.7, roughness: 0.45 });
  const body = new three.Mesh(new three.BoxGeometry(0.72, 0.78, 0.95), aluminum);
  satellite.add(body);
  const face = new three.Mesh(new three.BoxGeometry(0.6, 0.66, 0.025), darkMetal);
  face.position.z = 0.49;
  satellite.add(face);
  const edges = new three.LineSegments(
    new three.EdgesGeometry(body.geometry),
    new three.LineBasicMaterial({ color: 0x6b9cb4, transparent: true, opacity: 0.58 }),
  );
  satellite.add(edges);
  const cornerGeometry = new three.BoxGeometry(0.045, 0.81, 0.05);
  for (const x of [-0.35, 0.35]) {
    for (const z of [-0.45, 0.45]) {
      const corner = new three.Mesh(cornerGeometry, gold);
      corner.position.set(x, 0, z);
      satellite.add(corner);
    }
  }

  const panelGeometry = new three.BoxGeometry(1.8, 0.92, 0.018);
  const panelMaterial = new three.MeshStandardMaterial({
    color: 0x061c36,
    metalness: 0.5,
    roughness: 0.45,
    side: three.DoubleSide,
  });
  const cellGeometry = new three.BoxGeometry(0.106, 0.125, 0.005);
  const cellMaterial = new three.MeshStandardMaterial({
    color: 0x08233c,
    emissive: 0x00040b,
    metalness: 0.55,
    roughness: 0.5,
  });
  const cells = new three.InstancedMesh(cellGeometry, cellMaterial, 168);
  const matrix = new three.Matrix4();
  let cell = 0;
  for (const side of [-1, 1]) {
    const panel = new three.Mesh(panelGeometry, panelMaterial);
    panel.position.x = side * 1.4;
    satellite.add(panel);
    const frame = new three.LineSegments(
      new three.EdgesGeometry(panelGeometry),
      new three.LineBasicMaterial({ color: 0x58a1c1, transparent: true, opacity: 0.52 }),
    );
    frame.position.copy(panel.position);
    satellite.add(frame);
    const arm = new three.Mesh(new three.BoxGeometry(0.55, 0.055, 0.06), aluminum);
    arm.position.set(side * 0.63, 0, -0.02);
    satellite.add(arm);
    for (let row = 0; row < 6; row++) {
      for (let column = 0; column < 14; column++) {
        matrix.makeTranslation(side * 1.4 + (column - 6.5) * 0.123, (row - 2.5) * 0.144, 0.013);
        cells.setMatrixAt(cell++, matrix);
      }
    }
  }
  satellite.add(cells);

  const barrelGeometry = new three.CylinderGeometry(0.17, 0.2, 0.72, 28);
  const lens = new three.Mesh(barrelGeometry, darkMetal);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.06, 0.78);
  satellite.add(lens);
  const barrelEdges = new three.LineSegments(
    new three.EdgesGeometry(barrelGeometry),
    new three.LineBasicMaterial({ color: 0x5098b6, transparent: true, opacity: 0.55 }),
  );
  barrelEdges.rotation.copy(lens.rotation);
  barrelEdges.position.copy(lens.position);
  satellite.add(barrelEdges);
  const ringGeometry = new three.TorusGeometry(0.18, 0.005, 6, 32);
  const ringMaterial = new three.MeshBasicMaterial({
    color: 0x4787a2,
    transparent: true,
    opacity: 0.68,
  });
  for (const z of [0.58, 0.82, 1.14]) {
    const ring = new three.Mesh(ringGeometry, ringMaterial);
    ring.position.set(0, 0.06, z);
    satellite.add(ring);
  }
  const glass = new three.Mesh(
    new three.CircleGeometry(0.126, 28),
    new three.MeshStandardMaterial({
      color: 0x091e30,
      emissive: 0x01060e,
      metalness: 0.8,
      roughness: 0.12,
    }),
  );
  glass.position.set(0, 0.06, 1.145);
  satellite.add(glass);
  const aperture = new three.Mesh(
    new three.CircleGeometry(0.061, 24),
    new three.MeshBasicMaterial({ color: 0x041323 }),
  );
  aperture.position.set(0, 0.06, 1.148);
  satellite.add(aperture);
  const mast = new three.Mesh(new three.CylinderGeometry(0.012, 0.018, 0.8, 8), aluminum);
  mast.position.set(0.18, 0.82, -0.15);
  satellite.add(mast);
  const antennaMaterial = new three.LineBasicMaterial({
    color: 0x8fa9bd,
    transparent: true,
    opacity: 0.9,
  });
  for (const side of [-1, 1]) {
    satellite.add(
      new three.Line(
        new three.BufferGeometry().setFromPoints([
          new three.Vector3(side * 0.31, 0.33, -0.2),
          new three.Vector3(side * 0.65, 1.28, -0.32),
        ]),
        antennaMaterial,
      ),
    );
  }
  return satellite;
}

function createStars(three: Three, mobile: boolean) {
  const stars = new three.Group();
  const rand = random(8147);
  for (let layer = 0; layer < 2; layer++) {
    const positions: number[] = [];
    const count = layer === 0 ? (mobile ? 130 : 220) : 24;
    for (let i = 0; i < count; i++)
      positions.push((rand() - 0.5) * 95, (rand() - 0.5) * 65, -16 - rand() * 45);
    const geometry = new three.BufferGeometry();
    geometry.setAttribute("position", new three.Float32BufferAttribute(positions, 3));
    stars.add(
      new three.Points(
        geometry,
        new three.PointsMaterial({
          color: layer === 0 ? 0x8da7bd : 0xcde7ff,
          size: layer === 0 ? 0.045 : 0.075,
          transparent: true,
          opacity: layer === 0 ? 0.58 : 0.78,
          depthWrite: false,
        }),
      ),
    );
  }
  return stars;
}

function disposeScene(scene: Object3D, renderer: WebGLRenderer) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  scene.traverse((object) => {
    const drawable = object as Object3D & {
      geometry?: BufferGeometry;
      material?: Material | Material[];
    };
    if (drawable.geometry) geometries.add(drawable.geometry);
    if (drawable.material)
      for (const material of Array.isArray(drawable.material)
        ? drawable.material
        : [drawable.material])
        materials.add(material);
    const instanced = object as Object3D & { isInstancedMesh?: boolean; dispose?: () => void };
    if (instanced.isInstancedMesh) instanced.dispose?.();
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  renderer.renderLists.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
}

/** Scroll-scrubbed original 3D artwork. The host always owns the static fallback. */
export function OrbitScene({
  progressRef,
  disabled,
  onReady,
}: {
  progressRef: RefObject<number>;
  disabled: boolean;
  onReady?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);
  const [state, setState] = useState<SceneState>("idle");
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || disabled) return;
    let disposed = false;
    let teardown = () => {};
    setState("loading");

    void Promise.all([import("three"), import("@/lib/world-geodata")])
      .then(([three, { WORLD_LAND }]) => {
        if (disposed) return;
        let renderer: WebGLRenderer | undefined;
        const scene = new three.Scene();
        try {
          const mobile = window.matchMedia("(max-width: 767px)").matches;
          const camera = new three.PerspectiveCamera(mobile ? 48 : 42, 1, 0.1, 110);
          renderer = new three.WebGLRenderer({
            alpha: true,
            antialias: !mobile,
            powerPreference: "high-performance",
          });
          const activeRenderer = renderer;
          renderer.setClearColor(0x000000, 0);
          renderer.outputColorSpace = three.SRGBColorSpace;
          renderer.toneMapping = three.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.18;
          const canvas = renderer.domElement;
          canvas.setAttribute("aria-hidden", "true");
          canvas.setAttribute("tabindex", "-1");
          host.appendChild(canvas);
          scene.add(createStars(three, mobile));
          const { frame: earth, globe, setFade } = createEarth(three, mobile, WORLD_LAND);
          const satellite = createSatellite(three);
          scene.add(earth, satellite);
          scene.add(new three.AmbientLight(0x7eafd9, 0.62));
          const key = new three.DirectionalLight(0xd8ecff, 4.4);
          key.position.set(-4, 5, 8);
          scene.add(key);
          const blue = new three.DirectionalLight(0x156bde, 2.3);
          blue.position.set(5, -1, 2);
          scene.add(blue);

          let visible = true;
          let raf = 0;
          let previous = 0;
          let lastPaint = 0;
          let elapsed = 0;
          let firstFrame = true;
          let tornDown = false;
          let compact = window.matchMedia("(max-width: 700px)").matches;
          let mapAnchorY = compact ? 48 : 52;
          let needsPaint = true;
          let previousGlobeVisible = true;
          let currentProgress = Math.max(0, Math.min(1, progressRef.current || 0));
          let yaw = 0;
          let targetYaw = 0;
          let pointer: {
            id: number;
            x: number;
            startX: number;
            startY: number;
            dragging: boolean;
          } | null = null;
          const lookAt = new three.Vector3();
          const position = new three.Vector3();
          const story = host.closest<HTMLElement>(".mission-story");
          const thailandPoint = globePoint(three, THAILAND.lon, THAILAND.lat, 2.42);
          const thailandWorld = new three.Vector3();
          const anchorDirection = new three.Vector3();
          const anchorWorld = new three.Vector3();
          const projectedThailand = new three.Vector3();
          const viewFrame = new three.Matrix4();
          const driftRotation = new three.Euler();
          const focusRotation = new three.Quaternion();
          const thailandRotation = new three.Quaternion().setFromEuler(
            new three.Euler((THAILAND.lat * Math.PI) / 180, (-THAILAND.lon * Math.PI) / 180, 0),
          );

          const resize = () => {
            const { width, height } = host.getBoundingClientRect();
            if (!width || !height) return;
            const narrow = width < 768;
            compact = width <= 700;
            // Reserve the bottom navigation on tablets and landscape phones.
            mapAnchorY = compact ? 48 : width < 1024 ? (height <= 600 ? 38 : 45) : 52;
            needsPaint = true;
            activeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1 : 1.5));
            activeRenderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.fov = narrow ? 48 : 42;
            camera.updateProjectionMatrix();
          };
          const render = (time: number) => {
            raf = 0;
            if (disposed || tornDown || !visible || document.hidden) return;
            const target = Math.max(0, Math.min(1, progressRef.current || 0));
            const moving =
              pointer?.dragging ||
              Math.abs(target - currentProgress) > 0.00005 ||
              Math.abs(targetYaw - yaw) > 0.002;
            // Full refresh rate while scrolling/dragging; quiet idle motion needs
            // only 30 paints per second and considerably less GPU work.
            if (!firstFrame && !moving && time - lastPaint < 32) {
              raf = requestAnimationFrame(render);
              return;
            }
            lastPaint = time;
            const delta = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
            previous = time;
            elapsed += delta;
            // MissionStory already scrubs this clock. A second easing stage
            // would let the SVG map reveal ahead of the geographic camera.
            currentProgress = target;
            if (target >= 0.94 && !previousGlobeVisible && !needsPaint && !firstFrame) {
              raf = requestAnimationFrame(render);
              return;
            }
            yaw += (targetYaw - yaw) * (1 - Math.exp(-delta * 12));
            const storyProgress = Math.min(1, currentProgress / GLOBE_STORY_END);
            const focus = phase(currentProgress, GLOBE_STORY_END, 0.88);
            const zoom = phase(currentProgress, 0.78, 0.92);
            const align = phase(currentProgress, 0.78, 0.86);
            let segment = 0;
            while (segment < POSES.length - 2 && storyProgress > POSES[segment + 1]!.at) segment++;
            const from = POSES[segment]!;
            const to = POSES[segment + 1]!;
            const raw = Math.max(0, Math.min(1, (storyProgress - from.at) / (to.at - from.at)));
            const mix = raw * raw * (3 - 2 * raw);
            const blend = (a: number, b: number) => a + (b - a) * mix;
            const approach = (from: number, to: number) => from + (to - from) * zoom;
            const mobileScale = camera.aspect < 1 ? 0.77 : 1;
            position.set(
              blend(from.earth[0], to.earth[0]) * mobileScale,
              blend(from.earth[1], to.earth[1]),
              approach(blend(from.earth[2], to.earth[2]), -0.6),
            );
            earth.position.copy(position);
            earth.scale.setScalar(
              approach(
                blend(from.earthScale, to.earthScale) * (camera.aspect < 1 ? 0.8 : 1),
                compact ? 2.95 : 3.35,
              ),
            );
            camera.position.set(
              blend(from.camera[0], to.camera[0]) * (1 - zoom),
              blend(from.camera[1], to.camera[1]) * (1 - zoom),
              approach(blend(from.camera[2], to.camera[2]), compact ? 11.1 : 11.7),
            );
            camera.lookAt(lookAt);
            camera.updateMatrixWorld(true);

            // North remains up as the real Thai coordinate turns toward the
            // camera. Blend from the live drift, so entering/reversing this
            // chapter never replaces the rotation with a captured pose.
            driftRotation.set(
              0.1 + Math.sin(elapsed * 0.09) * 0.012,
              -1.72 + storyProgress * 2.65 + yaw + Math.sin(elapsed * 0.07) * 0.018,
              -0.1,
            );
            anchorDirection
              .set(compact ? 0 : 0.36, 1 - mapAnchorY / 50, 0.5)
              .unproject(camera)
              .sub(camera.position)
              .normalize();
            anchorWorld.copy(anchorDirection).negate();
            viewFrame.lookAt(anchorWorld, lookAt, camera.up);
            focusRotation.setFromRotationMatrix(viewFrame).multiply(thailandRotation);
            globe.quaternion.setFromEuler(driftRotation).slerp(focusRotation, focus);
            earth.rotation.z = Math.sin(elapsed * 0.06) * 0.008 * (1 - focus);

            // Project and align the geographic point in Three's camera space.
            // The SVG receives the same center without per-frame DOM reads.
            earth.updateMatrixWorld(true);
            thailandWorld.copy(thailandPoint).applyMatrix4(globe.matrixWorld);
            const distance = (thailandWorld.z - camera.position.z) / anchorDirection.z;
            anchorWorld.copy(camera.position).addScaledVector(anchorDirection, distance);
            earth.position.x += (anchorWorld.x - thailandWorld.x) * align;
            earth.position.y += (anchorWorld.y - thailandWorld.y) * align;
            earth.updateMatrixWorld(true);
            projectedThailand.copy(thailandPoint).applyMatrix4(globe.matrixWorld).project(camera);
            const anchorX =
              currentProgress < GLOBE_STORY_END
                ? compact
                  ? 50
                  : 68
                : (projectedThailand.x + 1) * 50;
            const anchorY =
              currentProgress < GLOBE_STORY_END ? mapAnchorY : (1 - projectedThailand.y) * 50;
            story?.style.setProperty("--thailand-anchor-x", `${anchorX.toFixed(3)}%`);
            story?.style.setProperty("--thailand-anchor-y", `${anchorY.toFixed(3)}%`);
            setFade(1 - phase(currentProgress, 0.88, 0.94), focus);
            if (currentProgress >= GLOBE_STORY_END) {
              host.dataset["geographic"] = "true";
              delete host.dataset["pointerVisible"];
              if (pointer) {
                if (canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id);
                pointer = null;
                delete host.dataset["dragging"];
              }
            } else delete host.dataset["geographic"];
            satellite.position.set(
              blend(from.satellite[0], to.satellite[0]) * mobileScale,
              blend(from.satellite[1], to.satellite[1]) + Math.sin(elapsed * 0.2) * 0.035,
              blend(from.satellite[2], to.satellite[2]),
            );
            const satelliteScale =
              blend(from.satelliteScale, to.satelliteScale) * (camera.aspect < 1 ? 0.64 : 1);
            satellite.visible = satelliteScale > 0.001;
            satellite.scale.setScalar(Math.max(0.001, satelliteScale));
            satellite.rotation.set(
              0.27 + Math.sin(elapsed * 0.12) * 0.018,
              -0.38 + storyProgress * 0.8 + yaw * 0.12,
              -0.7 + Math.sin(elapsed * 0.1) * 0.014,
            );
            try {
              // Clear the faded globe once; leave the static star field intact
              // without issuing GPU work throughout the final network chapter.
              if (earth.visible || previousGlobeVisible || needsPaint || firstFrame)
                activeRenderer.render(scene, camera);
              previousGlobeVisible = earth.visible;
              needsPaint = false;
            } catch {
              setState("failed");
              host.dispatchEvent(new CustomEvent("orbit-scene-error", { bubbles: true }));
              teardown();
              return;
            }
            if (firstFrame) {
              firstFrame = false;
              setState("ready");
              readyRef.current?.();
            }
            raf = requestAnimationFrame(render);
          };
          const start = () => {
            if (!disposed && !tornDown && visible && !document.hidden && !raf) {
              previous = 0;
              lastPaint = 0;
              raf = requestAnimationFrame(render);
            }
          };
          const stop = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            previous = 0;
          };
          const visibility = () => {
            if (document.hidden) {
              stop();
              if (pointer && canvas.hasPointerCapture(pointer.id))
                canvas.releasePointerCapture(pointer.id);
              pointer = null;
              delete host.dataset["dragging"];
              delete host.dataset["pointerVisible"];
            } else start();
          };
          const observer =
            typeof IntersectionObserver === "undefined"
              ? null
              : new IntersectionObserver(
                  ([entry]) => {
                    visible = !!entry?.isIntersecting;
                    if (visible) start();
                    else stop();
                  },
                  { threshold: 0.01 },
                );
          observer?.observe(host);
          const resizeObserver =
            typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
          resizeObserver?.observe(host);
          window.addEventListener("resize", resize);
          document.addEventListener("visibilitychange", visibility);

          const pointerDown = (event: PointerEvent) => {
            if (
              currentProgress >= GLOBE_STORY_END ||
              !event.isPrimary ||
              event.button !== 0 ||
              event.pointerType !== "mouse"
            )
              return;
            pointer = {
              id: event.pointerId,
              x: event.clientX,
              startX: event.clientX,
              startY: event.clientY,
              dragging: false,
            };
          };
          const pointerMove = (event: PointerEvent) => {
            if (event.pointerType === "mouse" && currentProgress < GLOBE_STORY_END) {
              host.style.setProperty("--orbit-pointer-x", `${event.offsetX}px`);
              host.style.setProperty("--orbit-pointer-y", `${event.offsetY}px`);
              host.dataset["pointerVisible"] = "true";
            }
            if (pointer && event.buttons === 0) {
              if (canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id);
              pointer = null;
              delete host.dataset["dragging"];
            }
            if (!pointer || pointer.id !== event.pointerId) return;
            if (!pointer.dragging) {
              const dx = Math.abs(event.clientX - pointer.startX);
              const dy = Math.abs(event.clientY - pointer.startY);
              if (dx < 6 || dx <= dy) return;
              pointer.dragging = true;
              canvas.setPointerCapture(event.pointerId);
              host.dataset["dragging"] = "true";
            }
            targetYaw += (event.clientX - pointer.x) * 0.004;
            pointer.x = event.clientX;
            event.preventDefault();
          };
          const pointerUp = (event: PointerEvent) => {
            if (!pointer || pointer.id !== event.pointerId) return;
            if (canvas.hasPointerCapture(event.pointerId))
              canvas.releasePointerCapture(event.pointerId);
            pointer = null;
            delete host.dataset["dragging"];
          };
          const pointerLeave = () => {
            delete host.dataset["pointerVisible"];
          };
          const contextLost = (event: Event) => {
            event.preventDefault();
            stop();
            setState("failed");
            host.dispatchEvent(new CustomEvent("orbit-scene-error", { bubbles: true }));
            teardown();
          };
          canvas.addEventListener("pointerdown", pointerDown);
          canvas.addEventListener("pointermove", pointerMove);
          canvas.addEventListener("pointerup", pointerUp);
          canvas.addEventListener("pointercancel", pointerUp);
          canvas.addEventListener("pointerleave", pointerLeave);
          canvas.addEventListener("lostpointercapture", pointerUp);
          canvas.addEventListener("webglcontextlost", contextLost);
          teardown = () => {
            if (tornDown) return;
            tornDown = true;
            stop();
            observer?.disconnect();
            resizeObserver?.disconnect();
            window.removeEventListener("resize", resize);
            document.removeEventListener("visibilitychange", visibility);
            canvas.removeEventListener("pointerdown", pointerDown);
            canvas.removeEventListener("pointermove", pointerMove);
            canvas.removeEventListener("pointerup", pointerUp);
            canvas.removeEventListener("pointercancel", pointerUp);
            canvas.removeEventListener("pointerleave", pointerLeave);
            canvas.removeEventListener("lostpointercapture", pointerUp);
            canvas.removeEventListener("webglcontextlost", contextLost);
            delete host.dataset["dragging"];
            delete host.dataset["pointerVisible"];
            delete host.dataset["geographic"];
            host.style.removeProperty("--orbit-pointer-x");
            host.style.removeProperty("--orbit-pointer-y");
            story?.style.removeProperty("--thailand-anchor-x");
            story?.style.removeProperty("--thailand-anchor-y");
            disposeScene(scene, activeRenderer);
            canvas.remove();
          };
          resize();
          start();
        } catch {
          if (renderer) disposeScene(scene, renderer);
          renderer?.domElement.remove();
          if (!disposed) {
            setState("failed");
            host.dispatchEvent(new CustomEvent("orbit-scene-error", { bubbles: true }));
          }
        }
      })
      .catch(() => {
        if (!disposed) {
          setState("failed");
          host.dispatchEvent(new CustomEvent("orbit-scene-error", { bubbles: true }));
        }
      });

    return () => {
      disposed = true;
      teardown();
    };
  }, [disabled, progressRef]);

  return (
    <div
      ref={hostRef}
      className="orbit-scene"
      data-orbit-state={state}
      data-disabled={disabled ? "true" : undefined}
      aria-hidden="true"
    >
      <span className="orbit-drag-cue" lang="en" aria-hidden="true">
        <span>DRAG</span>
        <span>↔</span>
      </span>
    </div>
  );
}
