import { lazy, Suspense, useEffect, useState, Component, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { Application } from "@splinetool/runtime";

// The browser-only Spline module is never evaluated during SSR.
const Spline = lazy(() => import("@splinetool/react-spline"));
const scene = "https://prod.spline.design/PBQQBw8bfXDhBo7w/scene.splinecode";

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? null : this.props.children; }
}

export function AuthScene() {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 60, damping: 24 });
  const smoothY = useSpring(y, { stiffness: 60, damping: 24 });
  const rotateX = useTransform(smoothY, [-1, 1], [7, -7]);
  const rotateY = useTransform(smoothX, [-1, 1], [-9, 9]);
  const prepareScene = async (app: Application) => {
    try {
      const root = document.querySelector(".auth-page");
      if (!root) return;
      const tokens = getComputedStyle(root);
      // Spline needs RGB; resolve semantic OKLCH tokens through the browser.
      const resolveColor = (token: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d");
        if (!context) return "transparent";
        context.fillStyle = tokens.getPropertyValue(token).trim();
        context.fillRect(0, 0, 1, 1);
        const pixel = context.getImageData(0, 0, 1, 1).data;
        return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
      };
      const primary = resolveColor("--neon");
      const muted = resolveColor("--input");
      app.setBackgroundColor(resolveColor("--background"));
      app.setZoom(2.5);
      app.getAllObjects().forEach(object => {
        if (/sphere|cube|rectangle|plane/i.test(object.name)) object.visible = false;
      });
      for (let index = 0; index < 3; index++) {
        await app.createObject("Cube", {
          name: `Workflow layer ${index}`,
          width: 220, height: 32, depth: 145,
          position: [0, (index - 1) * 55, 0],
          rotation: [18, -28, -12],
          color: index === 2 ? primary : muted,
        });
      }
      setLoaded(true);
    } catch {
      setLoaded(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (reduced || window.matchMedia("(pointer: coarse)").matches) return;
    const move = (event: PointerEvent) => {
      x.set(event.clientX / window.innerWidth * 2 - 1);
      y.set(event.clientY / window.innerHeight * 2 - 1);
    };
    const reset = () => { x.set(0); y.set(0); };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", reset);
    };
  }, [reduced, x, y]);

  return (
    <div className="auth-scene" aria-hidden="true">
      <div className="scene-grid" />
      <motion.div className="scene-object" style={reduced ? undefined : { rotateX, rotateY }}>
        <div className={`scene-fallback ${loaded ? "scene-fallback-loaded" : ""}`}>
          <div className="workflow-mark"><i /><i /><i /></div>
        </div>
        {mounted && !reduced && (
          <SceneBoundary>
            <Suspense fallback={null}>
              <Spline scene={scene} onLoad={prepareScene} onError={() => setLoaded(false)} className={loaded ? "spline-scene is-loaded" : "spline-scene"} />
            </Suspense>
          </SceneBoundary>
        )}
      </motion.div>
      <span className="scene-coordinate scene-coordinate-top">01 / WORK IN MOTION</span>
      <span className="scene-coordinate scene-coordinate-bottom">IDEA → ACTION → DONE</span>
    </div>
  );
}