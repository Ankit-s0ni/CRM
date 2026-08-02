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

      const heroProduct = document.querySelector<HTMLElement>(".hero-product");
      const hero = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "+=185%",
          pin: true,
          scrub: 0.85,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      const centerProductX = () => {
        if (!heroProduct) return 0;
        const bounds = heroProduct.getBoundingClientRect();
        return window.innerWidth / 2 - (bounds.left + bounds.width / 2);
      };
      const centerProductY = () => {
        if (!heroProduct) return 0;
        const bounds = heroProduct.getBoundingClientRect();
        return window.innerHeight / 2 - (bounds.top + bounds.height / 2);
      };

      // Preserve spatial continuity: the workspace becomes the DeltCRM mark,
      // then the mark becomes the next section rather than fading between scenes.
      hero
        .to(".scroll-cue", { opacity: 0, y: 12 }, 0.06)
        .to(".site-header", { yPercent: -150 }, 0.08)
        .to(".hero-copy", { opacity: 0, yPercent: -14 }, 0.12)
        .to(
          ".hero-product",
          {
            borderRadius: "3.5rem",
            boxShadow: "0 1rem 4rem rgb(25 29 26 / 10%)",
            rotation: 0,
            scale: 0.22,
            x: centerProductX,
            y: centerProductY,
          },
          0.14,
        )
        .fromTo(
          ".hero-transition-mark",
          { opacity: 0, rotation: -8, scale: 0.4 },
          { opacity: 1, rotation: 0, scale: 1 },
          0.4,
        )
        .to(".hero-product", { opacity: 0, scale: 0.16 }, 0.42)
        .fromTo(
          ".hero-transition-caption",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0 },
          0.5,
        )
        .to(".hero-transition-mark", { scale: 1.12 }, 0.58)
        .to(".hero-transition-caption", { opacity: 0, y: -12 }, 0.72)
        .to(".hero-transition-wipe", { scale: 24 }, 0.73)
        .to(".hero-transition-mark", { opacity: 0, scale: 15 }, 0.75)
        .to(".site-header", { yPercent: 0 }, 0.9)
        .set(".hero", { backgroundColor: "#f26444" }, 1.22)
        .set(".hero-transition", { autoAlpha: 0 }, 1.24);

      const fragments = gsap.utils.toArray<HTMLElement>(".fragment");
      const convergence = gsap.timeline({
        scrollTrigger: {
          trigger: ".fragmentation",
          start: "top top",
          end: "+=150%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // Let the complete fragmented scene settle before it starts converging.
      convergence.to({}, { duration: 0.32 });

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
            duration: 0.6,
          },
          0.32,
        );
      });
      convergence
        .to(
          ".fragment-copy",
          { yPercent: -10, opacity: 0.28, duration: 0.55 },
          0.38,
        )
        .fromTo(
          ".fragment-convergence",
          { scale: 0.25, opacity: 0, rotation: -20 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.45 },
          0.78,
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
