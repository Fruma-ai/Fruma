"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function HeroCloth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [allowMotion, setAllowMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAllowMotion(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    void el.play().catch(() => undefined);
  }, [allowMotion]);

  return (
    <>
      <Image
        src="/splash/black-cloth.jpg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="manifest-poster object-cover object-center"
      />
      {allowMotion ? (
        <video
          ref={videoRef}
          className="manifest-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/splash/black-cloth.jpg"
          aria-hidden
        >
          <source src="/splash/black-cloth.mp4" type="video/mp4" />
        </video>
      ) : null}
    </>
  );
}
