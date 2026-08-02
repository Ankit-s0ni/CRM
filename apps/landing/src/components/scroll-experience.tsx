"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

export function ScrollExperience() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
    });
    const updateScroll = () => ScrollTrigger.update();
    const tick = (time: number) => lenis.raf(time * 1000);

    lenis.on("scroll", updateScroll);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const context = gsap.context(() => {
      gsap.to(".scroll-progress-bar", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.15 },
      });

      gsap.to(".ambient-mint", {
        xPercent: 65,
        yPercent: 190,
        rotation: 80,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 1.5 },
      });
      gsap.to(".ambient-blue", {
        xPercent: -90,
        yPercent: 260,
        scale: 1.3,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 2 },
      });

      const desktop = window.matchMedia("(min-width: 901px)").matches;

      if (!desktop) {
        gsap.utils
          .toArray<HTMLElement>(
            ".hero-product, .fragment-copy, .platform-heading, .platform-core, .domain-card, .intelligence-panel",
          )
          .forEach((element) => {
            gsap.fromTo(
              element,
              { y: 38, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.75,
                ease: "power2.out",
                scrollTrigger: { trigger: element, start: "top 88%", once: true },
              },
            );
          });
        return;
      }

      const hero = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });

      // Keep the first impression readable while adding a small amount of depth.
      hero
        .to(".hero-copy", { yPercent: -7 }, 0)
        .to(".hero-product", { yPercent: -5, rotation: 0 }, 0)
        .to(".scroll-cue", { y: 12 }, 0);

      const fragments = gsap.utils.toArray<HTMLElement>(".fragment");
      const convergence = gsap.timeline({
        scrollTrigger: {
          trigger: ".fragmentation",
          start: "top top",
          end: "+=115%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      fragments.forEach((fragment, index) => {
        convergence.to(
          fragment,
          {
            left: "50%",
            top: "50%",
            xPercent: -50,
            yPercent: -50,
            rotation: index % 2 === 0 ? 10 : -10,
            scale: 0.5,
            opacity: 0,
          },
          0,
        );
      });
      convergence
        .to(".fragment-copy", { yPercent: -10, opacity: 0.28 }, 0.05)
        .fromTo(
          ".fragment-convergence",
          { scale: 0.25, opacity: 0, rotation: -20 },
          { scale: 1, opacity: 1, rotation: 0 },
          0.28,
        );

      const services = gsap.utils.toArray<HTMLElement>(".service-ring span");
      const platform = gsap.timeline({
        scrollTrigger: {
          trigger: ".platform-reveal",
          start: "top top",
          end: "+=105%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });
      platform
        .fromTo(".platform-heading", { y: 70, opacity: 0 }, { y: 0, opacity: 1 }, 0)
        .fromTo(
          ".platform-core",
          { clipPath: "inset(46% 46% 46% 46% round 8rem)" },
          { clipPath: "inset(0% 0% 0% 0% round 2rem)" },
          0.12,
        )
        .fromTo(".core-label", { scale: 0.4 }, { scale: 1 }, 0.24);

      services.forEach((service, index) => {
        platform.fromTo(
          service,
          { x: index % 2 === 0 ? -80 : 80, opacity: 0 },
          { x: 0, opacity: 1 },
          0.3 + index * 0.04,
        );
      });

      const domainCards = gsap.utils.toArray<HTMLElement>(".domain-card");
      domainCards.forEach((card, index) => {
        const nextCard = domainCards[index + 1];
        if (!nextCard) return;

        gsap.to(card, {
          scale: 0.93 - index * 0.008,
          y: -18,
          filter: "saturate(0.75)",
          ease: "none",
          scrollTrigger: {
            trigger: nextCard,
            start: "top 82%",
            end: "top 18%",
            scrub: 0.8,
          },
        });
      });

      gsap.fromTo(
        ".intelligence-panel",
        { scale: 0.78, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".intelligence",
            start: "top 75%",
            end: "center center",
            scrub: 1,
          },
        },
      );
    });

    ScrollTrigger.refresh();

    return () => {
      context.revert();
      lenis.off("scroll", updateScroll);
      lenis.destroy();
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <>
      <div className="ambient-field" aria-hidden="true">
        <span className="ambient-blob ambient-mint" />
        <span className="ambient-blob ambient-blue" />
      </div>
      <div className="scroll-progress" aria-hidden="true">
        <span className="scroll-progress-bar" />
      </div>
    </>
  );
}
