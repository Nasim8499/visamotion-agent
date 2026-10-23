import { useApp } from "@/lib/store";

/**
 * White-first ambient canvas. In "blue" mode the same geometry turns into a
 * Facebook-blue → white gradient with deeper glass glow.
 */
export default function Background() {
  const { settings } = useApp();
  const blue = settings.theme === "blue";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          background: blue
            ? "linear-gradient(155deg,#1877f2 0%,#4a98fb 22%,#a9cdfb 48%,#f3f8ff 74%,#ffffff 100%)"
            : "linear-gradient(165deg,#ffffff 0%,#f7faff 38%,#eef4fd 72%,#f7f9ff 100%)",
        }}
      />

      {/* soft colour washes */}
      <div
        className="float-slow absolute -left-[14%] -top-[16%] h-[56vw] w-[56vw] rounded-full blur-[90px] transition-opacity duration-700"
        style={{
          background: blue
            ? "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.62), transparent 62%)"
            : "radial-gradient(circle at 35% 35%, rgba(24,119,242,0.16), transparent 64%)",
          opacity: blue ? 0.9 : 1,
        }}
      />
      <div
        className="float-slower absolute -right-[16%] top-[2%] h-[48vw] w-[48vw] rounded-full blur-[100px]"
        style={{
          background: blue
            ? "radial-gradient(circle at 55% 45%, rgba(9,72,166,0.32), transparent 64%)"
            : "radial-gradient(circle at 55% 45%, rgba(120,160,255,0.22), transparent 66%)",
        }}
      />
      <div
        className="float-slow absolute bottom-[-22%] left-[18%] h-[46vw] w-[46vw] rounded-full blur-[110px]"
        style={{
          background: blue
            ? "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.75), transparent 62%)"
            : "radial-gradient(circle at 50% 50%, rgba(191,219,254,0.5), transparent 66%)",
        }}
      />
      <div
        className="float-slower absolute bottom-[6%] right-[10%] h-[30vw] w-[30vw] rounded-full blur-[90px]"
        style={{
          background: blue
            ? "radial-gradient(circle at 50% 50%, rgba(24,119,242,0.28), transparent 66%)"
            : "radial-gradient(circle at 50% 50%, rgba(224,231,255,0.7), transparent 68%)",
        }}
      />

      {/* specular light streak */}
      <div
        className="absolute -top-[30%] left-[10%] h-[70vh] w-[55vw] rotate-[16deg] blur-[70px] transition-opacity duration-700"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))",
          opacity: blue ? 0.55 : 0.4,
        }}
      />

      {/* grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
