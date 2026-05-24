import { useEffect, useState } from "react";
import clsx from "clsx";

export default function Slideshow() {
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = [
    "/assets/images/slide1.jpg",
    "/assets/images/slide2.jpeg",
    "/assets/images/slide3.webp",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {slides.map((slide, index) => (
        <img
          key={slide}
          src={slide}
          alt={`Slide ${index + 1}`}
          className={clsx(
            "absolute w-full h-full object-cover transition-opacity duration-700",
            index === slideIndex ? "opacity-30" : "opacity-0"
          )}
        />
      ))}
    </div>
  );
}
